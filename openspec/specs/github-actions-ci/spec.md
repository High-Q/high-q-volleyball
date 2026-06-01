# GitHub Actions CI Spec

## Purpose

CI ワークフロー (`.github/workflows/ci.yml`) の構成要件を定義する。
## Requirements
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

`lint` ジョブは `pnpm -r lint` で全アプリ（`apps/lp` / `apps/admin` / `apps/reservation`）の ESLint を実行しなければならない（SHALL）。`apps/admin` と `apps/reservation` には本 change で `lint` script を新規追加する（SHALL）。各アプリの lint script が無いワークスペースは `pnpm -r` の挙動でスキップされる前提とする。終了コード 0 で成功とみなす（SHALL）。

#### Scenario: lint コマンドが pnpm -r lint である
- **WHEN** lint ジョブのチェックステップを読み込む
- **THEN** `pnpm -r lint` が実行される

#### Scenario: admin と reservation の lint が CI で実行される
- **WHEN** `pnpm -r lint` を実行する
- **THEN** `apps/admin` と `apps/reservation` の ESLint も起動し、ESLint error 時に lint job が fail する

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

### Requirement: render.yaml の autoDeployTrigger が checksPass である
`render.yaml` の `services[0].autoDeployTrigger` は `checksPass` でなければならない（SHALL）。`commit` 値は本仕様適用後は許容してはならない（SHALL NOT）。これにより Render の自動デプロイは GitHub の commit status / Actions checks がすべて成功した時のみ起動する。

#### Scenario: render.yaml が checksPass を指定している
- **WHEN** `render.yaml` を読み込む
- **THEN** `services[0].autoDeployTrigger` の値が `checksPass` である

### Requirement: static-checks ジョブが構造ルール検査を CI で並列実行する

ワークフローは `static-checks` ジョブを持たなければならない（SHALL）。`static-checks` ジョブは `needs: install` を宣言し（SHALL）、`install` 完了後に他の typecheck / lint / test / build / e2e と並列で起動しなければならない（SHALL）。本ジョブは以下の step を実行しなければならない（SHALL）:

1. `service_role` 文字列の grep 検査（`apps/*/src/` 配下に出現したら fail）
2. `dependency-cruiser` の依存方向検証（違反で fail）
3. `stylelint` の `.vue` 内 `<style>` ブロック検査（warning で job 自体は pass）

各 step は非ゼロ終了で job を fail させなければならない（SHALL、warning 設計の step を除く）。

#### Scenario: static-checks が install を needs に持つ
- **WHEN** `.github/workflows/ci.yml` の `jobs.static-checks` を読み込む
- **THEN** `needs: install` が含まれる

#### Scenario: static-checks が他ジョブと並列に起動する
- **WHEN** install が成功した後の挙動を観察する
- **THEN** typecheck / lint / test / build / e2e / static-checks が同時刻に起動する

#### Scenario: service_role grep step が fail で job fail
- **WHEN** `apps/reservation/src/foo.ts` に `service_role` 文字列がある状態で CI が走る
- **THEN** static-checks job が fail する

### Requirement: migration-safety ジョブが SQL 静的解析を CI で実行する

ワークフローは `migration-safety` ジョブを持たなければならない（SHALL）。本ジョブは PR の変更ファイルに `supabase/migrations/**` が含まれる場合のみ起動しなければならない（SHALL、`paths-filter` または `dorny/paths-filter` 等で判定）。本ジョブは以下の step を実行しなければならない（SHALL）:

1. RLS ポリシー存在検査（allowlist 除外）
2. マイナンバー 12 桁 text 列禁止検査
3. ロールバック手順コメント存在 warning

`service_role` 検査と異なり migration 関連は変更頻度が低いため独立 job として隔離する。

#### Scenario: migrations 変更なしで migration-safety はスキップ
- **WHEN** PR の変更が `apps/` のみで `supabase/migrations/` を含まない
- **THEN** migration-safety job は起動しない（skipped）

#### Scenario: 新規 migration 追加で migration-safety が起動
- **WHEN** PR の変更に `supabase/migrations/*.sql` の追加が含まれる
- **THEN** migration-safety job が起動し、RLS / マイナンバー検査を実行する

#### Scenario: RLS なし migration で job fail
- **WHEN** 新規 migration ファイルに `create table` のみで `enable row level security` を含まない
- **THEN** migration-safety job が fail し、PR を merge できない

### Requirement: test ジョブが coverage threshold を計測する

`test` ジョブは `pnpm -r test:coverage` 相当のコマンドで vitest を coverage 計測モードで実行しなければならない（SHALL）。coverage threshold（lines / branches / functions）を満たさない場合 job が fail しなければならない（SHALL）。coverage report は次のいずれかの方法で可視化されなければならない（SHALL）:

- A. PR コメント
- B. GitHub Actions job summary
- C. `actions/upload-artifact` で `coverage/` を `retention-days: 14` で保存

#### Scenario: test ジョブが coverage を計測する
- **WHEN** test ジョブのチェックステップを読み込む
- **THEN** `pnpm -r test:coverage` または同等のコマンドが実行される

#### Scenario: coverage threshold 未達で test job fail
- **WHEN** いずれかの app で coverage が threshold を下回る
- **THEN** test job が fail する

#### Scenario: coverage report が可視化される
- **WHEN** test ジョブの step を読み込む
- **THEN** PR コメント / job summary / artifact upload のいずれかが設定されている

### Requirement: static-checks ジョブが 4 状態テスト存在と E2E 件数を warning として実行する

`static-checks` ジョブには以下の warning step を追加しなければならない（SHALL）:

1. 新規追加された `widgets/` / `features/` / `pages/` 配下の `.vue` ファイルに対応する `*.spec.ts` 内に `Loading` / `Empty` / `Error` / `Success` の test ケース名のいずれかを含むかの grep（含まない場合 warning）
2. `apps/*/e2e/` 配下の E2E ファイル数を機能ごとに集計（3 件以上で warning）

warning step は CI fail を引き起こしてはならない（SHALL NOT fail）。GitHub Actions の `::warning::` annotation で可視化しなければならない（SHALL）。

#### Scenario: 4 状態テスト無しの新規 .vue で warning
- **WHEN** PR で `apps/reservation/src/widgets/foo/Foo.vue` が新規追加され、対応 spec が無い
- **THEN** `::warning::` annotation が出るが static-checks job 自体は pass する

#### Scenario: E2E 機能あたり 3 件以上で warning
- **WHEN** `apps/reservation/e2e/booking-*.e2e.ts` が 3 ファイル以上ある
- **THEN** `::warning::` annotation が出るが job は pass する

