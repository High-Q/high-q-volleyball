-- =============================================================================
-- #254 + #255 会員退会フロー (admin 強制削除 / 自己退会の共通基盤)
-- =============================================================================
-- 目的:
--   会員退会時の DB 整合性を確立する。退会後も過去予約は events 側の集計に
--   残すが、個人を特定する情報は一切残さない (匿名化済み)。
--
-- 仕様:
--   openspec/changes/member-withdrawal-flow/specs/data-schema/spec.md
--   openspec/changes/member-withdrawal-flow/specs/rls-policies/spec.md
--   openspec/changes/member-withdrawal-flow/design.md (D1, D2, D3, D5)
--
-- 関連: Issue #254 (会員自己退会) / Issue #255 (admin 強制削除)
--
-- 本マイグレーションで変更する範囲:
--   1. reservations.member_id を NULL 許容 + FK ON DELETE SET NULL に変更 (D1)
--   2. reservations の INSERT WITH CHECK 句に member_id IS NOT NULL を追加
--   3. member_history_view を WHERE member_id IS NOT NULL 込みに置換 (D5)
--   4. event_participants_view を members LEFT JOIN + COALESCE 版に置換 (D5)
--
-- ロールバック手順 (緊急時のみ; FK 動作変更は片方向で運用):
--   ・event_participants_view / member_history_view は drop して旧定義を RUN し直す
--   ・FK 動作 (ON DELETE SET NULL → RESTRICT) と NOT NULL は、すでに NULL 行が
--     存在する場合は復元不可。dev で NULL 行を投入する前なら復元可。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. reservations.member_id を NULL 許容 + FK ON DELETE SET NULL に変更
-- -----------------------------------------------------------------------------
-- 既存: member_id uuid not null references members(id) on delete restrict
-- 新規: member_id uuid     null references members(id) on delete set null
--
-- 設計判断 (design.md D1):
--   退会時に過去の参加履歴を集計上残しつつ、個人特定情報 (display_name 等への
--   JOIN 経路) を遮断するため、ON DELETE SET NULL を採用する。

alter table public.reservations
  alter column member_id drop not null;

alter table public.reservations
  drop constraint if exists reservations_member_id_fkey;

alter table public.reservations
  add constraint reservations_member_id_fkey
  foreign key (member_id) references public.members(id) on delete set null;


-- -----------------------------------------------------------------------------
-- 2. reservations INSERT WITH CHECK 句に member_id IS NOT NULL を追加
-- -----------------------------------------------------------------------------
-- 新規 INSERT で member_id が NULL になる経路は存在 SHALL NOT。NULL になるのは
-- 退会実行に伴う ON DELETE SET NULL の自動更新のみ。

drop policy if exists reservations_insert_self on public.reservations;
create policy reservations_insert_self
on public.reservations
for insert
to authenticated
with check (
  member_id is not null
  and (
    member_id = auth.uid()
    or public.is_admin()
  )
);


-- -----------------------------------------------------------------------------
-- 3. member_history_view 置換: member_id IS NOT NULL フィルタ追加
-- -----------------------------------------------------------------------------
-- 退会済み会員 (member_id IS NULL) の過去予約は admin の /members 詳細 sheet
-- には表示しない (そもそも一覧から消えているため詳細を開けないが、view 側で
-- も明示的に除外して防御層を二重化する)。
--
-- 列順は既存 v1 と完全同一を保つ (create or replace の制約)。

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
where r.status <> 'cancelled'
  and r.member_id is not null;


-- -----------------------------------------------------------------------------
-- 4. event_participants_view 置換: members LEFT JOIN + COALESCE 表示
-- -----------------------------------------------------------------------------
-- 退会済み会員の過去予約も /events/:id の参加者一覧に「退会済み会員」として
-- 表示する。氏名・メール・経験レベルは個人特定情報なので NULL or 匿名ラベル
-- に置換する。
--
-- ⚠️ PostgreSQL の create or replace view 制約により、列順は v1 と同一を保つ。
-- 列の意味のみ拡張 (NULL 許容化 + COALESCE 適用)。
--
-- is_first_time:
--   member_id IS NULL の行は「退会済み会員」のため、初回バッジは出さず常に false。

create or replace view public.event_participants_view
with (security_invoker = true)
as
select
  r.id                                            as reservation_id,
  r.event_id,
  r.member_id,
  coalesce(m.display_name, '退会済み会員')        as display_name,
  m.email,
  m.experience_level,
  r.guest_count,
  r.status,
  r.checked_in_at,
  r.created_at,
  case
    when r.member_id is null then false
    else not exists (
      select 1
      from public.reservations r2
      join public.events e2 on e2.id = r2.event_id
      where r2.member_id = r.member_id
        and r2.status = 'attended'
        and r2.event_id <> r.event_id
        and e2.start_at < e.start_at
    )
  end                                             as is_first_time
from public.reservations r
left join public.members m on m.id = r.member_id
join public.events e on e.id = r.event_id
where r.status in ('reserved', 'attended', 'no_show', 'waitlist');


-- =============================================================================
-- 検証 (適用後に実行することを推奨):
-- =============================================================================
-- 1. FK 動作確認 (dev で実施):
--   ・テスト用 member 作成 → reservation 作成 → member 削除
--   ・期待: reservation 行が残り、member_id が NULL になっている
--
--   begin;
--     insert into public.members (id, email, display_name, birthday)
--       values ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'テスト退会者', '2000-01-01');
--     -- (実際のテストは Edge Function 経由 + auth.users 作成と組み合わせる)
--   rollback;
--
-- 2. View 置換確認:
--   select to_regclass('public.member_history_view');
--   select to_regclass('public.event_participants_view');
--
-- 3. INSERT WITH CHECK 句確認:
--   ・member_id = null で reservations を INSERT → RLS で拒否される (一般会員 / admin 共通)
