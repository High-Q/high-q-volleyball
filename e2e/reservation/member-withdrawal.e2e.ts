import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #254 会員自己退会フロー E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/reservation-profile-page/spec.md
 *   openspec/changes/member-withdrawal-flow/specs/reservation-member-auth/spec.md
 *   CLAUDE.md「E2E スケーラビリティ運用ルール」(機能あたり 1〜2 件)
 *
 * 認証済みフロー (実 Edge Function 呼び出し + signOut + LP リダイレクト) は
 * Supabase Guard 環境では模擬できないため、component test
 * (`useAccountDeletion.spec.ts`) で詳細網羅し、本 E2E では退会後の自動 signOut
 * 経路の最終段 (=`/login?error=member_not_found`) で会員に提示されるエラー
 * メッセージが正しく表示されることのみを確認する。
 */

test.describe('reservation member withdrawal (#254)', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('/login?error=member_not_found 直接アクセスで退会済み案内が表示される', async ({
    page,
  }) => {
    await page.goto('/login?error=member_not_found')

    // 退会済み (members 行不在) を示すエラーメッセージが表示される
    await expect(
      page.getByText('アカウントが見つかりません。退会済みの可能性があります。'),
    ).toBeVisible()

    // メールフォームは引き続き利用可能 (再ログイン経路が残る)
    await expect(page.locator('input[type=email]')).toBeVisible()

    // URL からは error クエリが除去される (再表示防止)
    await expect(page).toHaveURL(/\/login(\?(?!.*error).*)?$/)
  })
})
