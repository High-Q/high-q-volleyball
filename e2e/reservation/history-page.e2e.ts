import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #211 reservation history page の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-history-page/specs/reservation-history-page/spec.md
 *   openspec/changes/reservation-history-page/design.md (Decision 10: E2E スコープ)
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 1 件のみ実装する:
 *   - 未認証ユーザーが /history に直接アクセスすると /login にリダイレクトされる
 *     (auth guard の最終段ルート保護を統合確認)
 *
 * Stats Strip 集計 / グループ分割 / キャンセル動線 / 状態バッジ / Bottom Tab Bar の
 * active 判定の詳細検証は component test / unit test に押し下げ (CLAUDE.md E2E
 * スケーラビリティ運用ルール)。
 */

test.describe('reservation history page', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /history にアクセス → /login にリダイレクト (ガード統合)', async ({
    page,
  }) => {
    await page.goto('/history')

    // 認証ガードにより /login へ強制遷移 (#211 の最終段ルート保護)
    await expect(page).toHaveURL(/\/login/)

    // /login のメール入力フォームが描画される
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
