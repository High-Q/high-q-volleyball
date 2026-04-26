# Supabase Foundation Spec

## ADDED Requirements

### Requirement: Supabase プロジェクトの設置

システムは ap-northeast-1（東京）リージョンに Supabase プロジェクトを 1 つ作成し、無料枠で運用する。

#### Scenario: プロジェクトが存在する
- **WHEN** Supabase Dashboard にアクセス
- **THEN** プロジェクト名 `high-q` が ap-northeast-1 で作成されており、PostgreSQL バージョンは 16 系である

### Requirement: 接続情報の環境変数管理

システムはクライアントから利用する接続情報（URL / Publishable key）を環境変数経由でのみ取得する。Supabase 新形式 API キー（Publishable / Secret）を採用し、`secret` キー（旧 service_role 相当）をクライアントコードで使用してはならない。

#### Scenario: フロントエンドで Publishable key を使用
- **WHEN** apps/admin または apps/reservation が Supabase に接続する
- **THEN** `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を環境変数（Render env vars / ローカル `.env.local`）から読み込み、`secret` キーは参照しない

#### Scenario: ローカル開発の env ファイル
- **WHEN** 開発者がローカルで起動する
- **THEN** `apps/<app>/.env.local` から接続情報を読み、`.env*` ファイルは git 管理外（`.gitignore` 追加済み）である

### Requirement: Supabase クライアントの単一エントリポイント

システムは `packages/shared/src/api/supabase.ts` のみで Supabase クライアントを生成する。各アプリ・各 FSD レイヤーから直接 `createClient` を呼び出すことを禁止する。

#### Scenario: shared/api 経由でのみ参照
- **WHEN** apps/admin / apps/reservation の任意のコードが Supabase へアクセスする
- **THEN** `import { supabase } from '@high-q/shared/api'` 形式（または `apps/<app>/src/shared/api/` の thin wrapper 経由）でのみ取得する

#### Scenario: features / entities からの直接 import 禁止
- **WHEN** ESLint が `features/*` または `entities/*` 配下のファイルから `@supabase/supabase-js` を直接 import している
- **THEN** `eslint-plugin-boundaries` または `no-restricted-imports` でビルドエラーとなる

### Requirement: Branded Types によるドメイン ID 安全性

システムはドメイン識別子（events.id 等）を Branded Types として表現し、生の `string` を直接代入できないようにする。

#### Scenario: 型レベルでの誤代入防止
- **WHEN** TypeScript で `EventId` を期待する関数に `string` を直接渡す
- **THEN** 型エラーとなりコンパイルが通らない

#### Scenario: Smart constructor でのバリデーション
- **WHEN** 外部入力から `EventId` を作成する
- **THEN** `createEventId(value: string): Result<EventId>` 経由で UUID 形式バリデーションを通過した値のみが `EventId` として扱える

### Requirement: SQL Migration のリポジトリ管理

システムは DB スキーマ変更を `supabase/migrations/<timestamp>_<name>.sql` として git 管理する。

#### Scenario: 初期スキーマの migration ファイル
- **WHEN** リポジトリを clone した直後
- **THEN** `supabase/migrations/` に events / members / reservations の作成 SQL と RLS 有効化 SQL が含まれる
