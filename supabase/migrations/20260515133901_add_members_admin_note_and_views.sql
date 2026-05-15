-- =============================================================================
-- #150 admin メンバー管理画面 (一覧 + フィルタ + 詳細 sheet + 運営メモ編集)
-- =============================================================================
-- 目的:
--   admin が会員を横断的に閲覧・運営メモ編集できる画面 `/members` を支える
--   DB 基盤を整える。具体的には:
--     1. members.admin_note 列を追加 (admin 専用メモ、本人 UPDATE 不可)
--     2. member_list_view を作成 (一覧 + 集計列)
--     3. member_history_view を作成 (詳細 sheet の参加履歴)
--     4. members_update_self ポリシーを再定義 (admin_note を本人 UPDATE 不可に)
--
-- 仕様:
--   openspec/changes/admin-members-list-screen/specs/data-schema/spec.md
--   openspec/changes/admin-members-list-screen/specs/rls-policies/spec.md
--   openspec/changes/admin-members-list-screen/design.md (D1〜D5)
--
-- 関連: Issue #150 / Epic #169
--
-- ロールバック手順 (緊急時):
--   drop view if exists public.member_history_view;
--   drop view if exists public.member_list_view;
--   alter table public.members drop column admin_note;
--   -- members_update_self ポリシーは init_high_q.sql 相当に手動復元
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. members.admin_note 列追加
-- -----------------------------------------------------------------------------
-- 運営メモを保管する admin 専用列。
-- ・NULL 許容 (デフォルト NULL)
-- ・DB レベル CHECK 制約なし (長さ制限 500 文字はアプリ層 admin で担保)
-- ・本人 UPDATE は RLS WITH CHECK で拒否 (後述)
-- ・本人 SELECT は技術的には可能だが、reservation 側コードは明示的列指定 SELECT
--   で除外する運用ルールを採用 (rls-policies capability 参照)

alter table public.members
  add column admin_note text null;

comment on column public.members.admin_note is
  '運営側メモ (admin 専用)。本人からの UPDATE は RLS で拒否。reservation アプリは明示列指定 SELECT で除外する運用。';


-- -----------------------------------------------------------------------------
-- 2. member_list_view
-- -----------------------------------------------------------------------------
-- 目的: admin の `/members` 画面が単一クエリで会員一覧と集計情報を取得する DTO。
--
-- 列:
--   id, display_name, email, experience_level, admin_note, created_at
--   first_attended_at  - 当該 member の最古 attended events.start_at (NULL 可)
--   attended_count     - 当該 member の status='attended' 件数 (member 数ベース)
--   last_attended_at   - 当該 member の最新 attended events.start_at (NULL 可)
--
-- 設計判断 (design.md D1, D2, D3):
--   ・accumulated は attended のみ (reserved/cancelled/no_show/waitlist は除外)
--   ・最初/最終も attended のみベース
--   ・attended ゼロの会員も行は残す (LEFT JOIN)
--   ・同伴 (guest_count) は累計に加算しない (member 単位カウント)
--
-- SECURITY INVOKER:
--   呼び出し元の権限で評価され、members の SELECT RLS が継承される。
--   admin は全件、非 admin は自分の行のみが返る。

create or replace view public.member_list_view
with (security_invoker = true)
as
select
  m.id,
  m.display_name,
  m.email,
  m.experience_level,
  m.admin_note,
  m.created_at,
  agg.first_attended_at,
  coalesce(agg.attended_count, 0)::int as attended_count,
  agg.last_attended_at
from public.members m
left join lateral (
  select
    min(e.start_at) filter (where r.status = 'attended') as first_attended_at,
    max(e.start_at) filter (where r.status = 'attended') as last_attended_at,
    count(*)         filter (where r.status = 'attended') as attended_count
  from public.reservations r
  join public.events e on e.id = r.event_id
  where r.member_id = m.id
) agg on true;

comment on view public.member_list_view is
  '#150 admin /members 画面用 DTO。members + reservations × events 集計 (attended ベース)。';

-- GRANT: authenticated に SELECT 付与 (RLS で members 行レベル制御)
revoke all on public.member_list_view from anon;
grant select on public.member_list_view to authenticated;


-- -----------------------------------------------------------------------------
-- 3. member_history_view
-- -----------------------------------------------------------------------------
-- 目的: admin の `/members` 詳細 sheet が単一クエリで会員の参加履歴を取得する DTO。
--
-- 列:
--   reservation_id, member_id, event_id, event_name, start_at, venue_name,
--   status, guest_count, checked_in_at, is_first_time
--
-- 設計判断 (design.md D8):
--   ・cancelled は除外 (event_participants_view と同じ運用)
--   ・is_first_time は「過去 attended 履歴なし」で判定 (event_participants_view
--     と同一ロジック)
--   ・並びはアプリ層 ORDER BY start_at DESC で指定

create or replace view public.member_history_view
with (security_invoker = true)
as
select
  r.id          as reservation_id,
  r.member_id,
  r.event_id,
  e.name        as event_name,
  e.start_at,
  v.name        as venue_name,
  r.status,
  r.guest_count,
  r.checked_in_at,
  not exists (
    select 1
    from public.reservations r2
    join public.events e2 on e2.id = r2.event_id
    where r2.member_id = r.member_id
      and r2.status = 'attended'
      and r2.event_id <> r.event_id
      and e2.start_at < e.start_at
  ) as is_first_time
from public.reservations r
join public.events e on e.id = r.event_id
left join public.venues v on v.id = e.venue_id
where r.status <> 'cancelled';

comment on view public.member_history_view is
  '#150 admin /members 詳細 sheet 用 DTO。reservations × events × venues、cancelled 除外。';

revoke all on public.member_history_view from anon;
grant select on public.member_history_view to authenticated;


-- -----------------------------------------------------------------------------
-- 4. members_update_self ポリシー再定義 (admin_note を本人 UPDATE 不可に)
-- -----------------------------------------------------------------------------
-- 既存 (init_high_q.sql):
--   ・本人は role を変えない場合のみ UPDATE 可
--
-- 本 change での追加:
--   ・本人は admin_note を変えない場合のみ UPDATE 可
--   ・admin は引き続き全件・全列可
--
-- `IS NOT DISTINCT FROM` は NULL 同士の比較も正しく扱える (NULL = NULL は NULL に
-- なるため通常の `=` だと WITH CHECK 句が偽になり拒否されてしまう)。

drop policy if exists members_update_self on public.members;
create policy members_update_self
on public.members
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  -- 管理者は何でも可
  public.is_admin()
  -- 一般会員は自分の行で、かつ role / admin_note を変えない場合のみ可
  or (
    id = auth.uid()
    and role is not distinct from (select role from public.members where id = auth.uid())
    and admin_note is not distinct from (select admin_note from public.members where id = auth.uid())
  )
);


-- =============================================================================
-- 検証 (適用後に実行することを推奨):
-- =============================================================================
-- 1. 列とビューの存在
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'members' and column_name = 'admin_note';
--   select to_regclass('public.member_list_view');
--   select to_regclass('public.member_history_view');
--
-- 2. 本人 UPDATE 拒否確認 (翔太郎くんでログインした state で実行)
--   update public.members set admin_note = 'test' where id = auth.uid();
--   -- → 0 rows updated (RLS WITH CHECK で拒否)
--
-- 3. admin UPDATE 確認 (admin role のユーザーで実行)
--   update public.members set admin_note = 'test' where id = '<対象 member id>';
--   -- → 1 row updated
