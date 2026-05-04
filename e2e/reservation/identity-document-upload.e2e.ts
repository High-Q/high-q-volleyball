import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #92 reservation 本人確認書類アップロード の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 *   openspec/changes/reservation-identity-document-upload/design.md (D15 テスト戦略)
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 1 件のみ実装する:
 *   - 未認証ユーザーが /signup/identity に直接アクセスすると /login にリダイレクトされ、
 *     ログインフォームが描画される (auth guard の Step 3 ルート保護を統合確認)
 *
 * 認証済 + 書類アップロード成功フローの happy path は component test (18 spec) で
 * 完全カバーしているため、E2E では auth ガードとの統合のみを確認する。
 * 詳細バリエーションは component test に押し下げ (CLAUDE.md E2E スケーラビリティ運用ルール)。
 */

test.describe('reservation identity document upload', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /signup/identity にアクセス → /login にリダイレクト (ガード統合)', async ({
    page,
  }) => {
    await page.goto('/signup/identity')

    // 認証ガードにより /login へ強制遷移
    await expect(page).toHaveURL(/\/login/)

    // /login のメール入力フォームが描画される
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
