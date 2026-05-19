-- =============================================================================
-- DEV / STAGING ONLY — #271 ニックネーム併記の動作確認用 seed
-- =============================================================================
-- ⚠️  本番 Supabase で実行禁止。Render プレビュー / ローカル / staging 専用。
--
-- 目的:
--   admin の /events/:id 画面で「氏名（ニックネーム）」併記を確認するため、
--   `dev_event_detail_seed.sql` で投入済みの 5 名のテスト member のうち
--   3 名に nickname を埋め、2 名は NULL のまま残す。
--
--   これにより同一イベントの予約者一覧で:
--     ・nickname あり (3 名)  → 「氏名（ニックネーム）」併記
--     ・nickname なし (2 名)  → 氏名のみ
--   が同時に確認できる。
--
-- 前提:
--   1. `dev_event_detail_seed.sql` を先に実行済みであること
--      （未実行でも単に UPDATE 0 件で安全に終わる。冪等）
--   2. 翔太郎くん本人会員 (high.q.volleyball@gmail.com) は別 migration で
--      nickname='たろ' が既に投入済み（20260507000000_add_members_nickname.sql）。
--
-- 関連:
--   openspec/changes/admin-event-detail-show-nickname/specs/admin-event-detail/spec.md
--   supabase/seed/dev_event_detail_seed.sql
--   supabase/migrations/20260519163927_add_nickname_to_event_participants_view.sql
--
-- 使い方 (Supabase Dashboard SQL Editor):
--   1. dev_event_detail_seed.sql を先に RUN
--   2. 本ファイル全体をコピーして Dashboard SQL Editor で RUN
--   3. /events/:id で 5 名の参加者一覧 + 翔太郎くんの予約行を見て確認
--
-- ロールバック:
--   ファイル末尾「-- ROLLBACK」セクション参照
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- nickname を 3 名に投入 (2 名は NULL のまま残し、混在状態を作る)
--   - 田中 美咲   → 'みさきち'   (ひらがな)
--   - 佐藤 健太   → 'けんちゃん' (ひらがな)
--   - 中村 あかり → 'Aka'        (半角 ASCII 英字、検索 lowercase ヒット確認用)
--   - 高橋 直樹   → NULL         (nickname なしの表示確認用)
--   - 鈴木 翔太郎 → NULL         (nickname なし + 初回バッジ off 確認用)
-- -----------------------------------------------------------------------------

update public.members set nickname = 'みさきち'   where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01';
update public.members set nickname = 'けんちゃん' where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02';
update public.members set nickname = 'Aka'        where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03';
-- 11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04 (高橋) と 11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05 (鈴木) は
-- 意図的に nickname を NULL のままにする

commit;

-- =============================================================================
-- 検証クエリ (Dashboard SQL Editor で確認用に実行)
-- =============================================================================
-- select display_name, nickname
-- from public.members
-- where id in (
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05'
-- )
-- order by display_name;
--
-- view 側にも反映されているか:
-- select display_name, nickname, is_first_time
-- from public.event_participants_view
-- where member_id in (
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05'
-- );

-- =============================================================================
-- ROLLBACK (テストデータ削除)
-- =============================================================================
-- begin;
-- update public.members set nickname = null
-- where id in (
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03'
-- );
-- commit;
