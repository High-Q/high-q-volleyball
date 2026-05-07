---
name: create-issue
description: GitHub Issue 新規作成フロー。Epic 配置 / Milestone / 着手順 / Project Status の 4 必須項目を漏らさずセットする。Issue を作る話が出た時点で起動する。
metadata:
  author: high-q-volleyball
  version: "1.0"
---

# create-issue — Issue 新規作成 + 4 必須項目セット

## いつ使うか

新規 GitHub Issue を作成する話が出たとき (翔太郎くんから「Issue 作って」「これチケット化して」等)。**Issue 作成提案を翔太郎くんに見せる前**に本 skill のチェックリストを満たす。

## 起動条件チェック

1. 翔太郎くんから新規 Issue 作成の意図が明示されている
2. Issue のタイトル候補・本文骨子が準備されている
3. 既存の同種 Issue や Epic の状況を `gh issue list` で確認できる状態

## 必須 4 項目

| 項目 | 値 | 設定方法 |
|---|---|---|
| **Epic** (親 Issue) | `Epic: #<番号>` を本文末尾に記載 | `gh issue create` 後の本文に含める |
| **Milestone** | MVP1 / MVP2 / Phase 1 / Phase 2 等 | `gh issue create --milestone "MVP1"` |
| **Project: 着手順** | Number (隣接 Issue を参考に提案) | `gh api graphql` mutation |
| **Project Status** | 通常 Todo (進行中なら In Progress) | `gh issue create --project ...` で自動 Todo |

## 実行手順 (順序厳守)

### Step 1: Epic 一覧の確認 (機械的踏襲を回避)

```bash
gh issue list --label epic --state all
```

- 後続 Issue の **作業ドメイン・前提条件** に応じて Epic を選定
- **元 Issue の Epic を機械的に踏襲しない**。スコープ縮小で分離した後続 Issue は作業ドメインが異なる可能性が高い
- 完全に独立した新規タスクなら「親 Issue なし」と明示

### Step 2: Milestone デフォルト判定

- **元 Issue が MVP1 → 派生 Issue もデフォルト MVP1**
- UX 強化系・ポリッシュ系を勝手に MVP2 に降格しない (2026-05-07 #211/#212 でレムが #212 を MVP2 降格しようとして reject された経緯あり)
- 降格の根拠 (機能は満たしている等) があっても**必ず翔太郎くんに確認**してから降格
- Milestone 一覧: `gh api repos/:owner/:repo/milestones --jq '.[] | {number, title}'`

### Step 3: 着手順 (Project Number Field) の値を提案

```bash
# 隣接 Issue (元 Issue + 直前直後にマージされた Issue) の着手順を確認
gh api graphql -f query='query { user(login: "High-Q") { projectV2(number: 1) { items(first: 100) { nodes { content { ... on Issue { number title } } fieldValues(first: 20) { nodes { ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } } } } } } } } }'
```

- 元 Issue が 90.0 の follow-up なら 96.0〜97.0 のように間に入れる
- 同時作成する複数 Issue は連番にする
- 値に迷ったら短く翔太郎くんに確認

### Step 4: 翔太郎くんへの提案 (4 項目宣言)

提案フォーマット (必ず 4 項目すべて宣言):

```
以下の Issue を作成します。

タイトル: feat: ...
Epic: #<番号> (理由: ...)
Milestone: MVP1
着手順: 96.0 (理由: #91 直後)
Project Status: Todo

本文:
...

Epic: #<番号>
```

承認後 Step 5 に進む。

### Step 5: Issue 作成 (1 コマンドで Milestone + Project 同時付与)

```bash
gh issue create \
  --title "feat: ..." \
  --label "feature" \
  --label "app:reservation" \
  --label "priority:medium" \
  --milestone "MVP1" \
  --project "High Q 開発ロードマップ" \
  --body "$(cat <<'EOF'
## 概要
...

## 完了条件
- [ ] ...

Epic: #<番号>
EOF
)"
```

### Step 6: 着手順 (Number Field) を GraphQL mutation でセット

```bash
# Project / Field ID は固定値 (High Q 開発ロードマップ)
PROJECT_ID="PVT_kwHOBXCujc4BVjFD"
FIELD_ID="PVTF_lAHOBXCujc4BVjFDzhQ-LLQ"

# 新規 Issue の Item ID を取得
ITEM_ID=$(gh api graphql -f query="query { user(login: \"High-Q\") { projectV2(number: 1) { items(first: 100) { nodes { id content { ... on Issue { number } } } } } } }" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([n['id'] for n in d['data']['user']['projectV2']['items']['nodes'] if (n.get('content') or {}).get('number') == <issue番号>][0])")

# 着手順をセット
gh api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_ID\", value: { number: 96 } }) { projectV2Item { id } } }"
```

### Step 7: 検証

```bash
gh issue view <issue番号> --json number,milestone,projectItems,labels
```

`milestone` が null でない / `projectItems` に Status=Todo がある / labels が想定通り、を確認。

### Step 8: ブランチ作成 (Apply 開始時)

```bash
git checkout -b feature/<issue番号>-<kebab-case-summary>
# または fix/<番号>-<...> / chore/<番号>-<...>
```

## マージ後の後始末 (`/opsx-ship` が処理するが、手動時の参考)

```bash
git checkout master && git pull
git branch -d feature/<issue番号>-<...>
git push origin --delete feature/<issue番号>-<...>   # gh pr merge --delete-branch なら不要
gh issue close <issue番号> --comment "Done in #<PR番号>"
```

## エラー時の対応

- Milestone 未存在 → `gh api repos/:owner/:repo/milestones -X POST -f title="MVP1" -f description="..."` で作成 (要承認)
- Project not found → `gh api graphql ... projectsV2` で実在確認、命名揺れ確認
- 着手順 mutation 失敗 → ITEM_ID 取得時の Issue 番号フィルタを再確認

## 完了報告テンプレート

```
✅ Issue #<番号> 作成完了
- Title: <title>
- Epic: #<番号> (...)
- Milestone: MVP1
- 着手順: 96.0
- Project Status: Todo
- Labels: feature / app:reservation / priority:medium
URL: https://github.com/High-Q/high-q-volleyball/issues/<番号>
```
