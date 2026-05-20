-- =============================================================================
-- #281 members 氏名を姓・名 2 列に分離 + display_name はトリガで派生同期
-- =============================================================================
-- 目的:
--   会員登録フォームで姓だけ入力して名を入れ忘れる事故を構造的に防ぐため、
--   members に last_name / first_name を NOT NULL で追加し、片方欠落を DB
--   レベルで拒否する。既存 display_name 参照箇所 (ビュー / admin 検索 ILIKE /
--   ニックネーム fallback) を壊さないため、display_name は通常列のまま残し、
--   BEFORE INSERT/UPDATE トリガで last_name || ' ' || first_name に同期する。
--
-- 仕様:
--   openspec/changes/member-name-split-last-first/specs/data-schema/spec.md
--     (Requirement: members テーブル / signup_pending テーブル / Branded Types)
--   openspec/changes/member-name-split-last-first/design.md (決定 1〜3)
--
-- ロールバック手順 (緊急時):
--   drop trigger if exists sync_members_display_name_trg on public.members;
--   drop function if exists public.sync_members_display_name();
--   alter table public.members alter column last_name drop not null;
--   alter table public.members alter column first_name drop not null;
--   alter table public.members drop constraint if exists members_last_name_length_chk;
--   alter table public.members drop constraint if exists members_first_name_length_chk;
--   -- last_name / first_name 列は残しても害なし。完全削除する場合は drop column。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Step 1. last_name / first_name 列を nullable で追加
-- -----------------------------------------------------------------------------

alter table public.members
  add column if not exists last_name  text null,
  add column if not exists first_name text null;

comment on column public.members.last_name is
  '#281 姓。NOT NULL、1〜32 文字。display_name はトリガで last_name || '' '' || first_name に同期される。';
comment on column public.members.first_name is
  '#281 名。NOT NULL、1〜32 文字。display_name はトリガで同期される。';


-- -----------------------------------------------------------------------------
-- Step 2. 既存行をバックフィル
-- -----------------------------------------------------------------------------
-- 全角スペース / タブ / 連続スペースを単一半角に正規化した上で、最初の
-- 半角スペースで分割する。前後とも 1 文字以上なら成功とみなす。
-- 分割不能な行は last_name = display_name / first_name = '(未設定)' を
-- 一時値として置き、profile.name_split_needed = true を立てる
-- (運営側で SELECT 抽出して補正する)。
-- -----------------------------------------------------------------------------

with normalized as (
  select
    id,
    -- 全角スペース・タブを半角に揃え、連続スペースを単一化、前後 trim
    btrim(regexp_replace(replace(replace(display_name, E'　', ' '), E'\t', ' '), ' +', ' ', 'g')) as norm
  from public.members
)
update public.members m
set
  last_name  = split_part(n.norm, ' ', 1),
  first_name = substr(n.norm, position(' ' in n.norm) + 1)
from normalized n
where m.id = n.id
  and position(' ' in n.norm) > 0
  and length(split_part(n.norm, ' ', 1)) >= 1
  and length(substr(n.norm, position(' ' in n.norm) + 1)) >= 1;

-- 分割不能行: スペース無し / 片側空 / display_name 自体が空に近い
update public.members
set
  last_name  = coalesce(nullif(btrim(display_name), ''), '(未設定)'),
  first_name = '(未設定)',
  profile    = jsonb_set(coalesce(profile, '{}'::jsonb), '{name_split_needed}', 'true'::jsonb, true)
where last_name is null or first_name is null;


-- -----------------------------------------------------------------------------
-- Step 3. NOT NULL + CHECK 制約を付与
-- -----------------------------------------------------------------------------

alter table public.members
  alter column last_name  set not null,
  alter column first_name set not null;

alter table public.members
  add constraint members_last_name_length_chk
    check (char_length(last_name) >= 1 and char_length(last_name) <= 32);

alter table public.members
  add constraint members_first_name_length_chk
    check (char_length(first_name) >= 1 and char_length(first_name) <= 32);


-- -----------------------------------------------------------------------------
-- Step 4. display_name 同期トリガ
-- -----------------------------------------------------------------------------
-- BEFORE INSERT/UPDATE で display_name を last_name || ' ' || first_name に
-- 強制的に書き換える。アプリ側で display_name に値が指定されていても無視する。
-- 既存 display_name 参照 (ビュー / admin 検索 ILIKE / ニックネーム fallback) は
-- 無変更で動き続ける。
-- -----------------------------------------------------------------------------

create or replace function public.sync_members_display_name()
returns trigger
language plpgsql
as $$
begin
  new.display_name := new.last_name || ' ' || new.first_name;
  return new;
end;
$$;

comment on function public.sync_members_display_name() is
  '#281 members.display_name を last_name || '' '' || first_name に同期する BEFORE INSERT/UPDATE トリガ関数。';

drop trigger if exists sync_members_display_name_trg on public.members;
create trigger sync_members_display_name_trg
before insert or update of last_name, first_name, display_name on public.members
for each row
execute function public.sync_members_display_name();


-- -----------------------------------------------------------------------------
-- Step 5. 全行を再同期 (バックフィルで last_name / first_name が入った行の
--         display_name をトリガ経由で最新化)
-- -----------------------------------------------------------------------------

update public.members set last_name = last_name;


-- -----------------------------------------------------------------------------
-- Step 6. handle_new_auth_user() トリガ関数を更新
-- -----------------------------------------------------------------------------
-- 既存定義は (id, email, display_name, role) を INSERT していたが、
-- last_name / first_name が NOT NULL になったため placeholder 値を埋める。
-- 通常フローは verify-signup Edge Function 内で正式値に UPSERT されるため、
-- placeholder 値が観測されることは無い (signup_pending payload からの上書き)。
-- admin が Supabase Dashboard 経由で手動作成した場合のみ placeholder が残る
-- (既存運用と同等。手動で last_name / first_name を補正する)。
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.members (id, email, last_name, first_name, role)
  values (
    new.id,
    new.email,
    -- placeholder: メールアドレスの @ 前部分を仮の姓に充てる。
    -- 通常は verify-signup の UPSERT で即座に正式値に上書きされる。
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'user'),
    '(未設定)',
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- Step 7. members_update_self RLS ポリシー再定義
-- -----------------------------------------------------------------------------
-- 既存 (20260515133901_add_members_admin_note_and_views.sql):
--   ・本人は role / admin_note を変えない場合のみ UPDATE 可
--
-- 本 change での追加:
--   ・display_name は本人 UPDATE で変更できない (トリガ同期される派生属性のため、
--     アプリから直接書き換える経路を塞ぐ)
--   ・姓・名は last_name / first_name 経由で本人 UPDATE 可
-- -----------------------------------------------------------------------------

drop policy if exists members_update_self on public.members;
create policy members_update_self
on public.members
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  -- 管理者は何でも可
  public.is_admin()
  -- 一般会員は自分の行で、かつ role / admin_note / display_name を変えない場合のみ可
  or (
    id = auth.uid()
    and role        is not distinct from (select role        from public.members where id = auth.uid())
    and admin_note  is not distinct from (select admin_note  from public.members where id = auth.uid())
    -- display_name はトリガ同期される派生属性。本人 UPDATE で明示的に書き換えても
    -- トリガで戻されるが、ホワイトリストでも除外しておく (アプリ側が明示指定しない契約を強制)。
    and display_name is not distinct from (select display_name from public.members where id = auth.uid())
  )
);


-- =============================================================================
-- 検証 (適用後に手動実行を推奨):
-- =============================================================================
-- 1. 列とトリガの存在
--   select column_name, is_nullable from information_schema.columns
--     where table_schema = 'public' and table_name = 'members'
--       and column_name in ('last_name', 'first_name');
--   -- 期待: 2 行、is_nullable = 'NO'
--
--   select tgname from pg_trigger
--     where tgrelid = 'public.members'::regclass
--       and tgname = 'sync_members_display_name_trg';
--   -- 期待: 1 行
--
-- 2. 全行で display_name = last_name || ' ' || first_name が成立
--   select count(*) from public.members
--     where display_name <> last_name || ' ' || first_name;
--   -- 期待: 0
--
-- 3. 分離不能行の件数
--   select count(*) from public.members
--     where (profile->>'name_split_needed')::boolean is true;
--   -- 件数を運営に共有して、admin から SQL 直修正 or 補正モーダル別 Issue を判断
--
-- 4. CHECK 制約 (姓欠落 INSERT が拒否される)
--   begin;
--     insert into public.members (id, email, last_name, first_name, birthday)
--     values (gen_random_uuid(), 'test@x.com', '', 'taro', '1990-01-01');
--   rollback;
--   -- 期待: ERROR (members_last_name_length_chk 違反)
-- =============================================================================
