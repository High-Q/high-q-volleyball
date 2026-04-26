## ADDED Requirements

### Requirement: ルートで `pnpm test:e2e` がモノレポ E2E を実行できる
リポジトリルート `package.json` の `scripts` に `"test:e2e"` が定義されていなければならず（SHALL）、その値は `playwright test` または `playwright test` を内包するコマンドでなければならない（SHALL）。`pnpm test:e2e` 実行時に Playwright が起動し、`e2e/` 配下の全 `*.e2e.ts` を実行し、終了コード 0 で終了しなければならない（SHALL）。

#### Scenario: ルート package.json に test:e2e スクリプトが定義されている
- **WHEN** リポジトリルート `package.json` を読み込む
- **THEN** `scripts.test:e2e` が定義されており、`playwright test` を含む

#### Scenario: pnpm test:e2e が成功する
- **WHEN** リポジトリルートで `pnpm test:e2e` を実行する
- **THEN** Playwright が起動し、`e2e/lp/smoke.e2e.ts` を含む `*.e2e.ts` がすべて PASS して終了コード 0 で終了する

### Requirement: Playwright 設定ファイルがリポジトリルートに存在する
リポジトリルートに `playwright.config.ts` が存在しなければならない（SHALL）。当該ファイルは `@playwright/test` の `defineConfig` を使用し、`testDir` または `testMatch` で `e2e/**/*.e2e.ts` 相当を対象としなければならない（SHALL）。`projects` には `chromium` を含まなければならず（SHALL）、本仕様では `firefox` および `webkit` は含めてはならない（SHALL NOT、Phase 1 最小ブラウザ方針）。`webServer` で LP の preview サーバー（`pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview` または同等のコマンド）を起動する設定を持たなければならない（SHALL）。

#### Scenario: playwright.config.ts が存在する
- **WHEN** リポジトリルートから `playwright.config.ts` を読み込む
- **THEN** ファイルが存在し、TypeScript として parse 可能で、`@playwright/test` から `defineConfig` を import している

#### Scenario: testMatch が e2e/**/*.e2e.ts を対象としている
- **WHEN** `playwright.config.ts` の `testMatch`（または `testDir` + デフォルト pattern）を読み込む
- **THEN** `e2e/**/*.e2e.ts` 相当のパターンでテストファイルを検出する

#### Scenario: chromium のみが projects に含まれる
- **WHEN** `playwright.config.ts` の `projects` を読み込む
- **THEN** `chromium` のみが含まれており、`firefox` / `webkit` は含まれない

#### Scenario: webServer が LP の preview を起動する
- **WHEN** `playwright.config.ts` の `webServer` を読み込む
- **THEN** `command` に `vite preview` または `pnpm --filter @high-q/lp preview` を含み、`url` に LP の preview URL（例: `http://localhost:4173`）が指定されている

### Requirement: E2E テストファイルは `e2e/` 配下に `*.e2e.ts` で配置される
すべての E2E テストファイルは `e2e/` 配下に配置されなければならず（SHALL）、ファイル名は `*.e2e.ts` でなければならない（SHALL）。`*.spec.ts` 拡張子を使ってはならない（SHALL NOT、Vitest の `*.spec.ts` と区別するため）。アプリ単位でディレクトリを分け、LP の E2E は `e2e/lp/` 配下に配置されなければならない（SHALL）。

#### Scenario: smoke E2E が e2e/lp/smoke.e2e.ts に存在する
- **WHEN** リポジトリから `e2e/lp/smoke.e2e.ts` を読み込む
- **THEN** ファイルが存在し、`@playwright/test` から `test` / `expect` を import している

#### Scenario: e2e/ 配下に *.spec.ts が存在しない
- **WHEN** `e2e/` ディレクトリ配下を再帰的に検索する
- **THEN** `*.spec.ts` ファイルが 1 件も存在しない

### Requirement: LP トップページのスモークテストが「壊滅していない」を検出する
`e2e/lp/smoke.e2e.ts` は LP のトップページ（`/`）を Playwright で開き、以下を assert しなければならない（SHALL）:
- `<title>` 要素のテキストが LP のブランド名（"High Q" または同等の文字列）を含む
- 主要セクション 5-6 個の見出しまたは主要要素が DOM 上に存在する（hero / Concept / Activities / Footer 等）
- カレンダー widget の root 要素が DOM 上に存在する（`<v-calendar>` の wrapper、`[data-testid="event-calendar"]`、または同等の selector）

データ依存（イベントの実データが API から取得できているか / 今日のイベントが正しく表示されているか等）の assert を含めてはならない（SHALL NOT、本仕様はスモーク = 「壊滅していない」検出のみを担当する）。動的挙動（月切替・詳細ダイアログ等）の assert も含めてはならない（SHALL NOT、Issue #135 で別途対応）。

#### Scenario: トップページの title が High Q を含む
- **WHEN** Playwright で `/` を開く
- **THEN** `page.title()` が "High Q" を含む

#### Scenario: 主要セクションの見出しが描画される
- **WHEN** Playwright で `/` を開く
- **THEN** Concept / Activities / Footer 等の主要セクションの見出しテキストまたは主要要素が DOM 上に存在する（5-6 件の assert）

#### Scenario: カレンダー widget の root 要素が存在する
- **WHEN** Playwright で `/` を開く
- **THEN** `<v-calendar>` の wrapper 要素または `[data-testid="event-calendar"]` 等のセレクタで DOM 上に要素が見つかる（イベントデータの有無は問わない）

#### Scenario: スモークがデータ依存 assert を含まない
- **WHEN** `e2e/lp/smoke.e2e.ts` のソースコードを読み込む
- **THEN** API レスポンス内容や個別イベントデータに依存する assert（`page.getByText(具体的イベント名)` 等の動的データ前提の assert）が含まれていない

### Requirement: Playwright は root の devDependencies に配置され、apps/* には配置されない
`@playwright/test` は root `package.json` の `devDependencies` に追加されなければならない（SHALL）。`apps/lp` / `apps/admin` / `apps/reservation` / `packages/shared` の `package.json` には `@playwright/test` を追加してはならない（SHALL NOT）。これにより workspace 横断で 1 セットの Playwright インストールとブラウザバイナリで E2E を運用する。

#### Scenario: root に @playwright/test が devDependency として存在する
- **WHEN** root `package.json` を読み込む
- **THEN** `devDependencies['@playwright/test']` が定義されている

#### Scenario: apps/* に Playwright が含まれない
- **WHEN** `apps/lp/package.json` / `apps/admin/package.json` / `apps/reservation/package.json` を読み込む
- **THEN** いずれの `dependencies` / `devDependencies` にも `@playwright/test` および `playwright` が含まれていない

### Requirement: CI への E2E 組込みは本仕様の対象外である
本仕様は GitHub Actions ワークフロー（`.github/workflows/ci.yml`）への E2E job 追加を含まない（SHALL NOT）。`pnpm test:e2e` はローカル実行のみで完結し、CI 統合は別 Issue で扱う。

#### Scenario: .github/workflows/ci.yml に e2e job が追加されない
- **WHEN** `.github/workflows/ci.yml` の `jobs` を読み込む
- **THEN** `e2e` という名前のジョブ、または `playwright` を実行するジョブが存在しない

### Requirement: Playwright のレポート / 結果ファイルが Git 管理から除外される
リポジトリルートの `.gitignore` には Playwright の生成物 `playwright-report/` および `test-results/` が含まれていなければならない（SHALL）。これにより CI/ローカル実行で生成されるレポート HTML や trace ファイルが誤って commit されることを防ぐ。

#### Scenario: .gitignore に Playwright 生成物が含まれる
- **WHEN** リポジトリルートの `.gitignore` を読み込む
- **THEN** `playwright-report/` および `test-results/` が含まれている
