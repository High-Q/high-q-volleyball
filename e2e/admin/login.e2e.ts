import { expect, test } from '@playwright/test'
import {
  installSupabaseGuard,
  mockSignInWithOtpSuccess,
} from './_helpers/supabaseGuard'

/**
 * #84 admin login の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D10, D10.1)
 *
 * 本ファイルでは 2 件の E2E のみを扱い、詳細バリエーションは component test
 * (apps/admin/src/pages/LoginPage.spec.ts 等) に押し下げている。
 */

test.describe('admin login', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で / にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /マジックリンクを送る/ }),
    ).toBeVisible()
  })

  test('有効メール送信で Success 表示に切り替わる', async ({ page }) => {
    await mockSignInWithOtpSuccess(page)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)

    await page
      .locator('input[type=email]')
      .fill('owner@example.com')
    await page
      .getByRole('button', { name: /マジックリンクを送る/ })
      .click()

    await expect(page.getByText(/メールを送信しました/)).toBeVisible()
    await expect(page.getByText('owner@example.com')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /別のメールアドレス/ }),
    ).toBeVisible()
  })
})
