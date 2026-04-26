## Context

`render.yaml` 上で本来運用したい `autoDeployTrigger: checksPass`（CI 緑後にデプロイ）が、CI 未設定により checks が永久に走らず stuck することを避けるため `commit`（コミットごとに即デプロイ）に暫定設定されている（#128）。これにより以下の問題が発生している:

| 問題 | 影響 |
|---|---|
| PR 単位の品質ゲートが存在しない | lint/typecheck/test/build いずれかが壊れたコードが master にマージされ得る |
| Render が壊れたコードでも deploy を試みる | ビルド失敗 → サービス停止のリスク |
| `pnpm -r test` が #78 で動くようになっても自動実行されない | TDD のフィードバックループが手動依存 |

Issue #78（Vitest 基盤）の完了で `pnpm -r test` が走るようになり、CI を組む前提条件が揃った。本 change で `.github/workflows/ci.yml` を新規作成し、Render の `autoDeployTrigger` を `checksPass` に切り戻す。

ステークホルダー: 個人開発オーナー（=ユーザー）／Claude Code（実装エージェント）／Render 自動デプロイ。GitHub Actions の利用枠は public repo のため**無料・無制限**。

参照: `render.yaml`、`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`、CLAUDE.md Pillar 5（Git & デプロイ安全性）。

## Goals / Non-Goals

**Goals:**
- master 向けの全 PR で typecheck / lint / test / build が自動実行され、4 ジョブすべてが緑になるまでマージできない状態を作る（branch protection の登録は別途ユーザー手動操作）
- CI 全体の所要時間を **3 分以内** に収める（install キャッシュ命中時）
- 同一 PR への連続 push で古い run を自動キャンセルし、無駄な実行と待ち時間を削減する
- master への直接 push（マージ後の sanity check）でも CI を実行する
- `render.yaml` を `checksPass` に戻し、CI が落ちている間は Render が deploy しない安全側挙動にする
- ジョブ間の依存と並列性を明示する（install → 4 並列）
- CI ファイル自体は将来 lint や coverage を追加しやすい構造にしておく（`needs: install` パターン）

**Non-Goals:**
- Vitest / Vite / `tsbuildinfo` / ESLint のキャッシュ追加（pnpm store のみ）
- admin / reservation への lint script 追加（lp のみで開始、別 Issue で展開）
- Playwright E2E / coverage 計測 / bundle size check / dependency audit
- merge_group / workflow_dispatch / schedule トリガー
- branch protection rule の有効化自体（GitHub UI 操作のため、CI 緑確認後にユーザー手動で登録）
- Slack / Discord 通知連携
- Self-hosted runner（GitHub-hosted で十分）
- Matrix build（OS / Node 複数バージョン）

## Decisions

### D1. ジョブ構成: install + 4 並列ジョブ（typecheck / lint / test / build）

```
[install]
  ↓ needs
  ├── [typecheck]
  ├── [lint]
  ├── [test]
  └── [build]
```

**Why:**
- 4 ジョブを並列化することで CI 全体時間が「最も遅い 1 job + install」に支配される構造になる（直列なら和になる）
- `needs: install` で install を 1 回だけ実行し、各 job では pnpm store キャッシュをヒットさせて再 install を高速化
- 各 job が独立 runner で動くため `fail-fast` 的挙動になりにくい（matrix の `fail-fast: false` 相当が暗黙に達成される）
- 1 job 失敗時に他 job のログも確認できる → 修正の手戻りが減る

**Alternatives considered:**
- 1 ジョブ内で 4 ステップ直列 → 1 失敗で残りスキップ・全体時間が和になる、却下
- matrix で `[typecheck, lint, test, build]` を 1 job 内マトリクス化 → matrix 内の failover で他バリアントもキャンセルされうる、`fail-fast: false` 必須・記述が複雑、却下
- per-app に分割（admin/typecheck, lp/typecheck, …）→ 過剰並列化、`pnpm -r` の方がシンプル、却下

### D2. install ジョブの実体: 「依存解決と pnpm store 暖機」専用

install ジョブは **テスト実行はせず**、以下のみ行う:
1. `actions/checkout`
2. `actions/setup-node@v4` (`node-version: 22`)
3. `corepack enable` (root `package.json` の `packageManager` に従って pnpm 有効化)
4. `actions/cache` で pnpm store path をキャッシュ（key: lockfile hash）
5. `pnpm install --frozen-lockfile`

下流の typecheck/lint/test/build ジョブは **pnpm store キャッシュを restore して再度 `pnpm install --frozen-lockfile`** する。store がキャッシュ命中していれば実質 offline で `node_modules` を構築するだけのため高速。

**Why:**
- `node_modules` をジョブ間で artifact 経由で共有する案もあるが、monorepo の `node_modules` は数百 MB で artifact 圧縮/解凍コストが大きい
- pnpm store キャッシュ（hard link 元）を共有して各 job で `node_modules` を再構築する方が、GitHub Actions cache の特性（zstd 圧縮 / 並列 fetch）に合い高速
- install ジョブは「キャッシュ更新」「lockfile 整合性チェック」を兼ねる。lockfile が壊れていれば全 job が走る前にここで落ちる

**Alternatives considered:**
- install ジョブを設けず各 job 冒頭で setup → `actions/cache` の race condition で同時並行 save が無駄に発生、初回キャッシュ作成が遅延、却下
- `actions/upload-artifact` で `node_modules` を artifact 化 → 圧縮/解凍コストとサイズ制限、却下

### D3. トリガー設計

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    branches: [master]
  push:
    branches: [master]
```

**Why:**
- `opened`: PR 新規作成
- `synchronize`: PR への push（最頻イベント、これがないと PR 更新で CI が走らない）
- `reopened`: 一度 close した PR の再開
- `ready_for_review`: draft → ready の切替（draft 中は CI 不要、ready で初めて起動）
- `branches: [master]`: master 向け PR のみ対象。将来 develop 等を作っても明示しない限り無駄に走らない
- `push: master`: マージ後の sanity check（squash merge で commit が変わるため、PR 時の checks が必ずしも post-merge を反映しない）

**Alternatives considered:**
- `on: [pull_request, push]`（types 省略） → デフォルトの `opened, synchronize, reopened` のみで `ready_for_review` が漏れ、draft → ready 切替で CI が走らない、却下
- 全ブランチで CI 実行 → 個人開発で短命ブランチが多い、無駄、却下
- `merge_group` 追加 → Merge Queue 未使用、不要

### D4. `concurrency` 設計

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- `group` が `github.ref` を含む → 同一ブランチ（=同一 PR or master）の run がグループ化される
- `cancel-in-progress` を `pull_request` のみ true にする → 同一 PR への連続 push で古い run をキャンセル、master への push はキャンセルしない（履歴の commit すべてに checks を残したい）

**Why:**
- 個人開発で「1 PR に勢いよくコミットを積む」運用と相性が良い。古い run が走り続けると新しい commit の結果が出るのが遅れる
- master の push は履歴上の各 commit に対して必ず checks を残すべき（hot fix の roll-back 判断材料になる）

**Alternatives considered:**
- `cancel-in-progress: true` 一律 → master 履歴に checks が残らない、却下
- `cancel-in-progress: false` 一律 → PR の連続 push で run が積み上がる、無駄、却下

### D5. キャッシュ戦略: pnpm store のみ

| キャッシュ | 採用 | 理由 |
|---|---|---|
| pnpm store | ✅ | install を 90s → 15s（-75s）、key 設計が lockfile hash で確定的 |
| Vite build cache (`.vite`) | ❌ | アプリコード変更時に効果薄、size 大 |
| Vitest cache | ❌ | jsdom 起動が支配的、cache 書込で相殺 |
| `*.tsbuildinfo` | ❌ | `tsc --build` モード未使用、ヒット率低 |
| `.eslintcache` | ❌ | lp 単独 lint のため効果限定、別 Issue で検討 |

**Why:**
- GitHub Actions cache の無料枠は **10GB / repo**。複数キャッシュを積むと evict で先入れキャッシュが消え、結果的に pnpm store のヒット率が下がる事故が起きる
- 早すぎる最適化を避け、必要になったら測定して追加する

**Cache key 設計:**
```yaml
key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
restore-keys: |
  pnpm-store-${{ runner.os }}-
```

`restore-keys` で部分一致 fallback を許可 → lockfile を更新した PR でも古い store から差分のみ fetch でき、フルクリーンを避けられる。

### D6. `render.yaml` の `autoDeployTrigger` 切り戻し

`autoDeployTrigger: commit` → `autoDeployTrigger: checksPass` に変更。本 PR に同梱する。

**Why:**
- CI 構築と Render 連携を**同一 PR で動作確認**できる方が安全。別 PR に分けると「CI が緑なのに `commit` トリガーで先にデプロイされる」中間状態が発生する
- #128 の暫定対応の解消はずっと TODO だったので、ここで一気に正常化する

**Risk:** 本 PR の CI が初回 run でこける可能性 → その場合は `render.yaml` の修正だけ revert し、CI を直してから再度切り戻す（rollback plan は後述）。

### D7. Node バージョン: 22 固定

`actions/setup-node@v4` で `node-version: 22` を指定。`engines.node >= 22` と一致。

**Why:** root `package.json` の `engines.node` と `render.yaml` の `NODE_VERSION: "22"` と整合。マイナーは指定せず GitHub-hosted runner の最新 22.x に追随。

**Alternatives considered:**
- `node-version-file: .nvmrc` → `.nvmrc` 未配置、追加コスト
- 22.11.0 などピン止め → seurity patch 取り逃しリスク、却下

### D8. pnpm のセットアップ方法: `corepack enable`

`pnpm/action-setup` を使わず、`corepack enable` で root `package.json` の `packageManager` フィールド指定の pnpm を有効化する。

**Why:**
- `render.yaml` の buildCommand と一致（`corepack enable && pnpm install --prod ...`）→ ローカル / Render / CI の挙動を揃える
- `packageManager: pnpm@10.x` の単一の真実の源を保てる
- `pnpm/action-setup` は version を別途指定する必要があり二重管理になる

### D9. lint ジョブの対象を apps/lp に限定

`pnpm --filter @high-q/lp lint` のみ実行。admin / reservation には lint script 自体がない。

**Why:**
- 現状 lp のみ lint script を持つ。`pnpm -r lint` は admin/reservation で `Command "lint" not found` で stuck する可能性
- 将来 admin/reservation に lint を追加する別 Issue を起こす際は、lint job の command を `pnpm -r lint` に変えるだけで対応できる構造を保つ
- `pnpm -r lint` が走らないことを CLAUDE.md に明示しておく必要はない（CI ファイル自体が真実の源）

### D11. lp lint script の修復（Apply 中に発見した追加スコープ）

Apply 開始時の baseline 確認で `pnpm --filter @high-q/lp lint` が `ENOENT: apps/lp/.gitignore` で失敗していることが判明。原因は env 一元化 PR #118 で `apps/lp/.gitignore` が削除されたが lint script の `--ignore-path .gitignore` が更新されなかったため。

**修正内容:**
- `lint` script から `--ignore-path .gitignore` を削除（root の `.eslintrc.js` と ESLint デフォルトの ignore で十分）
- `--fix` を `lint` から外し、新規 `lint:fix` script に分離（CI で勝手にコード修正されないため）
- 修復によって検出された既存 lint エラー 2 件（`useEventCalendar.spec.js` の未使用 `beforeEach`、`EventCalendar.vue` の deprecated `v-calendar`）を本 PR で対応
  - `v-calendar` は Vuetify 3 で deprecated（Labs 移行）。完全な migration は別 Issue 規模のため、ここでは inline `eslint-disable-next-line` + TODO コメントで CI を緑にする一時対応に留める

**Why this scope:**
- CI の目的は「壊れたコードが master に入らない」こと。lint が壊れた状態で CI 入れても穴が開く
- env 一元化の置き土産を放置するのは技術的負債、修正コストも極小
- v-calendar 移行を本 PR に含めると scope creep。inline disable + TODO で「既知の deprecation」として記録するに留める

### D10. fail-fast / continue-on-error の設計

- ワークフロー全体: `fail-fast` 概念なし（job 群は並列、`needs: install` で連結のみ）
- 各 job: `continue-on-error: false`（デフォルト）→ 1 job が失敗すると PR の checks が赤になる
- ジョブ単位の `if: always()` は使わない（1 job 失敗で他 job も最後まで走る挙動はデフォルト）

**Why:** ユーザー要望「1 つ落ちて他がキャンセルされない」と「1 つでも落ちたら PR は赤」の両立。GitHub Actions のデフォルト挙動がそのまま要求を満たす。

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| 初回 CI run でいきなり `render.yaml: checksPass` に切り替えると、CI が落ちた瞬間 Render の deploy が止まる | 本 PR を merge する前に CI が緑であることを確認。緑で merge → 直後の master deploy が `checksPass` で動く流れを check。万一落ちたら `render.yaml` のみ revert PR で `commit` に戻す |
| pnpm store キャッシュが初回は cold で install 90s 程度かかる | 受容（次回以降は 15s）。初回の 1 回だけの問題 |
| GitHub Actions cache 10GB を超えて evict される | 当面 pnpm store のみで 200-500MB、余裕。将来別キャッシュを追加する場合は監視 |
| `concurrency` で master push run までキャンセルしてしまう | `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` で event 別制御、テストで確認 |
| `corepack enable` が GitHub-hosted runner で動かない可能性 | Ubuntu runner は corepack 同梱、動作実績あり。万一動かなければ `pnpm/action-setup` に切替（フォールバック） |
| draft PR で `synchronize` が走らない | `ready_for_review` でカバー、これがないと draft → ready 切替で CI が起動しない |
| typecheck / build が `pnpm -r` で全 workspace を見るが、内部の依存順序が変わると壊れる | `pnpm-workspace.yaml` で workspace 定義済み、`pnpm -r` は topological order で動くので影響なし |
| GitHub Actions の status check 名がジョブ名と一致 → branch protection 登録時の名前変更は破壊的 | ジョブ名は `typecheck` / `lint` / `test` / `build` で固定し、命名変更を別 PR で安易にやらないことを design.md に記録 |

## Migration Plan

1. `.github/workflows/ci.yml` を作成し、PR を上げる
2. PR 上で初回 CI run が緑になることを確認（push 1 回目で run、必要なら synchronize の挙動も確認）
3. 同 PR で `render.yaml` を `checksPass` に切替えて再 push、CI が再度緑であることを確認
4. ユーザーが PR をレビュー、Render Preview で lp が壊れていないこと（CI とは別系統）を確認
5. squash merge → master push トリガーで CI が再度走る
6. master の deploy が `checksPass` で起動することを Render Dashboard で確認
7. **後続作業**: ユーザーが GitHub UI で master の branch protection を設定し、`typecheck` / `lint` / `test` / `build` を Required status checks に登録する（タスクで案内）

### Rollback Plan
- CI が壊れている場合: `.github/workflows/ci.yml` のみ revert（または対象 job を `if: false` で一時無効化）
- Render が `checksPass` で deploy 起動しない場合: `render.yaml` のみ revert（`commit` に戻す）し、別 PR で原因究明
- 両方を別 PR で個別に revert できる粒度を保つため、本 PR 内では CI 追加と render.yaml 修正を **別コミット** にする（同一 PR 内で 2 commit）

## Open Questions

1. **branch protection の Required checks 登録は誰が・いつやるか**
   - 案 A: 本 PR merge 前に GitHub UI でユーザーが Required に登録（CI が走り出す前に名前を予約）
   - 案 B: 本 PR merge 後・CI が緑運用に入ってからユーザーが登録
   - **推奨: 案 B**。case A は CI 名前変更時の管理コストが高い。case B は最初の数日 CI を観察して安定したら登録する流れが自然
   - tasks.md の最後に「ユーザーへの手動依頼」として記録

2. **`pnpm -r build` で apps/lp が `--ignore-scripts` を必要とするか**
   - Render では `--ignore-scripts` を使っているが、CI では prepare script（jsdom v25 等）が走っても問題ないか確認が必要
   - 実装時に build job 初回 run で確認、もし jsdom prepare がエラーで落ちれば `pnpm install --frozen-lockfile --ignore-scripts` に切替
   - Open Question として tasks.md に明記し、Apply 中の最終確認タスクで判定する

3. **install job で lockfile 整合性チェックが追加で必要か**
   - `pnpm install --frozen-lockfile` 自体が lockfile 不整合で落ちるので暗黙に達成される
   - 別途 `pnpm install --lockfile-only --frozen-lockfile` の dry-run job は不要と判断（重複）
