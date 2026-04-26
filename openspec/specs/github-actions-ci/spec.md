## ADDED Requirements

### Requirement: CI ワークフローファイルが `.github/workflows/ci.yml` に存在する
リポジトリには `.github/workflows/ci.yml` が存在しなければならない（SHALL）。当該ファイルは GitHub Actions の YAML 構文として valid でなければならず（SHALL）、`name`、`on`、`jobs` のトップレベルキーを持たなければならない（SHALL）。ワークフロー名は `CI` でなければならない（SHALL）。

#### Scenario: CI ワークフローファイルが存在する
- **WHEN** リポジトリルートから `.github/workflows/ci.yml` を読み込む
- **THEN** ファイルが存在し、YAML として parse 可能で、`name: CI` を含む

### Requirement: トリガーが pull_request と push: master を網羅する
`.github/workflows/ci.yml` の `on` には `pull_request` と `push` の双方を含まなければならない（SHALL）。`pull_request` の `types` は `opened` / `synchronize` / `reopened` / `ready_for_review` の 4 種を含まなければならない（SHALL）。`pull_request` の `branches` は `master` のみを対象としなければならない（SHALL）。`push` の `branches` も `master` のみを対象としなければならない（SHALL）。draft 状態の PR では CI を起動してはならない（SHALL NOT、`ready_for_review` を含めることで実現する）。

#### Scenario: pull_request トリガーが必要な types を網羅している
- **WHEN** `.github/workflows/ci.yml` の `on.pull_request.types` を読み込む
- **THEN** `opened`、`synchronize`、`reopened`、`ready_for_review` の 4 値が含まれている

#### Scenario: pull_request の branches が master 限定である
- **WHEN** `.github/workflows/ci.yml` の `on.pull_request.branches` を読み込む
- **THEN** `master` が含まれており、他のブランチは対象外である

#### Scenario: push トリガーが master 限定である
- **WHEN** `.github/workflows/ci.yml` の `on.push.branches` を読み込む
- **THEN** `master` が含まれており、他のブランチは対象外である

#### Scenario: draft PR では CI が起動しない
- **WHEN** PR が draft 状態で作成・更新される
- **THEN** CI ワークフローは起動しない（`ready_for_review` イベントで初めて起動する）

### Requirement: concurrency group で同一 PR の古い run を自動キャンセルする
`.github/workflows/ci.yml` のトップレベルに `concurrency` が定義されていなければならない（SHALL）。`group` には `github.workflow` と `github.ref` を含むキーを使用しなければならない（SHALL）。`cancel-in-progress` は `pull_request` イベント時のみ `true`、`push: master` イベント時は `false` でなければならない（SHALL）。これにより同一 PR への連続 push 時に古い run は自動キャンセルされ、master への push では走り切ることが保証される。

#### Scenario: PR への連続 push で古い run が自動キャンセルされる
- **WHEN** 同一 PR で進行中の CI run があり、新たなコミットが push される
- **THEN** 古い run はキャンセルされ、新しい commit に対する run のみが走る

#### Scenario: master への push では run がキャンセルされない
- **WHEN** master への push が連続して発生する
- **THEN** すべての run が走り切り、いずれもキャンセルされない

### Requirement: install ジョブが pnpm store キャッシュを利用して依存解決する
ワークフローは依存解決用の `install` ジョブを持たなければならない（SHALL）。`install` ジョブは Node 22 をセットアップし（SHALL）、`corepack enable` 経由で root `package.json` の `packageManager` 指定 pnpm を有効化しなければならない（SHALL）。pnpm store ディレクトリは `actions/cache` でキャッシュされ、キャッシュキーには `pnpm-lock.yaml` の hash を含めなければならない（SHALL）。依存解決は `pnpm install --frozen-lockfile` で行わなければならず（SHALL）、lockfile に従わない install を許可してはならない（SHALL NOT）。

#### Scenario: install ジョブが Node 22 を使う
- **WHEN** install ジョブの `actions/setup-node` ステップを読み込む
- **THEN** `node-version` が `22` または `22.x` である

#### Scenario: pnpm store キャッシュキーが lockfile hash を含む
- **WHEN** install ジョブの `actions/cache` ステップを読み込む
- **THEN** `key` に `hashFiles('**/pnpm-lock.yaml')` または `hashFiles('pnpm-lock.yaml')` が含まれる

#### Scenario: install が frozen-lockfile で実行される
- **WHEN** install ジョブのインストールステップを読み込む
- **THEN** `pnpm install --frozen-lockfile` が実行される

### Requirement: typecheck / lint / test / build の 4 ジョブが install 後に並列実行される
ワークフローは `typecheck`、`lint`、`test`、`build` の 4 ジョブを持たなければならない（SHALL）。各ジョブは `needs: install` を宣言し（SHALL）、`install` 完了後に並列で起動しなければならない（SHALL）。`fail-fast` は `false` でなければならない（SHALL）— ただし `fail-fast` は matrix 配下のオプションのため、`needs: install` で連結された通常 job 群では各 job が独立に実行され、1 job の失敗が他 job をキャンセルしないことを保証する。各ジョブは Node 22 をセットアップし、`pnpm install --frozen-lockfile`（pnpm store キャッシュをヒットさせるため offline モード可）で依存を再構築しなければならない（SHALL）。

#### Scenario: 4 ジョブが install を needs に持つ
- **WHEN** `.github/workflows/ci.yml` の `jobs.typecheck`、`jobs.lint`、`jobs.test`、`jobs.build` を読み込む
- **THEN** いずれも `needs: install` を含む

#### Scenario: 4 ジョブが並列に起動する
- **WHEN** install が成功した後の挙動を観察する
- **THEN** typecheck / lint / test / build が同時刻に起動する（連結されない）

#### Scenario: 1 ジョブの失敗が他ジョブをキャンセルしない
- **WHEN** typecheck が失敗する
- **THEN** lint / test / build はキャンセルされず最後まで走る

### Requirement: typecheck ジョブが pnpm -r typecheck を実行する
`typecheck` ジョブは `pnpm -r typecheck` を実行しなければならない（SHALL）。`pnpm -r typecheck` は `typecheck` script を持つワークスペース（admin / reservation / shared）に対して実行され、当該 script を持たないワークスペース（lp）はスキップされる前提とする。終了コード 0 で成功とみなす（SHALL）。

#### Scenario: typecheck コマンドが pnpm -r typecheck である
- **WHEN** typecheck ジョブのチェックステップを読み込む
- **THEN** `pnpm -r typecheck` が実行される

### Requirement: lint ジョブが apps/lp の lint を実行する
`lint` ジョブは `pnpm --filter @high-q/lp lint` または同等のコマンドで `apps/lp` の ESLint を実行しなければならない（SHALL）。`apps/admin` と `apps/reservation` には現時点で lint script が存在しないため対象外とする（SHALL NOT 実行）。終了コード 0 で成功とみなす（SHALL）。

#### Scenario: lint コマンドが apps/lp 限定で実行される
- **WHEN** lint ジョブのチェックステップを読み込む
- **THEN** `pnpm --filter @high-q/lp lint` または `pnpm --filter ./apps/lp lint` が実行される

### Requirement: test ジョブが pnpm -r test を実行する
`test` ジョブは `pnpm -r test` を実行しなければならない（SHALL）。`pnpm -r test` は lp / admin / reservation / shared 全 4 ワークスペースの Vitest を起動し、いずれかが失敗した場合にジョブも失敗しなければならない（SHALL）。終了コード 0 で成功とみなす（SHALL）。

#### Scenario: test コマンドが pnpm -r test である
- **WHEN** test ジョブのチェックステップを読み込む
- **THEN** `pnpm -r test` が実行される

### Requirement: build ジョブが pnpm -r build を実行する
`build` ジョブは `pnpm -r build` を実行しなければならない（SHALL）。`pnpm -r build` は lp / admin / reservation の Vite ビルドを起動する（shared は build script を持たない前提でスキップされる）。終了コード 0 で成功とみなす（SHALL）。ビルド成果物の artifact 保存は本仕様の対象外であり、行ってはならない（SHALL NOT）— Render が自身でビルドするため CI でのビルド成果物保存は不要。

#### Scenario: build コマンドが pnpm -r build である
- **WHEN** build ジョブのチェックステップを読み込む
- **THEN** `pnpm -r build` が実行される

#### Scenario: ビルド成果物の artifact 保存を行わない
- **WHEN** build ジョブのステップを読み込む
- **THEN** `actions/upload-artifact` ステップが存在しない

### Requirement: render.yaml の autoDeployTrigger が checksPass である
`render.yaml` の `services[0].autoDeployTrigger` は `checksPass` でなければならない（SHALL）。`commit` 値は本仕様適用後は許容してはならない（SHALL NOT）。これにより Render の自動デプロイは GitHub の commit status / Actions checks がすべて成功した時のみ起動する。

#### Scenario: render.yaml が checksPass を指定している
- **WHEN** `render.yaml` を読み込む
- **THEN** `services[0].autoDeployTrigger` の値が `checksPass` である
