import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ローカル開発時のポートを固定し、LP の .env.local から
  // VITE_RESERVATION_URL=http://localhost:5174 で安定参照できるようにする。
  // LP dev は 5173 (Vite デフォルト)、reservation dev は 5174 に分ける。
  server: {
    port: 5174,
    strictPort: true,
  },
  // モノレポ root の .env.* を共通参照する（envDir）。
  // 関連: openspec/specs/env-management/spec.md（本 change マージ後）
  envDir: path.resolve(__dirname, '../..'),
})
