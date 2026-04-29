import type { Page } from '@playwright/test'

/**
 * E2E 用 Supabase 通信ガード。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/design.md (D10.1)
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *     "E2E から本番 Supabase へ通信が届かないこと"
 *
 * 各 E2E テスト fixture で `page.goto` の前にこの関数を呼ぶことで:
 *   1) Supabase 全 API パス (auth/v1, rest/v1, storage/v1) を route mock
 *   2) 未マッチの外部 HTTP は abort (許可リスト方式の fail-closed)
 */
export async function installSupabaseGuard(page: Page): Promise<void> {
  // Supabase の全 API パスを mock。デフォルトは empty success (各テストが上書き可)
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

  // 想定外の外部ホストへの通信を fail-closed で遮断。
  // localhost / 127.0.0.1 / file: は許可。
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

/**
 * `signInWithOtp` の成功レスポンスをセット。
 * (page.route は LIFO で評価されるため、本関数は installSupabaseGuard より後に呼ぶ)
 */
export async function mockSignInWithOtpSuccess(page: Page): Promise<void> {
  await page.route(/\/auth\/v[0-9]+\/otp/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // signInWithOtp は session を返さない (メールに送信されたリンクをクリックする)
        // 成功時は { data: { user: null, session: null }, error: null } 相当
        user: null,
        session: null,
      }),
    })
  })
}
