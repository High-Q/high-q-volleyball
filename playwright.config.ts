import { defineConfig, devices } from '@playwright/test'

const LP_PORT = 4173
const ADMIN_PORT = 4174
const RESERVATION_PORT = 4175
const LP_URL = `http://localhost:${LP_PORT}`
const ADMIN_URL = `http://localhost:${ADMIN_PORT}`
const RESERVATION_URL = `http://localhost:${RESERVATION_PORT}`

/**
 * E2E 用の DUMMY Supabase 接続情報。
 *
 * 設計の根拠:
 *   openspec/changes/admin-login-magic-link/design.md (D10.1)
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *     "E2E から本番 Supabase へ通信が届かないこと"
 *
 * - URL は **DNS で解決できない `*.invalid`** を採用。Playwright route mock が
 *   全リクエストを横取りする前提だが、万一漏れても本番 Supabase に届かない。
 * - publishable key は形式バリデーション (`sb_publishable_*`) を通すためのダミー。
 * - global setup でこの値を読んで本番値が誤注入された場合は fail-fast する。
 */
const E2E_DUMMY_SUPABASE_URL = 'https://e2e-dummy.invalid'
const E2E_DUMMY_SUPABASE_KEY = 'sb_publishable_e2e_dummy_xxxxxxxxxxxxxxxx'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  globalSetup: './e2e/_global-setup.ts',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'lp',
      testDir: './e2e/lp',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LP_URL,
      },
    },
    {
      name: 'admin',
      testDir: './e2e/admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
      },
    },
    {
      name: 'reservation',
      testDir: './e2e/reservation',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: RESERVATION_URL,
      },
    },
  ],
  webServer: [
    {
      command:
        'pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview --port 4173 --strictPort',
      url: LP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'pnpm --filter @high-q/admin build && pnpm --filter @high-q/admin exec vite preview --port 4174 --strictPort',
      url: ADMIN_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PLAYWRIGHT_E2E: '1',
        VITE_SUPABASE_URL: E2E_DUMMY_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: E2E_DUMMY_SUPABASE_KEY,
      },
    },
    {
      command:
        'pnpm --filter @high-q/reservation build && pnpm --filter @high-q/reservation exec vite preview --port 4175 --strictPort',
      url: RESERVATION_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PLAYWRIGHT_E2E: '1',
        VITE_SUPABASE_URL: E2E_DUMMY_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: E2E_DUMMY_SUPABASE_KEY,
      },
    },
  ],
})

export { E2E_DUMMY_SUPABASE_URL, E2E_DUMMY_SUPABASE_KEY }
