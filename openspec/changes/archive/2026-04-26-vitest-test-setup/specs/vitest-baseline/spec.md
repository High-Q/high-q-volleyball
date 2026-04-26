## ADDED Requirements

### Requirement: ルートで `pnpm -r test` がモノレポ全ワークスペースの Vitest を実行できる
リポジトリルート `package.json` の `scripts` に `"test": "pnpm -r test"` が定義されていなければならない（SHALL）。`apps/lp`、`apps/admin`、`apps/reservation`、`packages/shared` の各 `package.json` の `scripts` には `"test"` が定義されていなければならず（SHALL）、その値は `vitest run` または `vitest run` を内包するコマンドでなければならない（SHALL）。`pnpm -r test` 実行時に全ワークスペースのテストが完走し、終了コード 0 で終了しなければならない（SHALL）。

#### Scenario: ルート package.json に test スクリプトが定義されている
- **WHEN** リポジトリルート `package.json` を読み込む
- **THEN** `scripts.test` が `"pnpm -r test"` である

#### Scenario: 全アプリ／パッケージに test スクリプトが定義されている
- **WHEN** `apps/lp/package.json`、`apps/admin/package.json`、`apps/reservation/package.json`、`packages/shared/package.json` を読み込む
- **THEN** いずれの `scripts.test` も定義されており、`vitest run` を含む

#### Scenario: ルートで pnpm -r test が成功する
- **WHEN** リポジトリルートで `pnpm -r test` を実行する
- **THEN** 4 ワークスペース（lp / admin / reservation / shared）すべての Vitest が走り、終了コード 0 で終了する

### Requirement: 各アプリに Vitest 設定ファイルが存在し、jsdom 環境で `*.spec.{ts,js}` を実行する
`apps/admin` および `apps/reservation` には `vitest.config.ts` が、`apps/lp` には `vitest.config.js` が存在しなければならない（SHALL）。各設定ファイルは `environment: "jsdom"` を指定しなければならず（SHALL）、`include` には `src/**/*.spec.{ts,tsx,js,jsx}` 相当のパターンが含まれていなければならない（SHALL）。`globals` は明示的に `false` でなければならず（SHALL）、テストコードは `vitest` から `describe`/`it`/`expect` を import して使用しなければならない（SHALL）。`packages/shared/vitest.config.ts` は本仕様の対象外であり、変更してはならない（SHALL NOT）。

#### Scenario: admin の vitest.config.ts が jsdom 環境を指定している
- **WHEN** `apps/admin/vitest.config.ts` を読み込む
- **THEN** `test.environment` が `"jsdom"` であり、`test.globals` が `false`、`test.include` が `src/**/*.spec.{ts,tsx,js,jsx}` を含む

#### Scenario: reservation の vitest.config.ts が jsdom 環境を指定している
- **WHEN** `apps/reservation/vitest.config.ts` を読み込む
- **THEN** `test.environment` が `"jsdom"` であり、`test.globals` が `false`、`test.include` が `src/**/*.spec.{ts,tsx,js,jsx}` を含む

#### Scenario: lp の vitest.config.js が jsdom 環境を指定している
- **WHEN** `apps/lp/vitest.config.js` を読み込む
- **THEN** `test.environment` が `"jsdom"` であり、`test.globals` が `false`、`test.include` が `src/**/*.spec.{ts,tsx,js,jsx}` を含む

#### Scenario: packages/shared の既存 vitest.config.ts が変更されていない
- **WHEN** 本 change 適用前後で `packages/shared/vitest.config.ts` を比較する
- **THEN** 内容は同一である（`environment: "node"`、`globals: false`、`include: ["src/**/*.spec.ts"]` を維持）

### Requirement: 各アプリにサンプルコンポーネントテストが少なくとも 1 件存在し、`pnpm --filter <app> test` で PASS する
`apps/lp`、`apps/admin`、`apps/reservation` には、Vue コンポーネントを `@vue/test-utils` の `mount` で描画し、ルート要素または特定の DOM 要素が描画されることを検証するテストファイルが少なくとも 1 件存在しなければならない（SHALL）。各サンプルテストはテスト戦略ドキュメント（`docs/07-テスト/01-テスト戦略・方針.md`）の共存配置ルールに従い、対象コンポーネントと同一ディレクトリに `*.spec.{ts,js}` で配置されていなければならない（SHALL）。

#### Scenario: admin にサンプルコンポーネントテストが存在する
- **WHEN** `apps/admin/src/` 配下を `*.spec.ts` で再帰検索する
- **THEN** 少なくとも 1 件のテストファイルが存在し、`pnpm --filter @high-q/admin test` 実行時に当該テストが PASS する

#### Scenario: reservation にサンプルコンポーネントテストが存在する
- **WHEN** `apps/reservation/src/` 配下を `*.spec.ts` で再帰検索する
- **THEN** 少なくとも 1 件のテストファイルが存在し、`pnpm --filter @high-q/reservation test` 実行時に当該テストが PASS する

#### Scenario: lp にサンプルコンポーネントテストが存在する
- **WHEN** `apps/lp/src/` 配下を `*.spec.{ts,js}` で再帰検索する
- **THEN** 少なくとも 1 件のテストファイルが存在し、`pnpm --filter @high-q/lp test` 実行時に当該テストが PASS する

### Requirement: 各アプリに MSW のテスト用サーバーが組み込まれている
`apps/lp`、`apps/admin`、`apps/reservation` には MSW v2 系（`msw@^2`）が devDependency として導入されていなければならない（SHALL）。各アプリは `src/test/mocks/server.ts`（lp は `src/test/mocks/server.js` も可）に `setupServer` を呼ぶエントリを持ち、`src/test/setup.ts`（lp は `src/test/setup.js` も可）で `beforeAll`／`afterEach`／`afterAll` ライフサイクルにより `server.listen()`／`server.resetHandlers()`／`server.close()` を実行しなければならない（SHALL）。各アプリの `vitest.config.{ts,js}` の `test.setupFiles` に当該 setup ファイルが指定されていなければならない（SHALL）。

#### Scenario: 各アプリに MSW が依存追加されている
- **WHEN** `apps/lp/package.json`、`apps/admin/package.json`、`apps/reservation/package.json` の `devDependencies` を確認する
- **THEN** いずれにも `"msw"` が含まれ、バージョン制約は `^2` 系である

#### Scenario: 各アプリの setup ファイルで MSW のライフサイクルが起動される
- **WHEN** `apps/admin/src/test/setup.ts`、`apps/reservation/src/test/setup.ts`、`apps/lp/src/test/setup.{ts,js}` を読み込む
- **THEN** いずれも `server.listen()` を `beforeAll`、`server.resetHandlers()` を `afterEach`、`server.close()` を `afterAll` で呼んでいる

#### Scenario: vitest.config の setupFiles に setup ファイルが指定されている
- **WHEN** 各アプリの `vitest.config.{ts,js}` を読み込む
- **THEN** `test.setupFiles` に上記 setup ファイルへのパスが含まれている

### Requirement: admin に MSW を使った API モックのサンプルテストが少なくとも 1 件存在する
`apps/admin` には MSW のハンドラーで HTTP レスポンスをモックし、テスト中の `fetch` 等の HTTP 呼び出しがそのモックを返すことを検証するサンプルテストが少なくとも 1 件存在しなければならない（SHALL）。当該テストは `pnpm --filter @high-q/admin test` で PASS しなければならない（SHALL）。

#### Scenario: admin の MSW サンプルテストが PASS する
- **WHEN** `pnpm --filter @high-q/admin test` を実行する
- **THEN** MSW ハンドラーで定義したエンドポイントへの `fetch` 呼び出しがモックレスポンスを返し、当該 spec がエラーなく PASS する

### Requirement: 各アプリに Vuetify を含むコンポーネントを mount するためのテストヘルパーが存在する
`apps/admin` および `apps/reservation` には `src/test/mountWithVuetify.ts`、`apps/lp` には `src/test/mountWithVuetify.js` が存在し、`@vue/test-utils` の `mount` に `createVuetify()` を `global.plugins` として注入する薄いラッパーを export しなければならない（SHALL）。サンプルコンポーネントテストはこのヘルパー経由で `App.vue` または同等の Vuetify を含む Vue コンポーネントを mount しなければならない（SHALL）。

#### Scenario: admin に mountWithVuetify ヘルパーが存在する
- **WHEN** `apps/admin/src/test/mountWithVuetify.ts` を import する
- **THEN** デフォルト export または名前付き export で関数が公開され、`mount(Component)` シグネチャで Vuetify プラグインを注入したマウント結果を返す

#### Scenario: reservation に mountWithVuetify ヘルパーが存在する
- **WHEN** `apps/reservation/src/test/mountWithVuetify.ts` を import する
- **THEN** デフォルト export または名前付き export で関数が公開され、Vuetify プラグインを注入する

#### Scenario: lp に mountWithVuetify ヘルパーが存在する
- **WHEN** `apps/lp/src/test/mountWithVuetify.js` を import する
- **THEN** デフォルト export または名前付き export で関数が公開され、Vuetify プラグインを注入する
