-- =============================================================================
-- announcements の RLS / GRANT を検証する（general-announcements / #395）
-- =============================================================================
-- 使い方: supabase db query --linked --file supabase/tests/verify_announcements_rls.sql
--
-- 掲載前/掲載中/掲載終了 × 出す相手(public/members/all) × ロール(anon/一般会員/admin)
-- の可視行と、admin 以外の書込拒否を検証する。検証用の行はマーカー付きで投入し、
-- 最後に必ず削除する（既存の実データには触れない）。結果は expected/actual の一覧。
-- 前提: members に admin 1 名以上・非 admin 1 名以上が存在すること。
-- =============================================================================

create temp table if not exists _ar (check_name text, expected text, actual text);
truncate _ar;
grant all on _ar to anon, authenticated;

-- 念のため前回の残骸を掃除
delete from public.announcements where title like '\_\_ann\_rls\_\_%';

do $$
declare
  v_admin  uuid;
  v_member uuid;
  v_cnt    int;
begin
  select id into v_admin  from public.members where role = 'admin'  limit 1;
  select id into v_member from public.members where role <> 'admin' limit 1;

  -- 検証用フィクスチャ投入（DO ブロックは特権ロールで走るため RLS を跨いで投入可）
  insert into public.announcements (title, body, audience, publish_start, publish_end) values
    ('__ann_rls__ public active',  'x', 'public',  now() - interval '1 day', null),
    ('__ann_rls__ members active', 'x', 'members', now() - interval '1 day', null),
    ('__ann_rls__ all active',     'x', 'all',     now() - interval '1 day', null),
    ('__ann_rls__ public future',  'x', 'public',  now() + interval '1 day', null),
    ('__ann_rls__ public expired', 'x', 'public',  now() - interval '2 day', now() - interval '1 day');

  -- 1. anon は public/all かつ掲載中のみ（public active + all active = 2）
  begin
    execute 'set local role anon';
    select count(*) into v_cnt from public.announcements where title like '\_\_ann\_rls\_\_%';
    execute 'reset role';
    insert into _ar values ('anon 可視件数(public/all・掲載中)', '2', v_cnt::text);
  end;

  -- 2. anon に members 専用は見えない
  begin
    execute 'set local role anon';
    select count(*) into v_cnt from public.announcements
      where title = '__ann_rls__ members active';
    execute 'reset role';
    insert into _ar values ('anon に members 専用', '0', v_cnt::text);
  end;

  -- 3. anon に掲載前・掲載終了後は見えない（future + expired = 0）
  begin
    execute 'set local role anon';
    select count(*) into v_cnt from public.announcements
      where title in ('__ann_rls__ public future', '__ann_rls__ public expired');
    execute 'reset role';
    insert into _ar values ('anon に掲載前/終了後', '0', v_cnt::text);
  end;

  -- 4. 一般会員は members/all かつ掲載中のみ（members active + all active = 2）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.announcements where title like '\_\_ann\_rls\_\_%';
    execute 'reset role';
    insert into _ar values ('会員 可視件数(members/all・掲載中)', '2', v_cnt::text);
  end;

  -- 5. 一般会員に public 専用は見えない
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.announcements
      where title = '__ann_rls__ public active';
    execute 'reset role';
    insert into _ar values ('会員に public 専用', '0', v_cnt::text);
  end;

  -- 6. admin は掲載前/終了後も含めて全フィクスチャが見える（5 件）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.announcements where title like '\_\_ann\_rls\_\_%';
    execute 'reset role';
    insert into _ar values ('admin 可視件数(全件)', '5', v_cnt::text);
  end;

  -- 7. 一般会員の INSERT は拒否（WITH CHECK is_admin() 違反）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.announcements (title, body, audience)
      values ('__ann_rls__ member insert', 'x', 'all');
    execute 'reset role';
    insert into _ar values ('会員 INSERT', 'denied', 'allowed');
  exception when others then
    execute 'reset role';
    insert into _ar values ('会員 INSERT', 'denied', 'denied');
  end;

  -- 8. admin の INSERT は許可（投入後に削除して戻す）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.announcements (title, body, audience)
      values ('__ann_rls__ admin insert', 'x', 'all');
    get diagnostics v_cnt = row_count;
    execute 'reset role';
    insert into _ar values ('admin INSERT', '1', v_cnt::text);
  exception when others then
    execute 'reset role';
    insert into _ar values ('admin INSERT', '1', 'denied');
  end;

  -- 9. admin の DELETE は許可（フィクスチャ全消去を兼ねる）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    delete from public.announcements where title like '\_\_ann\_rls\_\_%';
    get diagnostics v_cnt = row_count;
    execute 'reset role';
    insert into _ar values ('admin DELETE(>=1)', 'true', (v_cnt >= 1)::text);
  exception when others then
    execute 'reset role';
    insert into _ar values ('admin DELETE(>=1)', 'true', 'denied');
  end;
end
$$;

-- 取りこぼし掃除（検証行を残さない）
delete from public.announcements where title like '\_\_ann\_rls\_\_%';

select check_name, expected, actual, (expected = actual) as ok from _ar;
