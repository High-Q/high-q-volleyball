import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * E2E (Playwright) で本番 Supabase の認証情報がビルド成果物に焼き込まれることを防ぐ。
 *
 * 通常ビルドはモノレポ root の `.env.*` を envDir で共有するが、E2E では:
 *   - playwright.config.ts が webServer.env で DUMMY 値を渡す
 *   - .env.local の本番値が VITE_ vars を上書きしないよう、envDir をプロジェクト
 *     ローカル (apps/admin/, .env.* が存在しない) に切り替える
 * これにより process.env (= webServer.env で渡した DUMMY) のみが Vite に渡る。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/design.md (D10.1)
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 */
const isPlaywrightE2E = process.env.PLAYWRIGHT_E2E === '1'

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 通常はモノレポ root の .env.* を共通参照する（envDir）。
  // E2E モードではプロジェクトローカルに切り替えて .env.local 漏れを遮断する。
  // 関連: openspec/specs/env-management/spec.md
  envDir: isPlaywrightE2E
    ? path.resolve(__dirname)
    : path.resolve(__dirname, '../..'),
})
