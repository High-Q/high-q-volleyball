## Why

商用稼働中の prd Supabase に対し migration 適用は翔太郎くんが手動で `supabase db push --project-ref <prd-ref>` を叩いている。dev に push したセッションで prd を忘れる、適用順を間違える、`pnpm exec supabase link` の戻し忘れで以降のローカル作業を prd に向けてしまう、といったヒューマンリスクが顕在化しやすい。商用利用中はスキーマドリフトが致命傷になるため、master マージ時に GitHub Actions が prd へ自動適用する仕組みに切り替える。

## What Changes

- **追加**: master push 時に `supabase/migrations/` の変更を検知して prd へ自動 `db push` する GitHub Actions ワークフロー
- **追加**: PR 段階での dry-run（適用差分の表示のみ・実適用なし）チェック
- **追加**: 危険操作（DROP TABLE / DROP COLUMN / TRUNCATE 等）を含む migration を検知したら GitHub Environment 承認ゲートで翔太郎くん承認を待つ
- **追加**: 自動適用失敗時に翔太郎くんへ通知する仕組み（GitHub Actions 標準のジョブ失敗通知メールを Repo 設定で有効化、追加で Sentry へエラー送出を検討）
- **追加**: prd 自動適用に必要な GitHub Secrets（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PRD_PROJECT_REF` / `SUPABASE_DB_PASSWORD`）の運用ルール
- **追加**: 障害時の rollback 手順をインフラ・CI/CD 構成ドキュメントに追記
- **修正**: `docs/08-移行/01-環境戦略・本番リリース計画.md` の「migrations は当面手動」記述を、自動化済み運用に更新

## Capabilities

### New Capabilities

- `prd-db-push-ci`: master マージ時の prd Supabase migrations 自動適用と PR 段階の dry-run チェック、危険操作の承認ゲート、失敗通知、rollback 手順までを含む CI 整備

### Modified Capabilities

なし（既存の `github-actions-ci` は app テスト/ビルドの CI を対象としており、関心が異なるため独立 spec として追加する）

## Impact

- **追加ファイル**: `.github/workflows/db-push-prd.yml`
- **既存ドキュメント更新**: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`（rollback 手順とワークフロー説明追加）、`docs/08-移行/01-環境戦略・本番リリース計画.md`（手動運用記述の更新）
- **GitHub 設定**: Secrets 3 件追加、Environment `prd-db-push` の作成と承認者設定（翔太郎くん）
- **既存 CI への影響なし**: `.github/workflows/ci.yml` の typecheck/lint/test/build/e2e ジョブには手を入れない
- **dev 運用は不変**: dev Supabase への push は引き続き翔太郎くん手動（メモリ `dev_db_push_self_execute.md` 準拠）
- **コードへの影響なし**: アプリケーションコード（`apps/*` / `packages/*`）への変更は無し
