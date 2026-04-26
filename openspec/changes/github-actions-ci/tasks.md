## 1. ブランチと前提整備

- [x] 1.1 Issue #80 に紐づく作業ブランチ `feature/80-github-actions-ci` を切る
- [x] 1.2 リポジトリルートで `pnpm -r typecheck && pnpm -r test && pnpm -r build && pnpm --filter @high-q/lp lint` を実行し、ローカルで全コマンドが成功することを確認する（CI 構築前の baseline）。**lint が ENOENT で失敗したため D11 の追加スコープを発生させ、修復済み**
- [x] 1.3 `.github/` ディレクトリの存在を確認（既に `dependabot.yml` があるため新規作成不要）

## 2. CI ワークフローファイルの作成

- [x] 2.1 `.github/workflows/` ディレクトリを新規作成する
- [x] 2.2 `.github/workflows/ci.yml` を新規作成し、`name: CI` を設定する
- [x] 2.3 `on.pull_request` に `types: [opened, synchronize, reopened, ready_for_review]`、`branches: [master]` を設定する
- [x] 2.4 `on.push` に `branches: [master]` を設定する
- [x] 2.5 トップレベル `concurrency` を `group: ci-${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` で設定する

## 3. install ジョブの実装

- [x] 3.1 `jobs.install` を `runs-on: ubuntu-latest` で定義する
- [x] 3.2 `actions/checkout@v4` ステップを追加する
- [x] 3.3 `actions/setup-node@v4` で `node-version: 22` を設定する
- [x] 3.4 `corepack enable` を実行するステップを追加し、root `package.json` の `packageManager` 指定 pnpm を有効化する
- [x] 3.5 `pnpm config get store-path` で store path を取得し、`echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV` で環境変数化する
- [x] 3.6 `actions/cache@v4` で `path: ${{ env.STORE_PATH }}`、`key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}`、`restore-keys: pnpm-store-${{ runner.os }}-` を設定する
- [x] 3.7 `pnpm install --frozen-lockfile` ステップを追加する

## 4. typecheck ジョブの実装

- [x] 4.1 `jobs.typecheck` を `needs: install`、`runs-on: ubuntu-latest` で定義する
- [x] 4.2 install ジョブと同等の checkout / setup-node / corepack / cache / install ステップを追加する（pnpm store キャッシュ restore + `pnpm install --frozen-lockfile` で `node_modules` を再構築）
- [x] 4.3 `pnpm -r typecheck` を実行するステップを追加する

## 5. lint ジョブの実装

- [x] 5.1 `jobs.lint` を `needs: install`、`runs-on: ubuntu-latest` で定義する
- [x] 5.2 typecheck ジョブと同等の checkout / setup-node / corepack / cache / install ステップを追加する
- [x] 5.3 `pnpm --filter @high-q/lp lint` を実行するステップを追加する（admin / reservation は lint script 未定義のため対象外）

## 6. test ジョブの実装

- [x] 6.1 `jobs.test` を `needs: install`、`runs-on: ubuntu-latest` で定義する
- [x] 6.2 typecheck ジョブと同等の checkout / setup-node / corepack / cache / install ステップを追加する
- [x] 6.3 `pnpm -r test` を実行するステップを追加する（lp / admin / reservation / shared 全 4 ワークスペース）

## 7. build ジョブの実装

- [x] 7.1 `jobs.build` を `needs: install`、`runs-on: ubuntu-latest` で定義する
- [x] 7.2 typecheck ジョブと同等の checkout / setup-node / corepack / cache / install ステップを追加する
- [x] 7.3 `pnpm -r build` を実行するステップを追加する
- [x] 7.4 `actions/upload-artifact` ステップを **追加しない** ことを確認する（仕様で禁止、Render が自身でビルドするため）

## 8. CI ファイルの構文検証とコミット

- [x] 8.1 `.github/workflows/ci.yml` を YAML linter（任意、`yq eval` 等）で parse して構文エラーがないことを確認する
- [x] 8.2 ジョブ名が `install` / `typecheck` / `lint` / `test` / `build` の 5 つで一致していることを確認する（branch protection の Required checks 名と紐づくため命名固定）
- [ ] 8.3 ここまでの内容を 1 コミット（例: `chore(ci): GitHub Actions CI ワークフローを新規作成`）でコミットし、ブランチに push する
- [ ] 8.4 GitHub 上で PR を作成し、初回 CI run が起動して install → 4 並列 job が走ることを確認する
- [ ] 8.5 4 ジョブすべてが緑になることを確認する。落ちた場合は原因（design.md Open Question 2: jsdom prepare script 等）を特定して修正コミットを追加する

## 9. concurrency 動作の確認

- [ ] 9.1 PR ブランチに連続 2 commit を push し、古い run が自動キャンセルされ新しい run のみ走ることを確認する（`cancel-in-progress: true` 動作）
- [ ] 9.2 同一 PR を一度 draft に戻し、コミット push しても CI が起動しないことを確認する
- [ ] 9.3 PR を ready for review に戻すと CI が起動することを確認する

## 10. render.yaml の autoDeployTrigger 切り戻し

- [ ] 10.1 `render.yaml` の `services[0].autoDeployTrigger` を `commit` → `checksPass` に変更する
- [ ] 10.2 当該変更箇所のコメント（#128 を参照する暫定対応の説明）を更新し、「#80 完了で `checksPass` に戻した」旨を残す
- [ ] 10.3 別コミット（例: `chore(infra): autoDeployTrigger を checksPass に戻す（#128 暫定対応の解消）`）でコミットして push する
- [ ] 10.4 PR 上で再度 CI が走り、4 ジョブすべてが緑であることを確認する

## 11. ドキュメント整備（sync フェーズで実施）

- [ ] 11.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に以下を追記する: ① CI ジョブ一覧（install + 4 並列） ② トリガー網羅 ③ pnpm store キャッシュ方針 ④ Render との `checksPass` 連携
- [ ] 11.2 CLAUDE.md Pillar 5 の「デプロイ 3 回連続失敗時の対応」記述で `checksPass` 前提を確認し、必要なら CI 失敗時のトラブルシュート手順を補足する
- [ ] 11.3 `openspec/specs/github-actions-ci/spec.md` を本 change の `specs/github-actions-ci/spec.md` の内容で新規作成する（sync フェーズで実施）

## 12. 全体検証

- [ ] 12.1 PR 上で CI が緑であることを最終確認する
- [ ] 12.2 ローカルで `pnpm -r typecheck && pnpm -r test && pnpm -r build && pnpm --filter @high-q/lp lint` が引き続き成功することを確認する（CI と挙動を揃える）
- [ ] 12.3 `openspec validate github-actions-ci --strict` を実行し、change の整合性を検証する
- [ ] 12.4 design.md の Open Questions について実装で取った選択（特に Q2: `--ignore-scripts` 要否）をこの最終タスクのコメントとしてユーザーに報告する

## 13. ユーザー手動作業の依頼（Apply 後・Merge 後に実施）

- [ ] 13.1 PR merge 後、master の Render 自動デプロイが `checksPass` トリガーで起動することを Render Dashboard で確認するようユーザーに依頼する（Claude は確認できない）
- [ ] 13.2 master ブランチの GitHub branch protection 設定で「Require status checks to pass before merging」に `typecheck` / `lint` / `test` / `build` の 4 ジョブを Required status checks として登録するようユーザーに依頼する。design.md Open Question 1 の推奨は「案 B: CI が数日緑で安定してから登録」だが、最終判断はユーザーに委ねる
