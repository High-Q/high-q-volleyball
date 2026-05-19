-- #271 admin の /events/:id 予約者一覧に nickname を併記するための view 拡張。
--
-- 仕様: openspec/changes/admin-event-detail-show-nickname/specs/data-schema/spec.md
--      （MODIFIED: event_participants_view ビュー）
--
-- 変更点:
--   ・出力列に m.nickname (text NULL) を追加
--   ・列順は PostgreSQL の `create or replace view` 制約（既存列の順序・名前・型は固定）
--     を満たすため、既存末尾 (`is_first_time` の後) に追加する
--   ・退会済み会員 (member_id IS NULL) の行は LEFT JOIN 由来で m.nickname も NULL になり、
--     仕様「nickname は常に NULL を返す」を自然に満たす（追加 case 分岐不要）
--
-- 関連:
--   ・20260507000000_add_members_nickname.sql (members.nickname 列の導入 #200)
--   ・20260516000000_member_withdrawal_flow.sql (LEFT JOIN + COALESCE 版 v3)
--
-- ロールバック (緊急時のみ):
--   #200 時点の SELECT 列定義に戻す create or replace を打ち直す。
--   詳細は 20260516000000_member_withdrawal_flow.sql のセクション 4 を参照。

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
  end                                             as is_first_time,
  m.nickname                                      as nickname
from public.reservations r
left join public.members m on m.id = r.member_id
join public.events e on e.id = r.event_id
where r.status in ('reserved', 'attended', 'no_show', 'waitlist');


-- -----------------------------------------------------------------------------
-- 権限再付与 (create or replace 後の明示的再設定)
-- -----------------------------------------------------------------------------
-- 同名 view への create or replace は基本的に既存 grant を保持するが、
-- 過去 migration (#87 / #200) でも明示再 GRANT を入れている運用に合わせる。
revoke all on public.event_participants_view from anon;
grant select on public.event_participants_view to authenticated;


-- =============================================================================
-- 検証 (適用後に実行することを推奨):
-- =============================================================================
-- 1. 列追加確認:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'event_participants_view'
--     and column_name = 'nickname';
--   -- 期待: nickname / text / YES
--
-- 2. nickname あり / なしの行が混在する event で SELECT:
--   select reservation_id, display_name, nickname
--   from public.event_participants_view
--   where event_id = '<test-event-id>';
--   -- 期待: nickname 列が member.nickname の値 or NULL を返す
--
-- 3. 退会済み会員行で nickname が NULL:
--   select display_name, nickname
--   from public.event_participants_view
--   where member_id is null
--   limit 5;
--   -- 期待: display_name = '退会済み会員' / nickname = NULL
