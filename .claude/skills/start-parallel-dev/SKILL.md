---
name: start-parallel-dev
description: 2 並列開発 (worktree + 別 Claude セッション) の開始フロー。master 占有禁止 / 同期手順 / ポート規約 / dev DB 衝突回避 / OpenSpec 衝突回避を必ず案内したうえで scripts/dev/setup-worktree.sh を呼ぶ。
metadata:
  author: high-q-volleyball
  version: "1.0"
---

# start-parallel-dev — 2 並列開発開始フロー

## いつ使うか

翔太郎くんから次のような意図が示されたとき:

- 「2 並列で開発したい」「worktree 作って」「もう 1 つ別ブランチで動かしたい」
- 別 Claude セッションを立ち上げて並列で別 Issue に取り組む話が出たとき

**起動前に必ず本 Skill のチェックリストを通す。** 個別 memory ではなく Skill / スクリプト / docs が真実の源。

## 起動条件チェック

1. 着手する Issue 番号が決まっている (無ければ `/create-issue` を先に起動)
2. 進行中の OpenSpec change と新規 worktree の作業範囲を翔太郎くんから確認できる状態
3. メインリポジトリ (`~/Desktop/high-q-volleyball`) の状態を `git status` で把握できる状態

## 並列開発の前提ルール (必ず案内する)

### 1. master を 2 箇所で握らない

`git worktree` は同一ブランチを 2 箇所で checkout できない。メイン作業ディレクトリも常に feature ブランチに居る運用にする。

- メイン側が master clean の場合: そのままで OK (worktree 作成は通る)
- メイン側が master + 未コミット変更ありの場合: 先に feature ブランチへ切替 / commit / stash のいずれか
- メイン側が既に feature ブランチに居る場合: 何もせず worktree 作成可

最新を取り込みたい時は `git fetch origin && git merge origin/master` (rebase ではなく merge)。

### 2. ポート規約

| Worktree | admin | reservation |
|---|---|---|
| メイン (`high-q-volleyball`) | 5173 | 5174 |
| wt-N (N = 既存 worktree 数) | `5173 + 100*N` | `5174 + 100*N` |

`vite.config.ts` は触らず、起動時 `--port` フラグで上書き。setup-worktree.sh が自動計算して案内に含める。

### 3. dev Supabase は 1 個しかない (重要)

- **migration を含む change を 2 並列で走らせない**。スキーマ衝突する
- 進行中 change の `tasks.md` を grep して `supabase/migrations/` を触るタスクが残っていないか確認
- 新規 worktree でも migration が必要な場合は、片方の change 完了 + dev DB push 後に着手する

### 4. OpenSpec 衝突回避

- **同名 change ディレクトリは作らない** (`openspec/changes/` 配下のディレクトリ名が同一だと Git で衝突必至)
- **同一 capability の spec を 2 並列で編集しない** (spec deltas の整合が崩れる)
- 進行中 change の `proposal.md` の Capabilities セクションを確認

## 実行手順

### Step 1: 進行中作業の確認

```bash
git -C ~/Desktop/high-q-volleyball status --short
ls ~/Desktop/high-q-volleyball/openspec/changes/ | grep -v archive
git worktree list
```

進行中の change と worktree 一覧を翔太郎くんに提示する。

### Step 2: 衝突可能性チェック

進行中 change と新規 worktree の作業範囲を比べる:

- migration の有無 (両方が migration を含むなら 2 並列禁止)
- 編集 capability の重複 (同一 capability ならどちらか先送り)

衝突があれば翔太郎くんに是非を確認し、回避策 (順序入れ替え / capability 分割) を提案する。

### Step 3: メインリポジトリの状態確認

```bash
git -C ~/Desktop/high-q-volleyball rev-parse --abbrev-ref HEAD
git -C ~/Desktop/high-q-volleyball status --short
```

master + dirty なら、setup-worktree.sh が `--force-main` 無しでブロックする。翔太郎くんに先に feature ブランチへ移動するよう案内するか、`--force-main` の是非を確認。

### Step 4: setup-worktree.sh 実行

```bash
cd ~/Desktop/high-q-volleyball
scripts/dev/setup-worktree.sh <issue番号> <slug> [--type=feature|fix|chore]
```

例:

```bash
scripts/dev/setup-worktree.sh 329 add-foo
scripts/dev/setup-worktree.sh 330 fix-bar --type=fix
```

### Step 5: 新規 worktree で別 Claude セッション起動を案内

スクリプトの出力 (worktree パス / 起動コマンド / URL) をそのまま翔太郎くんに見せ、次の操作を案内:

1. 別ターミナル window / tab を開く
2. `cd ../high-q-volleyball-wt-<issue>`
3. `claude` を起動 (別セッション)
4. そのセッションで該当 Issue / OpenSpec change の Apply を進める

## エラー時の対応

- メイン master + dirty: 翔太郎くんに commit / stash / branch 切替の選択肢を提示
- 既存 worktree 衝突: `scripts/dev/teardown-worktree.sh <issue>` を案内
- ブランチ既存: 過去 worktree の残骸の可能性。`git branch -D <name>` の是非を確認

## 完了報告テンプレート

```
✅ 2 並列開発の準備が完了しました、翔太郎くん。

worktree:     ~/Desktop/high-q-volleyball-wt-<issue>
branch:       <type>/<issue>-<slug>
admin URL:    http://localhost:<port>
reservation URL: http://localhost:<port>

別ターミナル window で:
  cd ~/Desktop/high-q-volleyball-wt-<issue>
  claude

を起動して並列開発を始められます。
```

## 関連

- スクリプト本体: `scripts/dev/setup-worktree.sh` / `scripts/dev/teardown-worktree.sh`
- 全体ガイド: `docs/03-アーキテクチャ/06-並列開発ガイド.md`
- 動作確認案内 Skill: `verify-locally`
