import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #85 admin events list の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-events-list-screen/specs/app-routing/spec.md
 *   openspec/changes/admin-events-list-screen/design.md (§6 E2E)
 *
 * E2E は CLAUDE.md ルール「機能あたり 1〜2 件まで、肥大化したら component test
 * に押し下げる」に従って 1 件に絞る。理由:
 *
 *   - 認証済 admin の AAL2 セッション再現は localStorage 仕込み + getSession 透過
 *     復元 + MFA factor mock 等が必要で、認証セットアップだけで E2E が肥大する
 *   - 一覧の表示・フィルタ・ソート・ページネーション・4 状態の出し分けは
 *     既に component test (vitest 48 件) で網羅されている:
 *       - apps/admin/src/widgets/events-list/ui/EventsListWidget.spec.ts (4 状態)
 *       - apps/admin/src/widgets/events-list/ui/EventsTable.spec.ts (8 列・aria-sort)
 *       - apps/admin/src/widgets/events-list/ui/EventsPagination.spec.ts (ページ送り)
 *       - apps/admin/src/widgets/events-list/ui/EventsToolbar.spec.ts (フィルタ操作)
 *       - apps/admin/src/widgets/events-list/composables/useEventsListData.spec.ts (debounce)
 *       - apps/admin/src/features/events-filter/composables/useEventsFilter.spec.ts (URL 同期)
 *
 * 本 E2E では「auth guard が /events を保護していること」のみ E2E で確認する。
 */

test.describe('admin events list', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /events にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
