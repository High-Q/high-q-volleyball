# Proposal: env 一元化（envDir 化）

## Why

現状 `apps/admin/.env.local` と `apps/reservation/.env.local` に同一値（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`）を二重管理している。値変更時に両方同期する必要があり、漏れリスクあり。Phase 1 で admin (#84) 着手前に解消しておかないと、開発が進むほど二重管理コストが増える。

## What Changes

- **NEW** リポジトリ root に `.env.local`（git 管理外）と `.env.example` を 1 つずつ配置（共通 env の唯一の真実の源）
- **NEW** `apps/admin/vite.config.js` と `apps/reservation/vite.config.js` に **`envDir: path.resolve(__dirname, '../..')`** を追加し、Vite が root の env を読むよう構成
- **REMOVED** `apps/admin/.env.local` / `apps/reservation/.env.local` を削除（root に統合）
- **REMOVED** `apps/admin/.env.example` / `apps/reservation/.env.example` を削除（root に統合）
- **NOT CHANGED** `apps/lp/` は今回スコープ外（LP は Supabase 接続なし）。将来 LP も Supabase 化する change で同様に対応
- **NOT CHANGED** `apps/<app>/.env.local` を併用する余地は残す（アプリ固有 env が必要になった時、Vite が root と app の env を自動マージ）

## Capabilities

### New Capabilities

- `env-management`: モノレポにおける環境変数の管理規約。共通分は root、アプリ固有は app で。Vite envDir で実現。

### Modified Capabilities

なし（新規構築のみ）

## Impact

### 影響を受けるファイル

- 新規作成: `.env.local`（git 管理外、ユーザー手動）/ `.env.example`
- 修正: `apps/admin/vite.config.js`, `apps/reservation/vite.config.js`
- 削除: `apps/admin/.env.local`, `apps/admin/.env.example`, `apps/reservation/.env.local`, `apps/reservation/.env.example`

### 依存・後続

- 後続 Issue #84 (管理者ログイン), #89 (会員登録) は本 change の完了後に env 設定が単純化される
- Render の env vars 設定は **各サービス個別**のままで影響なし（高-q-lp 等のサービスごとの dashboard 設定）

### 動作確認

- `pnpm dev:admin` / `pnpm dev:reservation` で `import.meta.env.VITE_SUPABASE_URL` が正しく読めること（admin/reservation の vite を起動して確認）
- LP は影響なし（envDir 変更しない）

### コスト

- 追加依存ゼロ（Vite 標準機能）
- 学習コスト微小（envDir の概念だけ）
