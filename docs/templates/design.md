# Design: [変更名]

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Task の3ファイルをすべて承認後に Apply へ進む。

---

## 0. コンテキスト確認（Apply 開始前に必ず実施）

> Apply 開始時に Claude が宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: [要約]」

---

## 1. FSD アーキテクチャ設計

> 参照: `docs/03-アーキテクチャ/04-開発・コーディング規約.md`

### 影響レイヤー・スライス

- [ ] `shared/` — 共通型・スキーマ・API client の変更
- [ ] `entities/<name>/` — エンティティ型・Branded Types・クエリオプション
- [ ] `features/<name>/` — ユーザー操作ロジック・UI
- [ ] `widgets/<name>/` — 複合UIブロック
- [ ] `pages/<name>/` — ページレイアウトの変更
- [ ] `packages/shared/` — クロスアプリ共通型

### 依存関係図

```
pages/XxxPage → widgets/XxxWidget → features/xxx → entities/xxx → shared/api
```

### Value Object / Branded Types（ドメイン型の変更がある場合）

> 参照: 規約の「Value Object（Branded Types）」セクション

```typescript
// entities/<name>/model/<name>.types.ts
// 追加・変更する Branded Types と Smart constructor を記述

// export type XxxId = Brand<string, 'XxxId'>;
// export function createXxxId(value: string): XxxId { ... }
```

### エラーコード（追加分）

```typescript
// shared/types/result.ts に追加するエラーコード
// 技術エラーとドメインエラーを区別して列挙すること

// 技術エラー: NETWORK_ERROR | SERVER_ERROR | NOT_FOUND | ...
// ドメインエラー: CAPACITY_EXCEEDED | DUPLICATE_RESERVATION | ...
```

---

## 2. ビジネス異常系の洗い出し（必須）

> **全ての異常系を列挙し、UI でのフィードバック方法まで設計すること。**
> APIエラー（5xx）だけでなく、ビジネスルール起因の失敗を網羅する。

| # | 異常ケース | エラーコード | ユーザーへのフィードバック |
|---|-----------|-------------|--------------------------|
| 1 | （例）定員に達している | `CAPACITY_EXCEEDED` | 「このイベントは定員に達しています」 |
| 2 | （例）すでに予約済み | `DUPLICATE_RESERVATION` | 「すでにこのイベントに予約済みです」 |
| 3 | （例）受付終了後 | `RESERVATION_CLOSED` | 「このイベントの受付は終了しています」 |
| 4 | （例）本人確認未完了 | `MEMBER_NOT_VERIFIED` | 「予約には本人確認が必要です」 |
| 5 | API 通信失敗 | `NETWORK_ERROR` | 「通信に失敗しました。再試行してください」 |
| 6 | サーバーエラー | `SERVER_ERROR` | 「しばらくしてから再試行してください」 |

**UI 表示方針**: エラーコードで分岐し、「なぜ失敗したか」を具体的に表示する。「エラーが発生しました」だけは禁止。

---

## 3. UI/UX 設計

> 参照: `docs/05-インターフェース/01-UI設計方針.md`

### コンポーネント構成（FSD）

```
widgets/<name>/
  ui/<WidgetName>.vue        ← メインコンポーネント
  model/use<WidgetName>.ts   ← composable
  index.ts

features/<name>/
  ui/<FeatureButton>.vue
  model/use<Feature>.ts
  api/<feature>Mutation.ts   ← TanStack Query mutationOptions
  index.ts

entities/<name>/
  ui/<EntityCard>.vue
  model/<entity>.types.ts    ← Branded Types
  api/<entity>Queries.ts     ← TanStack Query queryOptions
  index.ts
```

### デザイントークン使用確認

- [ ] 色は `color="primary"` / `color="secondary"` 等のトークンを使用
- [ ] マジックナンバー（`#182F43`・`16px` 等）をコードに書いていない

### 4状態設計（必須）

| 状態 | 条件 | 表示方法 |
|------|------|---------|
| **Loading** | `isPending === true` |  |
| **Empty** | `data.length === 0` |  |
| **Error** | `isError === true` | エラーコードに応じたメッセージ |
| **Success** | データあり・エラーなし | 通常表示 |

### レスポンシブ対応

| ブレークポイント | レイアウト |
|---------------|----------|
| xs（〜599px） |  |
| sm（600〜959px） |  |
| md〜（960px〜） |  |

### アクセシビリティチェックリスト

- [ ] インタラクティブ要素に `aria-label` を設定
- [ ] キーボード操作（Tab・Enter・ESC）が機能する
- [ ] テキストのコントラスト比 AA（4.5:1）以上
- [ ] モーダルはフォーカストラップを実装
- [ ] エラーメッセージに `role="alert"` を付与

---

## 4. DB / Supabase 設計（テーブル追加・変更がある場合）

> **テーブルの追加・変更を伴うすべての変更で、SQL と RLS ポリシーを必ず設計すること。**

### 新規テーブル migration チェックリスト

- [ ] `supabase/templates/new_table.sql` を出発点としてコピーした
- [ ] anon / authenticated / service_role の 3 ロールへ明示 GRANT を含めた（`alter default privileges` の自動付与に依存しない）
- [ ] 必要に応じて `supabase/tests/verify_grants.sql` を Apply 後に実行し、3 ロール × 4 権限の付与状態を検証する計画がある

### SQL Migration

```sql
-- migration: YYYYMMDDHHMMSS_<説明>.sql

CREATE TABLE IF NOT EXISTS table_name (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ...
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### RLS ポリシー設計（必須）

**テーブル作成・変更時は必ず RLS を有効化し、ポリシーを設計すること。RLS なしのテーブルは承認しない。**

```sql
-- RLS 有効化
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ポリシー設計（アクセス制御を全パターン列挙する）
-- 例: events テーブル
CREATE POLICY "events_select_all"    ON events FOR SELECT USING (true);
CREATE POLICY "events_insert_admin"  ON events FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "events_update_admin"  ON events FOR UPDATE USING     (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "events_delete_admin"  ON events FOR DELETE USING     (auth.jwt() ->> 'role' = 'admin');
```

| ポリシー名 | 操作 | 対象ロール | 条件 |
|-----------|------|-----------|------|
|           | SELECT |  |  |
|           | INSERT |  |  |
|           | UPDATE |  |  |
|           | DELETE |  |  |

### TypeScript エンティティとの整合確認

```typescript
// SQL スキーマと TypeScript 型の対応を明示する
// entities/<name>/model/<name>.types.ts

// interface XxxRow {   ← Supabase が返す raw 型（snake_case）
//   id: string;
//   created_at: string;
// }
//
// interface Xxx {       ← アプリ内ドメイン型（camelCase + Branded Types）
//   id: XxxId;
//   createdAt: Date;
// }
```

---

## 5. テスト設計

> 参照: `docs/07-テスト/01-テスト戦略・方針.md`

### テスト対象

| 対象 | 種別 | ツール |
|------|------|--------|
| Smart constructor（Branded Types） | ユニットテスト | Vitest |
| composable（`useXxx`） | ユニットテスト（TDD） | Vitest |
| API layer（TanStack Query） | ユニットテスト + MSW | Vitest + MSW |
| component（複雑な場合） | コンポーネントテスト | Vitest + @vue/test-utils |

### テストケース（事前定義）

**正常系**
- [ ] 
- [ ] 

**ビジネス異常系（上記セクション2と対応させること）**
- [ ] 定員オーバー時に `CAPACITY_EXCEEDED` エラーが返る
- [ ] 重複予約時に `DUPLICATE_RESERVATION` エラーが返る
- [ ] （追加した異常系を全てカバーする）

**技術エラー系**
- [ ] API 通信失敗時に `NETWORK_ERROR` エラー状態になる
- [ ] 空配列が返った時に Empty 状態になる

**Branded Types**
- [ ] Smart constructor が不正値で例外を投げる
- [ ] Smart constructor が正常値でインスタンスを返す

---

## 6. ロギング設計

> 参照: `docs/06-品質・セキュリティ/07-ロギング方針.md`

| 事象 | ログレベル | 含む情報 |
|------|-----------|---------|
| 重要な操作成功（予約完了等） | `info` | 操作種別（個人情報除く） |
| ビジネス異常系 | `warn` | エラーコード（値は除く） |
| 技術エラー | `error` | エラーコード・エンドポイント（個人情報除く） |
