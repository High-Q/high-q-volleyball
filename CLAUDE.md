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
  → PR作成 → プレビュー確認 → 本番マージ
  → Sync & Archive
```

- Proposal / Design / Task は**同一セッションで同時生成**する（分割しない）
- 3ファイルすべての承認を受けてから Apply を開始する
- Apply 中は Task リスト順に 1 件ずつ完遂し、チェックを更新しながら進める
- Apply 内でのタスク順序変更・スキップは禁止

---

## セッション開始時に必ず読むこと

```
openspec/project.md                              ← 技術スタック・制約
openspec/specs/                                  ← 実装済み仕様
docs/templates/                                  ← Proposal / Design / Task テンプレート
docs/03-アーキテクチャ/04-開発・コーディング規約.md ← FSD・Value Object・ESLint設定（必読）
docs/03-アーキテクチャ/05-開発ワークフロー.md       ← 人間×Claude 協働プロセス
```

---

## Pillar 1 — OpenSpec & ワークフロー

### フェーズ定義

| フェーズ | 目的 | 成果物 |
|---|---|---|
| **Propose** | Why・What・How・Task を同時設計 | `proposal.md` + `design.md` + `tasks.md` |
| **Apply** | TDD 実装。1タスク＝1コミット | コード + テスト |
| **Sync** | 実装仕様を docs に反映 | `openspec/specs/` 更新・関連 docs 更新 |
| **Archive** | Change のアーカイブ・Issue クローズ | archived change |

### openspec コマンド

```bash
/opsx:propose   # Proposal + Design + Task を同時生成
/opsx:apply     # 承認済み Task を 1 件ずつ TDD 実装
/opsx:archive   # Sync 完了後に Change をアーカイブ
```

### Issue & ブランチ命名

```bash
gh issue create --title "feat: ..." --label "enhancement"
git checkout -b feature/<issue番号>-<kebab-case-summary>
```

### Apply 中のテスト・ビルド実行ルール

**UI 変更タスクが連続するとき、各タスクごとに `pnpm exec vitest run` / `pnpm build:lp` を実行しない。** 全タスク完了後（最終確認 T-N）に 1 回まとめて実行する。

- 適用対象: コンポーネントの template / style 修正、props 整理、見た目の調整など、既存テストへの影響確認のみが目的のタスク
- 例外（各タスクで TDD を回す）:
  - `shared/lib/` や `entities/` などにロジックを新規追加する場合
  - `*.spec.js/ts` を新規作成する Apply タスクの場合
  - バグ修正で再発防止テストを書くタスクの場合
- 最終確認タスク（通常 T-16 or 類似）でテスト・ビルド・grep 検証をまとめて実施

### Apply 中のコミット粒度ルール

**デフォルトは「1 タスク = 1 コミット」**。ただし以下のケースは「1 PR = 1 コミット」にまとめてよい:

- UI フィードバック対応など、ユーザーの 1 回の指摘から派生した小粒な修正の集合
- ユーザーから明示的に「まとめてコミット」と指示があった場合
- 各タスクの差分が極めて小さく、個別コミットの意味が薄い場合

判断に迷ったらユーザーに確認する。1 コミットにまとめる場合も、コミットメッセージ本文で T-N.M 番号を箇条書きで列挙する（後追いで何が含まれるか分かるように）。

### コンテキスト維持ルール（長期セッション対策）

以下のタイミングで **自発的に** `project.md` と `design.md` を読み直し、現在の進捗と技術制約を宣言すること：

1. **Apply 開始時**: 「project.md と design.md を読み直しました。現在の進捗: X/N タスク完了。確認した制約: [要約]」
2. **フェーズ切り替え時**（Propose → Apply 等）
3. **同一セッションで Apply タスクが5件を超えた時点**

宣言なしに実装を継続することを禁止する。

詳細プロセスは `docs/03-アーキテクチャ/05-開発ワークフロー.md` を参照。

---

## Pillar 2 — アーキテクチャ（FSD）& コーディング品質

### Feature Sliced Design レイヤー構造

```
app → pages → widgets → features → entities → shared
```

依存方向は上位 → 下位の一方向のみ。同一レイヤー間の直接 import 禁止。

```
apps/<app>/src/
  app/       ← ルーター・プラグイン・グローバル設定
  pages/     ← ルーティング単位（薄く保つ）
  widgets/   ← 複合UIブロック（event-calendar, reservation-form 等）
  features/  ← ユーザー操作単位（book-event, create-event 等）
  entities/  ← ビジネスエンティティ（event, member, reservation, session）
  shared/    ← 非ビジネスの汎用コード（ui, api, lib, types, schemas）

packages/shared/src/  ← クロスアプリ shared（Supabase client・共通型）
```

### 外部接続の境界

**Supabase client は `shared/api/` にのみ存在する。`features/entities` 層からの直接 import を禁止。**

テスト時の依存差し替えは MSW + TanStack Query の `queryClient` で行う（`provide/inject` は不要）。

### Public API ルール

各スライスは `index.ts` を持ち、**外部からは必ず `index.ts` 経由で import する**。
このルールは **ESLint（`eslint-plugin-boundaries` + `no-restricted-imports`）で自動検証**する。

### Value Object（Branded Types）

ドメイン層の型は Branded Types + Smart constructor で不変性とバリデーションを担保する。
生の `string` / `number` をドメイン識別子に直接使用することを禁止する。

```typescript
export type EventId = Brand<string, 'EventId'>;
export function createEventId(value: string): EventId { ... }
```

### エラー型

技術エラーとビジネス異常系を区別し、UI でエラーコードに応じた具体的フィードバックを返す。

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };
// ErrorCode: CAPACITY_EXCEEDED | DUPLICATE_RESERVATION | NETWORK_ERROR | ...
```

「エラーが発生しました」だけの表示は禁止。「なぜ失敗したか」を具体的に伝えること。

### テスト義務

- **全 Apply タスクに対応するテストタスクを必須**とする
- テストファイルはスライス内 `model/` と同じディレクトリ（`*.spec.ts`）
- TDD（RED → GREEN → REFACTOR）を原則とする
- ビジネス異常系テストは Design フェーズで定義した全ケースをカバーすること

詳細は `docs/07-テスト/01-テスト戦略・方針.md` を参照。

### ロギング

- `console.log` を本番コードに残さない
- エラーは `logger.error()` で記録し、個人情報をログに含めない

詳細は `docs/06-品質・セキュリティ/07-ロギング方針.md` を参照。

---

## Pillar 3 — UI 品質

### スタック

| アプリ | UIライブラリ |
|--------|------------|
| `apps/lp` | Vuetify 3 |
| `apps/admin` | shadcn/ui + Tailwind |
| `apps/reservation` | shadcn/ui + Tailwind |

### Design フェーズで必ず適用するチェックリスト

- [ ] 影響する FSD レイヤー・スライスを明記
- [ ] **ビジネス異常系を全て列挙し、UIフィードバックを設計**（エラーコード対応）
- [ ] Loading / Empty / Error / Success の4状態を定義
- [ ] モバイルファーストのブレークポイントを明記
- [ ] アクセシビリティ（ARIA・コントラスト比 AA・キーボード操作）
- [ ] デザイントークン使用（マジックナンバー禁止）

詳細は `docs/05-インターフェース/01-UI設計方針.md` を参照。

---

## Pillar 4 — DB & セキュリティ

### Supabase RLS（必須）

**テーブルの追加・変更を伴う全ての変更で、RLS ポリシーの設計を Design フェーズに含めること。**
RLS なしのテーブルを Apply で実装することを禁止する。

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- SELECT / INSERT / UPDATE / DELETE のポリシーを全て明示すること
```

### スキーマとエンティティの整合

DB テーブル変更時は Design フェーズで以下をセットで提示する:
1. SQL Migration ファイル
2. 対応する TypeScript エンティティ型（Branded Types 含む）
3. RLS ポリシー

---

## Pillar 5 — Git & デプロイ安全性

### ブランチ戦略

- `master` への直接 push は**いかなる理由があっても禁止**
- PR は CI（lint / typecheck / test / build）が全パスすることが必須条件
- GitHub ブランチ保護の設定手順は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` 参照

### アンチループデプロイ原則

デプロイが **3回連続失敗** した場合、同じ修正を繰り返すことを禁止する。
以下の 3 軸で根本原因を分析してユーザーに報告すること:

1. **環境軸**: Node.js バージョン・OS・CI ランナーの差異
2. **ビルド設定軸**: `buildCommand`・`rootDir`・環境変数の設定ミス
3. **依存関係軸**: パッケージバージョン競合・lifecycle script の問題

---

## セキュリティルール

- `.env` ファイルは**読まない・編集しない・コミットしない・提案しない**（絶対）
- 環境変数の値を Claude に共有しない。Render / Supabase の管理画面で直接設定する
- 秘密情報（APIキー・トークン）をコードにハードコードしない
- Supabase `service_role` キーをクライアントサイドで使わない
- マイナンバーカードの個人番号を収集・保管するコードを書かない
- SQL インジェクション・XSS に常に注意する
