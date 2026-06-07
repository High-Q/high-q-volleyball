# Supabase Foundation Spec

## Purpose

High Q バレーボールサークルの DB / Auth / Storage 基盤として Supabase を採用し、dev / prd の 2 プロジェクト体制で運用する。Branded Types によるドメイン ID 安全性、Supabase クライアントの単一エントリポイント、Migration の git 管理など、安全な開発と本番運用を両立させるための基盤要件を定義する。
## Requirements
### Requirement: Supabase プロジェクトの設置

システムは ap-northeast-1（東京）リージョンに Supabase プロジェクトを **dev / prd の 2 つ**作成しなければならない (MUST)。無料枠で運用し、dev は開発検証用、prd は本番運用用に物理分離する。

#### Scenario: dev プロジェクトが存在する
- **WHEN** Supabase Dashboard にアクセス
- **THEN** プロジェクト名 `high-q-dev` が ap-northeast-1 で作成されており、PostgreSQL バージョンは 16 系である

#### Scenario: prd プロジェクトが存在する
- **WHEN** Supabase Dashboard にアクセス
- **THEN** プロジェクト名 `high-q-prd` が ap-northeast-1 で作成されており、PostgreSQL バージョンは 16 系である

#### Scenario: 2 プロジェクトが Free プラン枠内で運用される
- **WHEN** Supabase の billing / project 設定を確認
- **THEN** dev / prd の双方が Free プランの 2 active project 枠内で運用されている

### Requirement: 接続情報の環境変数管理

システムはクライアントから利用する接続情報（URL / Publishable key）を環境変数経由でのみ取得しなければならない (MUST)。Supabase 新形式 API キー（Publishable / Secret）を採用し、`secret` キー（旧 service_role 相当）をクライアントコードで使用してはならない (MUST NOT)。

#### Scenario: フロントエンドで Publishable key を使用
- **WHEN** apps/admin または apps/reservation が Supabase に接続する
- **THEN** `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を環境変数（Render env vars / ローカル `.env.local`）から読み込み、`secret` キーは参照しない

#### Scenario: ローカル開発の env ファイル
- **WHEN** 開発者がローカルで起動する
- **THEN** `apps/<app>/.env.local` から接続情報を読み、`.env*` ファイルは git 管理外（`.gitignore` 追加済み）である

### Requirement: Supabase クライアントの単一エントリポイント

システムは `packages/shared/src/api/supabase.ts` のみで Supabase クライアントを生成しなければならない (MUST)。各アプリ・各 FSD レイヤーから直接 `createClient` を呼び出してはならない (MUST NOT)。

#### Scenario: shared/api 経由でのみ参照
- **WHEN** apps/admin / apps/reservation の任意のコードが Supabase へアクセスする
- **THEN** `import { supabase } from '@high-q/shared/api'` 形式（または `apps/<app>/src/shared/api/` の thin wrapper 経由）でのみ取得する

#### Scenario: features / entities からの直接 import 禁止
- **WHEN** ESLint が `features/*` または `entities/*` 配下のファイルから `@supabase/supabase-js` を直接 import している
- **THEN** `eslint-plugin-boundaries` または `no-restricted-imports` でビルドエラーとなる

### Requirement: Branded Types によるドメイン ID 安全性

システムはドメイン識別子（events.id 等）を Branded Types として表現しなければならない (MUST)。生の `string` を直接代入できない型構造とする。

#### Scenario: 型レベルでの誤代入防止
- **WHEN** TypeScript で `EventId` を期待する関数に `string` を直接渡す
- **THEN** 型エラーとなりコンパイルが通らない

#### Scenario: Smart constructor でのバリデーション
- **WHEN** 外部入力から `EventId` を作成する
- **THEN** `createEventId(value: string): Result<EventId>` 経由で UUID 形式バリデーションを通過した値のみが `EventId` として扱える

### Requirement: SQL Migration のリポジトリ管理

システムは DB スキーマ変更を `supabase/migrations/<timestamp>_<name>.sql` として git 管理しなければならない (MUST)。

#### Scenario: 初期スキーマの migration ファイル
- **WHEN** リポジトリを clone した直後
- **THEN** `supabase/migrations/` に events / members / reservations の作成 SQL と RLS 有効化 SQL が含まれる

### Requirement: prd プロジェクトのスキーマは migration ファイル経由で構築される

システムは prd プロジェクトのスキーマ構築を `supabase/migrations/*.sql` の全件適用 (`supabase db push`) のみで行う。SQL Editor からの手動 DDL 投入や `pg_dump` での dev データコピーを行ってはならない (MUST NOT)。

#### Scenario: prd プロジェクトに migration が全件適用される
- **WHEN** prd プロジェクト初期構築時に `supabase link --project-ref <prd-ref>` 実行後 `supabase db push` を実行
- **THEN** `supabase/migrations/` 配下の全 SQL ファイルが順番に適用され、スキーマが dev と一致する

#### Scenario: dev データが prd にコピーされない
- **WHEN** prd プロジェクトの初期構築が完了した直後
- **THEN** prd の各テーブルは空（または migration に同梱された seed のみ）であり、dev のテストデータは含まれない

### Requirement: dev / prd 間のスキーマドリフト禁止

新規 migration を作成した Apply / 開発作業では、dev に `supabase db push` を実行した直後、同セッションで prd にも `supabase link --project-ref <prd-ref>` → `supabase db push` を実行しなければならない (MUST)。dev のみ push して prd を流し忘れることを禁止する (MUST NOT)。

#### Scenario: dev 適用後に prd にも同じ migration が流れる
- **WHEN** 開発者が `supabase/migrations/<timestamp>_<name>.sql` を新規追加し dev に push
- **THEN** 同セッション内で prd にも `supabase db push` で同じ migration が流れている

#### Scenario: ドリフト検出
- **WHEN** dev / prd 間でスキーマが乖離している疑いがある時
- **THEN** Supabase Dashboard の各プロジェクトの schema viewer または `\d` コマンド相当でテーブル定義を比較し、差分があれば即修正する

### Requirement: prd プロジェクトの Storage バケットと RLS

prd プロジェクトは `identity-documents` Storage バケットを private 設定で作成し、RLS を有効化しなければならない (MUST)。バケットおよび RLS の構成は dev と同一とする。

#### Scenario: prd Storage バケットが存在する
- **WHEN** prd プロジェクトの Storage 設定を確認
- **THEN** `identity-documents` バケットが private 設定で存在し、RLS ポリシーが有効化されている

### Requirement: prd プロジェクトの認証メール SMTP

prd プロジェクトの Auth → SMTP は、`docs/06-品質・セキュリティ/10-メール送信設定SOP.md` の Phase 1 設定（Gmail SMTP）を再適用しなければならない (MUST)。Phase 3 で Resend + 独自ドメインに移行する別 Issue は本 spec のスコープ外である。

#### Scenario: prd で Gmail SMTP が有効化されている
- **WHEN** prd プロジェクトの Auth → Email Settings を確認
- **THEN** Gmail SMTP の認証情報が設定されており、Confirmation / Magic Link メールが prd の SMTP で送信される

### Requirement: prd プロジェクトの初期 seed データ

prd プロジェクトには本番運用に必要な最小限の seed データ（`venues` テーブルの 5 会場レコード）のみを投入しなければならない (MUST)。テスト会員 / テスト予約 / テスト本人確認書類などの試験データを投入してはならない (MUST NOT)。

#### Scenario: 5 会場が prd に投入されている
- **WHEN** prd プロジェクトの `venues` テーブルを SELECT
- **THEN** 5 件の会場レコードが存在する

#### Scenario: 試験データが prd に存在しない
- **WHEN** prd プロジェクトの `members` / `reservations` / `identity_documents` テーブルを SELECT
- **THEN** 0 件である

### Requirement: prd 接続情報のセキュリティ管理

システムは prd プロジェクトの URL / Publishable Key / Secret Key を Supabase Dashboard と Render Dashboard でのみ扱い、コード / Issue 本文 / コメント / Claude へのチャットペーストを行ってはならない (MUST NOT)。値の所有・管理は翔太郎くん本人が行う。

#### Scenario: prd Key がリポジトリ内に存在しない
- **WHEN** リポジトリ全体に対し prd プロジェクト URL の文字列を grep
- **THEN** マッチが 0 件である（`render.yaml` `previewValue` に dev の値が入る場合は許容するが、prd 値は記載しない）

#### Scenario: secret キーがクライアントコードに存在しない
- **WHEN** リポジトリ全体に対し `service_role` または `secret` プレフィックスのキー文字列を grep
- **THEN** マッチが 0 件である

### Requirement: 新規 migration の rollback 戦略の明示

システムは **本 spec 導入後に新規追加される** `supabase/migrations/<timestamp>_<name>.sql` について、当該 migration を以下 3 分類のいずれかに位置付けなければならない (MUST)。既存 migration（本 spec 導入時点でリポジトリに存在する 21 件）は SOP § 5 分類表で「全件カテゴリ 3」として一括宣言する運用とし、ファイル本体への遡及的なコメント追記は要求しない (SHALL NOT)。

- **カテゴリ 1 (forward-only / 加算的)**: CREATE TABLE / CREATE VIEW / ADD COLUMN（NOT NULL 制約なし、または DEFAULT 付き）/ INSERT seed 等の加算的変更。rollback SQL の併設は任意。
- **カテゴリ 2 (要 rollback SQL)**: column rename / FK 変更 / column 削除 / NOT NULL 化 / 既存データ書き換え等、データ構造に影響する変更。対応する `<元タイムスタンプ>_<元名称>_rollback.sql` を同一 PR で `supabase/migrations/` に併設しなければならない (MUST)。
- **カテゴリ 3 (rollback 不可)**: DROP TABLE / TRUNCATE / 不可逆な data migration。migration ファイル冒頭コメントに「rollback 不可: GitHub Actions 自動 pg_dump (#299) または手動 pg_dump からの restore で復旧」と明示しなければならない (MUST)。

分類判定の基準と既存 migrations の分類表は `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を真実の源とする。

#### Scenario: forward-only 新規 migration を追加

- **WHEN** 開発者が CREATE VIEW のみを含む新規 migration `<timestamp>_add_xxx_view.sql` を `supabase/migrations/` に追加する
- **THEN** rollback SQL の併設は要求されない（カテゴリ 1）が、SOP 分類表への追記により分類が明示される

#### Scenario: 要 rollback の新規 migration を追加

- **WHEN** 開発者が column 削除を含む新規 migration `<timestamp>_drop_xxx_column.sql` を `supabase/migrations/` に追加する
- **THEN** 同一 PR に `<timestamp>_drop_xxx_column_rollback.sql` が含まれており、当該 SQL を適用すると削除した column が元の型・default 値で復元される

#### Scenario: rollback 不可の新規 migration を追加

- **WHEN** 開発者が DROP TABLE を含む新規 migration を `supabase/migrations/` に追加する
- **THEN** migration ファイル冒頭コメントに「rollback 不可: Supabase Daily Backup point-in-time restore で復旧」相当の文言が記載されている

### Requirement: 既存 migrations の分類が SOP に一括宣言される

`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 5 は、本 spec 導入時点でリポジトリに存在する全 `supabase/migrations/*.sql` ファイルを「全件カテゴリ 3 (rollback 不可・Daily Backup point-in-time restore で復旧)」として一括宣言しなければならない (MUST)。新規 migration が追加された場合は SOP § 5 の分類表に追記し、未掲載の migration があってはならない (MUST NOT)。

#### Scenario: 既存 migration が全件カテゴリ 3 として一括宣言されている

- **WHEN** SOP § 5 を読み込む
- **THEN** 「本 spec 導入時点の既存 21 件は全件カテゴリ 3」と明記され、GitHub Actions 自動 pg_dump (#299) または手動 pg_dump からの restore で復旧する旨が記載されている

#### Scenario: 新規 migration が分類表に追記される

- **WHEN** 新規 `supabase/migrations/<timestamp>_<name>.sql` が PR に含まれる
- **THEN** 同 PR で SOP § 5 分類表に当該ファイル名と分類カテゴリが追記されている

### Requirement: バックアップ・復旧 SOP ドキュメントの存在

リポジトリには `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` が存在しなければならない (MUST)。当該 SOP は最低限以下を含まなければならない (MUST): Supabase 自動バックアップ仕様 / Pro プラン昇格 trigger 条件 / 重要 migration 適用前の手動 `pg_dump` 取得手順 / migration 分類ルールと既存 migrations 分類表 / 復旧手順 / 障害時の復旧フロー / 漏洩時対応 SOP との連携 / 法令準拠の根拠。

#### Scenario: SOP ドキュメントが存在し主要章を持つ

- **WHEN** `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を読み込む
- **THEN** Supabase 自動バックアップ仕様 / Pro 昇格 trigger / 手動 pg_dump 手順 / migration 分類 / 既存 migrations 分類表 / 復旧手順 / 障害時復旧フロー / 漏洩時 SOP との連携 / 法令準拠の根拠 の各セクションが存在する

### Requirement: prd Supabase 週次自動 pg_dump ワークフローの存在

システムは `.github/workflows/backup-prd.yml` を備え、prd Supabase プロジェクトに対して週次で自動 pg_dump を取得し、GitHub Artifacts に保管しなければならない (MUST)。本ワークフローは Supabase Free プランが自動バックアップを提供しない構造的弱点に対する補完策であり、`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 1.2 が前提とする運用基盤を成す。

ワークフローは cron による週次定期実行と `workflow_dispatch` による手動実行の双方をサポートし、SOP § 3「重要 migration 適用前の手動 pg_dump 取得」の手段を GitHub Actions UI から提供しなければならない (MUST)。dump 対象は `public` スキーマと `auth` スキーマの双方を含み、会員データ（`auth.users` と FK 関係の `members` 等）を一貫した状態で復元可能でなければならない (MUST)。

ワークフローは既存 Secrets（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PRD_PROJECT_REF` / `SUPABASE_DB_PASSWORD`）を再利用し、prd Supabase に対しては読み取り操作（pg_dump）のみを行い、書き込み・破壊的操作を行ってはならない (MUST NOT)。

#### Scenario: 週次 cron で自動 pg_dump が取得される

- **WHEN** 毎週日曜 03:00 JST（UTC 土曜 18:00）が到来する
- **THEN** GitHub Actions が `backup-prd.yml` をトリガーし、prd Supabase の `public` + `auth` スキーマを含む SQL dump を取得して GitHub Artifacts にアップロードする

#### Scenario: 重要 migration 適用前に手動で dump を取得できる

- **WHEN** 翔太郎くんが GitHub Actions UI から `backup-prd.yml` の "Run workflow" を実行する
- **THEN** その時点の prd Supabase の dump が取得され、GitHub Artifacts にアップロードされる

#### Scenario: dump ファイル名規約が一貫している

- **WHEN** ワークフロー実行で dump ファイルが生成される
- **THEN** ファイル名は `prd_<YYYYMMDD_HHMMSS>.sql` 形式であり、SOP § 3 の手動取得手順と整合する

#### Scenario: Artifacts 保持期間が 90 日

- **WHEN** dump ファイルが Artifacts にアップロードされる
- **THEN** 保持期間 90 日が設定されており、それ以降は GitHub によって自動削除される

#### Scenario: ワークフロー失敗時に翔太郎くんへ通知が届く

- **WHEN** `backup-prd.yml` のジョブが失敗する
- **THEN** GitHub Actions 標準の job failure 通知メールが翔太郎くんに送信される

#### Scenario: prd に対する書き込み操作を行わない

- **WHEN** `backup-prd.yml` の全ステップを確認する
- **THEN** `supabase db push` / `psql` での INSERT・UPDATE・DELETE・DDL 等の書き込み操作は含まれず、`supabase db dump` 相当の読み取り操作のみで構成される

<!-- merged from data-api-grant-template (Issue #247) -->

### Requirement: 新規テーブル migration は 3 ロールへの明示 GRANT を含める

`supabase/migrations/` に新規追加されるテーブル作成 migration は `supabase/templates/new_table.sql` を出発点とし、anon / authenticated / service_role の 3 ロールに対し当該テーブルの利用想定に沿った `grant` 文を明示的に含めなければならない (SHALL)。`alter default privileges` による自動付与にのみ依存してはならない (SHALL NOT) 。これは Supabase の Data API 仕様変更 (2026-10-30 既存プロジェクト enforce) において、public schema テーブルが PostgREST 経由でアクセスされるために明示 GRANT が必要となるためである。

#### Scenario: 新規テーブル migration がテンプレを出発点として書かれる

- **WHEN** 開発者が `supabase/migrations/<timestamp>_add_<name>.sql` を新規作成する
- **THEN** 当該 migration は `supabase/templates/new_table.sql` の構成 (CREATE TABLE / enable RLS / create policy / 3 ロール GRANT / ROLLBACK コメント) を踏襲しており、anon / authenticated / service_role それぞれに対する `grant` 文を含む

#### Scenario: 明示 GRANT 抜けの新規 migration は許容しない

- **WHEN** 新規テーブル migration が `create table` を含むが、anon / authenticated / service_role のいずれか 1 つでも明示 `grant` 文を欠く
- **THEN** 当該 migration は本要件を満たさず、レビューで差し戻しの対象となる (CI による機械検知は本変更ではスコープ外、レビュー時の人手チェックで担保)

### Requirement: GRANT 状態の検証クエリを提供する

システムは `supabase/tests/verify_grants.sql` を提供 SHALL し、public schema の全ベーステーブルに対する anon / authenticated / service_role の SELECT / INSERT / UPDATE / DELETE 権限を `has_table_privilege` で一覧化できるようにする。本クエリは `supabase db query --linked --file supabase/tests/verify_grants.sql` で dev / prd 双方に対し実行可能であり、enforce 期日前点検と新規テーブル追加後の自己検証に用いる SHALL 。

#### Scenario: 検証クエリの実行で全テーブル × 3 ロール × 4 権限を取得

- **WHEN** 開発者またはレムが `supabase db query --linked --file supabase/tests/verify_grants.sql` を実行する
- **THEN** public schema の全ベーステーブルについて、anon / authenticated / service_role の 4 権限 (SELECT / INSERT / UPDATE / DELETE) の付与状態が table_name 昇順 + role 固定順で出力され、欠落を目視で発見できる

#### Scenario: ロール権限欠落の検出

- **WHEN** いずれかのテーブルで service_role の SELECT が `false` を返す
- **THEN** 出力からそのテーブルが特定でき、補正 migration の作成判断ができる
