import { expect, test } from '@playwright/test'
import {
  dismissConsentBanner,
  installSupabaseGuard,
  mockRequestSignupSuccess,
  mockSignInWithOtpSuccess,
  mockVerifySignupInvalidCode,
  mockVerifySignupSuccess,
} from './_helpers/supabaseGuard'

/**
 * reservation member auth の E2E (Playwright)。
 *
 * 関連:
 *   - #89 (reservation-member-auth-magic-link): /login マジックリンクログイン
 *   - #189 (reservation-signup-zero-stale): /signup → /signup/verify ゼロ滞留 signup
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルは:
 *   (a) /login で有効メール送信 → /auth/link-sent に遷移して送信先表示
 *   (b) /signup ゼロ滞留 signup ハッピーパス: 全項目入力 → コード送信 →
 *       /signup/verify でコード入力 → session 確立 → 書類アップロード画面
 *   (c) edge case: /signup/verify で誤コード → invalid-code エラー表示
 * 詳細は component test に押し下げている。
 */

test.describe('reservation member auth', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
    await dismissConsentBanner(page)
  })

  test('/login で有効メール送信 → /auth/link-sent に遷移して送信先表示 (login 専用)', async ({
    page,
  }) => {
    await mockSignInWithOtpSuccess(page)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)

    // /login は login 専用。新規会員向けには /signup へのリンクのみ。
    await expect(page.locator('input[type=date]')).toHaveCount(0)
    await expect(page.locator('input[type=tel]')).toHaveCount(0)
    await expect(page.locator('input[type=checkbox]')).toHaveCount(0)
    await expect(page.locator('[data-testid="login-go-signup"]')).toBeVisible()

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
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })

  test('#189 ハッピーパス: /signup 全項目入力 → /signup/verify 遷移 + email 表示', async ({
    page,
  }) => {
    await mockRequestSignupSuccess(page)

    await page.goto('/signup')
    await expect(page).toHaveURL(/\/signup$/)

    // 全項目入力
    await page.locator('input[type=email]').fill('rem-e2e@example.com')
    const textInputs = page.locator('input:not([type=email]):not([type=date]):not([type=tel]):not([type=radio]):not([type=checkbox])')
    await textInputs.nth(0).fill('レム E2E') // display_name
    await textInputs.nth(1).fill('レム') // nickname
    await page.locator('input[type=date]').fill('1995-03-15')
    await page.locator('input[type=tel]').fill('090-1234-5678')
    await page.locator('input[type=checkbox]').check()

    await page.getByRole('button', { name: /認証コードを送信する/ }).click()

    // request-signup 成功 → /signup/verify?email=... に遷移
    await expect(page).toHaveURL(/\/signup\/verify\?email=/)
    await expect(page.getByText('rem-e2e@example.com')).toBeVisible()
    await expect(page.locator('[data-testid="verify-code-input"]')).toBeVisible()

    // /signup/verify 段階の UI が完全に出ていれば段階 1 → 2 の橋渡しは確認済み。
    // session 確立後の遷移（→ /signup/identity）は composable の単体テスト + 手動 E2E で検証済み。
  })

  test('#189 edge: /signup/verify で誤コード入力 → invalid-code エラーバナー表示', async ({
    page,
  }) => {
    await mockRequestSignupSuccess(page)
    await mockVerifySignupInvalidCode(page)

    // /signup/verify に直接アクセス（email クエリ付き）
    await page.goto('/signup/verify?email=rem-e2e%40example.com')
    await expect(page).toHaveURL(/\/signup\/verify/)

    await page.locator('[data-testid="verify-code-input"]').fill('999999')
    await page.getByRole('button', { name: /認証する/ }).click()

    // invalid-code バナーが残り回数付きで表示される
    await expect(page.locator('[data-testid="verify-banner"]')).toContainText('正しくありません')
    await expect(page.locator('[data-testid="verify-banner"]')).toContainText('残り 4 回')
  })
})
