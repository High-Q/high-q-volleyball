-- LP（未認証の来訪者）にイベントの残席表現を出すため、event_availability_view への
-- anon SELECT を許可する。
--
-- 本ビューは集計列 (event_id, capacity, reserved_count) のみを返し、個別予約行・
-- 予約者 ID 等の個人情報を構造的に含まない（SECURITY DEFINER でも漏洩しない）。
-- そのため anon への公開は「個人情報を含まない集計のみ」という不変条件に依存する。
-- 本ビューに個人情報に当たる列を追加してはならない。
-- 参照: openspec/specs/rls-policies/spec.md「event_availability_view の RLS と権限」
--
-- ROLLBACK: revoke select on public.event_availability_view from anon;

grant select on public.event_availability_view to anon;
