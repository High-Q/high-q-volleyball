import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #155 admin モバイルレスポンシブの E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-auth/spec.md
 *   openspec/changes/admin-mobile-responsive/design.md (D1, D7)
 *
 * E2E 戦略 (CLAUDE.md / 既存 admin E2E と同方針):
 *   - 認証済 admin の AAL2 セッション再現は localStorage 仕込み + getSession 透過
 *     復元 + MFA factor mock 等が必要で本リポジトリでは意図的に E2E 化していない。
 *     よって「ログイン→詳細→チェックイン」の認証後フローはモバイルでも component
 *     test に押し下げる:
 *       - widgets/admin-shell/ui/AdminShell.spec.ts (サイドバー/ドロワー開閉)
 *       - widgets/admin-shell/ui/SidebarNavContent.spec.ts (ナビ/ログアウト)
 *       - widgets/event-participants/ui/EventParticipantsTable.spec.ts
 *           (モバイルカード / チェックイン済ハイライト / 44px / 操作保持)
 *       - widgets/{events-list,members-list,identity-documents-list} テーブル→カード切替
 *   - 本 E2E ではモバイルビューポートで「認証不要の表層」= ログイン画面のレスポンシブ
 *     描画と auth guard リダイレクトが破綻しないことを確認する。
 */

// iPhone 相当のモバイルビューポート (390 x 844)
test.use({ viewport: { width: 390, height: 844 } })

test.describe('admin モバイルレスポンシブ', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('モバイル幅でログイン画面が横スクロールせず描画される', async ({
    page,
  }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)

    // フォーム (全幅) とモバイルブランド帯が見える
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /マジックリンクを送る/ }),
    ).toBeVisible()

    // 横スクロールが発生しない (document 幅 <= viewport 幅 + 1px の許容)
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('モバイル幅でも未認証アクセスは /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/events/00000000-0000-0000-0000-000000000001')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
