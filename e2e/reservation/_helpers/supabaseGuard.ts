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

/**
 * #189 ゼロ滞留 signup フローの Edge Function モックヘルパー。
 * request-signup 成功 + verify-signup 成功 + verifyOtp 成功 の 3 連を許可する。
 */
export async function mockRequestSignupSuccess(page: Page): Promise<void> {
  await page.route(/\/functions\/v1\/request-signup/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      }),
    })
  })
}

export async function mockVerifySignupSuccess(page: Page): Promise<void> {
  await page.route(/\/functions\/v1\/verify-signup/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        tokenHash: 'mock-token-hash',
        email: 'rem-e2e@example.com',
      }),
    })
  })
  // verifyOtp が叩く /auth/v1/verify を成功で返す
  await page.route(/\/auth\/v[0-9]+\/verify/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access',
        refresh_token: 'mock-refresh',
        token_type: 'bearer',
        user: { id: '00000000-0000-4000-8000-000000000001', email: 'rem-e2e@example.com' },
      }),
    })
  })
}

/**
 * Cookie 同意バナーを事前に dismiss する（バナーが pointer event を遮るのを防ぐ）。
 * page.goto の前に呼ぶ。
 */
export async function dismissConsentBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'hq.consent.v1',
        JSON.stringify({
          necessary: true,
          analytics: false,
          decidedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // localStorage が使えない環境（Safari 等）は無視
    }
  })
}

export async function mockVerifySignupInvalidCode(page: Page): Promise<void> {
  await page.route(/\/functions\/v1\/verify-signup/, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid-code', remainingAttempts: 4 }),
    })
  })
}
