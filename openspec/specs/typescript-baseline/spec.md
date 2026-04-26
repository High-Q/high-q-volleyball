# typescript-baseline Specification

## Purpose
TBD - created by archiving change typescript-admin-reservation. Update Purpose after archive.
## Requirements
### Requirement: 全アプリケーションが TypeScript strict 設定の `tsconfig.json` を持つ
`apps/admin` と `apps/reservation` は、それぞれのディレクトリ直下に `tsconfig.json` を配置しなければならない（SHALL）。当該設定では `compilerOptions.strict` が `true`、`noUncheckedIndexedAccess` が `true`、`noImplicitOverride` が `true` でなければならない（SHALL）。`packages/shared/tsconfig.json` も同等の strict 設定を維持しなければならない（SHALL）。

#### Scenario: admin の tsconfig が strict を有効化している
- **WHEN** `apps/admin/tsconfig.json` を読み込む
- **THEN** `compilerOptions.strict` が `true`、`compilerOptions.noUncheckedIndexedAccess` が `true` である

#### Scenario: reservation の tsconfig が strict を有効化している
- **WHEN** `apps/reservation/tsconfig.json` を読み込む
- **THEN** `compilerOptions.strict` が `true`、`compilerOptions.noUncheckedIndexedAccess` が `true` である

#### Scenario: shared の tsconfig が strict を維持している
- **WHEN** `packages/shared/tsconfig.json` を読み込む
- **THEN** `compilerOptions.strict` が `true` である

### Requirement: 各 Vite アプリのエントリポイントが TypeScript で記述されている
`apps/admin` と `apps/reservation` のエントリは `src/main.ts` でなければならず、対応する `index.html` の `<script>` タグは `src/main.ts` を参照しなければならない（SHALL）。Vite 設定ファイルは `vite.config.ts` でなければならない（SHALL）。

#### Scenario: admin のエントリが TS 化されている
- **WHEN** `apps/admin/src/main.ts` の存在と `apps/admin/index.html` の `<script>` 参照先を確認する
- **THEN** `apps/admin/src/main.ts` が存在し、`index.html` は `/src/main.ts` を参照している

#### Scenario: reservation のエントリが TS 化されている
- **WHEN** `apps/reservation/src/main.ts` の存在と `apps/reservation/index.html` の `<script>` 参照先を確認する
- **THEN** `apps/reservation/src/main.ts` が存在し、`index.html` は `/src/main.ts` を参照している

#### Scenario: Vite 設定ファイルが TS 化されている
- **WHEN** `apps/admin/` および `apps/reservation/` ディレクトリを確認する
- **THEN** それぞれに `vite.config.ts` が存在し、`vite.config.js` は存在しない

### Requirement: Vue 単一ファイルコンポーネントが `<script setup lang="ts">` を使用する
`apps/admin/src/App.vue` および `apps/reservation/src/App.vue` の `<script setup>` ブロックは `lang="ts"` 属性を持たなければならない（SHALL）。本 change 以降、`apps/admin` および `apps/reservation` 配下に新規作成する `.vue` ファイルでスクリプトを書く場合は `<script setup lang="ts">` を用いなければならない（SHALL）。

#### Scenario: admin の App.vue が TS スクリプトを使う
- **WHEN** `apps/admin/src/App.vue` の `<script>` タグを確認する
- **THEN** `<script setup lang="ts">` で記述されている

#### Scenario: reservation の App.vue が TS スクリプトを使う
- **WHEN** `apps/reservation/src/App.vue` の `<script>` タグを確認する
- **THEN** `<script setup lang="ts">` で記述されている

### Requirement: 各パッケージが `typecheck` スクリプトを公開する
`apps/admin` / `apps/reservation` / `packages/shared` の各 `package.json` は `scripts.typecheck` を持たなければならない（SHALL）。`apps/admin` と `apps/reservation` の `typecheck` は `vue-tsc --noEmit -p tsconfig.json` を実行しなければならず、`packages/shared` の `typecheck` は `tsc --noEmit -p tsconfig.json` を実行しなければならない（SHALL）。

#### Scenario: admin の typecheck が成功する
- **WHEN** `pnpm --filter @high-q/admin typecheck` を実行する
- **THEN** `vue-tsc` がエラーなく終了する（exit code 0）

#### Scenario: reservation の typecheck が成功する
- **WHEN** `pnpm --filter @high-q/reservation typecheck` を実行する
- **THEN** `vue-tsc` がエラーなく終了する（exit code 0）

#### Scenario: shared の typecheck が成功する
- **WHEN** `pnpm --filter @high-q/shared typecheck` を実行する
- **THEN** `tsc` がエラーなく終了する（exit code 0）

### Requirement: ルート `package.json` から再帰的に typecheck が実行できる
リポジトリルートの `package.json` は `scripts.typecheck` を持たなければならず、`pnpm -r typecheck` を実行しなければならない（SHALL）。当該コマンドは Issue #77 の完了条件 `pnpm -r typecheck` がエラーなく通ることを満たさなければならない（SHALL）。

#### Scenario: ルートからの再帰 typecheck が全パッケージで成功する
- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `typecheck` スクリプトを持つ全パッケージで型検査が走り、全て exit code 0 で終了する

#### Scenario: typecheck を持たないパッケージは無視される
- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `apps/lp` のように `typecheck` スクリプトを持たないパッケージは pnpm の標準挙動でスキップされ、全体は失敗しない

### Requirement: admin / reservation が `@high-q/shared` を workspace 依存として宣言する
`apps/admin/package.json` および `apps/reservation/package.json` の `dependencies` または `devDependencies` に `"@high-q/shared": "workspace:*"` が含まれなければならない（SHALL）。これにより shared の型定義（`Result<T>`、Branded Types 等）を import 経由で利用可能な状態にする。

#### Scenario: admin から shared の型が解決できる
- **WHEN** `apps/admin/src` の TS ファイル内で `import type { Result } from '@high-q/shared/types'` を記述する
- **THEN** `pnpm --filter @high-q/admin typecheck` がモジュール解決エラーを出さず成功する

#### Scenario: reservation から shared の型が解決できる
- **WHEN** `apps/reservation/src` の TS ファイル内で `import type { Result } from '@high-q/shared/types'` を記述する
- **THEN** `pnpm --filter @high-q/reservation typecheck` がモジュール解決エラーを出さず成功する

### Requirement: TS 化後も既存ビルドが破壊されない
`pnpm --filter @high-q/admin build` および `pnpm --filter @high-q/reservation build` は本 change 適用後もエラーなく完了し、ビルド成果物（`dist/`）を生成しなければならない（SHALL）。

#### Scenario: admin のビルドが成功する
- **WHEN** `pnpm --filter @high-q/admin build` を実行する
- **THEN** Vite がエラーなくビルドを完了し、`apps/admin/dist/` に成果物が生成される

#### Scenario: reservation のビルドが成功する
- **WHEN** `pnpm --filter @high-q/reservation build` を実行する
- **THEN** Vite がエラーなくビルドを完了し、`apps/reservation/dist/` に成果物が生成される

