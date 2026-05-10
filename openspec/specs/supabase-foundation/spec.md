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

