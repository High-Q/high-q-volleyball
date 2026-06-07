# Design: data-api-grant-template

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Task の 3 ファイルをすべて承認後に Apply へ進む。

---

## 0. コンテキスト確認 (Apply 開始前に必ず実施)

> Apply 開始時にレムが宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: Supabase 既存プロジェクト 2026-10-30 enforce / GRANT は新規テーブル追加時の運用整備のみ / 既存テーブル GRANT 構成には触れない」

---

## 1. FSD アーキテクチャ設計

本変更はランタイムコード (apps/admin, apps/reservation, packages/shared) を一切変更しない。SQL テンプレ・検証クエリ・ドキュメントの追記のみで構成されるため、FSD レイヤー設計の対象外。

- [x] 影響レイヤーなし (ランタイム影響なし)
- [x] Value Object / Branded Types の追加なし
- [x] エラーコードの追加なし

---

## 2. ビジネス異常系の洗い出し

ランタイム振る舞いを変更しないため、UI フィードバック設計の対象外。

ただし「テンプレを使わずに migration を書いて GRANT を忘れた」という運用上の失敗は想定される。対策は次の二段構え:

| # | 失敗ケース | 検知方法 | リカバリ |
|---|-----------|---------|--------|
| 1 | テンプレを使わず新規テーブル migration を書き、GRANT を忘れる | Apply 後の検証クエリ実行で抜けを検出 | 同じ migration ファイルに GRANT 文を追記して再 push |
| 2 | dev では GRANT 残置で動いていたが prd で permission denied | enforce 期日前 (2026-09-30) の Security Advisor 確認 | 不足ロールに対し補正 migration を追加 |

---

## 3. UI/UX 設計

UI 変更なし。本セクションは対象外。

---

## 4. DB / Supabase 設計

### 4.1 テンプレ SQL の置き場と構成

新規テーブル migration の出発点を `supabase/templates/` に置き、開発者 (= レム) は新規 migration 作成時にこのテンプレを `supabase/migrations/<timestamp>_<name>.sql` にコピーしてから書き始める。

テンプレ 1 ファイルに含める要素 (順番):

1. ヘッダコメント (テンプレ由来である旨と、コピー後に消すべきプレースホルダの位置を明示)
2. CREATE TABLE (id / created_at / updated_at の標準列を含む)
3. enable row level security
4. create policy (SELECT / INSERT / UPDATE / DELETE のスケルトン)
5. anon ロール GRANT (SELECT のみ / 必要に応じて削除)
6. authenticated ロール GRANT (CRUD)
7. service_role ロール GRANT (CRUD)
8. 末尾コメントでロールバック手順 (`-- ROLLBACK:`)

> 既存の `20260429000000_table_grants.sql` で `alter default privileges` は設定済みだが、enforce 後の bootstrap 挙動に依存しない明示 GRANT を全テーブル migration に書く方針を取る。

### 4.2 検証クエリの設計

`supabase/tests/verify_grants.sql` を追加。クエリ単独で次を出力する想定:

- public schema に属する全ベーステーブル一覧
- 各テーブルに対する anon / authenticated / service_role の SELECT / INSERT / UPDATE / DELETE 権限 (`has_table_privilege` で取得)
- 期待値からのズレを目視で発見できるよう、テーブル名昇順 + ロール固定順で並べる

実行方法は `supabase db query --linked --file supabase/tests/verify_grants.sql` を想定 (dev / prd は `supabase link` 先で切り替え)。

### 4.3 既存 GRANT 構成との関係

- 既存 migration 2 本 (`20260429000000_table_grants.sql` / `20260511000100_grant_service_role.sql`) には触れない
- `alter default privileges` は補完的に残す。本変更で導入する明示 GRANT が一次予防、既定権限が二次の保険
- 既存テーブルへの再 GRANT は行わない (リスクと変更影響に対して効果が薄い)

### 4.4 CLAUDE.md / docs/templates 連携

- `CLAUDE.md` Pillar 4 に「新規テーブル migration は `supabase/templates/` のテンプレを出発点とし、anon / authenticated / service_role への明示 GRANT を必ず含める」ルールを追記。検証クエリと SOP 文書へのリンクも 1 行ずつ記載
- `docs/templates/design.md` の「4. DB / Supabase 設計」内チェックリストに「テンプレ SQL を出発点として書き、3 ロール GRANT を含めている」を追記

### 4.5 スコープ外 (Non-Goals)

- CI による migration の GRANT 有無の機械検知 (`scripts/static-checks/migrations/` への追加)。enforce 期日後の再発防止には有効だが、本 Issue では「テンプレ + 検証クエリ + ルール文書化」までを完了とし、CI 化は後続 Issue として切り出す
- 既存 5 テーブル + signup_pending の GRANT 再構成 (既存 GRANT は維持されるため不要)
- RLS ポリシーの見直し (本変更とは独立)

---

## 5. テスト設計

ランタイムコード変更なしのため Vitest / Playwright / コンポーネントテストは追加しない。

代替の検証手段:

| 検証対象 | 方法 |
|---------|------|
| テンプレ SQL が syntactically valid | dev DB に対し試験的に `supabase db query --linked --file supabase/templates/new_table.sql` 相当を直接実行せず、テンプレヘッダの「コピー後にプレースホルダ置換」運用で担保 (テンプレ自体は実行されないため) |
| 検証クエリが正常に動く | Apply 最終タスクでレムが `supabase db query --linked --file supabase/tests/verify_grants.sql` を 1 度実行し、現状の権限一覧が取得できることを確認 |
| CLAUDE.md / design.md 追記が破綻していない | `openspec validate data-api-grant-template --strict` パス + Markdown 目視 |

---

## 6. ロールアウト計画

1. Apply 完了 (テンプレ / 検証クエリ / ドキュメント 4 点) → PR push → Render Preview は本変更で生成物が無いため検証スキップ可
2. PR レビュー OK → `/opsx-ship` で sync / archive / merge
3. 2026-09-30 までに翔太郎くんが Supabase Dashboard Security Advisor で既存テーブル状態を再確認し、Issue #247 をクローズ
4. (後続) 必要なら CI 機械検知化を別 Issue で起こす
