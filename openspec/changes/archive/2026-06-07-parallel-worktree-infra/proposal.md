## Why

翔太郎くんと Claude セッションが 2 並列で開発する場面で、毎回 worktree 作成・ポート割当・dev DB 衝突回避・master 占有回避の判断を口頭で繰り返しており、別端末・別セッション・別人が同じ運用に再現性をもって入れない。`git worktree` は同一ブランチを 2 箇所で checkout できない制約があるため、master を握りっぱなしの worktree が 1 つでもあると最新取込時の merge が破綻する。これらの取り決めをスクリプトと Skill とガイドに落とし、誰でも同じ手順で 2 並列開発を開始できる状態にする。

## What Changes

- スクリプト `scripts/dev/setup-worktree.sh` を追加し、引数 `<issue番号> <slug> [--type=feature|fix|chore]` から worktree ディレクトリ作成 / ブランチ切り / `pnpm install` / ポート割当案内までを 1 コマンドで実行する
- スクリプト `scripts/dev/teardown-worktree.sh` を追加し、マージ済み検証付きで worktree とローカルブランチを安全に掃除する
- Skill `.claude/skills/start-parallel-dev/` を追加し、2 並列開発開始時の運用ルール (master 占有禁止 / 最新取込手順 / ポート規約 / dev DB / OpenSpec 衝突回避) を Claude が自動説明できるようにする
- Skill `.claude/skills/verify-locally/` を追加し、実装完了時の動作確認案内を機械生成する (router.ts 確認 → URL 確定 → 4 状態 + a11y + モバイル + 権限の試験観点)
- ドキュメント `docs/03-アーキテクチャ/07-並列開発ガイド.md` を新設し、CLAUDE.md から 1 行参照を張る
- 本変更自体を新スクリプトで dogfooding し、ガイド手順が現場で機能することを確認する

## Capabilities

### New Capabilities

- `parallel-development-workflow`: 2 並列 worktree 開発を再現可能にする運用規約 (worktree 配置 / ブランチ運用 / ポート割当 / dev DB 衝突回避 / OpenSpec 衝突回避 / 動作確認案内テンプレ)

### Modified Capabilities

なし。既存 capability の要件は変更しない。

## Impact

- 影響コード: `scripts/dev/` 新規 2 ファイル / `.claude/skills/` 新規 2 Skill / `docs/03-アーキテクチャ/07-並列開発ガイド.md` 新規 / `CLAUDE.md` 1 行追記
- ランタイム影響なし (admin / reservation / lp の本番動作には一切触れない)
- 依存追加なし (bash + 既存 pnpm / git のみで完結)
- CI 影響なし (新規スクリプトは CI から呼び出さず、開発者ローカル専用)
