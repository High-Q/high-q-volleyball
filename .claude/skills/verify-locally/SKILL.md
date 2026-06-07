---
name: verify-locally
description: 実装完了時の動作確認案内テンプレを機械生成する。router.ts / pages を Read して URL を確定し、起動コマンド・主要シナリオ・4 状態 (Loading/Empty/Error/Success) + a11y + モバイル + 権限の探索的試験観点をまとめて翔太郎くんに渡す。記憶や推測で画面パスを出さない。
metadata:
  author: high-q-volleyball
  version: "1.0"
---

# verify-locally — 動作確認案内テンプレ生成

## いつ使うか

- 翔太郎くんから「動作確認案内して」「ローカルで試したい」等の意図が示されたとき
- OpenSpec Apply 完了時 / PR 完成時の動作確認案内ステップ
- UI 変更を含むタスク完了時の自発的確認案内

**起動前に必ず本 Skill のチェックリストを通す。** memory の `feedback_verify_screens_before_guiding` (動作確認案内前に画面実装を確認) を機械化したもの。

## 起動条件チェック

1. 影響アプリ (admin / reservation / lp) が特定できる
2. 影響画面のパスが `router.ts` または `pages/` で確認できる状態
3. 現在の worktree が何番か (= ポート番号が何か) 把握できる状態

## 必須遵守ルール

- **URL は必ず実コードを Read してから案内する**。記憶や推測で「`/members` だと思います」と書かない
- **4 状態 (Loading / Empty / Error / Success) を必ず含める**。CLAUDE.md Pillar 3 の UI 品質基準
- **a11y / モバイル / 権限を必ず含める**。これらは UI 機能テストで漏れがち
- **起動コマンドは現在の worktree のポートを反映**。メイン (5173/5174) と wt-N (5173+100*N / 5174+100*N) を取り違えない

## 実行手順

### Step 1: 影響アプリと画面の特定

実装した tasks.md / diff から影響アプリと画面を特定:

```bash
git diff origin/master --name-only | grep -E '^apps/(admin|reservation|lp)/'
```

### Step 2: router.ts / pages を Read して URL 確定

対象アプリの router を Read:

- admin: `apps/admin/src/app/router.ts`
- reservation: `apps/reservation/src/app/router.ts`
- lp: `apps/lp/src/app/router/index.ts` 等 (アプリ構造に合わせて)

**path 文字列を実物から取得**してから URL を組み立てる。

### Step 3: 現在の worktree のポート特定

```bash
git worktree list --porcelain | grep -cE '^worktree '
# 出力が N の場合: メインを除いた worktree index = N - 1
# 現在ディレクトリがメインなら 5173 / 5174
# 現在ディレクトリが wt-K なら、worktree 一覧での K の出現順 (0 起点) を使い 5173+100*idx / 5174+100*idx
```

詳細は `docs/03-アーキテクチャ/07-並列開発ガイド.md` のポート規約を参照。

### Step 4: 出力テンプレで案内

```
■ 起動コマンド
  pnpm --filter @high-q/<app> dev --port <port>

■ アクセス先
  http://localhost:<port>/<router で確認した path>

■ 主要シナリオ (ハッピーパス)
  1. <ログイン状態 → 該当画面遷移 → 主要操作 → 完了状態>
  2. <最低 1 件のドメイン代表ケース>

■ 探索的試験の観点
  ▼ 4 状態
  - Loading: 通信遅延 (Chrome DevTools Network: Slow 3G) で表示崩れないか
  - Empty:   データ 0 件で空状態メッセージが出るか
  - Error:   通信遮断 (Offline) で Toast / Error UI が出て復帰可能か
  - Success: 正常系の完了表示

  ▼ a11y
  - Tab キーで操作可能か (focus order が論理的か)
  - focus ring が見えるか
  - aria-label / role が適切か (スクリーンリーダーで読み上げ可能か)

  ▼ モバイル
  - DevTools iPhone 13 表示で破綻しないか
  - タップ領域が 44x44px 以上か
  - 横スクロール発生していないか

  ▼ 権限
  - 別ロール (ログアウト / member / admin) で見えてはいけない物が見えないか
  - URL 直叩きでアクセスガードが効くか
```

## 探索的観点の取捨選択

- **画面が無いタスク (CI / docs / インフラ)** の場合は本 Skill は起動しない。代わりに CI 緑 / docs 反映確認のみ案内
- **新規 page**: 上記テンプレ全項目
- **既存 page の微修正**: 主要シナリオを修正箇所に絞り、4 状態のうち変更が影響する状態のみ
- **権限が無いコンポーネント単位の変更**: 「権限」観点は省略可

## 完了報告テンプレート

```
動作確認手順をお渡しします、翔太郎くん。

[上記出力テンプレを埋めたもの]

確認後、問題なければ ship に進みます。違和感があれば指摘してください。
```

## 関連

- 並列開発全体ガイド: `docs/03-アーキテクチャ/07-並列開発ガイド.md`
- 開発開始 Skill: `start-parallel-dev`
- UI 品質基準: `CLAUDE.md` Pillar 3 / `docs/05-インターフェース/01-UI設計方針.md`
