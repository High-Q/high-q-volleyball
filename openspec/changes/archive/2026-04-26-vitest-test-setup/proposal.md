## Why

`openspec/project.md` および `docs/07-テスト/01-テスト戦略・方針.md` で「Unit / Component テストは Vitest + @vue/test-utils、API モックは MSW、TDD（実装前に書く）」と定義しているが、現状テスト基盤は `packages/shared` の Vitest（Node 環境・コンポーネント未対応）のみで、`apps/admin` / `apps/reservation` には設定が存在しない。`apps/lp` には `vitest` / `@vue/test-utils` / `jsdom` が devDependencies に入っているもののテスト設定もサンプルテストもなく、`pnpm -r test` を実行すると "No script test" エラーで止まる。Phase 1 で本格実装に入る前に、Issue #78 の完了条件「`pnpm -r test` が実行できる」「サンプルコンポーネントテストが通る」を満たすテスト基盤を全アプリ共通で整備し、TDD ワークフローを起動可能にする必要がある。

## What Changes

- ルート `package.json` に `"test": "pnpm -r test"` スクリプトを追加し、Issue #78 完了条件 `pnpm -r test` を満たす
- `apps/admin` / `apps/reservation` に Vitest + @vue/test-utils + jsdom + MSW を導入（`vitest.config.ts` / `package.json` の `test` スクリプト / `setupTests.ts`）
- `apps/lp` に `vitest.config.js`、`test` スクリプト、MSW を追加し、既存の `vitest` / `@vue/test-utils` / `jsdom` 依存を稼働状態にする
- `packages/shared` の既存 `vitest.config.ts`（Node 環境・`*.spec.ts` 限定）はそのまま維持し、本 change の対象外
- 各アプリにサンプルコンポーネントテスト（`App.vue` のレンダリング検証）を 1 件ずつ追加する
- 各アプリに MSW のサーバーセットアップファイル（`src/test/mocks/server.ts` 等）を追加し、API モックの利用パターンを示すサンプルテストを admin に 1 件追加する
- ルート `package.json` の `devDependencies` には何も追加しない（依存はアプリ／パッケージ単位で管理）
- CI へのテスト組み込みは別 PR（Issue #79 想定）に切り出し、本 change ではローカルで `pnpm -r test` が緑になることを保証する

## Capabilities

### New Capabilities
- `vitest-baseline`: モノレポ全体の Vitest テスト基盤の基準を定義する。各アプリ／パッケージが `pnpm -r test` で実行可能であること、Vue コンポーネントテストが jsdom 環境で動くこと、MSW で API モックを差し込めること、テストファイル命名規則（`*.spec.ts` / `*.spec.tsx`）、サンプルテストが各アプリに 1 件以上存在することを含む。

### Modified Capabilities
（なし — 既存仕様の要求は変更しない。`typescript-baseline` の strict 設定はテストコードでもそのまま守る前提。）

## Impact

- **コード**: `apps/admin` / `apps/reservation` / `apps/lp` 配下に `vitest.config.{ts,js}` / `src/test/` / サンプルテスト ファイル群を新規追加、ルート `package.json` に `test` スクリプト追加
- **依存関係**:
  - `apps/admin` / `apps/reservation`: `vitest` / `@vue/test-utils` / `jsdom` / `msw` / `@vitest/coverage-v8` を新規追加（devDependencies）
  - `apps/lp`: `msw` を新規追加（devDependencies、その他は既存依存を流用）
  - `packages/shared`: 変更なし
- **CI**: 本 change ではテスト job を追加しない。`pnpm -r test` がローカルで通ることを保証するに留める（CI 組込みは Issue #79 で別 PR）
- **ドキュメント**: `docs/07-テスト/01-テスト戦略・方針.md` に「コマンド一覧」「サンプルテスト位置」を追記（sync フェーズで実施）
- **スコープ外**:
  - E2E テスト（Playwright）— 別 Issue
  - CI への テスト組込み — Issue #79 で別 PR
  - 既存 `packages/shared` の Vitest 設定変更
- **後続作業**: CI に `pnpm -r test` を組み込む（別 PR）／ Playwright 導入（別 Issue）／ TDD で書かれた本物のコンポーネントテスト追加（各 feature change 内で実施）
