## ADDED Requirements

### Requirement: dev / prd で異なる Supabase 接続値

システムは `VITE_SUPABASE_URL` および `VITE_SUPABASE_PUBLISHABLE_KEY` の値を dev / prd の各 Supabase プロジェクトで別々に管理しなければならない (MUST)。アプリコード側で dev / prd を判別するロジックを持たず、環境変数の値で透過的に切り替わる構造とする。

#### Scenario: 本番デプロイで prd の値が読まれる
- **WHEN** master ブランチ向けの Render 本番デプロイが起動
- **THEN** `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は prd プロジェクトの値である

#### Scenario: PR Preview で dev の値が読まれる
- **WHEN** PR から生成された Render Preview デプロイが起動
- **THEN** `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は dev プロジェクトの値である

#### Scenario: アプリコードが環境判別ロジックを持たない
- **WHEN** `apps/<app>/src/shared/api/supabase.ts` を確認
- **THEN** 環境変数を読むだけで dev / prd を `if` / `process.env.NODE_ENV` 等で判別する分岐を含まない

### Requirement: Render `envVars` による dev/prd 切替

システムは `render.yaml` の admin / reservation サービス定義（雛形コメント含む）で、Supabase 系 env var を `sync: false` + `previewValue` の 2 段構造で定義しなければならない (MUST)。本番デプロイは `sync: false` で Dashboard に設定された値（prd）を、PR Preview は `previewValue` の値（dev）を使う。

#### Scenario: envVars が dev/prd 切替構造で定義される
- **WHEN** admin / reservation サービスを `services` 配列に追加する PR を作成
- **THEN** `VITE_SUPABASE_URL` および `VITE_SUPABASE_PUBLISHABLE_KEY` の各エントリが `sync: false` と `previewValue: <dev-value>` の両方を持つ

#### Scenario: secret キーが previewValue に書かれない
- **WHEN** `render.yaml` の任意の `previewValue` を確認
- **THEN** `service_role` 相当の secret キーは含まれない（公開キーである Publishable Key のみ許容）

### Requirement: 環境変数キー名は新形式 Publishable Key に統一

システムは Supabase 接続の Anon 相当キーを `VITE_SUPABASE_PUBLISHABLE_KEY` として統一表記しなければならない (MUST)。docs / spec / コード / `.env.example` / `render.yaml` のいずれにも旧表記 `VITE_SUPABASE_ANON_KEY` を残してはならない (MUST NOT)。

#### Scenario: docs に旧表記が残らない
- **WHEN** `docs/` 配下に対し `VITE_SUPABASE_ANON_KEY` を grep
- **THEN** マッチが 0 件である

#### Scenario: spec に旧表記が残らない
- **WHEN** `openspec/specs/` および `openspec/changes/` 配下に対し `VITE_SUPABASE_ANON_KEY` を grep
- **THEN** マッチが 0 件である（本 change の archive 後を含む）

#### Scenario: コード / 設定ファイルに旧表記が残らない
- **WHEN** `apps/` / `packages/` / `render.yaml` / `.env.example` 等に対し `VITE_SUPABASE_ANON_KEY` を grep
- **THEN** マッチが 0 件である

### Requirement: ローカル開発の `.env.local` は dev プロジェクトの値を使用する

システムはローカル開発時、リポジトリ root の `.env.local` に dev プロジェクトの `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を記載する運用を維持しなければならない (MUST)。ローカルから prd プロジェクトに接続する運用は許可しない (MUST NOT)。

#### Scenario: ローカル開発が dev に接続する
- **WHEN** 開発者が `pnpm dev:admin` または `pnpm dev:reservation` を実行
- **THEN** root `.env.local` に記載された dev プロジェクトの URL/Key で Supabase に接続する

#### Scenario: ローカルから prd に接続しない
- **WHEN** root `.env.local` を確認
- **THEN** prd プロジェクトの URL は記載されていない（事故防止）
