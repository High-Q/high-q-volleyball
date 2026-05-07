import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #201 reservation events list page の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/reservation-events-list-e2e/specs/reservation-e2e-coverage/spec.md
 *   openspec/changes/reservation-events-list-e2e/design.md (D1 ガード統合のみ)
 *
 * 機能あたり 1〜2 件の上限ルールに従い、本ファイルでは 1 件のみ実装する:
 *   - 未認証ユーザーが /events に直接アクセスすると /login にリダイレクトされ、
 *     ログインフォームが描画される (auth guard のイベント一覧ルート保護を統合確認)
 *
 * イベントカード描画 / カード押下による /events/:id 遷移 / 詳細画面の主要要素
 * (開催日・イベント名・会場名・会場住所・参加費・「予約に進む」CTA) の表示検証は
 * component test / unit test に押し下げ (CLAUDE.md E2E スケーラビリティ運用ルール)。
 */

test.describe('reservation events list page', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /events にアクセス → /login にリダイレクト (ガード統合)', async ({
    page,
  }) => {
    await page.goto('/events')

    // 認証ガードにより /login へ強制遷移 (#201 のイベント一覧ルート保護)
    await expect(page).toHaveURL(/\/login/)

    // /login のメール入力フォームが描画される
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /メールでリンクを受け取る/ }),
    ).toBeVisible()
  })
})
