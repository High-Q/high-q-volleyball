## ADDED Requirements

### Requirement: worktree セットアップスクリプト

システムは `scripts/dev/setup-worktree.sh <issue番号> <slug> [--type=feature|fix|chore]` を提供し、1 コマンドで 2 並列開発用 worktree を構築できるようにする SHALL。スクリプトは worktree ディレクトリ作成、ブランチ切り、`pnpm install`、ポート割当案内を一括で実行 SHALL し、開発者が現場で判断する必要をなくす。

#### Scenario: 標準的な worktree 作成

- **WHEN** 開発者が `scripts/dev/setup-worktree.sh 329 add-foo --type=feature` を実行する
- **THEN** スクリプトはリポジトリ root の親階層に `high-q-volleyball-wt-329` ディレクトリを作成し、`origin/master` を起点にした `feature/329-add-foo` ブランチを checkout し、`pnpm install` を完了し、ポート (admin / reservation) と起動コマンド・URL を標準出力に表示する

#### Scenario: master の事前同期

- **WHEN** スクリプトが起動する
- **THEN** スクリプトは `git fetch origin` を実行して `origin/master` 最新を取得してからブランチを切り、古い master を起点にしない

#### Scenario: 既存 worktree 存在時のポート競合回避

- **WHEN** 既に他の wt-N worktree が 1 つ以上存在する状態で新規 worktree を作成する
- **THEN** スクリプトは既存 worktree 数 N に応じて admin ポート `5173+100*N` / reservation ポート `5174+100*N` を計算し、案内に含める

#### Scenario: 入力検証

- **WHEN** Issue 番号が数値でない、または slug が空、または `--type` が `feature|fix|chore` 以外
- **THEN** スクリプトはエラーメッセージを出力して非ゼロで終了し、worktree や branch を一切作成しない

#### Scenario: 同名 worktree 既存時の保護

- **WHEN** 同じ Issue 番号で worktree が既に存在する
- **THEN** スクリプトは既存 worktree のパスを表示してエラー終了し、上書きや重複作成を行わない

### Requirement: worktree teardown スクリプト

システムは `scripts/dev/teardown-worktree.sh <issue番号>` を提供し、マージ済み worktree とローカルブランチを安全に掃除できるようにする SHALL。マージ未完了の worktree は `--force` 明示がない限り削除してはならない MUST NOT。

#### Scenario: マージ済み worktree の正常掃除

- **WHEN** PR がマージ済みのブランチを持つ worktree に対し teardown スクリプトを実行する
- **THEN** スクリプトは worktree を削除し、ローカルブランチを削除し、結果を標準出力に報告する

#### Scenario: マージ未完了時の保護

- **WHEN** ブランチが `origin/master` にマージされていない worktree に対し `--force` 無しで teardown を実行する
- **THEN** スクリプトはマージ未完了を警告して非ゼロ終了し、worktree とブランチを保持する

#### Scenario: 強制削除

- **WHEN** マージ未完了状態で `--force` 付き teardown を実行する
- **THEN** スクリプトは警告を出力した上で worktree とブランチを削除する

### Requirement: 並列開発開始 Skill

Claude は 2 並列開発開始の意図を検知したとき `.claude/skills/start-parallel-dev/` Skill を起動 SHALL し、master 占有禁止 / 同期手順 / ポート規約 / dev DB 衝突回避 / OpenSpec 衝突回避の運用ルールを案内 SHALL したうえで setup-worktree.sh の呼び出しに繋ぐ MUST。

#### Scenario: Skill 起動

- **WHEN** 開発者が「2 並列開発を始めたい」「worktree 作って」等の意図を示す
- **THEN** Claude は start-parallel-dev Skill を起動し、運用ルールと setup-worktree.sh の引数を案内する

#### Scenario: master 占有警告

- **WHEN** 現在のリポジトリのメイン作業ディレクトリが master を checkout している
- **THEN** Skill は「メイン側も feature ブランチへ移動するか、メイン側を bare 化する必要がある」旨を警告に含める

#### Scenario: dev DB 衝突警告

- **WHEN** 進行中の OpenSpec change が migration を含む、または新規 worktree で migration を含む change を扱う予定が宣言される
- **THEN** Skill は dev Supabase は 1 個しかないため migration を含む change は 2 並列で走らせない旨を警告する

#### Scenario: OpenSpec 衝突警告

- **WHEN** 進行中の OpenSpec change が編集中の capability spec を、新規 worktree でも編集する予定が宣言される
- **THEN** Skill は同一 capability の同時編集は merge 衝突を招くため避けるよう警告する

### Requirement: 動作確認案内 Skill

Claude は実装完了時に `.claude/skills/verify-locally/` Skill を起動 SHALL し、影響画面の URL と動作確認シナリオを機械生成 SHALL する。URL は推測ではなく `router.ts` / pages の実コードを Read して確定 MUST する。

#### Scenario: Skill 起動

- **WHEN** 開発者が「動作確認案内して」「ローカルで試したい」等の意図を示す、または PR 完成報告のタイミング
- **THEN** Claude は verify-locally Skill を起動し、起動コマンド・URL・主要シナリオ・探索的試験観点を出力する

#### Scenario: URL の根拠特定

- **WHEN** Skill が URL を案内する
- **THEN** Skill は対象アプリの `router.ts` または `pages/` を Read し、パスの実在を確認してから URL を案内する (記憶や推測で出さない)

#### Scenario: 探索的試験観点の網羅

- **WHEN** Skill が試験観点を出力する
- **THEN** 出力は最低限以下を含む: Loading 状態 / Empty 状態 / Error 状態 / Success 状態 / a11y (キーボード操作・focus ring・aria) / モバイル表示 / 権限 (別ロールでの可視性)

### Requirement: 並列開発ガイド

`docs/03-アーキテクチャ/07-並列開発ガイド.md` は 2 並列開発の全体像 (worktree 配置 / ブランチ運用 / ポート規約 / Supabase / OpenSpec / スクリプト / Skill) を網羅 SHALL し、CLAUDE.md から 1 行参照される MUST。

#### Scenario: ガイドの所在

- **WHEN** 開発者または別 Claude セッションが CLAUDE.md を読む
- **THEN** CLAUDE.md は `docs/03-アーキテクチャ/07-並列開発ガイド.md` への参照を含み、開発者は 1 ホップで全体像に到達できる

#### Scenario: スクリプトと Skill の整合

- **WHEN** ガイドがスクリプトや Skill の使い方を記述する
- **THEN** 記述された引数・コマンド・出力例は実際の `scripts/dev/*.sh` および `.claude/skills/*/SKILL.md` と一致する
