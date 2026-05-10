-- =============================================================================
-- Phase 1 滞留行のワンショット清掃 SQL
-- =============================================================================
-- 関連: openspec/changes/reservation-signup-zero-stale/design.md D8
--
-- 目的:
--   #189 ゼロ滞留 signup フロー導入前（Phase 1 マジックリンク方式）に発生した
--   未確認 / プロフィール未完成 / テスト用作成された auth.users + members を
--   1 回限りで削除する。本フローでは新規滞留が発生しないため cron 化は不要。
--
-- 適用方針:
--   1. 翔太郎くんが Supabase Dashboard → SQL Editor に貼り付けて実行
--   2. 先に Section A (SELECT) を実行して件数確認
--   3. 件数を翔太郎くんに目視確認してもらう
--   4. OK が出たら Section B (DELETE) を実行
--   5. dev で完了後、同じ手順を prd でも実行（本 change リリース時 1 回のみ）
--
-- 削除条件（auth.users が DELETE され ON DELETE CASCADE で members 連動削除）:
--   - 24 時間以上前に作成された
--   - email_confirmed_at IS NULL（未確認）
--     OR profile.signup_completed != 'true'（プロフィール未完成）
--   - かつ role != 'admin'（admin は除外）
--   - かつ email NOT LIKE '%@*.example.invalid'（dev seed fixture を除外）
--     ※ `dev_event_detail_seed.sql` が intentional に作る `*.example.invalid` 行は
--        Phase 1 滞留扱いではなく load-bearing 開発フィクスチャのため除外する
--
-- =============================================================================


-- ============================================================================
-- Section A: 削除対象の SELECT（先に実行して件数確認）
-- ============================================================================

select count(*) as stale_count
from auth.users u
left join public.members m on m.id = u.id
where u.created_at < now() - interval '24 hours'
  and (
    u.email_confirmed_at is null
    or coalesce(m.profile->>'signup_completed', 'false') != 'true'
  )
  and coalesce(m.role, 'member') != 'admin'
  and u.email not like '%@%.example.invalid';

-- 詳細を見たい場合（最大 50 件）:
select
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  m.role,
  m.profile->>'signup_completed' as signup_completed
from auth.users u
left join public.members m on m.id = u.id
where u.created_at < now() - interval '24 hours'
  and (
    u.email_confirmed_at is null
    or coalesce(m.profile->>'signup_completed', 'false') != 'true'
  )
  and coalesce(m.role, 'member') != 'admin'
  and u.email not like '%@%.example.invalid'
order by u.created_at desc
limit 50;


-- ============================================================================
-- Section B: 実 DELETE（Section A の件数を翔太郎くんが確認後に実行）
-- ============================================================================
-- 注意: この DELETE は元に戻せない。実行前に必ず Section A の件数確認 + admin
-- ユーザーが除外されることを目視確認すること。

-- delete from auth.users
-- where id in (
--   select u.id
--   from auth.users u
--   left join public.members m on m.id = u.id
--   where u.created_at < now() - interval '24 hours'
--     and (
--       u.email_confirmed_at is null
--       or coalesce(m.profile->>'signup_completed', 'false') != 'true'
--     )
--     and coalesce(m.role, 'member') != 'admin'
--     and u.email not like '%@%.example.invalid'
-- );


-- ============================================================================
-- Section C: 実行後の検証
-- ============================================================================

-- 残件 0 を確認:
-- select count(*) as remaining
-- from auth.users u
-- left join public.members m on m.id = u.id
-- where u.created_at < now() - interval '24 hours'
--   and (
--     u.email_confirmed_at is null
--     or coalesce(m.profile->>'signup_completed', 'false') != 'true'
--   )
--   and coalesce(m.role, 'member') != 'admin';

-- admin が残っていることを確認:
-- select id, email, role, profile->>'signup_completed' as signup_completed
-- from public.members
-- where role = 'admin';
