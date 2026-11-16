-- =============================================================================
-- operational_settings: サークル運営のグローバル設定を 1 行で保持する
-- =============================================================================
-- 背景: Issue #XXX 新規会員登録の一時停止トグル。オーナーが育児休暇で運営を
--       離れる間、新規会員の受付を停止し既存メンバー + 幹事代理で運営を回す。
--       runtime で可逆に切り替えたいため env ではなく DB フラグで保持する。
--       グローバル設定なので 1 行のみ（単一行制約）。admin のみ読み書きし、
--       匿名ユーザーには受付可否 1 bit だけを `public.registration_open()`
--       関数経由で公開する（テーブル本体は非公開）。
-- 参照: openspec/changes/member-registration-toggle/design.md D1〜D4
--       CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
-- 検証: supabase db query --linked --file supabase/tests/verify_grants.sql
--       supabase db query --linked --file supabase/tests/verify_operational_settings_rls.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成（単一行運用）
-- -----------------------------------------------------------------------------
-- id を固定値 true に縛ることで行は常に 1 行のみ（2 行目は PK 衝突で不可）。

create table if not exists public.operational_settings (
  id                          boolean     primary key default true
                                          constraint operational_settings_singleton_check
                                          check (id),
  member_registration_enabled boolean     not null default true,
  updated_by                  uuid        references public.members(id) on delete set null,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.operational_settings is
  'サークル運営のグローバル設定（1 行運用・admin のみ読み書き・会員非公開）';
comment on column public.operational_settings.member_registration_enabled is
  '新規会員登録の受付可否。false = 受付停止中。';

-- updated_at トリガー
drop trigger if exists set_operational_settings_updated_at on public.operational_settings;
create trigger set_operational_settings_updated_at
before update on public.operational_settings
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない（CLAUDE.md Pillar 4）。

alter table public.operational_settings enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT / UPDATE は admin のみ。INSERT / DELETE はポリシーを作らず全拒否
-- （行は migration の seed で 1 行だけ作り、増減させない）。

create policy "operational_settings_select_admin"
  on public.operational_settings
  for select
  to authenticated
  using (public.is_admin());

create policy "operational_settings_update_admin"
  on public.operational_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- -----------------------------------------------------------------------------
-- 4. GRANT（3 ロール明示付与）
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更（2026-10-30 enforce）に備え、
-- `alter default privileges` の自動付与には頼らず 3 ロールを明示的に扱う。

-- 4.1 anon（未認証）— 付与しない。受付可否は registration_open() 関数で公開する。
revoke all on public.operational_settings from anon;

-- 4.2 authenticated — select / update のみ。RLS で admin に限定。
revoke all on public.operational_settings from authenticated;
grant select, update on public.operational_settings to authenticated;

-- 4.3 service_role（Edge Function のゲート判定用、特権・必須）
grant select, insert, update, delete on public.operational_settings to service_role;


-- -----------------------------------------------------------------------------
-- 5. 受付可否の公開参照関数
-- -----------------------------------------------------------------------------
-- 設定テーブル本体を anon に見せず、受付可否 1 bit だけを返す。
-- SECURITY DEFINER で RLS を跨いで singleton 行を読む。行が無い場合は
-- 受付中（true）とみなす（フェイルオープン・既定は受付中）。

create or replace function public.registration_open()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select member_registration_enabled from public.operational_settings limit 1),
    true
  );
$$;

comment on function public.registration_open() is
  '新規会員登録の受付可否を返す（true=受付中 / false=停止中）。anon から参照可。';

revoke all on function public.registration_open() from public;
grant execute on function public.registration_open() to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 6. 初期行（受付中で seed）
-- -----------------------------------------------------------------------------
-- 既存行がある場合は上書きしない。デプロイ時点では受付継続（挙動不変）。

insert into public.operational_settings (id, member_registration_enabled)
values (true, true)
on conflict (id) do nothing;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: revoke execute on function public.registration_open() from anon, authenticated, service_role;
-- ROLLBACK: drop function if exists public.registration_open();
-- ROLLBACK: revoke all on public.operational_settings from service_role;
-- ROLLBACK: revoke all on public.operational_settings from authenticated;
-- ROLLBACK: revoke all on public.operational_settings from anon;
-- ROLLBACK: drop policy if exists "operational_settings_select_admin" on public.operational_settings;
-- ROLLBACK: drop policy if exists "operational_settings_update_admin" on public.operational_settings;
-- ROLLBACK: drop trigger if exists set_operational_settings_updated_at on public.operational_settings;
-- ROLLBACK: drop table if exists public.operational_settings;
