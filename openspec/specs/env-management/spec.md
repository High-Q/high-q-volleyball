# Env Management Spec

## ADDED Requirements

### Requirement: 共通環境変数のリポジトリ root 管理

システムは、複数アプリで共有する環境変数（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` など）を **リポジトリ root** の `.env.local`（git 管理外）と `.env.example`（git 管理）で一元管理する。各アプリは独自の `.env.local` を持たず、root の値を Vite の `envDir` 経由で読む。

#### Scenario: root に env を配置
- **WHEN** リポジトリ root に `.env.local` が存在し `VITE_SUPABASE_URL=https://xxx.supabase.co` が定義されている
- **THEN** `apps/admin` と `apps/reservation` の Vite ビルド/開発で `import.meta.env.VITE_SUPABASE_URL` が同じ値として読み取れる

#### Scenario: テンプレートで変数名を共有
- **WHEN** リポジトリ root に `.env.example` が存在
- **THEN** 新規開発者は `cp .env.example .env.local` で初期セットアップが完了し、各アプリ個別の env.example を見る必要がない

### Requirement: Vite envDir による root env の参照

システムは、`apps/admin` と `apps/reservation` の `vite.config.js` で `envDir` を **リポジトリ root に向ける**ことで、Vite が root の `.env.*` ファイルを読み込むようにする。

#### Scenario: vite.config.js での envDir 指定
- **WHEN** `apps/admin/vite.config.js` に `envDir: path.resolve(__dirname, '../..')` が設定されている
- **THEN** `pnpm dev:admin` 時に root の `.env.local` から VITE_ プレフィックス変数が読み込まれる

### Requirement: アプリ固有 env の併用余地

システムは、root 共通 env に加えて `apps/<app>/.env.local` を併用できる構造を維持する。両方が存在する場合、Vite の規約に従いマージ（後者が前者を上書き）される。

#### Scenario: アプリ固有 env のオーバーライド
- **WHEN** root の `.env.local` に `VITE_SUPABASE_URL=https://shared.supabase.co` があり、`apps/admin/.env.local` に `VITE_SUPABASE_URL=https://admin-only.supabase.co` がある
- **THEN** `apps/admin` の Vite では admin の値が優先される

### Requirement: LP は本 change のスコープ外

システムは、`apps/lp` の env 構成を本 change で変更しない。LP は Phase 1 では Supabase 接続なしで AWS API Gateway + DynamoDB を使い、Phase 2 で Supabase 移行時に同様の envDir 構造へ移行する別 change で対応する。

#### Scenario: LP の env 構成
- **WHEN** 本 change のマージ後
- **THEN** `apps/lp/vite.config.js` に envDir 設定はなく、`apps/lp/` 配下に `.env*` ファイルも存在しない（LP は env 不要）

### Requirement: .gitignore による .env.local 除外の継続

システムは、リポジトリ root の `.gitignore` で `.env.local` および `.env.*.local` を除外する。これは既存の設定で、本 change で削除された各アプリの `.env.local` も再帰パターンで対象に含まれている。

#### Scenario: root .env.local は git に追跡されない
- **WHEN** リポジトリ root に `.env.local` を作成して `git status` を実行
- **THEN** untracked にも modified にも表示されない（gitignore で除外済み）

### Requirement: 削除されるファイル

システムは、本 change の Apply 完了後、以下のファイルがリポジトリに存在しないことを保証する:
- `apps/admin/.env.local`
- `apps/admin/.env.example`
- `apps/reservation/.env.local`
- `apps/reservation/.env.example`

#### Scenario: アプリ配下の env テンプレートが残らない
- **WHEN** 本 change マージ後に `find apps -maxdepth 2 -name ".env*"` を実行
- **THEN** マッチが 0 件である
