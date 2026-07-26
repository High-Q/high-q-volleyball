-- event-availability-secure-rpc
--
-- 目的:
--   Supabase Advisor が public.event_availability_view を SECURITY DEFINER view
--   (Critical) として検知する。この view は「RLS で自分の予約しか見えない
--   reservations を所有者権限で全件集計し、返す列は集計3列のみ (個人情報なし)」
--   という意図的設計で実害は無いが、未解消 Critical の放置はアラート疲れを招く。
--   同一の集計挙動を保ったまま、view を search_path 固定の SECURITY DEFINER
--   関数へ移し、view を DROP して Critical を解消する。
--
-- 仕様:
--   openspec/changes/event-availability-secure-rpc/specs/data-schema/spec.md
--   openspec/changes/event-availability-secure-rpc/specs/rls-policies/spec.md
--   openspec/changes/event-availability-secure-rpc/design.md (D1, D2, D3)
--
-- 変更点:
--   1. public.get_event_availability(p_event_ids uuid[]) を新規追加
--      - SECURITY DEFINER / set search_path = public / stable
--      - 返却: event_id / capacity / reserved_count の集計3列のみ (個人情報なし)
--      - 集計ロジックは旧 event_availability_view と同値
--        reserved_count = SUM(1 + guest_count) FILTER (status IN ('reserved','attended'))
--        cancelled は除外。attended も母集団に含む。予約0件も0行で返す。
--   2. EXECUTE を anon / authenticated に GRANT (LP=anon も残席取得するため)、
--      public からは明示 REVOKE
--   3. public.event_availability_view を DROP
--
-- 関連:
--   ・20260526124434_event_availability_view.sql        (旧 view #277)
--   ・20260623000000_grant_anon_event_availability_view.sql (旧 view の anon grant)
--   ・20260607172803_create_event_participant_nicknames_rpc.sql (definer 関数の先例)
--
-- ROLLBACK:
--   drop function if exists public.get_event_availability(uuid[]);
--   create or replace view public.event_availability_view with (security_invoker = false) as
--     select e.id as event_id, e.capacity,
--       coalesce(sum(1 + r.guest_count) filter (where r.status in ('reserved','attended')), 0)::int as reserved_count
--     from public.events e
--     left join lateral (select sum(1 + r.guest_count) filter (where r.status in ('reserved','attended')) as reserved_count
--       from public.reservations r where r.event_id = e.id) agg on true;
--   revoke all on public.event_availability_view from anon;
--   grant select on public.event_availability_view to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. get_event_availability 関数
-- -----------------------------------------------------------------------------
-- p_event_ids に含まれる events.id ごとに 1 行を返す。呼び出し側は表示対象の
-- event_id 群を渡す (旧 view の .in("event_id", ids) を関数引数へ移した)。
create or replace function public.get_event_availability(p_event_ids uuid[])
returns table (
  event_id       uuid,
  capacity       int,
  reserved_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id::uuid                                         as event_id,
    e.capacity::int                                    as capacity,
    coalesce(
      sum(1 + r.guest_count) filter (where r.status in ('reserved', 'attended')),
      0
    )::int                                             as reserved_count
  from public.events e
  left join public.reservations r on r.event_id = e.id
  where e.id = any(p_event_ids)
  group by e.id, e.capacity;
$$;

comment on function public.get_event_availability(uuid[]) is
  '会員サイト/LP 用の予約埋まり具合集計 (event_id/capacity/reserved_count のみ)。SECURITY DEFINER で reservations を全件集計するが個人情報は返さない。旧 event_availability_view の後継。';

-- -----------------------------------------------------------------------------
-- 2. 権限付与: anon / authenticated にのみ EXECUTE、public からは REVOKE
-- -----------------------------------------------------------------------------
-- LP 来訪者 (anon) も残席を出すため anon にも EXECUTE を許可する。
-- 返却列は集計のみで個人情報を含まないため anon 公開が成立する。
revoke all    on function public.get_event_availability(uuid[]) from public;
grant  execute on function public.get_event_availability(uuid[]) to anon;
grant  execute on function public.get_event_availability(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. 旧 view の DROP (Critical 解消の本体)
-- -----------------------------------------------------------------------------
drop view if exists public.event_availability_view;


-- =============================================================================
-- 検証 (適用後に dev DB で確認):
-- =============================================================================
-- 1. capacity NULL + (本人1+同伴0) を 11 件:
--    select reserved_count from public.get_event_availability(array['<event_id>']::uuid[]);
--    -- 期待: 11 / capacity=NULL
-- 2. cancelled 3件 + reserved 8件:
--    -- 期待: reserved_count=8 (cancelled 除外)
-- 3. attended 4件 + reserved 12件 (guest_count=0):
--    -- 期待: reserved_count=16 (attended も母集団)
-- 4. 予約0件を含む複数 id:
--    select count(*) from public.get_event_availability(array[<10件>]::uuid[]);
--    -- 期待: 10 (予約0件も reserved_count=0 の行で返る)
-- 5. 返却列に個人情報が無い / 実行権限:
--    select has_function_privilege('anon',          'public.get_event_availability(uuid[])', 'EXECUTE'); -- true
--    select has_function_privilege('authenticated', 'public.get_event_availability(uuid[])', 'EXECUTE'); -- true
--    select has_function_privilege('service_role',  'public.get_event_availability(uuid[])', 'EXECUTE'); -- false (server 側は未使用)
