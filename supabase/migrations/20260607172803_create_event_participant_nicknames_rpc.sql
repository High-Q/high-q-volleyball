-- #278 予約済イベントの参加者ニックネーム一覧を表示
--
-- 仕様:
--   openspec/changes/show-event-participant-nicknames/specs/data-schema/spec.md
--   openspec/changes/show-event-participant-nicknames/specs/rls-policies/spec.md
--   openspec/changes/show-event-participant-nicknames/design.md (D1, D2)
--
-- 変更点:
--   1. public.get_event_participant_nicknames(p_event_id uuid) を新規追加
--      - SECURITY DEFINER / set search_path = public で固定
--      - 呼び出し元 (auth.uid()) が p_event_id に有効な reservations
--        (status IN ('reserved','attended')) を 1 件以上持つときのみ非空集合を返す
--      - 戻り値: reservations.status IN ('reserved','attended')
--                AND reservations.member_id IS NOT NULL の行のみ
--                (cancelled / no_show / 退会済み参加者は除外)
--      - 個人特定情報 (email / phone / 本名 / 生年月日 / 経験レベル) は返さない
--   2. EXECUTE 権限を authenticated にのみ GRANT
--      anon / public からは明示 REVOKE
--
-- 関連:
--   ・20260426000000_init_high_q.sql           (reservations / members 初期化)
--   ・20260507000000_add_members_nickname.sql  (members.nickname 列 #200)
--   ・20260516000000_member_withdrawal_flow.sql (member_id ON DELETE SET NULL)
--
-- ROLLBACK: drop function if exists public.get_event_participant_nicknames(uuid);

create or replace function public.get_event_participant_nicknames(p_event_id uuid)
returns table (
  member_id   uuid,
  nickname    text,
  is_self     boolean,
  guest_count smallint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  -- 前提チェック: 呼び出し元がこのイベントに有効な reservations を持っていなければ
  -- 空集合を返す (例外を投げない)。
  if v_caller is null then
    return;
  end if;

  if not exists (
    select 1
    from public.reservations r
    where r.event_id   = p_event_id
      and r.member_id  = v_caller
      and r.status in ('reserved', 'attended')
  ) then
    return;
  end if;

  -- 参加者集合を返却。
  --   ・status IN ('reserved','attended') のみ (cancelled / no_show は除外)
  --   ・member_id IS NOT NULL のみ (退会フロー SET NULL 済み行は除外)
  --   ・並び順は created_at ASC
  --   ・nickname は NULL も含めて返し、UI 側でマスク表記
  return query
    select
      r.member_id,
      m.nickname,
      (r.member_id = v_caller) as is_self,
      r.guest_count
    from public.reservations r
    join public.members m on m.id = r.member_id
    where r.event_id  = p_event_id
      and r.status in ('reserved', 'attended')
      and r.member_id is not null
    order by r.created_at asc;
end;
$$;

-- -----------------------------------------------------------------------------
-- 権限付与: authenticated にのみ EXECUTE を許可、anon / public からは REVOKE
-- -----------------------------------------------------------------------------
revoke execute on function public.get_event_participant_nicknames(uuid) from public;
revoke execute on function public.get_event_participant_nicknames(uuid) from anon;
grant  execute on function public.get_event_participant_nicknames(uuid) to authenticated;


-- =============================================================================
-- 検証 (適用後に dev DB で確認):
-- =============================================================================
-- 1. 自分が予約しているイベントの参加者一覧取得 (正常):
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<会員Aの auth.uid()>"}';
--   select * from public.get_event_participant_nicknames('<会員Aが予約中のevent_id>');
--   -- 期待: 会員A自身を含む N 行、is_self=true が会員Aの行に立つ
--
-- 2. 自分が予約していないイベントへの呼び出し (空集合):
--   set local request.jwt.claims = '{"sub":"<会員Aの auth.uid()>"}';
--   select * from public.get_event_participant_nicknames('<会員Aが予約していないevent_id>');
--   -- 期待: 0 行
--
-- 3. cancelled / no_show は除外:
--   -- 同じイベントに reserved 3件 + cancelled 1件 + no_show 1件を準備
--   select count(*) from public.get_event_participant_nicknames('<event_id>');
--   -- 期待: 3
--
-- 4. 退会済み (member_id IS NULL) の行が除外される:
--   -- reservations に member_id IS NULL の reserved 行を 1 件混ぜる
--   select count(*) from public.get_event_participant_nicknames('<event_id>');
--   -- 期待: NULL 行が除外された件数
--
-- 5. anon / service_role からは EXECUTE 不可:
--   select has_function_privilege('anon',          'public.get_event_participant_nicknames(uuid)', 'EXECUTE');
--   select has_function_privilege('service_role',  'public.get_event_participant_nicknames(uuid)', 'EXECUTE');
--   select has_function_privilege('authenticated', 'public.get_event_participant_nicknames(uuid)', 'EXECUTE');
--   -- 期待: anon=false / service_role=false / authenticated=true
