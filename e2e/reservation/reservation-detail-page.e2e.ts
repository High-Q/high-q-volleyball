import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #213 reservation detail page の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *   openspec/changes/reservation-detail-page/design.md
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 1 件のみ実装する:
 *   - 未認証ユーザーが /reservations/<uuid> に直接アクセスすると /login にリダイレクトされる
 *     (auth guard の最終段ルート保護を統合確認)
 *
 * 詳細表示 / Dark Fact Card のカウントダウン / Meta テーブル / .ics 生成 / 会場地図リンクの
 * fallback / キャンセル動線の詳細検証は component test / unit test に押し下げる
 * (CLAUDE.md E2E スケーラビリティ運用ルール)。
 */

const DUMMY_RESERVATION_ID = '11111111-1111-1111-1111-111111111111'

test.describe('reservation detail page', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /reservations/<uuid> にアクセス → /login にリダイレクト (ガード統合)', async ({
    page,
  }) => {
    await page.goto(`/reservations/${DUMMY_RESERVATION_ID}`)

    await expect(page).toHaveURL(/\/login/)

    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
