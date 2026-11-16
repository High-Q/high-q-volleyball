-- =============================================================================
-- operational_settings の RLS / GRANT / 公開関数を検証する（member-registration-toggle）
-- =============================================================================
-- 使い方: supabase db query --linked --file supabase/tests/verify_operational_settings_rls.sql
--
-- 各検証はサブトランザクション内で実行し、成功ケースも例外で巻き戻すため
-- データは変更しない。結果は expected / actual の一覧で返す（全行で一致すれば OK）。
-- 前提: members に admin 1 名以上・非 admin 1 名以上が存在すること。
-- =============================================================================

create temp table if not exists _osr (check_name text, expected text, actual text);
truncate _osr;
grant all on _osr to anon, authenticated;

do $$
declare
  v_admin  uuid;
  v_member uuid;
  v_cnt    int;
  v_bool   boolean;
begin
  select id into v_admin  from public.members where role = 'admin'  limit 1;
  select id into v_member from public.members where role <> 'admin' limit 1;

  -- 1. singleton 行がちょうど 1 行
  select count(*) into v_cnt from public.operational_settings;
  insert into _osr values ('singleton が 1 行', '1', v_cnt::text);

  -- 2. 初期値は受付中（true）
  select member_registration_enabled into v_bool from public.operational_settings limit 1;
  insert into _osr values ('初期 受付可否', 'true', coalesce(v_bool::text, 'null'));

  -- 3. anon の直接 SELECT は権限なし
  begin
    execute 'set local role anon';
    perform 1 from public.operational_settings;
    execute 'reset role';
    insert into _osr values ('anon SELECT', 'denied', 'allowed');
  exception when insufficient_privilege then
    insert into _osr values ('anon SELECT', 'denied', 'denied');
  end;

  -- 4. anon は registration_open() を実行でき true が返る
  begin
    execute 'set local role anon';
    select public.registration_open() into v_bool;
    execute 'reset role';
    insert into _osr values ('anon registration_open()', 'true', coalesce(v_bool::text, 'null'));
  end;

  -- 5. 非 admin 会員 SELECT は 0 行（RLS で不可視）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.operational_settings;
    execute 'reset role';
    insert into _osr values ('会員 SELECT 行数', '0', v_cnt::text);
  end;

  -- 6. 非 admin 会員 UPDATE は 0 行（RLS で不可視）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.operational_settings set member_registration_enabled = false;
    get diagnostics v_cnt = row_count;
    execute 'reset role';
    insert into _osr values ('会員 UPDATE 行数', '0', v_cnt::text);
  end;

  -- 7. admin SELECT は 1 行
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_cnt from public.operational_settings;
    execute 'reset role';
    insert into _osr values ('admin SELECT 行数', '1', v_cnt::text);
  end;

  -- 8. admin UPDATE は 1 行（例外で巻き戻す）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.operational_settings set member_registration_enabled = false;
    get diagnostics v_cnt = row_count;
    raise exception using errcode = 'P0001', message = v_cnt::text;
  exception when sqlstate 'P0001' then
    insert into _osr values ('admin UPDATE 行数', '1', sqlerrm);
  end;

  -- 9. admin の 2 行目 INSERT は不可（INSERT ポリシー無し＝RLS 違反）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.operational_settings (id, member_registration_enabled) values (false, false);
    execute 'reset role';
    insert into _osr values ('admin INSERT (2行目)', 'denied', 'allowed');
  exception
    when insufficient_privilege then
      insert into _osr values ('admin INSERT (2行目)', 'denied', 'denied');
    when others then
      insert into _osr values ('admin INSERT (2行目)', 'denied', 'denied');
  end;

  -- 10. admin DELETE は不可（authenticated に DELETE GRANT 無し＝権限拒否）
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    delete from public.operational_settings;
    get diagnostics v_cnt = row_count;
    execute 'reset role';
    insert into _osr values ('admin DELETE', 'denied', 'allowed(' || v_cnt::text || '行)');
  exception when insufficient_privilege then
    insert into _osr values ('admin DELETE', 'denied', 'denied');
  end;
end
$$;

select check_name, expected, actual, (expected = actual) as ok from _osr;
