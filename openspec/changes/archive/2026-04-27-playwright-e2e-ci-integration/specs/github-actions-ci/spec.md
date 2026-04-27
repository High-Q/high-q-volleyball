## ADDED Requirements

### Requirement: e2e ジョブが install 後に並列実行される

ワークフローは `e2e` ジョブを持たなければならない（SHALL）。`e2e` ジョブは `needs: install` を宣言し（SHALL）、`install` 完了後に既存の `typecheck` / `lint` / `test` / `build` と並列で起動しなければならない（SHALL）。`build` ジョブの完了を待ってはならない（SHALL NOT）— Playwright の `webServer` 設定が独自に LP の build + preview を起動するため、CI レベルで build job との直列化は不要であり、wall time を最短化するために並列とする。`e2e` ジョブは Node 22 をセットアップし、`corepack enable` 経由で pnpm を有効化し、`pnpm install --frozen-lockfile` で依存を再構築しなければならない（SHALL）。

#### Scenario: e2e ジョブが install を needs に持つ
- **WHEN** `.github/workflows/ci.yml` の `jobs.e2e` を読み込む
- **THEN** `needs: install` が含まれる

#### Scenario: e2e ジョブが他 4 ジョブと並列に起動する
- **WHEN** install が成功した後の挙動を観察する
- **THEN** typecheck / lint / test / build / e2e が同時刻に起動する（連結されない）

#### Scenario: e2e ジョブが Node 22 と pnpm を使う
- **WHEN** e2e ジョブのセットアップステップを読み込む
- **THEN** `actions/setup-node` で `node-version: 22`、`corepack enable`、`pnpm install --frozen-lockfile` が順に実行される

### Requirement: e2e ジョブが Playwright ブラウザバイナリをキャッシュする

`e2e` ジョブは `actions/cache` を使用して Playwright のブラウザバイナリ（パス: `~/.cache/ms-playwright`）をキャッシュしなければならない（SHALL）。キャッシュキーは `runner.os` と `pnpm-lock.yaml` の hash を含まなければならない（SHALL）— `@playwright/test` のバージョンが上がると lockfile の hash が変わるため自動的に再 install される。キャッシュ miss 時は `pnpm exec playwright install chromium --with-deps` でブラウザバイナリと OS 依存ライブラリをインストールしなければならない（SHALL）。`firefox` / `webkit` のインストールは行ってはならない（SHALL NOT、Phase 1 の chromium のみ方針）。

#### Scenario: ブラウザバイナリのキャッシュキーが lockfile hash を含む
- **WHEN** e2e ジョブの `actions/cache` ステップを読み込む
- **THEN** `path` が `~/.cache/ms-playwright`、`key` に `playwright-` のプレフィックスと `hashFiles('**/pnpm-lock.yaml')` または `hashFiles('pnpm-lock.yaml')` が含まれる

#### Scenario: キャッシュ miss 時に chromium のみがインストールされる
- **WHEN** Playwright ブラウザバイナリのキャッシュが存在しない状態で e2e ジョブが起動する
- **THEN** `pnpm exec playwright install chromium --with-deps` が実行され、`firefox` / `webkit` を含む `playwright install` は実行されない

### Requirement: e2e ジョブが PR / master のトリガーに応じて smoke / full を切り替える

`e2e` ジョブの Playwright 実行ステップは、トリガーが `pull_request` の場合は `pnpm test:e2e:smoke`（または `pnpm test:e2e --grep '@smoke'` 相当）でタグ `@smoke` の付いた E2E のみを実行しなければならない（SHALL）。トリガーが `push: master` の場合は `pnpm test:e2e` で全 E2E を実行しなければならない（SHALL）。トリガー判定は `github.event_name` を使用しなければならない（SHALL）。

#### Scenario: PR push では smoke のみが実行される
- **WHEN** PR が push され e2e ジョブが起動する
- **THEN** Playwright が `--grep '@smoke'` 相当のフィルタで起動し、`@smoke` タグの付いた test のみが実行される

#### Scenario: master push では全 E2E が実行される
- **WHEN** master へ push され e2e ジョブが起動する
- **THEN** Playwright が grep フィルタなしで起動し、`e2e/**/*.e2e.ts` 配下のすべての test が実行される

#### Scenario: トリガー判定に github.event_name が使われる
- **WHEN** e2e ジョブの実行ステップを読み込む
- **THEN** smoke / full の切替条件に `github.event_name == 'pull_request'` または `github.event_name == 'push'` が使われている

### Requirement: e2e ジョブが失敗時のみ Playwright レポートを artifact としてアップロードする

`e2e` ジョブは `actions/upload-artifact` を使って `playwright-report/` および `test-results/` をアップロードしなければならない（SHALL）。アップロード条件は `if: failure() || cancelled()` でなければならず（SHALL）、成功時はアップロードしてはならない（SHALL NOT、ストレージ容量節約のため）。`retention-days` は `14` でなければならない（SHALL、GitHub のデフォルト 90 日では長すぎる）。アップロード対象 path は `playwright-report/` と `test-results/` の双方を含まなければならない（SHALL）。

#### Scenario: 失敗時のみ artifact がアップロードされる
- **WHEN** e2e ジョブの `actions/upload-artifact` ステップを読み込む
- **THEN** `if: failure() || cancelled()` 条件が指定されている

#### Scenario: artifact の retention が 14 日である
- **WHEN** e2e ジョブの `actions/upload-artifact` ステップを読み込む
- **THEN** `retention-days: 14` が指定されている

#### Scenario: artifact に playwright-report と test-results の双方が含まれる
- **WHEN** e2e ジョブの `actions/upload-artifact` ステップを読み込む
- **THEN** `path` に `playwright-report/` と `test-results/` の両ディレクトリが含まれる（複数行 path、または個別の upload-artifact ステップで両方カバーされる）

### Requirement: e2e ジョブが既存ジョブの失敗で連鎖キャンセルされない

`e2e` ジョブは他ジョブ（typecheck / lint / test / build）の失敗によってキャンセルされてはならない（SHALL NOT）。`needs` には `install` のみを指定しなければならず（SHALL）、`build` を含めてはならない（SHALL NOT、並列性を確保するため）。これにより 1 ジョブの失敗が CI 全体を止めず、すべてのチェック結果を 1 run で得られる（既存 4 job との同方針）。

#### Scenario: e2e の needs が install のみである
- **WHEN** `.github/workflows/ci.yml` の `jobs.e2e.needs` を読み込む
- **THEN** `install` のみが含まれており、`build` / `test` / `typecheck` / `lint` は含まれない

#### Scenario: 他ジョブが落ちても e2e は走り切る
- **WHEN** typecheck / lint / test / build のいずれかが失敗する
- **THEN** e2e ジョブはキャンセルされず最後まで走る
