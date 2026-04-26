# Design: env 一元化（envDir 化）

## Context

PR #119 で Supabase を共通バックエンドとして導入した結果、apps/admin と apps/reservation で同じ env（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`）を 2 箇所で管理する状態になった。Phase 1 で admin (#84) 着手前に解消しないと、開発中に同期漏れリスクが累積する。

LP（apps/lp）は Phase 1 では Supabase 接続なしのため、本 change のスコープ外。

## Goals / Non-Goals

**Goals**:
- admin / reservation が共通 env を 1 箇所で管理
- 追加依存ゼロ（Vite ネイティブ機能のみ）
- アプリ固有 env が増えた時の拡張余地を残す
- 既存の `.env.local` 値（Supabase の Publishable key）を失わずに移行

**Non-Goals**:
- LP の env 構成変更（Phase 2 で別 change）
- secret manager（1Password / dotenv vault）の導入
- CI / Render env vars の構成変更（dashboard 側は各サービス独立のまま）

## Decisions

### D1. Vite の `envDir` を採用
**選択**: `vite.config.js` で `envDir: path.resolve(__dirname, '../..')`
**代替**: `dotenv-cli` で起動 script から root env を読み込む
**理由**: 追加依存ゼロ、Vite ネイティブ機能なので将来も保守しやすい。dotenv-cli は別パッケージ追加 + `pnpm dev` script の wrap が必要で複雑。

### D2. root の .env.local は **ユーザー手動作成**
**選択**: Apply 中に root に `.env.local` を作成する手順をユーザーに依頼
**代替**: 私が作成（settings.json deny で不可）
**理由**: `.env.local` は秘密値（Supabase Publishable key）を含むため、Claude が触らない方針。`.env.example` のみ私が git 管理対象として作る。

### D3. アプリ配下の `.env.example` は **削除**
**選択**: root に統合して `apps/<app>/.env.example` は消す
**代替**: 残しておいて placeholder のみ（共通 env を root、固有 env を app に分けて記載）
**理由**: Phase 1 では admin/reservation 固有の env がない。残すと「どっちを編集するか」の判断が増えて混乱。固有 env が増えた時に `apps/<app>/.env.example` を再生成する運用で十分。

### D4. Vite の `envDir` 設定を vite.config.js でハードコードする
**選択**: `path.resolve(__dirname, '../..')` で各 vite.config.js に直書き
**代替**: 環境変数 `VITE_ENV_DIR` で動的に指定
**理由**: モノレポ構造は固定、相対パスは静的に決まる。動的化は不要な複雑性。

### D5. Vite の自動マージ挙動を活用
**選択**: root に共通 env、app に固有 env を置けば Vite が自動マージ（app 優先）
**代替**: 1 箇所のみ許可（root or app の片方）
**理由**: 将来 admin だけ別 Supabase project を使う等の拡張に対応できる。Vite 標準仕様なので学習コストなし。

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| envDir 変更後に `pnpm dev:admin` が起動しない | apply 中に動作確認タスクを必ず実施。Vite の `envDir` は標準機能なので失敗確率は低い |
| ユーザーが root に `.env.local` を作り忘れて起動失敗 | Vite 起動時のエラーメッセージ + `packages/shared/src/api/supabase.ts` の `readSupabaseConfig` で明確な ENV_MISSING_* エラーを既に実装済（PR #119）。docs にも記載 |
| Render 本番環境で envDir が効かない | Render は env vars を **OS 環境変数として注入**するので envDir 経由ではなく `import.meta.env` 直接参照で読む。本番影響なし |
| 既存の admin/reservation .env.local の値消失 | 削除前にユーザーに「root の .env.local に値をコピー」してもらう手順を明示 |
| ローカルで pnpm install のたびに workspace 設定が壊れる | 影響なし（env はリポジトリレベル、workspace 構造に非依存） |

## Migration Plan

1. ユーザーが既存 `apps/admin/.env.local` の中身を root の `.env.local` にコピー
2. PR で `vite.config.js` 修正 + `apps/<app>/.env.example` 削除 + root `.env.example` 追加
3. ユーザーが `apps/<app>/.env.local` を手動削除
4. 各アプリで `pnpm dev:<app>` 起動確認

ロールバック:
- yaml ではなく vite.config.js への変更なので、`git revert` で元に戻る
- ローカル `.env.local` ファイルは手動で apps/<app>/ に戻す（バックアップ推奨）

## Open Questions

- Q. root `.env.example` の中身は admin/reservation の合算でいいか?
  → A. **YES**. Phase 1 では VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY のみ。両アプリで使う。
- Q. アプリ固有 env が将来できた時の運用は?
  → A. `apps/<app>/.env.example` を再生成 + 該当アプリの README に記載。Vite の自動マージ挙動を活用。
- Q. CI で env をどう設定する?
  → A. GitHub Actions secret に `VITE_SUPABASE_URL` 等を登録し、ワークフローから注入。本 change のスコープ外（Issue #80 で対応）。
