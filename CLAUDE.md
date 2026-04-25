# Claude Code 開発ガイド — High Q バレーボールサークル

---

## ⛔ 最重要原則：承認ゲート

**「承認」というキーワードが発せられない限り、Apply フェーズへ進むことを絶対に禁止する。**

```
/opsx:propose
  → Proposal + Design + Task を同時生成・提示
  → [承認待ち: 3ファイルをすべてレビュー後に「承認」]
  → /opsx:apply で実装開始
  → [承認待ち: ローカル確認後に「承認」]
  → PR 作成
  → ユーザー確認(Render プレビュー)
  → /opsx:sync (specs / docs 更新)     ← マージ前にやる
  → /opsx:archive (change を archive へ移動)
  → sync / archive のコミットを push   ← PR に追加コミットとして反映
  → master へマージ
  → ブランチ削除 + Issue を Done       ← 後始末まで含めて完了
```

- Proposal / Design / Task は**同一セッションで同時生成**する（分割しない）
- 3ファイルすべての承認を受けてから Apply を開始する
- Apply 中はタスクリスト順に 1 件ずつ完遂、順序変更・スキップ禁止
- **Sync / Archive はマージ前**、同じ PR に push する（マージ後に別 PR 作らない）
- マージ後は **ブランチ削除 + Issue クローズ** まで含めて 1 サイクル

詳細フローは `docs/03-アーキテクチャ/05-開発ワークフロー.md` 参照。

---

## ♻️ /clear 運用ルール（コスト効率）

**コンテキストを小さく保つことがコスト効率と回答精度の両方を上げる。** 以下のタイミングで `/clear` を実行:

- **PR が ship 完了した時**（opsx-ship 後）
- **大きなタスクが終わった時**（次の独立タスクに移る前）
- **同じ問題で 2 回修正失敗した時**（汚染されたコンテキストをリセット）
- **CLAUDE.md / 仕様を大幅変更した時**

`/clear` 前に必要なら `/compact <要約指示>` で履歴を圧縮し、次セッションで参照する。

---

## セッション開始時に必ず読むこと

```
openspec/project.md                                   ← 技術スタック・制約
openspec/specs/                                       ← 実装済み仕様
docs/templates/                                       ← Proposal / Design / Task テンプレート
docs/03-アーキテクチャ/04-開発・コーディング規約.md   ← FSD・Value Object・ESLint 設定
docs/03-アーキテクチャ/05-開発ワークフロー.md         ← 人間×Claude 協働プロセス
```

---

## Pillar 1 — OpenSpec & ワークフロー

### フェーズ（順序厳守）

`Propose → Apply → PR 作成 → ユーザー確認 → Sync → Archive → push → Merge → 後始末`

| コマンド | 役割 |
|---|---|
| `/opsx:propose` | Proposal + Design + Task を同時生成 |
| `/opsx:apply` | 承認済み Task を 1 件ずつ TDD 実装 |
| `/opsx:sync` | 実装内容を openspec/specs / docs に反映（マージ前） |
| `/opsx:archive` | change を archive/ へ移動（Sync 後） |
| `/opsx-ship` | PR レビュー OK 後の出荷フロー（sync/archive/push/merge/後始末を一気に） |

### Issue & ブランチ命名

```bash
gh issue create --title "feat: ..." --label "enhancement"
git checkout -b feature/<issue番号>-<kebab-case-summary>
```

### マージ後の後始末（必須）

```bash
git checkout master && git pull
git branch -d feature/<issue番号>-<...>
git push origin --delete feature/<issue番号>-<...>   # gh pr merge --delete-branch を使った場合は不要
gh issue close <issue番号> --comment "Done in #<PR番号>"
```

### Apply 中のテスト・ビルド実行ルール

UI 変更タスク連続時は、各タスクごとに `pnpm exec vitest run` / `pnpm build:lp` を実行せず、**全タスク完了後の最終確認タスクで 1 回まとめて実行**。
例外（各タスクで TDD を回す）: ロジック新規追加 / spec 新規作成 / バグ修正再発防止テスト。

### Apply 中のコミット粒度

デフォルトは「1 タスク = 1 コミット」。UI フィードバック対応など小粒な集合は「1 PR = 1 コミット」可。

### コンテキスト維持ルール

以下のタイミングで自発的に `project.md` と `design.md` を読み直し、進捗・制約を宣言:
1. Apply 開始時
2. フェーズ切替時
3. 同一セッションで Apply タスクが 5 件超

---

## Pillar 2 — アーキテクチャ（FSD）

```
app → pages → widgets → features → entities → shared
```

依存方向は上位 → 下位の一方向のみ。各スライスは `index.ts`（Public API）経由で外部 import。Supabase client は `shared/api/` のみ。Branded Types でドメイン識別子を表現、生の `string`/`number` 直使用禁止。エラーは `Result<T>` 型で技術エラーとビジネス異常系を区別。

詳細は `docs/03-アーキテクチャ/04-開発・コーディング規約.md`。テスト戦略は `docs/07-テスト/01-テスト戦略・方針.md`。ロギング方針は `docs/06-品質・セキュリティ/07-ロギング方針.md`。

---

## Pillar 3 — UI 品質

| アプリ | UI ライブラリ |
|---|---|
| `apps/lp` | Vuetify 3 |
| `apps/admin` | shadcn/ui + Tailwind |
| `apps/reservation` | shadcn/ui + Tailwind |

Design フェーズで必ずチェック: 影響レイヤー / ビジネス異常系列挙 + UI フィードバック / Loading・Empty・Error・Success 4 状態 / モバイルファースト / アクセシビリティ AA / デザイントークン使用（マジックナンバー禁止）。

詳細チェックリストは `docs/05-インターフェース/01-UI設計方針.md`。

---

## Pillar 4 — DB & セキュリティ

**RLS なしのテーブル実装を Apply で行うことを禁止**。テーブル変更時は Design フェーズで「SQL Migration + TypeScript エンティティ型 + RLS ポリシー」をセットで提示。

詳細は `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md`。

---

## Pillar 5 — Git & デプロイ安全性

- `master` への直接 push 禁止。PR は CI 全パスが必須
- **デプロイ 3 回連続失敗時は同じ修正を繰り返さず、3 軸（環境・ビルド設定・依存関係）で根本原因分析しユーザー報告**
- **不具合修正は応急手当て禁止**。構造全体を見て根本原因を解消し、影響範囲も合わせて修正

修正フロー: ①構造全体を読む → ②根本原因の仮説 → ③影響範囲を grep で確認 → ④連鎖修正は 1 PR にまとめる。

詳細は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`。

---

## セキュリティルール

- `.env` ファイルは**読まない・編集しない・コミットしない・提案しない**（絶対）
- 環境変数の値を Claude に共有しない。Render / Supabase の管理画面で直接設定
- 秘密情報をコードにハードコードしない
- Supabase `service_role` キーをクライアントサイドで使わない
- マイナンバーカードの個人番号を収集・保管するコード禁止
- SQL インジェクション・XSS に常に注意
