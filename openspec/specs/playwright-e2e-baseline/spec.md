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

### Requirement: smoke E2E は `@smoke` タグで識別される

`e2e/lp/smoke.e2e.ts` の `test()` 呼び出しは Playwright の test annotation 機能で `@smoke` タグを持たなければならない（SHALL）。具体的には test タイトルに `@smoke` 文字列を含めるか、`test.describe` のタイトルまたは個別 test のタイトルに `@smoke` を含めることで Playwright の `--grep '@smoke'` でフィルタ可能でなければならない（SHALL）。`@smoke` タグは smoke 相当（データ非依存・「壊滅していない」検出）の E2E にのみ付与しなければならず（SHALL）、データ依存・動的挙動の E2E に付与してはならない（SHALL NOT、smoke の意味論を保つため）。

#### Scenario: smoke E2E が `@smoke` タグを持つ
- **WHEN** `e2e/lp/smoke.e2e.ts` を読み込む
- **THEN** `test.describe` のタイトルまたは `test()` のタイトルに `@smoke` 文字列が含まれる

#### Scenario: `--grep '@smoke'` で smoke のみがフィルタされる
- **WHEN** リポジトリルートで `pnpm exec playwright test --grep '@smoke'` を実行する
- **THEN** `e2e/lp/smoke.e2e.ts` の test が選択され実行される（他にタグなし test が存在する場合はスキップされる）

### Requirement: ルートで `pnpm test:e2e:smoke` が smoke サブセットを実行できる

リポジトリルート `package.json` の `scripts` に `"test:e2e:smoke"` が定義されていなければならない（SHALL）。その値は `playwright test --grep '@smoke'` または同等のコマンド（環境変数経由でフィルタを渡す形を含む）でなければならない（SHALL）。`pnpm test:e2e:smoke` 実行時は `@smoke` タグの付いた test のみが実行されなければならず（SHALL）、終了コード 0 で成功とみなす（SHALL）。これによりローカルで CI と同じ smoke サブセットを再現可能とする。

#### Scenario: ルート package.json に test:e2e:smoke スクリプトが定義されている
- **WHEN** リポジトリルート `package.json` を読み込む
- **THEN** `scripts.test:e2e:smoke` が定義されており、`--grep` または同等のフィルタで `@smoke` のみを対象としている

#### Scenario: pnpm test:e2e:smoke が smoke のみを実行する
- **WHEN** リポジトリルートで `pnpm test:e2e:smoke` を実行する
- **THEN** `@smoke` タグの付いた E2E のみが実行され、終了コード 0 で終了する

### Requirement: dynamic 挙動の E2E は `@smoke` タグを付けてはならない

API レスポンスや時刻に依存する dynamic 挙動を検証する E2E test は、`@smoke` タグを付けてはならない（SHALL NOT）。具体的には以下のいずれかに該当する test は `@smoke` 対象外とする:
- ネットワークレスポンス（API 取得結果、`page.route()` で intercept する対象）に依存する assert を含む
- `page.clock` で時刻を固定しないと結果が変わる
- ユーザー操作（クリック・入力・スクロール等）による状態変化を assert する
- フレーク傾向のあるアニメーション・タイミング依存の挙動を含む

これらは master push 時のフル E2E でのみ実行されなければならず（SHALL）、PR push 時には実行されてはならない（SHALL NOT）。理由は次の 2 点:
1. **PR feedback loop の保護**: dynamic 挙動 E2E は安定性が劣り wall time も長い。PR ごとに走らせると CI ハードリミット閾値（PR < 3 分）を超過する危険がある
2. **smoke 意味論の保護**: smoke は「アプリ壊滅検出」が目的であり、データ依存の fail は smoke の信頼性を損なう

#### Scenario: dynamic 挙動 E2E に @smoke が付与されていない
- **WHEN** `e2e/` 配下の test ファイルを読み込み、`page.route()` / `page.clock` / クリック等のユーザー操作 assert を含む test を識別する
- **THEN** 当該 test の test name および describe name に `@smoke` 文字列が含まれていない

#### Scenario: PR push で dynamic 挙動 E2E が実行されない
- **WHEN** PR push トリガで `pnpm test:e2e:smoke` が実行される
- **THEN** dynamic 挙動 E2E（`page.route()` 等を含む test）は filter で除外され実行されない

### Requirement: Playwright のレポート / 結果ファイルが Git 管理から除外される
リポジトリルートの `.gitignore` には Playwright の生成物 `playwright-report/` および `test-results/` が含まれていなければならない（SHALL）。これにより CI/ローカル実行で生成されるレポート HTML や trace ファイルが誤って commit されることを防ぐ。

#### Scenario: .gitignore に Playwright 生成物が含まれる
- **WHEN** リポジトリルートの `.gitignore` を読み込む
- **THEN** `playwright-report/` および `test-results/` が含まれている
