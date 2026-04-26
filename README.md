# High Q バレーボールサークル

LP / 管理画面 / 予約サイトのモノレポ。

## Quick Start

```bash
# 依存解決
pnpm install

# Playwright のブラウザバイナリ（E2E を走らせる場合のみ、初回 1 度だけ）
pnpm exec playwright install chromium

# 各アプリの開発サーバー
pnpm --filter @high-q/lp dev          # LP
pnpm --filter @high-q/admin dev       # 管理画面
pnpm --filter @high-q/reservation dev # 予約サイト
```

## よく使うコマンド

```bash
pnpm -r typecheck               # 全 workspace の typecheck
pnpm -r test                    # 全 workspace の Vitest（unit / component）
pnpm -r build                   # 全 workspace の本番ビルド
pnpm --filter @high-q/lp lint   # LP の ESLint
pnpm test:e2e                   # Playwright E2E（root 一括、LP smoke を実行）
pnpm test:e2e:ui                # Playwright UI モード（ローカル開発用）
```

## ドキュメント

- 開発ガイド: [CLAUDE.md](CLAUDE.md)
- アーキテクチャ: [docs/03-アーキテクチャ/](docs/03-アーキテクチャ/)
- テスト戦略: [docs/07-テスト/01-テスト戦略・方針.md](docs/07-テスト/01-テスト戦略・方針.md)
- OpenSpec 仕様: [openspec/](openspec/)

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| 言語 | TypeScript（strict）/ JavaScript（LP は段階的 TS 化中） |
| フレームワーク | Vue 3 (Composition API) |
| UI | Vuetify 3 (LP) / shadcn-vue + Tailwind (admin / reservation) |
| 状態 | Pinia / TanStack Query |
| バックエンド | Supabase（PostgreSQL + RLS + Auth + Storage） |
| ビルド | Vite + pnpm workspaces |
| ホスティング | Render（Static Site, Blueprint mode） |
| テスト | Vitest + @vue/test-utils + MSW (unit/component) / Playwright (E2E) |
| CI | GitHub Actions（typecheck / lint / test / build の 4 並列） |

## 環境

- Node.js >= 22
- pnpm >= 10（root の `package.json` で `packageManager: pnpm@10.x` 指定、`corepack enable` で有効化）
