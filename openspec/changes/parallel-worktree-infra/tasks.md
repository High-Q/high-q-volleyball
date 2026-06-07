## 1. setup-worktree.sh

- [x] 1.1 `scripts/dev/setup-worktree.sh` を新規作成 (shebang / `set -euo pipefail`)
- [x] 1.2 引数パース: `<issue> <slug> [--type=feature|fix|chore]` / type デフォルトは `feature`
- [x] 1.3 引数検証ガード節: Issue 番号 `^[0-9]+$` / slug `^[a-z0-9-]+$` / type allowlist
- [x] 1.4 メインリポジトリの状態検証: master かつ未コミット変更ありなら警告して中断 (`--force-main` で続行可)
- [x] 1.5 `git fetch origin` を実行して `origin/master` 最新化
- [x] 1.6 既存 worktree 衝突チェック: `git worktree list --porcelain` を grep し同 Issue 番号があればエラー終了
- [x] 1.7 worktree 作成: `git worktree add ../high-q-volleyball-wt-<issue> -b <type>/<issue>-<slug> origin/master`
- [x] 1.8 作成した worktree で `pnpm install` を実行
- [x] 1.9 ポート計算: `git worktree list` 行数から N を求め `BASE+100*N` を案内
- [x] 1.10 完了サマリ出力: worktree パス / ブランチ名 / 起動コマンド (admin / reservation) / URL を整形して表示

## 2. teardown-worktree.sh

- [ ] 2.1 `scripts/dev/teardown-worktree.sh` を新規作成
- [ ] 2.2 引数パース: `<issue> [--force]`
- [ ] 2.3 対象 worktree パス特定: `../high-q-volleyball-wt-<issue>`
- [ ] 2.4 マージ済み検証: 対象ブランチが `origin/master` にマージされているか `git branch --merged origin/master` で確認
- [ ] 2.5 未マージかつ `--force` 無しなら警告して非ゼロ終了
- [ ] 2.6 `git worktree remove <path>` 実行
- [ ] 2.7 ローカルブランチ削除 (`git branch -d` / 未マージなら `-D`)
- [ ] 2.8 完了サマリ出力 (削除した worktree とブランチ名)

## 3. start-parallel-dev Skill

- [ ] 3.1 `.claude/skills/start-parallel-dev/SKILL.md` 新規作成
- [ ] 3.2 起動条件・運用ルール (master 占有禁止 / 最新取込手順 / ポート規約) を記述
- [ ] 3.3 dev Supabase 衝突警告セクションを追加 (migration 含む change を 2 並列で走らせない)
- [ ] 3.4 OpenSpec 衝突警告セクションを追加 (同名 change / 同一 capability spec 編集を避ける)
- [ ] 3.5 setup-worktree.sh 呼び出しテンプレを記述

## 4. verify-locally Skill

- [ ] 4.1 `.claude/skills/verify-locally/SKILL.md` 新規作成
- [ ] 4.2 起動条件 (実装完了 / 「動作確認案内して」発話) を記述
- [ ] 4.3 router.ts Read による URL 根拠特定手順を記述 (memory: feedback_verify_screens_before_guiding 反映)
- [ ] 4.4 出力テンプレ: 起動コマンド / アクセス先 / 主要シナリオ / 探索的試験観点 (4 状態 + a11y + モバイル + 権限)

## 5. ガイドドキュメント

- [ ] 5.1 `docs/03-アーキテクチャ/06-並列開発ガイド.md` を新規作成
- [ ] 5.2 章立て: 概要 / worktree 配置 / ブランチ運用 / ポート規約 / dev DB / OpenSpec 衝突 / スクリプト使い方 / Skill 一覧 / トラブルシューティング
- [ ] 5.3 `CLAUDE.md` Pillar 5 末尾に 1 行参照を追記

## 6. Dogfooding と最終確認

- [ ] 6.1 ダミー Issue 番号 (例: 99999) で setup-worktree.sh を試走し、ポート計算と出力を検証
- [ ] 6.2 teardown-worktree.sh で試走 worktree を掃除できることを検証
- [ ] 6.3 `openspec validate parallel-worktree-infra --strict` が通ることを確認
- [ ] 6.4 `git status` clean を確認、コミット粒度を整理 (デフォルト: タスク群ごと、最終 1 PR = 1 コミットでも可)
