## Context

翔太郎くんは Claude セッションと 2 並列で開発することがあるが、毎回 worktree の置き場所・ポート割当・dev DB 衝突回避・master 占有回避を口頭で取り決めており、別端末や別人が同じ手順に乗れない。`git worktree` は同一ブランチを 2 箇所で checkout できない仕様のため、メイン作業ディレクトリが master を握ったまま 2 本目を作ると、2 本目から最新を取り込む `git merge origin/master` が破綻する。dev Supabase プロジェクトは 1 個しかなく、migration を含む change を 2 並列で走らせるとスキーマ衝突が起きる。OpenSpec change も同名 / 同 capability を 2 本同時に動かすと spec の merge 衝突が起きる。これらの取り決めをスクリプト・Skill・ガイドに固定して、現場の判断量をゼロに近づける。

## Goals / Non-Goals

**Goals:**

- `setup-worktree.sh <issue> <slug> [--type]` 1 コマンドで worktree 作成・ブランチ切り・`pnpm install`・ポート割当案内まで完結
- `teardown-worktree.sh <issue>` でマージ済み worktree を安全に掃除、未マージは `--force` 無しでブロック
- 2 並列開発開始時に Claude が `start-parallel-dev` Skill で運用ルール (master 占有禁止 / 最新取込手順 / ポート規約 / dev DB / OpenSpec 衝突) を毎回必ず案内する
- 実装完了時に Claude が `verify-locally` Skill で起動コマンド・URL・主要シナリオ・探索的試験観点を出す。URL は `router.ts` を Read して確定
- 全体像は `docs/03-アーキテクチャ/06-並列開発ガイド.md` に集約し、CLAUDE.md からは 1 行参照のみ

**Non-Goals:**

- CI からの呼び出し (本変更は開発者ローカル専用)
- worktree を 3 本以上で運用するケース (将来必要なら追加)
- Windows / WSL 対応 (翔太郎くん環境は macOS 単独。bash で動く前提)
- dev Supabase を複数立てる (費用ゼロ運用方針に反する。本変更は「衝突しない運用」で凌ぐ)
- vite.config.ts の改変 (ポート切替は起動時 `--port` フラグで完結させ設定汚染しない)
- `node_modules` の worktree 間共有 (pnpm hoist との相性が悪いため、各 worktree で素直に `pnpm install` する)

## Decisions

### 1. worktree ディレクトリ命名: `../high-q-volleyball-wt-<issue番号>`

Issue 番号で識別することで、長期保持される worktree がどの作業のものか一目で分かる。`wt2` `wt3` のような連番だと作業切替時にディレクトリ名と中身が乖離する。リポジトリ root の親階層に置くのは、エディタや shell の補完で兄弟ディレクトリとして扱いやすいため。

代替案: 各 Issue に GUID 付与 → 過剰、Issue 番号で十分。

### 2. master を 2 箇所で checkout しない運用

メイン作業ディレクトリも常に feature ブランチに居る運用にする。`setup-worktree.sh` は新規 worktree 作成前にメインが master clean かを検証し、必要なら警告する。最新取込は `git fetch origin && git merge origin/master` (rebase ではなく merge) を案内する。理由: PR 履歴を素直に保ち、push 済みブランチへの強制 force push を避けるため。

代替案: メインを bare repo 化 → 一般開発者には学習コストが高い。feature ブランチ常駐で十分対応可能。

### 3. ポート割当: 起動時 `--port` フラグで上書き

`vite.config.ts` は触らず、`pnpm --filter @high-q/admin dev --port 5273` のように起動時オーバーライドする。ポート番号は `BASE=5173`、worktree 番号 N に対し `BASE + 100*N` を割り当てる (admin / reservation はそれぞれ 5273/5274、5373/5374)。setup スクリプトは既存 `git worktree list` の数を N として計算する。

代替案: `.env.local` で `VITE_PORT` を上書き → vite の `server.port` は env 直読みしない / 設定汚染リスクあり。CLI フラグが最もシンプル。

### 4. dev Supabase 衝突は Skill 警告で運用回避

dev Supabase プロジェクトは 1 個しかなく、migration を 2 並列で当てるとスキーマ衝突する。`start-parallel-dev` Skill 起動時に Claude が「migration を含む change を 2 並列で走らせない」を明示する。技術的にブロックする手段は持たず、開発者の判断に委ねる運用ルール。

代替案: dev Supabase を 2 個立てる → 費用と運用負担で却下 (memory: feedback_cost_zero_default)。

### 5. OpenSpec 衝突回避も Skill 警告で運用回避

同名 change ディレクトリは Git 上で同一ファイルになり衝突必至。同一 capability の spec 編集も deltas の整合が崩れる。Skill 起動時に Claude が進行中 change と新規 worktree の change の capability 重複を確認し、警告する。

### 6. Skill の責務分離

- **`start-parallel-dev`**: 「2 並列開発を始めたい」発話への応答。運用ルール案内 → setup-worktree.sh の引数組み立て → 起動コマンド案内まで
- **`verify-locally`**: 「動作確認案内して」発話 / PR 完成タイミングへの応答。`router.ts` を Read してパス確定 → URL 整形 → 4 状態 + a11y + モバイル + 権限の試験観点を機械生成

別 Skill にする理由は責務 (開始 vs 検証) が直交しているため。共通テンプレは Skill の SKILL.md にハードコードでよく、抽象化しない。

### 7. ドキュメントの集約場所

CLAUDE.md は既に肥大化しており、本変更で新規ルールを CLAUDE.md 本体に直書きすると保守が悪化する。新規ガイド `docs/03-アーキテクチャ/06-並列開発ガイド.md` に集約し、CLAUDE.md からは Pillar 5 (Git & デプロイ安全性) 末尾に 1 行参照を追加するに留める。

### 8. bash スクリプトの実装方針

- shebang は `#!/usr/bin/env bash`、`set -euo pipefail`、`trap` でエラー時クリーンアップ
- 引数検証は冒頭でガード節 (Issue 番号は `[0-9]+`、slug は `[a-z0-9-]+`、type は `feature|fix|chore`)
- 既存 worktree 存在チェックは `git worktree list --porcelain` を grep
- ポート計算は `git worktree list` の行数 - 1 (メイン除外) を N とする
- 出力は色付け (ANSI escape) せず素のテキストで十分

## Risks / Trade-offs

- **[両 worktree が master を握る事故]** → setup スクリプト冒頭でメインの現在ブランチを検査し、master かつ未コミット変更ありの場合は警告。ただし完全防止は不可能 (開発者が `git checkout master` を手動で打てば破れる) なので、ガイド本文で運用ルールを強調
- **[ポート計算が既存 worktree のクリーンアップ漏れで衝突]** → teardown スクリプトの実行を励行。`setup` 時に既存 worktree 一覧も表示して開発者が異常に気付けるようにする
- **[dev DB の migration 衝突を技術的に防げない]** → Skill 警告のみ。事故時はマイグレーション再 apply / 片方の change を一時停止で復旧可能なので致命傷ではない
- **[Skill 文面が陳腐化]** → spec シナリオで「Skill 出力に含むべき要素」を固定し、文面変更時は spec も更新する運用にする (spec / Skill の整合性は archive 前にレビューで確認)
- **[node_modules の install コストが worktree 数倍]** → 容認 (pnpm の content-addressable store で実 disk 使用は小さい)

## Migration Plan

このインフラ追加自体に migration は不要。既存開発フローへの後方互換性影響もない。

ロールアウト手順:

1. ブランチ `chore/328-parallel-worktree-infra` 上で本変更を実装
2. 実装途中で本ブランチを setup-worktree.sh の対象として dogfooding (= 既に切ってある本ブランチで動かない場合に備え、新規ダミー Issue 番号で 2 本目 worktree を試作)
3. PR を出し、翔太郎くんが Render Preview ではなくローカルでスクリプト + Skill を確認
4. レビュー承認 → sync / archive / merge / 後始末 (`/opsx-ship` で一括)

ロールバック: スクリプト / Skill / docs を revert するだけ。本変更は production システムに一切触れないので影響範囲は開発者環境のみ。

## Open Questions

- なし。技術的不確定要素は無く、運用ルールも本 design で確定している。
