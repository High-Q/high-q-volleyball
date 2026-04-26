## 1. ブランチと前提整備

- [x] 1.1 Issue #77 に紐づく作業ブランチ `feature/77-typescript-admin-reservation` を切る
- [x] 1.2 ルート `package.json` の `scripts` に `"typecheck": "pnpm -r typecheck"` を追加する
- [x] 1.3 `pnpm install` を実行して workspace 整合性を確認する

## 2. packages/shared の typecheck スクリプト整備

- [x] 2.1 `packages/shared/package.json` の `scripts` に `"typecheck": "tsc --noEmit -p tsconfig.json"` を追加する
- [x] 2.2 `pnpm --filter @high-q/shared typecheck` がエラーなく成功することを確認する
- [x] 2.3 ルートで `pnpm -r typecheck` が shared だけ実行されエラーなく終了することを確認する

## 3. apps/admin の TypeScript 化

- [x] 3.1 `apps/admin/package.json` の `devDependencies` に `typescript`、`vue-tsc`、`@types/node` を追加する
- [x] 3.2 `apps/admin/package.json` の `dependencies` に `"@high-q/shared": "workspace:*"` を追加する
- [x] 3.3 `apps/admin/package.json` の `scripts` に `"typecheck": "vue-tsc --noEmit -p tsconfig.json"` を追加する
- [x] 3.4 `apps/admin/tsconfig.json` を新規作成する（strict / noUncheckedIndexedAccess / noImplicitOverride / Vue 3 + Vite + Vuetify 構成、design.md D3 に従う）
- [x] 3.5 `apps/admin/tsconfig.node.json` を新規作成し、`vite.config.ts` の Node 環境用設定を分離する
- [x] 3.6 `apps/admin/src/main.js` を `apps/admin/src/main.ts` にリネームし、必要な型注釈を追加する
- [x] 3.7 `apps/admin/vite.config.js` を `apps/admin/vite.config.ts` にリネームし、`defineConfig` ベースに整える
- [x] 3.8 `apps/admin/index.html` の `<script src="/src/main.js">` を `/src/main.ts` に変更する
- [x] 3.9 `apps/admin/src/App.vue` の `<script setup>` を `<script setup lang="ts">` に変更する
- [x] 3.10 リポジトリルートで `pnpm install` を再実行して新規依存を解決する
- [x] 3.11 `pnpm --filter @high-q/admin typecheck` がエラーなく成功することを確認する
- [x] 3.12 `pnpm --filter @high-q/admin dev` を起動し、ローカルブラウザで初期画面が表示されることを確認する（Vuetify が起動して App.vue が描画される）

## 4. apps/reservation の TypeScript 化

- [x] 4.1 `apps/reservation/package.json` の `devDependencies` に `typescript`、`vue-tsc`、`@types/node` を追加する
- [x] 4.2 `apps/reservation/package.json` の `dependencies` に `"@high-q/shared": "workspace:*"` を追加する
- [x] 4.3 `apps/reservation/package.json` の `scripts` に `"typecheck": "vue-tsc --noEmit -p tsconfig.json"` を追加する
- [x] 4.4 `apps/reservation/tsconfig.json` を新規作成する（admin と同等の strict 構成）
- [x] 4.5 `apps/reservation/tsconfig.node.json` を新規作成する
- [x] 4.6 `apps/reservation/src/main.js` を `apps/reservation/src/main.ts` にリネームする
- [x] 4.7 `apps/reservation/vite.config.js` を `apps/reservation/vite.config.ts` にリネームする
- [x] 4.8 `apps/reservation/index.html` の `<script src="/src/main.js">` を `/src/main.ts` に変更する
- [x] 4.9 `apps/reservation/src/App.vue` の `<script setup>` を `<script setup lang="ts">` に変更する
- [x] 4.10 リポジトリルートで `pnpm install` を再実行する
- [x] 4.11 `pnpm --filter @high-q/reservation typecheck` がエラーなく成功することを確認する
- [x] 4.12 `pnpm --filter @high-q/reservation dev` を起動し、ローカルブラウザで初期画面が表示されることを確認する

## 5. 全体検証（最終確認タスク：CLAUDE.md ガイド準拠でまとめて実行）

- [x] 5.1 リポジトリルートで `pnpm -r typecheck` が **admin / reservation / shared 全て** で成功することを確認する（Issue #77 完了条件）
- [x] 5.2 リポジトリルートで `pnpm -r build` が引き続き成功し、`apps/admin/dist/` と `apps/reservation/dist/` に成果物が生成されることを確認する
- [x] 5.3 `pnpm --filter @high-q/lp build` が **本 change によって壊れていない** ことを確認する（LP 非干渉の保証）
- [x] 5.4 `git status` で意図しない変更（特に `apps/lp` 配下や `.env` 系）が含まれていないことを確認する
- [x] 5.5 `openspec validate typescript-admin-reservation --strict` を実行し、change の整合性を検証する
