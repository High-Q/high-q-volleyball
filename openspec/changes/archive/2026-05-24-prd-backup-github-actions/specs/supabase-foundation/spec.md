## ADDED Requirements

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
