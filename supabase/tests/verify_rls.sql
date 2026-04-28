-- =============================================================================
-- High Q RLS 振る舞い検証スクリプト (Issue #147 / Section 5)
-- =============================================================================
-- 目的: migration 適用後に Supabase Dashboard の SQL Editor で RUN し、
--       RLS ポリシーが意図通りに動作することを手動検証する。
--
-- 前提:
--   - 20260426000000_init_high_q.sql / 20260428143738_db_schema_foundation.sql
--     が適用済み
--   - venues seed (5 行) が投入済み
--
-- 使い方:
--   - Supabase SQL Editor は service_role 相当で動くため、本ファイルでは
--     `set local role ...` と `set local request.jwt.claim.sub` で
--     auth.uid() を切り替えて RLS の振る舞いを検証する
--   - 各テストブロックは独立しており、上から順に RUN する
--
-- 関連: openspec/changes/db-schema-foundation/tasks.md Section 5
-- =============================================================================

begin;

-- 検証用ダミー member ID (auth.users にも同 ID で行を作る必要があるが、本検証では
-- 既存のユーザーがいる前提で、テスト後に rollback するため挙動だけ確認)。
-- TIP: 実環境では実際のテストユーザーの auth.uid() を使う。

-- =============================================================================
-- Test 5.1: venues — anon で SELECT → 全件返る
-- =============================================================================
set local role anon;

select
  case
    when count(*) = 5 then '✅ 5.1 PASS: anon で venues 5 行取得'
    else format('❌ 5.1 FAIL: anon で取得できた件数 = %s (期待 5)', count(*))
  end as result
from public.venues;

reset role;


-- =============================================================================
-- Test 5.2: venues — member で INSERT → 拒否される
-- =============================================================================
-- 一般会員ロールで INSERT を試みる。RLS で 0 行 INSERT になる想定。
do $$
declare
  test_member_id uuid := '11111111-1111-4111-8111-111111111111';
  inserted_count int;
begin
  perform set_config('request.jwt.claim.sub', test_member_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  begin
    insert into public.venues (name, address)
    values ('TEST_NOT_INSERTED', 'should be rejected by RLS');
    get diagnostics inserted_count = row_count;
    if inserted_count = 0 then
      raise notice '✅ 5.2 PASS: member で venues INSERT は 0 行 (RLS が機能)';
    else
      raise notice '❌ 5.2 FAIL: member で venues INSERT が成功してしまった';
    end if;
  exception when insufficient_privilege or check_violation then
    raise notice '✅ 5.2 PASS: member で venues INSERT が拒否された (% 例外)', sqlstate;
  end;
end;
$$;
reset role;


-- =============================================================================
-- Test 5.3: venues — admin で INSERT → 成功
-- =============================================================================
-- (admin ユーザーのセットアップは別途必要。実環境では:
--   update public.members set role = 'admin' where email = 'owner@high-q.club';
--  でロール昇格させた上で本テストを実施)
-- ここではコメントとして残す。


-- =============================================================================
-- Test 5.4 / 5.5: identity_documents — 自分の SELECT のみ取得可、他人は除外
-- =============================================================================
-- 同上、auth.uid() の切替が必要。実環境で実施。


-- =============================================================================
-- Test 5.6: identity_documents — 自己 status='approved' UPDATE → 拒否
-- =============================================================================
-- 同上、auth.uid() の切替が必要。実環境で実施。


-- =============================================================================
-- Test 5.7: identity_documents — admin で status='approved' UPDATE → 成功
-- =============================================================================
-- 同上、admin 権限のあるユーザーでの実施が必要。


-- =============================================================================
-- Test 5.8 / 5.9: Storage — 自分のディレクトリのみ upload 可
-- =============================================================================
-- Storage RLS は SQL からは検証しづらい (Supabase JS SDK 経由の検証が現実的)。
-- 手動検証手順:
--   1. アプリから member A でログイン
--   2. <member-A-uuid>/test.jpg に upload → 成功すること
--   3. <member-B-uuid>/test.jpg に upload を試行 → 403 で拒否されること


-- =============================================================================
-- Test 5.10: reservations — status='cancelled' UPDATE → cancelled_at 自動セット
-- =============================================================================
-- service_role で実施 (RLS バイパスでトリガー単体を検証)
do $$
declare
  test_event_id uuid;
  test_member_id uuid;
  test_reservation_id uuid;
  before_cancelled_at timestamptz;
  after_cancelled_at timestamptz;
begin
  -- 検証用 venue / event / member を仮作成 (rollback で消える)
  -- venues seed の 1 件を使う
  select id into test_event_id
  from public.venues where is_primary = true limit 1;

  -- 一時 event 作成
  insert into public.events (name, start_at, end_at, venue_id)
  values (
    'TEST_RESERVATION_TRIGGER',
    now() + interval '1 day',
    now() + interval '1 day' + interval '2 hours',
    test_event_id
  )
  returning id into test_event_id;

  -- 一時 member 作成 (auth.users と FK ありのため、実環境では既存 member を使う)
  -- ※本検証は service_role で auth.users の制約を一時的に無視する形になる
  test_member_id := gen_random_uuid();
  insert into public.members (id, email, display_name, birthday)
  values (test_member_id, 'trigger-test@example.com', 'Trigger Test', '1990-01-01');

  -- 予約作成
  insert into public.reservations (event_id, member_id)
  values (test_event_id, test_member_id)
  returning id, cancelled_at into test_reservation_id, before_cancelled_at;

  -- status を cancelled に更新
  update public.reservations set status = 'cancelled' where id = test_reservation_id;
  select cancelled_at into after_cancelled_at
  from public.reservations where id = test_reservation_id;

  if before_cancelled_at is null and after_cancelled_at is not null then
    raise notice '✅ 5.10 PASS: cancelled_at が自動セットされた (% → %)',
      before_cancelled_at, after_cancelled_at;
  else
    raise notice '❌ 5.10 FAIL: cancelled_at = % (期待: NOT NULL)', after_cancelled_at;
  end if;
end;
$$;


-- =============================================================================
-- Test 5.11: reservations — 同一 (event_id, member_id) で重複 INSERT → UNIQUE 違反
-- =============================================================================
-- 上の Test 5.10 で作成した event / member を使って重複 INSERT を試みる
do $$
declare
  test_event_id uuid;
  test_member_id uuid;
begin
  select id into test_event_id from public.events
  where name = 'TEST_RESERVATION_TRIGGER' limit 1;
  select member_id into test_member_id from public.reservations
  where event_id = test_event_id limit 1;

  if test_event_id is null or test_member_id is null then
    raise notice '⚠️  5.11 SKIP: 5.10 の検証データが見つからない';
    return;
  end if;

  begin
    insert into public.reservations (event_id, member_id)
    values (test_event_id, test_member_id);
    raise notice '❌ 5.11 FAIL: 重複 INSERT が成功してしまった';
  exception when unique_violation then
    raise notice '✅ 5.11 PASS: 重複 INSERT が UNIQUE 制約違反で拒否された';
  end;
end;
$$;


-- =============================================================================
-- 全テーブル RLS が有効であることの検証
-- =============================================================================
select
  relname as table_name,
  case when relrowsecurity then '✅ enabled' else '❌ DISABLED' end as rls_status
from pg_class
where relname in ('events', 'members', 'reservations', 'venues', 'identity_documents')
  and relnamespace = 'public'::regnamespace
order by relname;


-- =============================================================================
-- ポリシー数の確認 (期待値)
-- =============================================================================
-- events: 4 (select_public, insert_admin, update_admin, delete_admin)
-- members: 3 (select_self, update_self, delete_admin)
-- reservations: 4 (select_own, insert_self, update_self_cancel, delete_admin)
-- venues: 4 (select_public, insert_admin, update_admin, delete_admin)
-- identity_documents: 4 (select_self, insert_self, update_self, delete_self_or_admin)
-- storage.objects (identity-documents 関連): 4
-- 合計: 23 ポリシー

select
  schemaname,
  tablename,
  count(*) as policy_count
from pg_policies
where (
  schemaname = 'public'
  and tablename in ('events', 'members', 'reservations', 'venues', 'identity_documents')
) or (
  schemaname = 'storage'
  and tablename = 'objects'
)
group by schemaname, tablename
order by schemaname, tablename;


-- =============================================================================
-- ロールバック (本検証スクリプトの副作用を消す)
-- =============================================================================
rollback;
