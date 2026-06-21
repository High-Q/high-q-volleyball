-- =============================================================================
-- reservations: 会員が自分のキャンセル待ち行を DELETE 可能にする (Issue #344)
-- =============================================================================
-- 目的:
--   キャンセル待ちの取り消しを「status='cancelled' への UPDATE」ではなく「行の
--   DELETE」で表現する。キャンセル待ちは確定予約ではなく意思表明であり、撤回後に
--   'cancelled' 行として履歴に残すと、キャンセルした通常予約と区別できず誤解を生む
--   (リロード後は両者とも status='cancelled' で判別不能)。撤回 = 行削除とすることで
--   履歴から消え、再登録時の UNIQUE 衝突 (23505) も発生しなくなる。
--
-- 変更内容:
--   - DELETE ポリシー (reservations_delete_admin) を差し替え、会員が自分の
--     status='waitlist' 行のみ DELETE 可能にする。reserved / attended / no_show /
--     cancelled 行は会員から DELETE 不可 (admin のみ) を維持する。
--
-- 安全性:
--   - 会員が削除できるのは member_id = auth.uid() かつ status = 'waitlist' の行のみ。
--     参加実績 (attended) や確定予約 (reserved) を会員が消すことはできない。
--   - admin は従来どおり全行 DELETE 可。
--
-- 関連:
--   openspec/changes/reservation-waitlist-registration/specs/rls-policies/spec.md
--   openspec/changes/reservation-waitlist-registration/specs/reservation-waitlist-registration/spec.md
-- =============================================================================

drop policy if exists reservations_delete_admin on public.reservations;
create policy reservations_delete_admin
on public.reservations
for delete
to authenticated
using (
  public.is_admin()
  or (
    member_id = auth.uid()
    and status = 'waitlist'
  )
);

-- =============================================================================
-- ROLLBACK: admin のみ DELETE 可の旧ポリシーに戻す
-- =============================================================================
-- drop policy if exists reservations_delete_admin on public.reservations;
-- create policy reservations_delete_admin
-- on public.reservations
-- for delete
-- to authenticated
-- using (public.is_admin());
