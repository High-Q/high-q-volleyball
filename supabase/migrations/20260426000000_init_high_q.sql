-- =============================================================================
-- High Q 初期スキーマ
-- =============================================================================
-- 目的: Phase 1 の管理画面 / 予約サイトの共通バックエンド初期構築
-- 関連: openspec/changes/supabase-initial-schema/
--   - design.md (D1〜D12 設計判断)
--   - specs/data-schema/spec.md (テーブル要件)
--   - specs/rls-policies/spec.md (RLS 要件)
--   - docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md
--
-- 適用方法 (Phase 1 暫定):
--   Supabase Dashboard → SQL Editor に本ファイル全体を貼り付けて RUN
--   (Phase 2 で `supabase db push` の CI 自動化を Issue #80 と連携)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ユーティリティ関数: set_updated_at()
-- -----------------------------------------------------------------------------
-- BEFORE UPDATE トリガーで使用し、updated_at を常に now() に書き換える。
-- アプリ側のセットし忘れを防ぐ (design.md D6)。
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. events テーブル
-- -----------------------------------------------------------------------------
-- 練習会・大会等の開催単位。一般会員は閲覧のみ、管理者のみ書き込み (RLS で制御)。
-- -----------------------------------------------------------------------------

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  description  text,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  location     text,
  capacity     smallint,
  status       text        not null default 'scheduled',
  created_by   uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint events_status_check
    check (status in ('scheduled', 'cancelled', 'closed')),
  constraint events_start_before_end
    check (start_at < end_at),
  constraint events_capacity_positive
    check (capacity is null or capacity > 0)
);

-- インデックス
create index if not exists events_start_at_idx
  on public.events (start_at);

create index if not exists events_status_scheduled_idx
  on public.events (start_at)
  where status = 'scheduled';

-- updated_at トリガー
drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. members テーブル
-- -----------------------------------------------------------------------------
-- auth.users と 1:1 (id 共有)。サインアップ時にトリガーで自動 INSERT。
-- role は 'member' (default) / 'admin' の 2 値 (design.md D4)。
-- -----------------------------------------------------------------------------

create table if not exists public.members (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text        not null unique,
  display_name  text        not null,
  role          text        not null default 'member',
  profile       jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint members_role_check
    check (role in ('member', 'admin'))
);

-- updated_at トリガー
drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

-- auth.users 新規作成時に members へ自動 INSERT するトリガー
create or replace function public.handle_new_auth_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.members (id, email, display_name, role)
  values (
    new.id,
    new.email,
    -- display_name 初期値: メールアドレスの @ 前部分（後でユーザー編集可能）
    coalesce(split_part(new.email, '@', 1), 'user'),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();


-- -----------------------------------------------------------------------------
-- 4. is_admin() ヘルパー関数
-- -----------------------------------------------------------------------------
-- RLS ポリシー内で繰り返し使う管理者判定 (design.md D7)。
-- SECURITY DEFINER で members テーブルを所有者権限で読む。
-- 引数を取らず auth.uid() のみで判定する (SQL injection 経路を作らない)。
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.members
    where id = auth.uid()
      and role = 'admin'
  );
$$;


-- -----------------------------------------------------------------------------
-- 5. reservations テーブル
-- -----------------------------------------------------------------------------
-- 会員 × イベントの参加申込。1 イベント・1 会員に対し 1 行 (UNIQUE)。
-- キャンセル後の再予約は status を更新で表現 (design.md D5)。
-- -----------------------------------------------------------------------------

create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid        not null references public.events(id)  on delete restrict,
  member_id   uuid        not null references public.members(id) on delete restrict,
  status      text        not null default 'reserved',
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint reservations_status_check
    check (status in ('reserved', 'cancelled', 'attended', 'no_show')),
  constraint reservations_event_member_unique
    unique (event_id, member_id)
);

-- インデックス
create index if not exists reservations_event_id_idx
  on public.reservations (event_id);

create index if not exists reservations_member_id_idx
  on public.reservations (member_id);

create index if not exists reservations_member_status_idx
  on public.reservations (member_id, status);

-- updated_at トリガー
drop trigger if exists set_reservations_updated_at on public.reservations;
create trigger set_reservations_updated_at
before update on public.reservations
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 6. RLS 有効化
-- -----------------------------------------------------------------------------
-- 全テーブルで Row Level Security を有効化する (CLAUDE.md Pillar 4)。
-- -----------------------------------------------------------------------------

alter table public.events       enable row level security;
alter table public.members      enable row level security;
alter table public.reservations enable row level security;


-- -----------------------------------------------------------------------------
-- 7. events RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT: 誰でも可 (公開カレンダー)
-- INSERT/UPDATE/DELETE: 管理者のみ可
-- -----------------------------------------------------------------------------

drop policy if exists events_select_public on public.events;
create policy events_select_public
on public.events
for select
to anon, authenticated
using (true);

drop policy if exists events_insert_admin on public.events;
create policy events_insert_admin
on public.events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists events_update_admin on public.events;
create policy events_update_admin
on public.events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists events_delete_admin on public.events;
create policy events_delete_admin
on public.events
for delete
to authenticated
using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 8. members RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT: 自分の行のみ可。管理者は全件可。
-- UPDATE: 自分の行のうち display_name / profile のみ可 (role 自己昇格禁止)。
--         管理者は全件・全列可。
-- INSERT: トリガー (handle_new_auth_user) で SECURITY DEFINER 経由のみ。
--         RLS としては明示ポリシーを置かない (= 既定で拒否) ことで
--         クライアント直接 INSERT を防ぐ。
-- DELETE: 管理者のみ可。
-- -----------------------------------------------------------------------------

drop policy if exists members_select_self on public.members;
create policy members_select_self
on public.members
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists members_update_self on public.members;
create policy members_update_self
on public.members
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  -- 管理者は何でも可
  public.is_admin()
  -- 一般会員は自分の行で、かつ role を変えない場合のみ可
  or (
    id = auth.uid()
    and role = (select role from public.members where id = auth.uid())
  )
);

drop policy if exists members_delete_admin on public.members;
create policy members_delete_admin
on public.members
for delete
to authenticated
using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 9. reservations RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT: 自分の予約のみ可。管理者は全件可。
-- INSERT: 自分の member_id を指定する場合のみ可 (なりすまし防止)。
-- UPDATE: 自分の予約の reserved → cancelled のみ可。管理者は全件・全 status 可。
-- DELETE: 管理者のみ可。
-- -----------------------------------------------------------------------------

drop policy if exists reservations_select_own on public.reservations;
create policy reservations_select_own
on public.reservations
for select
to authenticated
using (member_id = auth.uid() or public.is_admin());

drop policy if exists reservations_insert_self on public.reservations;
create policy reservations_insert_self
on public.reservations
for insert
to authenticated
with check (
  member_id = auth.uid()
  or public.is_admin()
);

drop policy if exists reservations_update_self_cancel on public.reservations;
create policy reservations_update_self_cancel
on public.reservations
for update
to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (
  -- 管理者は何でも可
  public.is_admin()
  -- 一般会員は自分の予約に限定
  or (
    member_id = auth.uid()
    -- かつ、status は reserved or cancelled のみ (attended / no_show は admin only)
    and status in ('reserved', 'cancelled')
  )
);

drop policy if exists reservations_delete_admin on public.reservations;
create policy reservations_delete_admin
on public.reservations
for delete
to authenticated
using (public.is_admin());


-- =============================================================================
-- 検証用クエリ (RUN 後に手動で確認)
-- =============================================================================
-- 全テーブルで RLS が有効か:
--   select relname, relrowsecurity from pg_class
--   where relname in ('events','members','reservations');
--   → すべて t (true) であること
--
-- ポリシー一覧:
--   select schemaname, tablename, policyname, cmd
--   from pg_policies where schemaname = 'public';
--   → events / members / reservations の各ポリシーが見えること
--
-- 管理者の手動セットアップ (Phase 1 暫定):
--   1) 普通にサインアップしてユーザーを作成
--   2) SQL Editor で以下を実行:
--      update public.members set role = 'admin' where email = '<your-email>';
-- =============================================================================
