-- =============================================================================
-- announcement_templates: X チャネルを追加する
-- =============================================================================
-- 背景: Issue #386。LINE（オープンチャット = 既に High Q を知っている人）に加え、
--       X で High Q を知らない人にも告知する。X 用は知らない人の不安を先回りして
--       消す文面と、サークル紹介（LP）へのリンクを初期テンプレートにする。
--       テーブル・RLS・GRANT は 20261029000000_announcement_templates.sql のまま
--       変更しない（チャネル許可値の拡張と初期テンプレート投入のみ）。
-- 参照: openspec/changes/line-announcement-copy/specs/data-schema/spec.md
--       openspec/changes/line-announcement-copy/design.md (D10, D11)
-- 検証: supabase db query --linked --file supabase/tests/verify_announcement_templates_rls.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. チャネル許可値を line / x に拡張
-- -----------------------------------------------------------------------------

alter table public.announcement_templates
  drop constraint if exists announcement_templates_channel_check;

alter table public.announcement_templates
  add constraint announcement_templates_channel_check
  check (channel in ('line', 'x'));


-- -----------------------------------------------------------------------------
-- 2. X の初期テンプレート
-- -----------------------------------------------------------------------------
-- 既存行がある場合は上書きしない。本文は admin 側
-- `entities/announcement-template/model/defaultTemplate.ts` と同一内容（spec で一致を検査）。

insert into public.announcement_templates (channel, body)
values ('x', $tpl$🏐{日付} {開始時刻}〜 {会場}でバレーします！

初心者・ひとり参加・久しぶりの方 大歓迎🙌
20〜30代中心のゆるい社会人サークルです。
途中参加・途中抜けOK／参加費{参加費}

雰囲気はこちら👇 気軽にのぞいてみてください
{紹介ページリンク}

#バレーボール #社会人サークル #江東区 #初心者歓迎$tpl$)
on conflict (channel) do nothing;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: delete from public.announcement_templates where channel = 'x';
-- ROLLBACK: alter table public.announcement_templates drop constraint if exists announcement_templates_channel_check;
-- ROLLBACK: alter table public.announcement_templates add constraint announcement_templates_channel_check check (channel in ('line'));
