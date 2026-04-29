/**
 * Playwright global setup — 本番 Supabase 接続情報の誤注入を fail-fast で検知する。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/design.md (D10.1)
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *     "E2E から本番 Supabase へ通信が届かないこと"
 *
 * playwright.config.ts の admin webServer は env として DUMMY 値を渡すが、CI や
 * ローカルで誤って `.env` 等から `VITE_SUPABASE_URL=https://xxx.supabase.co`
 * が漏れ込む可能性をここで遮断する。
 */
async function globalSetup(): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL
  if (typeof url === 'string' && url.length > 0) {
    if (/\.supabase\.co/i.test(url) || /\.supabase\.io/i.test(url)) {
      throw new Error(
        `[E2E SAFETY] VITE_SUPABASE_URL が本番値を指している可能性があります: ${url}\n` +
          `E2E では DUMMY 値 (例: https://e2e-dummy.invalid) のみ許可されています。\n` +
          `playwright.config.ts の webServer.env で DUMMY を上書きするか、CI の secrets を確認してください。`,
      )
    }
  }
}

export default globalSetup
