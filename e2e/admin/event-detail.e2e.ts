import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #87 admin event detail の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D12)
 *
 * E2E は CLAUDE.md ルール「機能あたり 1〜2 件まで、肥大化したら component test
 * に押し下げる」に従って 1 件に絞る。理由:
 *
 *   - 認証済 admin の AAL2 セッション再現は localStorage 仕込み + getSession 透過
 *     復元 + MFA factor mock 等が必要で、認証セットアップだけで E2E が肥大する
 *     (events-list E2E でも同方針で 1 件のみ採用済み)
 *   - 詳細画面の StatCard / 4 状態 / Tabs / チェックイン optimistic / キャンセル代行 /
 *     検索フィルタ / URL 同期 はすべて component test で網羅されている:
 *       - apps/admin/src/widgets/event-detail/ui/EventDetailWidget.spec.ts (4 状態 + 編集 CTA)
 *       - apps/admin/src/widgets/event-detail/ui/EventStatCards.spec.ts (capacity 動的切替)
 *       - apps/admin/src/widgets/event-detail/ui/EventDetailTabs.spec.ts (a11y + disabled)
 *       - apps/admin/src/widgets/event-participants/composables/useEventParticipantsData.spec.ts (filter)
 *       - apps/admin/src/features/reservation-checkin/composables/useReservationCheckin.spec.ts (optimistic + ガード)
 *       - apps/admin/src/features/reservation-checkin/ui/CheckinToggle.spec.ts (Switch UI + a11y)
 *       - apps/admin/src/features/reservation-cancel-by-admin/composables/useReservationCancelByAdmin.spec.ts (confirm/error)
 *       - apps/admin/src/features/participants-filter/composables/useParticipantsFilter.spec.ts (URL 同期)
 *       - apps/admin/src/entities/event-detail/api/eventDetailQueries.spec.ts (EVENT_NOT_FOUND)
 *
 * 本 E2E では「auth guard が /events/:id を保護していること」のみ確認する。
 */

test.describe('admin event detail', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /events/:id にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/events/00000000-0000-0000-0000-000000000001')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
