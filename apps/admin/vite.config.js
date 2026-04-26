import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [Vue()],
  // モノレポ root の .env.* を共通参照する（envDir）。
  // 関連: openspec/specs/env-management/spec.md（本 change マージ後）
  envDir: path.resolve(__dirname, '../..'),
})
