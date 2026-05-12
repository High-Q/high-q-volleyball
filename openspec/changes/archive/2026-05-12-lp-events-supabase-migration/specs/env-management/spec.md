## MODIFIED Requirements

### Requirement: 共通環境変数のリポジトリ root 管理

システムは、複数アプリで共有する環境変数（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` など）を **リポジトリ root** の `.env.local`（git 管理外）と `.env.example`（git 管理）で一元管理しなければならない (MUST)。各アプリは独自の `.env.local` を持たず、root の値を Vite の `envDir` 経由で読む。本契約は `apps/lp` / `apps/admin` / `apps/reservation` の 3 アプリすべてに適用される。

#### Scenario: root に env を配置

- **WHEN** リポジトリ root に `.env.local` が存在し `VITE_SUPABASE_URL=https://xxx.supabase.co` が定義されている
- **THEN** `apps/lp` / `apps/admin` / `apps/reservation` の Vite ビルド/開発で `import.meta.env.VITE_SUPABASE_URL` が同じ値として読み取れる

#### Scenario: テンプレートで変数名を共有

- **WHEN** リポジトリ root に `.env.example` が存在
- **THEN** 新規開発者は `cp .env.example .env.local` で初期セットアップが完了し、各アプリ個別の env.example を見る必要がない

### Requirement: Vite envDir による root env の参照

システムは、`apps/lp` / `apps/admin` / `apps/reservation` の `vite.config.js` で `envDir` を **リポジトリ root に向ける**ことで、Vite が root の `.env.*` ファイルを読み込むようにしなければならない (MUST)。

#### Scenario: vite.config.js での envDir 指定

- **WHEN** `apps/lp/vite.config.js` / `apps/admin/vite.config.js` / `apps/reservation/vite.config.js` に `envDir: path.resolve(__dirname, '../..')` が設定されている
- **THEN** `pnpm dev:lp` / `pnpm dev:admin` / `pnpm dev:reservation` 時に root の `.env.local` から VITE_ プレフィックス変数が読み込まれる

### Requirement: アプリ配下に env テンプレートを置かない

システムは、`apps/lp` / `apps/admin` / `apps/reservation` 配下に `.env.local` / `.env.example` を置いてはならない (MUST NOT)。env はリポジトリ root で一元管理する:
- `apps/lp/.env.local` (置かない)
- `apps/lp/.env.example` (置かない)
- `apps/admin/.env.local` (置かない)
- `apps/admin/.env.example` (置かない)
- `apps/reservation/.env.local` (置かない)
- `apps/reservation/.env.example` (置かない)

#### Scenario: アプリ配下の env テンプレートが残らない

- **WHEN** 本 change マージ後に `find apps -maxdepth 2 -name ".env*"` を実行
- **THEN** マッチが 0 件である

### Requirement: dev / prd で異なる Supabase 接続値

システムは `VITE_SUPABASE_URL` および `VITE_SUPABASE_PUBLISHABLE_KEY` の値を dev / prd の各 Supabase プロジェクトで別々に管理しなければならない (MUST)。アプリコード側で dev / prd を判別するロジックを持たず、環境変数の値で透過的に切り替わる構造とする。

#### Scenario: 本番デプロイで prd の値が読まれる

- **WHEN** master ブランチ向けの Render 本番デプロイが起動
- **THEN** `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は prd プロジェクトの値である

#### Scenario: PR Preview で dev の値が読まれる

- **WHEN** PR から生成された Render Preview デプロイが起動
- **THEN** `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は dev プロジェクトの値である

#### Scenario: アプリコードが環境判別ロジックを持たない

- **WHEN** `apps/<app>/src/shared/api/supabase.{ts,js}` を確認
- **THEN** 環境変数を読むだけで dev / prd を `if` / `process.env.NODE_ENV` 等で判別する分岐を含まない

### Requirement: Render `envVars` による dev/prd 切替

システムは `render.yaml` の lp / admin / reservation 各サービス定義（雛形コメント含む）で、Supabase 系 env var を `sync: false` + `previewValue` の 2 段構造で定義しなければならない (MUST)。本番デプロイは `sync: false` で Dashboard に設定された値（prd）を、PR Preview は `previewValue` の値（dev）を使う。

#### Scenario: envVars が dev/prd 切替構造で定義される

- **WHEN** lp / admin / reservation サービスを `services` 配列に追加する PR を作成
- **THEN** `VITE_SUPABASE_URL` および `VITE_SUPABASE_PUBLISHABLE_KEY` の各エントリが `sync: false` と `previewValue: <dev-value>` の両方を持つ

#### Scenario: secret キーが previewValue に書かれない

- **WHEN** `render.yaml` の任意の `previewValue` を確認
- **THEN** `service_role` 相当の secret キーは含まれない（公開キーである Publishable Key のみ許容）

### Requirement: ローカル開発の `.env.local` は dev プロジェクトの値を使用する

システムはローカル開発時、リポジトリ root の `.env.local` に dev プロジェクトの `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を記載する運用を維持しなければならない (MUST)。ローカルから prd プロジェクトに接続する運用は許可しない (MUST NOT)。本契約は lp / admin / reservation の 3 アプリに等しく適用される。

#### Scenario: ローカル開発が dev に接続する

- **WHEN** 開発者が `pnpm dev:lp` / `pnpm dev:admin` / `pnpm dev:reservation` を実行
- **THEN** root `.env.local` に記載された dev プロジェクトの URL/Key で Supabase に接続する

#### Scenario: ローカルから prd に接続しない

- **WHEN** root `.env.local` を確認
- **THEN** prd プロジェクトの URL は記載されていない（事故防止）

## REMOVED Requirements

### Requirement: LP は env 共有スコープ外

**Reason**: 本 change で LP のイベント取得を Supabase に切替えるため、LP も他 2 アプリと同じ envDir 共有スキームに統合する。例外条項を残すと「LP だけ env 規約が違う」状態が継続し、運用上の混乱と grep 漏れリスクが残るため削除する。

**Migration**: 本 change の Apply で `apps/lp/vite.config.js` に `envDir: path.resolve(__dirname, '../..')` を追加し、リポジトリ root の `.env.local` から `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を読む状態にする。`apps/lp/` 配下に `.env*` ファイルを置く運用は引き続き禁止（root 一元管理を維持）。
