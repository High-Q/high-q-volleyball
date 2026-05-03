import { expect, test } from '@playwright/test'
import {
  installSupabaseGuard,
  mockSignInWithOtpSuccess,
} from './_helpers/supabaseGuard'

/**
 * #89 reservation member auth の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-member-auth-magic-link/specs/reservation-member-auth/spec.md
 *   openspec/changes/reservation-member-auth-magic-link/design.md (D9, D11)
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 2 件:
 *   (a) /login で有効メール送信 → /auth/link-sent に遷移して送信先表示
 *   (b) /signup で全項目入力 + 利用規約同意 → 送信成功で /auth/link-sent に遷移
 * 詳細は component test に押し下げている。
 */

test.describe('reservation member auth', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('/login で有効メール送信 → /auth/link-sent に遷移して送信先表示 (login = signup 兼用)', async ({
    page,
  }) => {
    await mockSignInWithOtpSuccess(page)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)

    // /login は段階 1 兼用。メール 1 項目のみで他フィールドは無い
    await expect(page.locator('input[type=date]')).toHaveCount(0)
    await expect(page.locator('input[type=tel]')).toHaveCount(0)
    await expect(page.locator('input[type=checkbox]')).toHaveCount(0)

    await page.locator('input[type=email]').fill('member@example.com')
    await page.getByRole('button', { name: /メールでリンクを受け取る/ }).click()

    await expect(page).toHaveURL(/\/auth\/link-sent/)
    await expect(page.getByText('member@example.com')).toBeVisible()
    await expect(page.getByText(/メールを送信しました/)).toBeVisible()
  })

  test('未認証で / にアクセスすると /login にリダイレクトされる (ランディング廃止)', async ({
    page,
  }) => {
    await page.goto('/')
    // / は認証必須なので /login に飛ぶ
    await expect(page).toHaveURL(/\/login/)
    // /login にメール入力フォームが描画される
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
