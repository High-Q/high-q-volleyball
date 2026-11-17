-- =============================================================================
-- announcements: サイト内に掲示する汎用お知らせ（複数行・掲載期間つき）
-- =============================================================================
-- 背景: Issue #395 汎用お知らせ機能。オーナーがコードに触れず、掲載期間を決めて
--       複数の周知を LP（公開）と予約サイト（会員）に出し入れできるようにする。
--       #393（受付停止トグル）が「LP/会員向け周知は本機能に委譲」と切り出した本体。
--       公開読取の安全境界は RLS で担保する:
--         - anon       : 出す相手が public/all かつ掲載期間内の行のみ
--         - 一般会員   : 出す相手が members/all かつ掲載期間内の行のみ
--         - admin      : 全 audience・掲載前/終了後も含めて全件
--       掲載期間の判定は端末 TZ によらずサーバー絶対時刻 now() で行う。
-- 参照: openspec/changes/general-announcements/design.md D1〜D6
--       CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
-- 検証: supabase db query --linked --file supabase/tests/verify_grants.sql
--       supabase db query --linked --file supabase/tests/verify_announcements_rls.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------

create table if not exists public.announcements (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null check (char_length(title) between 1 and 120),
  body          text        not null check (char_length(body) between 1 and 2000),
  audience      text        not null check (audience in ('public', 'members', 'all')),
  publish_start timestamptz not null default now(),
  publish_end   timestamptz,
  created_by    uuid        references public.members(id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint announcements_period_valid
    check (publish_end is null or publish_end > publish_start)
);

comment on table public.announcements is
  'サイト内に掲示する汎用お知らせ（複数行・掲載期間つき・admin が CRUD・公開読取は RLS で掲載期間と出す相手を制限）';
comment on column public.announcements.audience is
  '出す相手。public=公開サイト(LP) / members=会員向け(予約) / all=両方。';
comment on column public.announcements.publish_start is '掲載開始時刻。これ以降に掲載対象となる。';
comment on column public.announcements.publish_end is '掲載終了時刻（排他的上限）。null は無期限掲載。';

-- updated_at トリガー（既存の共通関数を再利用）
drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない（CLAUDE.md Pillar 4）。

alter table public.announcements enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー
-- -----------------------------------------------------------------------------
-- 公開読取は掲載期間と出す相手で制限する。掲載前・掲載終了後・対象外 audience の
-- 行は admin 以外に漏らさない。書き込みは admin のみ。

-- SELECT（anon）: 公開(public/all) かつ掲載期間内のみ
drop policy if exists announcements_select_public on public.announcements;
create policy announcements_select_public
  on public.announcements
  for select
  to anon
  using (
    audience in ('public', 'all')
    and publish_start <= now()
    and (publish_end is null or now() < publish_end)
  );

-- SELECT（authenticated）: admin は全件、一般会員は 会員(members/all) かつ掲載期間内のみ
drop policy if exists announcements_select_authenticated on public.announcements;
create policy announcements_select_authenticated
  on public.announcements
  for select
  to authenticated
  using (
    public.is_admin()
    or (
      audience in ('members', 'all')
      and publish_start <= now()
      and (publish_end is null or now() < publish_end)
    )
  );

-- INSERT / UPDATE / DELETE: admin のみ
drop policy if exists announcements_insert_admin on public.announcements;
create policy announcements_insert_admin
  on public.announcements
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists announcements_update_admin on public.announcements;
create policy announcements_update_admin
  on public.announcements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists announcements_delete_admin on public.announcements;
create policy announcements_delete_admin
  on public.announcements
  for delete
  to authenticated
  using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 4. GRANT（3 ロール明示付与）
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更（2026-10-30 enforce）に備え、
-- `alter default privileges` の自動付与には頼らず 3 ロールを明示的に扱う。

-- 4.1 anon（未認証）— 公開お知らせを LP で読むため SELECT のみ。行は RLS で制限。
grant select on public.announcements to anon;

-- 4.2 authenticated（ログイン会員）— CRUD 権限。行は RLS で admin / 会員に制御。
grant select, insert, update, delete on public.announcements to authenticated;

-- 4.3 service_role（Edge Function / Admin API 用、特権・必須）
grant select, insert, update, delete on public.announcements to service_role;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: revoke all on public.announcements from service_role;
-- ROLLBACK: revoke all on public.announcements from authenticated;
-- ROLLBACK: revoke all on public.announcements from anon;
-- ROLLBACK: drop policy if exists announcements_select_public        on public.announcements;
-- ROLLBACK: drop policy if exists announcements_select_authenticated on public.announcements;
-- ROLLBACK: drop policy if exists announcements_insert_admin         on public.announcements;
-- ROLLBACK: drop policy if exists announcements_update_admin         on public.announcements;
-- ROLLBACK: drop policy if exists announcements_delete_admin         on public.announcements;
-- ROLLBACK: drop trigger if exists set_announcements_updated_at on public.announcements;
-- ROLLBACK: drop table if exists public.announcements;
