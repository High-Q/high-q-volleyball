import type { Page } from '@playwright/test'

/**
 * E2E 用 Supabase 通信ガード (reservation 用)。
 *
 * 関連:
 *   openspec/changes/reservation-member-auth-magic-link/design.md (D2, D5)
 *   openspec/changes/reservation-member-auth-magic-link/specs/reservation-member-auth/spec.md
 *
 * 各 E2E テスト fixture で `page.goto` の前にこの関数を呼ぶ。
 * 実装は admin の supabaseGuard と同等の許可リスト方式。
 */
export async function installSupabaseGuard(page: Page): Promise<void> {
  await page.route(/\/auth\/v[0-9]+\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route(/\/rest\/v[0-9]+\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route(/\/storage\/v[0-9]+\//, async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'storage not allowed in E2E' }),
    })
  })

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    const allowed =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.protocol === 'file:' ||
      url.hostname.endsWith('.invalid') ||
      url.hostname.endsWith('.local')
    if (allowed) {
      await route.continue()
    } else {
      await route.abort('blockedbyclient')
    }
  })
}

export async function mockSignInWithOtpSuccess(page: Page): Promise<void> {
  await page.route(/\/auth\/v[0-9]+\/otp/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: null, session: null }),
    })
  })
}
