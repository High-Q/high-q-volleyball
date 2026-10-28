-- =============================================================================
-- announcement_templates の RLS / GRANT / CHECK 制約を検証する（Issue #386）
-- =============================================================================
-- 使い方: supabase db query --linked --file supabase/tests/verify_announcement_templates_rls.sql
--
-- 各検証はサブトランザクション内で実行し、成功ケースも例外で巻き戻すため
-- データは変更しない。結果は expected / actual の一覧で返す（全行で一致すれば OK）。
-- 前提: members に admin 1 名以上・非 admin 1 名以上が存在すること。
-- =============================================================================

create temp table if not exists _atr (check_name text, expected text, actual text);
truncate _atr;
grant all on _atr to anon, authenticated;

do $$
declare
  v_admin  uuid;
  v_member uuid;
  v_cnt    int;
begin
  select id into v_admin  from public.members where role = 'admin'  limit 1;
  select id into v_member from public.members where role <> 'admin' limit 1;

  -- 1. 初期テンプレート
  select count(*) into v_cnt from public.announcement_templates where channel = 'line';
  insert into _atr values ('初期テンプレート (line) が 1 行', '1', v_cnt::text);

  -- 2. anon SELECT は権限なし
  begin
    execute 'set local role anon';
    perform 1 from public.announcement_templates;
    execute 'reset role';
    insert into _atr values ('anon SELECT', 'denied', 'allowed');
  exception when insufficient_privilege then
    insert into _atr values ('anon SELECT', 'denied', 'denied');
  end;

  -- 3. 非 admin 会員 SELECT は 0 行
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.announcement_templates;
    execute 'reset role';
    insert into _atr values ('会員 SELECT 行数', '0', v_cnt::text);
  end;

  -- 4. 非 admin 会員 UPDATE は 0 行（RLS で不可視）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.announcement_templates set body = 'x' where channel = 'line';
    get diagnostics v_cnt = row_count;
    execute 'reset role';
    insert into _atr values ('会員 UPDATE 行数', '0', v_cnt::text);
  end;

  -- 5. 非 admin 会員 INSERT は RLS 違反
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    -- 許可値は line のみで既存行があるため、RLS 判定に先に当たるかを確認する
    insert into public.announcement_templates (channel, body) values ('line', 'x');
    execute 'reset role';
    insert into _atr values ('会員 INSERT', 'denied', 'allowed');
  exception when insufficient_privilege then
    insert into _atr values ('会員 INSERT', 'denied', 'denied');
  end;

  -- 6. admin SELECT は 1 行
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.announcement_templates;
    execute 'reset role';
    insert into _atr values ('admin SELECT 行数', '1', v_cnt::text);
  end;

  -- 7. admin UPDATE は 1 行（例外で巻き戻す）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.announcement_templates set body = body || ' ' where channel = 'line';
    get diagnostics v_cnt = row_count;
    raise exception using errcode = 'P0001', message = v_cnt::text;
  exception when sqlstate 'P0001' then
    insert into _atr values ('admin UPDATE 行数', '1', sqlerrm);
  end;

  -- 8. admin DELETE は権限なし
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    delete from public.announcement_templates where channel = 'line';
    raise exception using errcode = 'P0001', message = 'deleted';
  exception
    when insufficient_privilege then
      insert into _atr values ('admin DELETE', 'denied', 'denied');
    when sqlstate 'P0001' then
      insert into _atr values ('admin DELETE', 'denied', 'allowed');
  end;

  -- 9. 許可外チャネルは CHECK 違反
  begin
    insert into public.announcement_templates (channel, body) values ('jimoty', 'x');
    raise exception using errcode = 'P0001', message = 'inserted';
  exception
    when check_violation then
      insert into _atr values ('channel=jimoty', 'check_violation', 'check_violation');
    when sqlstate 'P0001' then
      insert into _atr values ('channel=jimoty', 'check_violation', 'inserted');
  end;

  -- 10. 空本文は CHECK 違反
  begin
    update public.announcement_templates set body = '' where channel = 'line';
    raise exception using errcode = 'P0001', message = 'updated';
  exception
    when check_violation then
      insert into _atr values ('body 空文字', 'check_violation', 'check_violation');
    when sqlstate 'P0001' then
      insert into _atr values ('body 空文字', 'check_violation', 'updated');
  end;

  -- 11. 5,001 文字は CHECK 違反
  begin
    update public.announcement_templates set body = repeat('あ', 5001) where channel = 'line';
    raise exception using errcode = 'P0001', message = 'updated';
  exception
    when check_violation then
      insert into _atr values ('body 5001 文字', 'check_violation', 'check_violation');
    when sqlstate 'P0001' then
      insert into _atr values ('body 5001 文字', 'check_violation', 'updated');
  end;
end
$$;

select check_name, expected, actual, (expected = actual) as ok from _atr;
