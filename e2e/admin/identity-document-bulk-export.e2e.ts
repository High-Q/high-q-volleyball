import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #172 役所提出用 本人確認書類一括ダウンロードの E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *     (Requirement: 権限（admin のみ） / Requirement: テスト)
 *
 * 一括ダウンロード機能は `/members` 上のツールバー + ダイアログとして実装される。
 * admin は AAL2 + MFA 必須で認証済みセッションの E2E 再現が重いため（既存
 * `members-list.e2e.ts` と同方針）、本 E2E では「auth guard が /members を保護し、
 * 未認証では機能の入口に到達できない」ことを確認する。選択 → ダウンロード →
 * 結果表示の happy path は component test + 手動確認 (dev) で担保する。
 */
test.describe('admin identity-document bulk export guard (#172)', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /members にアクセスすると /login にリダイレクトされ、一括ダウンロード機能に到達できない', async ({
    page,
  }) => {
    await page.goto('/members')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    // 一括アクションツールバーのダウンロード CTA は描画されない
    await expect(
      page.getByRole('button', {
        name: '会員名簿と本人確認書類をダウンロード',
      }),
    ).toHaveCount(0)
  })
})
