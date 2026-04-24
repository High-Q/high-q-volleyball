## Why

現在のリポジトリはLPアプリ1本のフラット構造だが、今後Admin・Reservationの2アプリを追加するため、コードの分離・共通パッケージの管理・アプリ別のCI/CDが必要になる。pnpm workspacesモノレポへ移行することで、複数アプリを1リポジトリで安全に管理できる基盤を整える（Issue #76）。

## What Changes

- `package.json` をワークスペースルートとして再構成し、pnpm workspacesを有効化
- `src/` `public/` `index.html` `vite.config.*` を `apps/lp/` へ移動
- `apps/admin/` `apps/reservation/` のスケルトンを作成（Vue3+Vuetify3+TypeScript）
- `packages/shared/` を作成（共通型・テーマの置き場）
- ルートの `vite.config` を削除し、各アプリが独自の `vite.config.ts` を持つ構成に変更
- Render のビルド設定（Root Directory: `apps/lp`）を productionマージ前に変更する（**手動作業**）
- **BREAKING**: `npm run build` が不要になり、`pnpm --filter @high-q/lp build` に変わる

## Capabilities

### New Capabilities

- `monorepo-workspace`: pnpm workspacesによる複数アプリの統合管理。ルートから各アプリのbuild/test/lintをフィルタ実行できる

### Modified Capabilities

（なし。アプリの機能要件は変わらない。構造変更のみ）

## Impact

- **コード**: `src/` → `apps/lp/src/` への移動（ロジック変更なし）
- **依存関係**: npm → pnpm、workspacesプロトコル導入
- **Render**: Root Directoryをproductionマージ前に `apps/lp` へ変更が必要
- **既存ブランチ**: `migrate-vue3` はmaster統合済みのため影響なし
