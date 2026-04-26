## Why

`render.yaml` は本来 `autoDeployTrigger: checksPass`（CI 緑後にデプロイ）で運用したいが、GitHub Actions CI が未設定のため checks が永久に走らず stuck することを避ける暫定対応として `commit` 起点（コミットごとに即デプロイ）になっている（#128 参照）。この状態では PR 単位の品質ゲートが存在せず、lint / typecheck / test / build のいずれかが壊れたコードが master にマージされ、Render のビルドが落ちるまで気付けない。Issue #78 で `pnpm -r test` が実行可能になった今、CI を構築して `checksPass` トリガーへ切り戻し、master へのマージ前に品質を担保する基盤を整える必要がある。

## What Changes

- `.github/workflows/ci.yml` を新規作成し、以下の 5 ジョブで構成する
  - `install`: pnpm store キャッシュ + `pnpm install --frozen-lockfile` を実行し、後続ジョブで再利用される
  - `typecheck`: `pnpm -r typecheck` を実行（admin / reservation / shared が対象、apps/lp は typecheck script なしのためスキップされる）
  - `lint`: `pnpm --filter @high-q/lp lint` を実行（lp のみ lint script を持つ）
  - `test`: `pnpm -r test` を実行（lp / admin / reservation / shared 全 4 ワークスペース）
  - `build`: `pnpm -r build` を実行（lp / admin / reservation）
- ジョブは `install` 完了後に typecheck / lint / test / build の **4 並列**で起動し、`fail-fast: false` で 1 つ落ちても他は走り切る
- トリガーは以下を網羅する
  - `pull_request`: `opened` / `synchronize`（PR への push）/ `reopened` / `ready_for_review`、`branches: [master]` 限定
  - `push`: `branches: [master]`（マージ後の sanity check）
- `concurrency` group で同一 PR への連続 push 時に古い run を自動キャンセル（`cancel-in-progress` は `pull_request` 時のみ true、`push: master` 時は false）
- pnpm store のみキャッシュする（key: `pnpm-lock.yaml` の hash）。Vitest / Vite / `tsbuildinfo` / ESLint のキャッシュは本 change では導入しない
- Node バージョンは `22` 固定、pnpm は root `package.json` の `packageManager` に従う（`corepack enable` 経由）
- `render.yaml` の `autoDeployTrigger` を `commit` → `checksPass` に戻し、#128 の暫定対応を解消する
- 本 PR に CI 設定と `render.yaml` 修正を**同一コミット群で含める**（CI 構築直後に Render 連携を確認できるため）
- **追加スコープ（Apply 中に発見）**: `apps/lp/package.json` の lint script 修復（`--ignore-path .gitignore` 参照先が env 一元化 #118 で削除済みだったため lint がローカルで常時 ENOENT 失敗していた）と、それにより検出された既存 lint エラー 2 件の修正。CI を緑にする前提条件として本 PR スコープ内で対応する

## Capabilities

### New Capabilities
- `github-actions-ci`: GitHub Actions による Phase 1 ベースライン CI の規範を定義する。ワークフロー構成（install + 並列 4 ジョブ）、トリガー網羅、`concurrency` キャンセル戦略、pnpm store キャッシュ、Node 22 固定、Render との `checksPass` 連携前提を含む。

### Modified Capabilities
（なし — 既存 capability の要求は変更しない。`vitest-baseline` / `typescript-baseline` / `monorepo-workspace` の要求は CI 上でも同じく満たされることが前提となるが、これは仕様の追加ではなく実行環境の追加であり、各 capability の Requirements は変更しない。）

## Impact

- **コード**: `.github/workflows/ci.yml` 新規追加、`render.yaml` の `autoDeployTrigger` を 1 行修正（`commit` → `checksPass`）、`apps/lp/package.json` の lint script を `--ignore-path .gitignore` 削除 + `--fix` を `lint:fix` に分離、`apps/lp/src/widgets/event-calendar/model/useEventCalendar.spec.js` の未使用 import 削除、`apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` の `v-calendar` deprecated 警告を inline disable + TODO コメント（Vuetify Labs Calendar 移行は別 Issue 想定）
- **依存関係**: 変更なし（CI 上で `pnpm install --frozen-lockfile` するのみ。新規 npm 依存は追加しない）
- **インフラ**: Render の `checksPass` ゲートが有効化される。CI が落ちている間は Render が deploy しない（=master が壊れた時点でデプロイ停止する安全側の挙動）
- **ドキュメント**: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に CI 構成（ジョブ一覧 / トリガー / キャッシュ方針）と Render 連携を追記（sync フェーズで実施）
- **GitHub 設定**: master ブランチの branch protection で「Require status checks to pass before merging」に CI ジョブ（typecheck / lint / test / build）を必須登録する手順をタスクに含める。ただし branch protection の有効化自体は GitHub UI 操作のためタスクは「ユーザーへの依頼」として記述する
- **コスト**: GitHub Actions Free tier（public repo は無制限、private repo は月 2,000 分）。本リポジトリは public のため無料
- **スコープ外**:
  - Vitest / Vite / `tsbuildinfo` / ESLint のキャッシュ追加（効果対投資が薄い、別 Issue）
  - admin / reservation への lint 導入（lp のみで開始）
  - Playwright E2E / coverage / bundle size / dependency audit（Phase 2 以降）
  - merge_group / workflow_dispatch / schedule トリガー（現時点で必要性なし）
- **後続作業**: branch protection の必須チェック登録（ユーザー手動）／ CI 緑運用の継続観察 / 必要になったら ESLint や tsbuildinfo キャッシュ追加（別 Issue）
