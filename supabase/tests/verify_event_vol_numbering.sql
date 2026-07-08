-- =============================================================================
-- events.vol 自動採番の検証 (event-vol-numbering / #158)
-- =============================================================================
-- 実行:
--   supabase db query --linked --file supabase/tests/verify_event_vol_numbering.sql
--
-- シナリオ 1-4 はトランザクション内の DO ブロックで実施し、不一致は RAISE EXCEPTION で
-- 落とす (= コマンドがエラー終了したら FAIL)。最後に ROLLBACK し dev データを汚さない。
-- 既存データの絶対 vol に依存しないよう遠未来 (now + 500〜1001 日) に隔離し相対差で検証。
-- シナリオ 5 (backfill 結果) は適用済み実データに対する最終 SELECT で行を返す (全 PASS 期待)。
-- =============================================================================

begin;

do $$
declare
  v_venue uuid := (select id from public.venues limit 1);
  v_a int; v_b int; v_c int; v_d int;
  v_past_id uuid; v_past_vol int; v_past_vol_after int;
begin
  -- 直近 past イベントの vol を控える (凍結検証用)
  select id, vol into v_past_id, v_past_vol
    from public.events
   where start_at <= now() and vol is not null
   order by start_at desc limit 1;

  -- 遠未来 A (基準) / B (翌日)
  insert into public.events (name, start_at, end_at, venue_id, status) values
    ('VOLTEST-A', now() + interval '1000 days', now() + interval '1000 days 2 hours', v_venue, 'scheduled'),
    ('VOLTEST-B', now() + interval '1001 days', now() + interval '1001 days 2 hours', v_venue, 'scheduled');

  select vol into v_a from public.events where name = 'VOLTEST-A';
  select vol into v_b from public.events where name = 'VOLTEST-B';
  if v_b - v_a <> 1 then
    raise exception '[1] consecutive failed: B-A = % (expected 1)', v_b - v_a;
  end if;

  -- 割り込み C (A と B の間)
  insert into public.events (name, start_at, end_at, venue_id, status) values
    ('VOLTEST-C', now() + interval '1000 days 12 hours', now() + interval '1000 days 14 hours', v_venue, 'scheduled');
  select vol into v_a from public.events where name = 'VOLTEST-A';
  select vol into v_b from public.events where name = 'VOLTEST-B';
  select vol into v_c from public.events where name = 'VOLTEST-C';
  if v_c - v_a <> 1 then
    raise exception '[2] inserted C failed: C-A = % (expected 1)', v_c - v_a;
  end if;
  if v_b - v_a <> 2 then
    raise exception '[2] shifted B failed: B-A = % (expected 2)', v_b - v_a;
  end if;

  -- 中止: C を cancelled
  update public.events set status = 'cancelled' where name = 'VOLTEST-C';
  select vol into v_c from public.events where name = 'VOLTEST-C';
  select vol into v_a from public.events where name = 'VOLTEST-A';
  select vol into v_b from public.events where name = 'VOLTEST-B';
  if v_c is not null then
    raise exception '[3] cancelled C vol should be null, got %', v_c;
  end if;
  if v_b - v_a <> 1 then
    raise exception '[3] B should reclaim A+1 after cancel, got B-A = %', v_b - v_a;
  end if;

  -- 過去凍結: 未開催 D 追加後も直近 past の vol が不変
  insert into public.events (name, start_at, end_at, venue_id, status) values
    ('VOLTEST-D', now() + interval '500 days', now() + interval '500 days 2 hours', v_venue, 'scheduled');
  if v_past_id is not null then
    select vol into v_past_vol_after from public.events where id = v_past_id;
    if v_past_vol_after is distinct from v_past_vol then
      raise exception '[4] past vol changed from % to % (should be frozen)', v_past_vol, v_past_vol_after;
    end if;
  end if;

  raise notice 'ALL SCENARIO 1-4 PASSED';
end;
$$;

rollback;

-- =============================================================================
-- シナリオ 5: backfill 結果 (適用済み実データ。全行 actual = expected なら PASS)
-- =============================================================================
select '5a. no 第N回 left in name' as check_name,
       count(*) filter (where name ~ '第\s*\d+\s*回') as actual, 0 as expected
  from public.events
union all
select '5b. no trailing vol.NN in name' as check_name,
       count(*) filter (where name ~* 'vol\.?\s*\d+\s*$') as actual, 0 as expected
  from public.events
union all
select '5c. active vol unique (dup count)' as check_name,
       coalesce((select sum(c - 1) from (
         select vol, count(*) c from public.events
          where vol is not null and status <> 'cancelled' group by vol
       ) g), 0) as actual, 0 as expected;
