## REMOVED Requirements

### Requirement: CI への E2E 組込みは本仕様の対象外である
**Reason**: 本変更（playwright-e2e-ci-integration）で CI 統合が実装されたため、本要件は不要となる。
**Migration**: CI 統合の要件は `github-actions-ci` capability の `e2e` ジョブ関連要件群に移管された（本変更で同 capability に追加）。

## ADDED Requirements

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
