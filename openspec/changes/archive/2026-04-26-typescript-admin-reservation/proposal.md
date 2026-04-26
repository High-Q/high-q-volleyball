## Why

`openspec/project.md` および `docs/03-アーキテクチャ/04-開発・コーディング規約.md` で「言語: TypeScript（strict）」「`<script setup lang="ts">`」を技術スタックの前提としているが、現在 `apps/admin` と `apps/reservation` は素の JavaScript（`main.js` / `vite.config.js` / `<script setup>`）で構築されている。型安全・Branded Types・Result 型 などの実装規約が機能する前提が崩れたままなので、Phase 1 の本格実装に入る前に TS strict 基盤を敷く必要がある。Issue #77 の親タスクのうち、LP は段階移行が必要なため別 Issue (#130) に切り出し、本 change では admin / reservation / packages/shared の TS 整備と `pnpm -r typecheck` 体制の確立に集中する。

## What Changes

- `apps/admin` / `apps/reservation` に **strict mode** な `tsconfig.json` と `tsconfig.node.json` を追加（Vue 3 + Vite + Vuetify 構成向け）
- `apps/admin` / `apps/reservation` の `main.js` → `main.ts`、`vite.config.js` → `vite.config.ts` へ移行
- `apps/admin/src/App.vue` / `apps/reservation/src/App.vue` を `<script setup lang="ts">` に変更
- `apps/admin` / `apps/reservation` の `package.json` に `vue-tsc` / `typescript` / `@types/node` / `vue-tsc` スクリプト（`typecheck`）を追加
- `packages/shared` の `package.json` に `typecheck` スクリプトを追加（既存 tsconfig.json を活用）
- ルート `package.json` に `typecheck: "pnpm -r typecheck"` スクリプトを追加し、Issue #77 の完了条件 `pnpm -r typecheck` を満たす
- `apps/admin/index.html` / `apps/reservation/index.html` の script src を `.ts` 拡張子に更新
- LP（`apps/lp`）は本 change の対象外（Issue #130 で別途扱う）

## Capabilities

### New Capabilities
- `typescript-baseline`: モノレポ全体の TypeScript strict 設定の基準と、各アプリ／パッケージが `pnpm -r typecheck` で型検査できる体制を定義する。アプリごとの `tsconfig.json` 構成・必須コンパイラオプション・型検査スクリプトの命名規則を含む。

### Modified Capabilities
（なし — 既存仕様の要求は変更しない。`monorepo-workspace` の「スケルトン存在」要件はそのまま、本 change はその上に TS 基盤を追加する位置づけ。）

## Impact

- **コード**: `apps/admin/**/*.{js,vue}` / `apps/reservation/**/*.{js,vue}` / `packages/shared/package.json` / ルート `package.json`
- **依存関係**: `apps/admin` / `apps/reservation` に `typescript`、`vue-tsc`、`@types/node` を新規追加（devDependencies）
- **CI**: 既存の lint/build に加え `pnpm -r typecheck` を流す前提が整う（CI への組込みは別 PR で行う想定、本 change ではローカルで通ることを保証）
- **ドキュメント**: `docs/03-アーキテクチャ/04-開発・コーディング規約.md` に typecheck コマンドの記述追加（sync フェーズで実施）
- **スコープ外**: LP アプリ（`apps/lp`）の TS 化 — Issue #130 として分離
- **後続作業**: CI に typecheck を組み込む（別 PR）／ LP の段階移行（Issue #130）
