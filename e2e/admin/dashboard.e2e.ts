import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #149 admin dashboard (`/`) の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-dashboard-screen/specs/app-routing/spec.md
 *   openspec/changes/admin-dashboard-screen/design.md (D9 テスト戦略)
 *
 * E2E は CLAUDE.md ルール「機能あたり 1〜2 件まで、肥大化したら component test
 * に押し下げる」に従い、auth guard が `/` (dashboard) を保護していることのみを
 * E2E で確認する。理由は events-list.e2e.ts と同じ:
 *
 *   - 認証済 admin の AAL2 セッション再現は localStorage 仕込み + getSession 透過
 *     復元 + MFA factor mock 等が必要で、認証セットアップだけで E2E が肥大する
 *   - 4 ブロック (StatCard 4 / 直近イベント / 通知 / 最近の予約) の描画と 4 状態の
 *     出し分けは既に component test (vitest) で網羅されている:
 *       - apps/admin/src/pages/DashboardPage.spec.ts (4 widget mount + 横遷移 + 主 CTA)
 *       - apps/admin/src/widgets/dashboard-stat-cards/ui/DashboardStatCards.spec.ts
 *       - apps/admin/src/widgets/dashboard-upcoming-events/ui/DashboardUpcomingEvents.spec.ts
 *       - apps/admin/src/widgets/dashboard-notifications/ui/DashboardNotifications.spec.ts
 *       - apps/admin/src/widgets/dashboard-recent-bookings/ui/DashboardRecentBookings.spec.ts
 *       - apps/admin/src/app/router.spec.ts (`/` = dashboard, login/mfa→dashboard)
 */

test.describe('admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で / (dashboard) にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
