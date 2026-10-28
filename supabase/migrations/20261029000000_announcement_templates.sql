-- =============================================================================
-- announcement_templates: LINE 等の告知文テンプレートを保存する
-- =============================================================================
-- 背景: Issue #386 LINE 告知文のワンタップ作成。admin のイベント詳細から
--       テンプレートにイベント情報を差し込んだ告知文をコピーする。テンプレートは
--       admin の「告知テンプレート」画面で編集する。チャネル単位で 1 行を持ち、
--       現状のチャネルは `line` のみ（将来ジモティー等を足すときは CHECK を拡張）。
--       admin のみ読み書きし、会員 / anon には露出しない。
-- 参照: openspec/changes/line-announcement-copy/specs/data-schema/spec.md
--       CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
-- 検証: supabase db query --linked --file supabase/tests/verify_grants.sql
--       supabase db query --linked --file supabase/tests/verify_announcement_templates_rls.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------

create table if not exists public.announcement_templates (
  channel     text        primary key
                          constraint announcement_templates_channel_check
                          check (channel in ('line')),
  body        text        not null
                          constraint announcement_templates_body_length_check
                          check (char_length(body) between 1 and 5000),  -- LINE 1 メッセージ上限
  updated_by  uuid        references public.members(id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.announcement_templates is
  '告知文テンプレート（チャネル単位で 1 行・admin のみ読み書き・会員非公開）';

-- updated_at トリガー
drop trigger if exists set_announcement_templates_updated_at on public.announcement_templates;
create trigger set_announcement_templates_updated_at
before update on public.announcement_templates
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない（CLAUDE.md Pillar 4）。

alter table public.announcement_templates enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT / INSERT / UPDATE は admin のみ。DELETE はポリシーを作らず全拒否
-- （テンプレートを削除する操作は提供しない）。

create policy "announcement_templates_select_admin"
  on public.announcement_templates
  for select
  to authenticated
  using (public.is_admin());

create policy "announcement_templates_insert_admin"
  on public.announcement_templates
  for insert
  to authenticated
  with check (public.is_admin());

create policy "announcement_templates_update_admin"
  on public.announcement_templates
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- -----------------------------------------------------------------------------
-- 4. GRANT（3 ロール明示付与）
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更（2026-10-30 enforce）に備え、
-- `alter default privileges` の自動付与には頼らず 3 ロールを明示的に扱う。

-- 4.1 anon（未認証）— 付与しない。既定付与が残っていても確実に剥奪する。
revoke all on public.announcement_templates from anon;

-- 4.2 authenticated — select / insert / update のみ。RLS で admin に限定。
revoke all on public.announcement_templates from authenticated;
grant select, insert, update on public.announcement_templates to authenticated;

-- 4.3 service_role（Edge Function / 将来の自動投稿用、特権・必須）
grant select, insert, update, delete on public.announcement_templates to service_role;


-- -----------------------------------------------------------------------------
-- 5. 初期テンプレート
-- -----------------------------------------------------------------------------
-- 既存行がある場合は上書きしない。本文は admin 側
-- `entities/announcement-template/model/defaultTemplate.ts` と同一内容（spec で一致を検査）。

insert into public.announcement_templates (channel, body)
values ('line', $tpl$🏐 {イベント名}のお知らせ 🏐

{日付} に{イベント名}を開催します！
初心者さんも経験者さんも、ゆるっと楽しくボールに触りましょう〜！
途中参加・途中抜けもOKです🙆

　◾️日時：{日付} {開始時刻}-{終了時刻}
　◾️場所：{会場}

　-------------------------------

　参加費：{参加費}
　持ち物：室内用シューズ・運動着・飲み物

　-------------------------------

▼ 予約はこちらから
{予約リンク}

ご予約お待ちしています！🙌$tpl$)
on conflict (channel) do nothing;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: revoke all on public.announcement_templates from service_role;
-- ROLLBACK: revoke all on public.announcement_templates from authenticated;
-- ROLLBACK: revoke all on public.announcement_templates from anon;
-- ROLLBACK: drop policy if exists "announcement_templates_select_admin" on public.announcement_templates;
-- ROLLBACK: drop policy if exists "announcement_templates_insert_admin" on public.announcement_templates;
-- ROLLBACK: drop policy if exists "announcement_templates_update_admin" on public.announcement_templates;
-- ROLLBACK: drop trigger if exists set_announcement_templates_updated_at on public.announcement_templates;
-- ROLLBACK: drop table if exists public.announcement_templates;
