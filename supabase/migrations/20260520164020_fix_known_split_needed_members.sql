-- =============================================================================
-- #281 known data fix: 移行で name_split_needed が立った prd 会員の補正
-- =============================================================================
-- 目的:
--   20260520160254_split_members_name_last_first.sql の backfill で「半角スペース
--   なしで registered された会員」が `last_name = display_name` / `first_name =
--   '(未設定)'` / `profile.name_split_needed = true` 状態になる。
--   prd で既知の対象会員について、運営が確認済の正しい姓・名で上書きする。
--
-- 既知の対象 (運営確認済 2026-05-21):
--   - 「横尾」のみで登録 → 正しくは「横尾 周」
--
-- 安全性:
--   - WHERE 句は `last_name = '横尾' AND first_name = '(未設定)'` の両条件で
--     絞り込むため、正常な「横尾」姓の会員（first_name が別の値）には当たらない
--   - 未知の対象（運営が氏名を把握していない他会員）は引き続き name_split_needed
--     フラグが残り、ship 後に SELECT 抽出 + 個別運用で補正する
--
-- 関連:
--   openspec/changes/member-name-split-last-first/tasks.md (9.1 / 9.2)
--
-- ロールバック:
--   特になし (UPDATE のみ・冪等)
-- =============================================================================

update public.members
set last_name = '横尾',
    first_name = '周',
    profile    = profile - 'name_split_needed'
where last_name = '横尾'
  and first_name = '(未設定)';

-- 検証 (適用後): name_split_needed フラグが残っている件数 + 内訳
-- select email, last_name, first_name, display_name
-- from public.members
-- where (profile->>'name_split_needed')::boolean is true;
