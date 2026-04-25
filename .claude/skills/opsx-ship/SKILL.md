---
name: opsx-ship
description: PR がレビュー OK になった後の出荷フロー。Sync (specs / docs 更新) → Archive (change を archive へ移動) → push → master へ Merge → ブランチ削除 + Issue クローズ までを 1 サイクルで実行する。Apply フェーズが完了し、Render プレビューでユーザー OK が出た後にだけ起動する。
metadata:
  author: high-q-volleyball
  version: "1.0"
---

# opsx:ship — Apply 後 PR 承認時の出荷フロー

## いつ使うか

Apply が完了し、PR を作成して **ユーザーが Render PR プレビューで OK を出した後** にだけ実行する。

CLAUDE.md Pillar 1 のフェーズ定義に対応:
```
1. Propose → 2. Apply → 3. PR 作成 → 4. ユーザー確認
→ 5. Sync (本 skill) → 6. Archive (本 skill) → 7. push (本 skill)
→ 8. Merge (本 skill, ユーザー承認のもと) → 9. 後始末 (本 skill)
```

## 起動条件チェック（実行前に必ず確認）

1. ユーザーから PR レビュー OK の合図（「OK」「マージして」「ship」等）が出ているか
2. 対象 change ディレクトリ（`openspec/changes/<change-name>/`）に未コミット差分がないか
3. 対象 PR の番号と change 名を把握しているか
4. master が最新か（fetch 済み）

不明な点があれば **必ずユーザーに確認してから** 進める。

## 実行手順（順序厳守）

### Step 1: Sync — specs / docs 更新

```bash
# 1) feature ブランチが現在の作業先である事を確認
git status

# 2) change が持つ specs を openspec/specs/ に反映
#    例: openspec/changes/<name>/specs/<capability>/spec.md
#        → openspec/specs/<capability>/spec.md
cp openspec/changes/<change-name>/specs/<capability>/spec.md \
   openspec/specs/<capability>/spec.md

# 3) 関連 docs (docs/ 配下) があれば更新
#    例: docs/05-インターフェース/01-UI設計方針.md など
#    design.md / proposal.md を読み直し、影響箇所を検出して反映
```

### Step 2: Archive — change を archive へ移動

```bash
# 命名規則: openspec/changes/archive/YYYY-MM-DD-<change-name>/
# YYYY-MM-DD は archive 実行日（CLAUDE 環境の現在日付）
git mv openspec/changes/<change-name> \
       openspec/changes/archive/$(date +%Y-%m-%d)-<change-name>
```

### Step 3: Commit + push

```bash
# Sync と Archive をまとめて 1 コミット（推奨）または分割
git add openspec/specs/ openspec/changes/
git commit -F - <<'EOF'
chore(openspec): sync & archive <change-name>

- specs: <capability> を modernize-lp-ui 版で上書き（差分概要）
- archive: openspec/changes/<change-name> を openspec/changes/archive/YYYY-MM-DD-<change-name> へ移動

Closes #<issue-number>
EOF

git push
```

### Step 4: Merge

PR が **すでに作成済みで CI が通っている** ことを確認した上で、**ユーザーの承認のもと** マージ:

```bash
# 通常 merge / squash はプロジェクト方針に従う
gh pr merge <pr-number> --squash --delete-branch
# または
gh pr merge <pr-number> --merge --delete-branch
```

`--delete-branch` を付けるとリモートブランチも削除される。これで Step 5 のリモート削除は省略可。

⚠️ **`master` への直接 push は禁止。必ず PR 経由でマージする。**

### Step 5: 後始末（ブランチ削除 + Issue クローズ）

```bash
# master 同期
git checkout master && git pull

# ローカルブランチ削除
git branch -d feature/<issue-number>-<...>

# リモートブランチ削除（gh pr merge --delete-branch を使った場合は不要）
# git push origin --delete feature/<issue-number>-<...>

# Issue クローズ
gh issue close <issue-number> --comment "Done in #<pr-number>"
```

## 注意

- Step 1〜3 は **マージ前** に完了していること。マージ後に sync/archive をやると別 PR が必要になる
- 1 コミットにまとめるか分割するかは change の規模で判断。**Sync が大規模で diff が読みづらい場合は Sync と Archive を別コミット**にする
- Merge の `--squash` か `--merge` かはプロジェクト規約に従う。本プロジェクトのデフォルトは未確定なのでユーザーに確認
- 実行ログ（各コマンドの結果）はユーザーに簡潔に報告。エラーが出たら止まって相談する

## 完了時の報告テンプレート

```
✅ opsx:ship 完了
- Sync: openspec/specs/<capability>/spec.md 更新
- Archive: openspec/changes/archive/<date>-<name>/ へ移動
- Merge: PR #<n> を <merge-strategy> でマージ
- 後始末: ブランチ削除 + Issue #<n> クローズ
```
