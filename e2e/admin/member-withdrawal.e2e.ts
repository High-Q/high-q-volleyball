import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #255 admin 会員強制削除フロー E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/admin-members-list/spec.md
 *   CLAUDE.md「E2E スケーラビリティ運用ルール」(機能あたり 1〜2 件)
 *
 * 認証済 admin の AAL2 セッション再現 + Edge Function 呼び出しは
 * Supabase Guard 環境では模擬できないため、component test
 * (`useMemberWithdrawal.spec.ts`) で詳細網羅し、本 E2E では `/members?detail=`
 * 付きの URL でも auth ガードが機能することのみ統合確認する (削除フローの
 * 入口経路保護)。
 */

test.describe('admin member withdrawal (#255)', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /members?detail=<uuid> にアクセス → /login へリダイレクト', async ({
    page,
  }) => {
    // 削除フローの入口である詳細 sheet 付き URL でも auth ガードが効くこと
    await page.goto('/members?detail=00000000-0000-0000-0000-000000000001')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
