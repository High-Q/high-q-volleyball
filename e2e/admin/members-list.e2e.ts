import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #150 admin members list の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/specs/app-routing/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (§D11 テスト戦略)
 *
 * 既存 admin の E2E と同様、機能あたり 1〜2 件に絞る (CLAUDE.md ルール)。
 * 認証済 admin の AAL2 セッション再現は手間が大きいため、本 E2E では
 * 「auth guard が /members を保護していること」 + 「?detail= 付き URL でも同じ
 * ガードが効くこと」を確認する。一覧 / フィルタ / 検索 / ソート / ページネーション /
 * 詳細 sheet / メモ編集の挙動は vitest component test + composable UT + 手動
 * 確認 (Render Preview) で網羅する。
 */

test.describe('admin members list (#150)', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /members にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/members')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })

  test('未認証で /members?detail=<uuid> にアクセスしても /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/members?detail=00000000-0000-0000-0000-000000000001')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
  })
})
