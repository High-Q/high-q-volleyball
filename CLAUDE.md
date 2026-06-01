# Claude Code 開発ガイド — High Q バレーボールサークル

---

## ⛔ 最重要原則：承認ゲート

**ユーザーの明確な合意がない限り、次フェーズへ進むことを禁止する。**

承認の判定は「**「承認」という literal なキーワード**」に縛らず、合意に相当する言動を広く受け入れる:

| 承認とみなす | 承認とみなさない |
|---|---|
| 「承認」「OK」「進めて」「やって」「go」など同意の明示 | 沈黙・反応なし |
| **前段成果物（Proposal 等）の提示後**に `/opsx:apply` / `/opsx-ship` 等の次フェーズコマンドを起動 | 「待って」「考える」「保留」など留保 |
| 「Aで」「これで」など複数候補への明確な選択 | 提案内容への質問のみ（"なぜ？" 等） |
| Render プレビュー確認後の「OK 完了」「ship」などの ship 合図 | 前段が未提示・未完成のまま次フェーズコマンドを起動（要確認） |

```
/opsx:propose
  → Proposal + Design + Task を同時生成・提示
  → [合意待ち: 3 ファイルをレビュー後に承認に当たる言動]
  → /opsx:apply で実装開始
  → [合意待ち: ローカル確認結果を提示後に承認に当たる言動]
  → PR 作成
  → ユーザー確認(Render プレビュー)
  → /opsx:sync (specs / docs 更新)     ← マージ前にやる
  → /opsx:archive (change を archive へ移動)
  → sync / archive のコミットを push   ← PR に追加コミットとして反映
  → master へマージ
  → ブランチ削除 + Issue を Done       ← 後始末まで含めて完了
```

- Proposal / Design / Task は**同一セッションで同時生成**する（分割しない）
- 3ファイルが揃った状態でユーザーの合意を取ってから Apply を開始する
- Apply 中はタスクリスト順に 1 件ずつ完遂、順序変更・スキップ禁止（ただし論理的順序が明らかにおかしい場合は前倒し提案可）
- **Sync / Archive はマージ前**、同じ PR に push する（マージ後に別 PR 作らない）
- マージ後は **ブランチ削除 + Issue クローズ** まで含めて 1 サイクル

> 文言の literal 解釈にこだわって過剰に止まることは避ける。逆に、合図が曖昧な場合は短く確認する。

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
docs/08-移行/01-環境戦略・本番リリース計画.md         ← dev/prd 分離方針・Render Preview 制約・リリース Phase
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

### Issue 作成 / マージ後の後始末

- **新規 Issue 作成は `/create-issue` Skill 経由**で行う。Epic 配置 / Milestone / 着手順 / Project Status の 4 必須項目を漏らさずセットする
- **マージ後の後始末（ブランチ削除 + Issue クローズ）は `/opsx-ship` Skill が一括処理**する
- ブランチ命名: `feature/<issue番号>-<kebab-case>` / `fix/<番号>-<...>` / `chore/<番号>-<...>`

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

依存方向は上位 → 下位の一方向のみ。各スライスは `index.ts`（Public API）経由で外部 import。Supabase client は `shared/api/` のみ（type-only import は features 等から可）。Branded Types でドメイン識別子を表現、生の `string`/`number` 直使用禁止。エラーは `Result<T>` 型で技術エラーとビジネス異常系を区別。

### 機械検知（admin / reservation 対象、LP は #310 完了まで対象外）

| 検知対象 | ツール | severity |
|---|---|---|
| FSD 依存方向 (上位 → 下位の一方向) | `eslint-plugin-boundaries` + `dependency-cruiser` | error |
| cross-slice の Public API 経由 | `boundaries/no-private` | error |
| Supabase client の `shared/api/` 集約 | `@typescript-eslint/no-restricted-imports` (allowTypeImports) | error |
| `service_role` のクライアント側露出 | `no-restricted-syntax` (Edge Function は対象外) | error |
| HQ デザイントークン経由（生 hex / 色名禁止） | `stylelint` | warning |

→ 意味理解が必要なレビュー（テストの意味的妥当性 / migration の既存データ影響等）は引き続きレム self-check 責務。CLAUDE.md Pillar 3 / 4 のチェックリストで担保。

詳細は `docs/03-アーキテクチャ/04-開発・コーディング規約.md`。テスト戦略は `docs/07-テスト/01-テスト戦略・方針.md`。ロギング方針は `docs/06-品質・セキュリティ/07-ロギング方針.md`。

---

## Pillar 3 — UI 品質

| アプリ | UI スタック |
|---|---|
| `apps/lp` | Vuetify 3（移行検討中） |
| `apps/admin` | `@high-q/ui`（意匠系） + shadcn-vue（機能系） + `@high-q/tailwind-preset` + Vue Router |
| `apps/reservation` | 同上 |

すべてのアプリで HQ デザイントークン（`@high-q/design-tokens`）が単一の真実の源。色・書体・spacing・radius・shadow は CSS 変数（`var(--hq-*)`）または Tailwind preset utility（`bg-paper` / `p-hq-4` 等）経由のみ。マジックナンバー禁止。

**プリミティブの棲み分け**（admin / reservation）:
- **意匠系 = `@high-q/ui`**（`Button` / `Kicker` / `Badge` / `Photo` / `RemainBar`）— HQ ブランドの顔。3 アプリ共通。`var(--hq-*)` 直接利用、Tailwind / shadcn-vue 非依存。`Button` は 3 アプリで完全統一するため `@high-q/ui` のみ。
- **機能系 = shadcn-vue**（`Input` / `Label` / `FormField` / `Dialog` / `Combobox` / `DataTable` / `Toast` / `DatePicker` 等）— a11y 重視のプリミティブを CLI で `apps/<app>/src/shared/ui/` に copy-paste。Tailwind preset utility 経由で着色。本基盤では Login (#84) 用の `Input` / `Label` / `FormField` のみ取り込み済み。追加は必要時に各 Issue で個別取得。

Design フェーズで必ずチェック: 影響レイヤー / ビジネス異常系列挙 + UI フィードバック / Loading・Empty・Error・Success 4 状態 / モバイルファースト / アクセシビリティ AA / デザイントークン使用（マジックナンバー禁止）/ **E2E ハッピーパス試験の対象シナリオ列挙**。

### グローバル UI 規約（違反したら revert・MUST）

- フォーム入力は `shared/ui/FormField` でラップ（生 `<label>`+`<input>` 直書き禁止・初期表示で赤枠出さない）
- パンくずは `widgets/page-breadcrumb/PageBreadcrumb` のみ・Page header 1 箇所のみ
- 横遷移リンクは双方向対称性を確保
- 新規 Page / Widget 実装前は既存同種 Page を必ず Read してから着手

詳細・参考実装・違反検出 grep は `docs/05-インターフェース/01-UI設計方針.md`「ナビゲーション規約」「フォーム実装ルール」「新規 Page 実装前の既存踏襲ルール」。

新規 feature Apply の E2E は機能あたり 1〜2 件まで（happy path + 主要 edge case）。詳細バリエーションは component test。詳細: `docs/07-テスト/01-テスト戦略・方針.md`「E2E スケーラビリティ運用ルール」。

---

## Pillar 4 — DB & セキュリティ

**RLS なしのテーブル実装を Apply で行うことを禁止**。テーブル変更時は Design フェーズで「SQL Migration + TypeScript エンティティ型 + RLS ポリシー」をセットで提示。

### 機械検知（CI `migration-safety` job、`supabase/migrations/**` 変更時のみ起動）

| 検知対象 | script | severity |
|---|---|---|
| 新規 migration の RLS 網羅 (`enable row level security` + `create policy` セット) | `scripts/static-checks/migrations/check-rls.sh` | error |
| マイナンバー 12 桁 text 列禁止 SOP | `scripts/static-checks/migrations/check-my-number.sh` | error |
| ロールバック手順コメント (`-- ROLLBACK:`) 存在 | `scripts/static-checks/migrations/check-rollback-comment.sh` | warning |

既存 migration は `scripts/static-checks/migrations-allowlist.txt` で除外。**allowlist 追加時は PR コメントで理由を明示する**（運用ルール）。allowlist 追加が頻発する場合は CI rule 自体の設計を見直す。

詳細は `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md`、SOP は `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`。

---

## Pillar 5 — Git & デプロイ安全性

- `master` への直接 push 禁止。PR は CI 全パスが必須
- **デプロイ 3 回連続失敗時は同じ修正を繰り返さず、3 軸（環境・ビルド設定・依存関係）で根本原因分析しユーザー報告**
- **不具合修正は応急手当て禁止**。構造全体を見て根本原因を解消し、影響範囲も合わせて修正

修正フロー: ①構造全体を読む → ②根本原因の仮説 → ③影響範囲を grep で確認 → ④連鎖修正は 1 PR にまとめる。

詳細は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`。

### Apply 完了報告 / 環境戦略

- **dev / prd 分離方針**: Supabase / 環境変数 / Render 設定に触れる Design / Apply 前に必ず `docs/08-移行/01-環境戦略・本番リリース計画.md` を読む。Phase 移行に絡む変更は専用 Issue として切り出す

---

## セキュリティルール

- `.env` ファイルは**読まない・編集しない・コミットしない・提案しない**（絶対）
- 環境変数の値を Claude に共有しない。Render / Supabase の管理画面で直接設定
- 秘密情報をコードにハードコードしない
- Supabase `service_role` キーをクライアントサイドで使わない
- マイナンバーカードの**個人番号 (12 桁) をテキスト列として保管するコード禁止**。マスク済み画像（個人番号が完全に隠れている）の Storage 保管は許可。通知カードは受け付けない。詳細 SOP: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`
- SQL インジェクション・XSS に常に注意
