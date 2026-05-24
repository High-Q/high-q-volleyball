## Why

商用稼働中の prd Supabase は Free プランで自動バックアップが存在せず、DB / 本人確認書類画像を扱う以上、最低限の backup 取得手段が無いのは個人情報保護法 §23（安全管理措置）が求める「合理的水準」を満たさない。#269 で策定したバックアップ復旧 SOP § 1.2 が「GitHub Actions による週次自動 pg_dump で補完する」と前提を置いており、SOP 文面と実装の整合性確保のためにも本ワークフロー実装は必須。費用一切かけない方針のため、Supabase Pro 昇格ではなく GitHub Actions + GitHub Artifacts（無料・90 日保持）で代替する。

## What Changes

- **追加**: `.github/workflows/backup-prd.yml` を新規作成し、prd Supabase に対して週次自動 pg_dump を取得して GitHub Artifacts に保管するワークフローを稼働させる
- **追加**: ワークフローは cron での定期実行と、`workflow_dispatch` での手動実行の双方をサポートし、重要 migration 適用前に翔太郎くんが手動で直前スナップショットを取得できる
- **追加**: 既存 Secrets（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PRD_PROJECT_REF` / `SUPABASE_DB_PASSWORD`）を再利用し、新規 Secret 発行は行わない
- **修正**: `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 7.2 (DB 層障害時の復旧フロー) に GitHub Actions Artifacts からの restore 手順を追記し、SOP 全体で残っている「#299 で導入予定」表現を実装済み表現へ更新する
- **修正**: `supabase-foundation` spec に「prd Supabase 週次自動 pg_dump ワークフローの存在」を Requirement として追加し、ワークフロー消失や cron 停止を spec 違反として検知可能にする

## Capabilities

### New Capabilities

なし（バックアップ運用は既存 `supabase-foundation` spec への Requirement 追加で表現する。新規 capability を切ると spec の重複が増えるため）

### Modified Capabilities

- `supabase-foundation`: prd 週次自動 pg_dump ワークフローの存在と要件（cron / workflow_dispatch / dump 範囲 / Artifacts 保持期間）を Requirement として追加

## Impact

- **新規ファイル**: `.github/workflows/backup-prd.yml`
- **既存ドキュメント更新**: `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 7.2 と関連箇所
- **spec 更新**: `openspec/specs/supabase-foundation/spec.md` に Requirement 1 件追加
- **新規 Secret なし**: 既存 db-push-prd.yml と同じ Secret 群を再利用
- **アプリケーションコードへの影響なし**: `apps/*` / `packages/*` には触れない
- **GitHub Actions 利用料**: パブリックリポジトリは無料、private リポジトリでも Owner 個人 plan の無料枠（月 2,000 分）に対して週次 dump 1 回数分のみ消費するため、費用ゼロ方針を維持する
- **dump ファイルの機微情報アクセス権**: private リポジトリの Actions Artifacts は Owner / Collaborator のみダウンロード可能で、個人情報保護観点で適切

## スコープ確定方針

Issue #299 のスコープ外項目（Issue 本文の「スコープ外」セクションを継承）:

1. **Storage バケット (`identity-documents`) の自動エクスポート**: MVP3 別 Issue へオフロード。本変更では DB のみが対象
2. **復旧訓練の定期実施**: 法令上必須でなく、SOP § 6 / § 9 で「頻度規定なし」と確定済みのため本変更でも導入しない
3. **Pro プラン昇格**: 費用一切かけない方針（memory: feedback_cost_zero_default）。SOP § 2.1 trigger 条件達成時に別 Issue 化

加えて Propose で確認したい運用 UX 論点:

4. **dump 対象スキーマ**: SOP § 3 の手動 pg_dump は `--schema=public` を例示しているが、`auth.users` が落ちると会員 ID / 氏名 / メールの復旧が不可となり実用性を欠く。本ワークフローは **`auth` スキーマも含めた dump** を取得する方針（具体的な dump コマンド・flag は tasks で確定）
5. **失敗通知**: GitHub Actions 標準のジョブ失敗通知メールのみで運用する。Slack 等の追加通知チャネル整備は本変更スコープ外（費用ゼロ方針 + Solo dev 運用に過剰）
6. **cron スケジュール**: 毎週日曜 03:00 JST（UTC では土曜 18:00）。High Q のイベント開催が土曜中心であり、土曜の DB 変更を直近 backup に取り込むタイミングとして妥当

## 制約・前提条件

- prd Supabase のスキーマ・データに対しては **読み取りのみ**（pg_dump）を行い、書き込み・破壊的操作は一切行わない
- 既存ワークフロー `.github/workflows/db-push-prd.yml` の動作・Secrets 構成と矛盾しない
- SOP 14 が既に「#299 で導入する」前提で書かれているため、本変更マージ後に SOP の表現を「実装済み」へ揃える必要がある（マージ前の sync フェーズで対応）
- GitHub Artifacts の 90 日保持期間 = RPO 上限。これより古い backup は失われる前提で SOP § 7.2 を整える

## 成功基準

- [ ] `.github/workflows/backup-prd.yml` が cron 週次 + workflow_dispatch でトリガーされ、GitHub Actions の run 一覧から実行履歴を確認できる
- [ ] 手動 `workflow_dispatch` を 1 回実行し、GitHub Artifacts に prd dump ファイルが 90 日保持でアップロードされていることを確認できる
- [ ] dump ファイルは `public` / `auth` の双方のスキーマを含み、復旧時に会員データを復元可能である
- [ ] ワークフロー失敗時、GitHub Actions 標準通知が翔太郎くんのメールに届く
- [ ] `supabase-foundation` spec に「prd 週次自動 pg_dump ワークフローの存在」Requirement が追加され、`openspec validate` が成功する
- [ ] SOP 14 § 7.2 に GitHub Actions Artifacts からの restore 手順が追記され、SOP 内の「#299 で導入予定」が「実装済み」へ更新されている
