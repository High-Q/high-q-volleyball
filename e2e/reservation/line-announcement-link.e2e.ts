import { expect, test } from '@playwright/test'
import {
  dismissConsentBanner,
  installSupabaseGuard,
} from './_helpers/supabaseGuard'

/**
 * #386 LINE 告知リンクの E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/reservation-booking-flow/spec.md
 *     「予約 Sheet のディープリンク起動 (再予約導線)」— 未ログインでの告知リンク着地
 *
 * 機能あたり 1〜2 件の上限ルールと、既存 reservation E2E の方針（認証済みセッションは
 * 再現せずガード統合までを確認）に従い、本ファイルは 1 件のみ:
 *   未ログインで告知リンク (?book=1&openExternalBrowser=1) を開く → /login に回され、
 *   マジックリンクの戻り先 (emailRedirectTo) にクエリごと next が保持される。
 *
 * 認証後の挙動（予約 Sheet 自動オープン / 予約済み会員には開かない / LINE 用クエリ除去）は
 * apps/reservation/src/pages/EventDetailPage.spec.ts に押し下げている。
 */

const EVENT_ID = '11111111-1111-1111-1111-111111111111'
const ANNOUNCEMENT_PATH = `/events/${EVENT_ID}?book=1&openExternalBrowser=1`

test.describe('LINE 告知リンク', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
    await dismissConsentBanner(page)
  })

  test('未ログインで告知リンクを開く → ログイン後の戻り先に予約シート指定が保持される', async ({
    page,
  }) => {
    let otpUrl: string | null = null
    await page.route(/\/auth\/v[0-9]+\/otp/, async (route) => {
      otpUrl = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null, session: null }),
      })
    })

    await page.goto(ANNOUNCEMENT_PATH)

    await expect(page).toHaveURL(/\/login/)
    const next = new URL(page.url()).searchParams.get('next')
    expect(next).toBe(ANNOUNCEMENT_PATH)

    await page.locator('input[type=email]').fill('member@example.com')
    await page.getByRole('button', { name: /メールでリンクを受け取る/ }).click()
    await expect(page).toHaveURL(/\/auth\/link-sent/)

    // マジックリンクの戻り先 (redirect_to) が /auth/callback?next=<告知リンクのパス> で、
    // book / openExternalBrowser がクエリごと残っている
    expect(otpUrl).not.toBeNull()
    const redirectTo = new URL(otpUrl!).searchParams.get('redirect_to')
    expect(redirectTo).not.toBeNull()
    const callback = new URL(redirectTo!)
    expect(callback.pathname).toBe('/auth/callback')
    expect(callback.searchParams.get('next')).toBe(ANNOUNCEMENT_PATH)
  })
})
