-- =============================================================================
-- reservations.event_id FK が ON DELETE CASCADE であることを検証 (#253)
-- =============================================================================
-- 目的:
--   20260517215530_change_reservations_event_fk_to_cascade.sql 適用後に
--   Supabase SQL Editor で RUN し、FK 制約が CASCADE に切り替わっていることを
--   情報スキーマ + 実データの両面で確認する。
--
-- 検証範囲:
--   2.1 reservations.event_id FK が ON DELETE CASCADE (information_schema)
--   2.2 reservations.member_id FK が ON DELETE SET NULL のまま (回帰確認)
--   2.3 event + reservations を seed → event DELETE → reservations 0 件
--   2.4 status mix (reserved + cancelled + waitlist) が混在しても全件 CASCADE
--
-- 関連:
--   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/data-schema/spec.md
-- =============================================================================


-- =============================================================================
-- Test 2.1: reservations.event_id FK が ON DELETE CASCADE
-- =============================================================================
select
  case
    when rc.delete_rule = 'CASCADE'
      then '✅ 2.1 PASS: reservations.event_id FK is ON DELETE CASCADE'
    else format('❌ 2.1 FAIL: delete_rule = %s (期待 CASCADE)', rc.delete_rule)
  end as result
from information_schema.referential_constraints rc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = rc.constraint_name
 and kcu.constraint_schema = rc.constraint_schema
where rc.constraint_schema = 'public'
  and kcu.table_name = 'reservations'
  and kcu.column_name = 'event_id';


-- =============================================================================
-- Test 2.2: reservations.member_id FK は ON DELETE SET NULL のまま (回帰確認)
-- =============================================================================
select
  case
    when rc.delete_rule = 'SET NULL'
      then '✅ 2.2 PASS: reservations.member_id FK is ON DELETE SET NULL (unchanged)'
    else format('❌ 2.2 FAIL: delete_rule = %s (期待 SET NULL)', rc.delete_rule)
  end as result
from information_schema.referential_constraints rc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = rc.constraint_name
 and kcu.constraint_schema = rc.constraint_schema
where rc.constraint_schema = 'public'
  and kcu.table_name = 'reservations'
  and kcu.column_name = 'member_id';


-- =============================================================================
-- Test 2.3 / 2.4: 実データでの CASCADE 動作確認
-- =============================================================================
-- ⚠️ 本テストは event / reservations を INSERT / DELETE するため、空の状態で実行するか
--    ロールバック前提の transaction で実行する。
-- =============================================================================

do $$
declare
  v_venue_id       uuid;
  v_member_a_id    uuid;
  v_member_b_id    uuid;
  v_member_c_id    uuid;
  v_event_id       uuid;
  v_count_before   int;
  v_count_after    int;
begin
  -- venues は seed 済 (亀戸スポーツセンター等) を 1 件流用
  select id into v_venue_id
  from public.venues
  order by created_at asc
  limit 1;

  if v_venue_id is null then
    raise notice '⚠️ 2.3 SKIP: venues が seed されていないためテストをスキップ';
    return;
  end if;

  -- 一時的なテストユーザーを 3 件作成 (cascade テスト後にロールバック)
  -- #281: last_name / first_name が NOT NULL。display_name はトリガ同期。
  insert into public.members (id, email, last_name, first_name, birthday, experience_level)
  values
    (gen_random_uuid(), 'cascade_test_a@example.com', 'Cascade', 'TestA', '2000-01-01', 'beginner'),
    (gen_random_uuid(), 'cascade_test_b@example.com', 'Cascade', 'TestB', '2000-01-01', 'beginner'),
    (gen_random_uuid(), 'cascade_test_c@example.com', 'Cascade', 'TestC', '2000-01-01', 'beginner')
  returning id into v_member_a_id;

  select id into v_member_b_id from public.members where email = 'cascade_test_b@example.com';
  select id into v_member_c_id from public.members where email = 'cascade_test_c@example.com';

  -- テスト用 event を INSERT
  insert into public.events (name, start_at, end_at, venue_id, visibility)
  values (
    'CASCADE TEST EVENT (#253)',
    now() + interval '7 days',
    now() + interval '7 days' + interval '2 hours',
    v_venue_id,
    'draft'
  )
  returning id into v_event_id;

  -- 3 件の reservations を異なる status で seed
  insert into public.reservations (event_id, member_id, status) values
    (v_event_id, v_member_a_id, 'reserved'),
    (v_event_id, v_member_b_id, 'cancelled'),
    (v_event_id, v_member_c_id, 'no_show');

  -- 削除前: reservations 3 件
  select count(*) into v_count_before
  from public.reservations
  where event_id = v_event_id;

  if v_count_before <> 3 then
    raise notice '❌ 2.3 SETUP FAIL: 期待 3 件 / 実際 %', v_count_before;
    -- 後片付け
    delete from public.events where id = v_event_id;
    delete from public.members where email like 'cascade_test_%@example.com';
    return;
  end if;

  -- event を削除 → CASCADE で reservations が消えることを期待
  delete from public.events where id = v_event_id;

  select count(*) into v_count_after
  from public.reservations
  where event_id = v_event_id;

  if v_count_after = 0 then
    raise notice '✅ 2.3/2.4 PASS: event 削除で 3 件の reservations (reserved/cancelled/no_show) が CASCADE 削除された';
  else
    raise notice '❌ 2.3/2.4 FAIL: event 削除後も reservations が % 件残存', v_count_after;
  end if;

  -- 後片付け: テストメンバーを削除
  delete from public.members where email like 'cascade_test_%@example.com';
end $$;
