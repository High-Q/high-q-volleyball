# Claude Code 開発ガイド — High Q バレーボールサークル

## セッション開始時に必ず読むこと

以下のファイルをセッション開始時に必ず読み込み、プロジェクトの背景・技術スタック・制約を把握した上で作業すること。

- `openspec/project.md` — プロジェクト全体仕様（技術スタック・アーキテクチャ・制約）
- `openspec/specs/` — 実装済み仕様（存在する場合）

---

## 開発プロセス（必須ルール）

### 1. 作業開始前に必ず Issue を作る

**いかなる変更作業もIssueなしに始めてはならない。**

```
# Issue が存在しない場合は必ず作成する
gh issue create --title "..." --label "..."
```

ブランチ名は Issue 番号を含める:
- `feature/<issue番号>-<概要>`（例: `feature/76-monorepo-migration`）
- `fix/<issue番号>-<概要>`（例: `fix/99-calendar-display`）

### 2. openspec ワークフローで進める

```
/opsx:propose  → 仕様・設計・タスクを作成・合意
/opsx:apply    → TDD で実装
/opsx:archive  → 完了後にアーカイブ
```

### 3. TDD で実装する

- テストを先に書く（RED）
- テストが通る最小限の実装をする（GREEN）
- リファクタリングする（REFACTOR）

### 4. PR を通じて master にマージする

- `master` への直接 push は禁止
- PR は CI（lint / typecheck / test / build）が通ることが必須

---

## ブランチ戦略

```
production  ← Render 本番デプロイ（リリース時のみマージ）
master      ← 開発統合ブランチ（PR 必須）
feature/*   ← 機能開発
fix/*       ← バグ修正
```

---

## 技術スタック（概要）

詳細は `openspec/project.md` を参照。

- **言語**: TypeScript（strict）
- **FW**: Vue 3 + Vuetify 3（Composition API + `<script setup lang="ts">`）
- **ビルド**: Vite / pnpm workspaces（モノレポ）
- **バックエンド**: Supabase（Auth / PostgreSQL / Storage）
- **ホスティング**: Render（Static Site）
- **CI/CD**: GitHub Actions
- **Node.js**: v22 LTS

---

## セキュリティルール

- `.env` ファイルは絶対に読まない・編集しない・コミットしない
- 秘密情報（APIキー等）はコードにハードコードしない
- マイナンバーカードの個人番号を収集・保管するコードを書かない
