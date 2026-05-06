import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #91 reservation profile page の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-profile-page/specs/reservation-profile-page/spec.md
 *   openspec/changes/reservation-profile-page/design.md (Decision 9: E2E スコープの上限遵守)
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 1 件のみ実装する:
 *   - 未認証ユーザーが /profile に直接アクセスすると /login にリダイレクトされ、
 *     ログインフォームが描画される (auth guard の最終段ルート保護を統合確認)
 *
 * 認証済 + 各セクション操作 (経験レベル変更 / アカウント編集 / 履歴キャンセル /
 * ログアウト) の happy path は component test / unit test (51 ファイル / 389 ケース)
 * で完全カバーしているため、E2E では auth ガードとの統合のみを確認する。
 * 詳細バリエーションは component test に押し下げ (CLAUDE.md E2E スケーラビリティ運用ルール)。
 */

test.describe('reservation profile page', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /profile にアクセス → /login にリダイレクト (ガード統合)', async ({
    page,
  }) => {
    await page.goto('/profile')

    // 認証ガードにより /login へ強制遷移 (#91 の最終段ルート保護)
    await expect(page).toHaveURL(/\/login/)

    // /login のメール入力フォームが描画される
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
