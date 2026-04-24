## 1. ブランチ・pnpm準備

- [ ] 1.1 `feature/76-monorepo-migration` ブランチを master から作成する
- [ ] 1.2 corepackでpnpmを有効化する（`corepack enable && corepack prepare pnpm@latest --activate`）
- [ ] 1.3 `package-lock.json` を削除し、`.gitignore` に追加する

## 2. ワークスペースルート設定

- [ ] 2.1 ルート `package.json` をワークスペース用に書き換える（`name: "@high-q/root"`、`private: true`、devDependenciesのみ）
- [ ] 2.2 `pnpm-workspace.yaml` を作成し、`apps/*` と `packages/*` を宣言する

## 3. LPアプリを`apps/lp/`へ移動

- [ ] 3.1 `apps/lp/` ディレクトリを作成する
- [ ] 3.2 `src/` `public/` `index.html` `vite.config.js`（または`.ts`）を `git mv` で `apps/lp/` へ移動する
- [ ] 3.3 `apps/lp/package.json` を作成する（`name: "@high-q/lp"`、Vue3・Vuetify3・Viteの依存関係を記載）
- [ ] 3.4 `pnpm install` を実行し、依存関係が解決されることを確認する
- [ ] 3.5 `pnpm --filter @high-q/lp build` が通ることを確認する
- [ ] 3.6 `pnpm --filter @high-q/lp dev` で開発サーバーが起動することを確認する

## 4. スケルトン作成

- [ ] 4.1 `apps/admin/` のスケルトンを作成する（`package.json`・`index.html`・`src/main.js`・`src/App.vue`・`vite.config.js`）
- [ ] 4.2 `apps/reservation/` のスケルトンを作成する（同上）
- [ ] 4.3 `packages/shared/` のスケルトンを作成する（`package.json`・`src/index.js`）
- [ ] 4.4 `pnpm list -r --depth 0` で4パッケージがすべて表示されることを確認する

## 5. ルートスクリプト整備

- [ ] 5.1 ルート `package.json` に `build:lp`・`dev:lp` スクリプトを追加する（`pnpm --filter @high-q/lp ...`）

## 6. PR・マージ・Render設定変更

- [ ] 6.1 変更をコミットし、`feature/76-monorepo-migration` → `master` のPRを作成する
- [ ] 6.2 PRをマージする
- [ ] 6.3 **【手動】** Renderダッシュボードで設定変更する（Root Directory: `apps/lp`、Build Command: `pnpm install && pnpm build`、Publish Directory: `dist`）
- [ ] 6.4 **【手動】** Renderで手動デプロイを実行し、LPが正常に表示されることを確認する
- [ ] 6.5 `master` → `production` ブランチにマージし、Renderの自動デプロイが成功することを確認する
