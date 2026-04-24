## 1. ブランチ・pnpm準備

- [x] 1.1 `feature/76-monorepo-migration` ブランチを master から作成する（migrate-vue3 → master で実施済み）
- [x] 1.2 corepackでpnpmを有効化する（packageManager: pnpm@10.33.2 設定済み）
- [x] 1.3 `package-lock.json` を削除し、`.gitignore` に追加する

## 2. ワークスペースルート設定

- [x] 2.1 ルート `package.json` をワークスペース用に書き換える（`name: "@high-q/root"`、`private: true`、devDependenciesのみ）
- [x] 2.2 `pnpm-workspace.yaml` を作成し、`apps/*` と `packages/*` を宣言する

## 3. LPアプリを`apps/lp/`へ移動

- [x] 3.1 `apps/lp/` ディレクトリを作成する
- [x] 3.2 `src/` `public/` `index.html` `vite.config.js`（または`.ts`）を `git mv` で `apps/lp/` へ移動する
- [x] 3.3 `apps/lp/package.json` を作成する（`name: "@high-q/lp"`、Vue3・Vuetify3・Viteの依存関係を記載）
- [x] 3.4 `pnpm install` を実行し、依存関係が解決されることを確認する
- [x] 3.5 `pnpm --filter @high-q/lp build` が通ることを確認する
- [x] 3.6 `pnpm --filter @high-q/lp dev` で開発サーバーが起動することを確認する

## 4. スケルトン作成

- [x] 4.1 `apps/admin/` のスケルトンを作成する（`package.json`・`index.html`・`src/main.js`・`src/App.vue`・`vite.config.js`）
- [x] 4.2 `apps/reservation/` のスケルトンを作成する（同上）
- [x] 4.3 `packages/shared/` のスケルトンを作成する（`package.json`・`src/index.js`）
- [x] 4.4 `pnpm list -r --depth 0` で4パッケージがすべて表示されることを確認する（5 projects 確認済み）

## 5. ルートスクリプト整備

- [x] 5.1 ルート `package.json` に `build:lp`・`dev:lp` スクリプトを追加する（`pnpm --filter @high-q/lp ...`）

## 6. PR・マージ・Render設定変更

- [x] 6.1 変更をコミットし、master に反映済み（ブランチ PR は省略）
- [x] 6.2 PRをマージする
- [x] 6.3 **【手動】** render.yaml で `rootDir: apps/lp`・`buildCommand: pnpm install && pnpm build` 設定済み
- [x] 6.4 **【手動】** Renderで手動デプロイを実行し、LPが正常に表示されることを確認する
- [x] 6.5 master → Render の自動デプロイが成功することを確認する
