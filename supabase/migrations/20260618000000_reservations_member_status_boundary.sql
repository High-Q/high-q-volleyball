-- =============================================================================
-- reservations: 会員が設定可能なステータス境界の明文化 (Issue #344)
-- =============================================================================
-- 目的:
--   キャンセル待ち登録 (reservation-waitlist-registration capability) を会員権限
--   の範囲で成立させつつ、会員による管理者専用ステータス ('attended' / 'no_show')
--   の自己設定を構造的に遮断する。
--
-- 背景 (現行ポリシーの問題):
--   - INSERT (reservations_insert_self) は WITH CHECK で member_id の本人一致のみを
--     検証し status を制限していなかった。このため会員が自分の行に 'attended' 等を
--     直接 INSERT して参加実績を偽装し得る潜在ホールがあった。
--   - UPDATE (reservations_update_self_cancel) は会員を status ∈ {reserved, cancelled}
--     に限定していたため、キャンセル済み行を 'waitlist' へ再活性化する UPDATE が会員
--     権限で通らなかった。
--
-- 変更内容:
--   - INSERT: 会員は member_id 本人一致 + status ∈ {'reserved', 'waitlist'} のみ可。
--     退会経路保護のための member_id IS NOT NULL は維持。admin は全 status 可。
--   - UPDATE: 会員設定可能ステータスを {'reserved', 'cancelled', 'waitlist'} に拡張。
--     'cancelled' → 'waitlist' のキャンセル待ち再活性化、'waitlist' → 'cancelled' の
--     辞退、既存の 'reserved' ↔ 'cancelled' を会員権限で許可。'attended' / 'no_show'
--     への遷移は引き続き不可。admin は全件・全 status 可。
--
-- 影響:
--   - 既存行の読み取り (USING) / admin 操作には影響しない。新規書き込みの WITH CHECK
--     のみを強化・拡張する。テーブル列・スキーマ変更は無し。
--
-- 関連:
--   openspec/changes/reservation-waitlist-registration/specs/rls-policies/spec.md
--   openspec/changes/reservation-waitlist-registration/design.md (D1)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- INSERT: 会員は status ∈ {'reserved', 'waitlist'} のみ自己 INSERT 可
-- -----------------------------------------------------------------------------
drop policy if exists reservations_insert_self on public.reservations;
create policy reservations_insert_self
on public.reservations
for insert
to authenticated
with check (
  member_id is not null
  and (
    public.is_admin()
    or (
      member_id = auth.uid()
      and status in ('reserved', 'waitlist')
    )
  )
);

-- -----------------------------------------------------------------------------
-- UPDATE: 会員設定可能ステータスを {'reserved', 'cancelled', 'waitlist'} に拡張
-- -----------------------------------------------------------------------------
drop policy if exists reservations_update_self_cancel on public.reservations;
create policy reservations_update_self_cancel
on public.reservations
for update
to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (
  -- 管理者は何でも可
  public.is_admin()
  -- 一般会員は自分の予約に限定。設定可能ステータスは reserved / cancelled / waitlist
  or (
    member_id = auth.uid()
    and status in ('reserved', 'cancelled', 'waitlist')
  )
);

-- =============================================================================
-- ROLLBACK: 旧ポリシー (INSERT は status 無制限・UPDATE は reserved/cancelled) を再作成
-- =============================================================================
-- drop policy if exists reservations_insert_self on public.reservations;
-- create policy reservations_insert_self
-- on public.reservations
-- for insert
-- to authenticated
-- with check (
--   member_id is not null
--   and (
--     member_id = auth.uid()
--     or public.is_admin()
--   )
-- );
--
-- drop policy if exists reservations_update_self_cancel on public.reservations;
-- create policy reservations_update_self_cancel
-- on public.reservations
-- for update
-- to authenticated
-- using (member_id = auth.uid() or public.is_admin())
-- with check (
--   public.is_admin()
--   or (
--     member_id = auth.uid()
--     and status in ('reserved', 'cancelled')
--   )
-- );
