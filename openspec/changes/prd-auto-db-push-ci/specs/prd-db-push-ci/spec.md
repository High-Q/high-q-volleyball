## ADDED Requirements

### Requirement: prd 自動 db push ワークフローファイルが `.github/workflows/db-push-prd.yml` として存在する

リポジトリには `.github/workflows/db-push-prd.yml` が存在しなければならない（SHALL）。当該ファイルは GitHub Actions の YAML 構文として valid でなければならず（SHALL）、`name` / `on` / `jobs` のトップレベルキーを持たなければならない（SHALL）。ワークフロー名は人間が一目で目的を理解できる文字列（例: `prd Supabase db push`）でなければならない（SHALL）。既存の `.github/workflows/ci.yml` には変更を加えてはならない（SHALL NOT、関心が異なるため別ファイルで管理する）。

#### Scenario: ワークフローファイルが存在し parse 可能である

- **WHEN** リポジトリルートから `.github/workflows/db-push-prd.yml` を読み込む
- **THEN** ファイルが存在し、YAML として parse 可能で、`name` / `on` / `jobs` のトップレベルキーを持つ

#### Scenario: 既存 ci.yml が改変されていない

- **WHEN** 本 spec 適用前後の `.github/workflows/ci.yml` を比較する
- **THEN** 差分が無い

### Requirement: トリガーは PR と push: master の双方を `supabase/migrations/**` パスフィルタで制御する

ワークフローの `on` には `pull_request` と `push` の双方を含まなければならない（SHALL）。`pull_request` は `master` 向けのみを対象としなければならず（SHALL）、`types` は最低でも `opened` / `synchronize` / `reopened` を含まなければならない（SHALL）。`push` は `master` ブランチのみを対象としなければならない（SHALL）。両方のトリガーは `paths` フィルタで `supabase/migrations/**` を対象とし、他のパス変更だけの PR / push ではワークフローを起動してはならない（SHALL NOT）。

#### Scenario: migrations を含まない PR ではワークフローが起動しない

- **WHEN** `apps/lp/src/...` のみを変更した PR が作成される
- **THEN** `db-push-prd.yml` のジョブは起動しない

#### Scenario: migrations を含む PR ではワークフローが起動する

- **WHEN** `supabase/migrations/<new>.sql` を含む PR が作成される
- **THEN** `db-push-prd.yml` の dry-run ジョブが起動する

#### Scenario: master への migrations 変更 push でワークフローが起動する

- **WHEN** `supabase/migrations/<new>.sql` を含む変更が master に push される
- **THEN** `db-push-prd.yml` の apply ジョブが起動する

### Requirement: PR トリガー時は dry-run ジョブのみが実行され prd に書き込みを行わない

`pull_request` イベントで起動した場合、ワークフローは prd Supabase に対して書き込みを伴う `supabase db push` を実行してはならない（SHALL NOT）。代わりに `supabase db diff` 系コマンドまたは同等の read-only 操作で、当該 PR に含まれる migration を prd に適用した場合の差分情報を取得し、ジョブログまたは PR コメントとして翔太郎くんに可視化しなければならない（SHALL）。

#### Scenario: PR ジョブで `supabase db push` が実行されない

- **WHEN** PR トリガーで起動した job の実行コマンドを確認する
- **THEN** `supabase db push` を含む書き込みコマンドが実行されていない

#### Scenario: PR ジョブで適用差分が可視化される

- **WHEN** migration を含む PR が起動した job のログを確認する
- **THEN** `supabase db diff` 系の出力、または同等の差分情報がログに表示される

### Requirement: master push トリガー時に GitHub Environment 承認ゲートを通過した後に prd へ適用する

`push: master` イベントで起動した apply job は GitHub Environment `prd-db-push` を要求しなければならない（SHALL）。当該 environment には Required reviewers として翔太郎くん（リポジトリ Owner）が登録されている前提とし、ジョブは承認されるまで待機しなければならない（SHALL）。承認後、ジョブは `supabase link --project-ref <prd-ref>` と `supabase db push` を実行して prd Supabase に migration を適用しなければならない（SHALL）。承認が拒否されたまたはタイムアウトした場合、ジョブは failure として終了しなければならない（SHALL）。

#### Scenario: apply job が prd-db-push environment を要求する

- **WHEN** apply job の定義を読み込む
- **THEN** `environment: prd-db-push` が指定されている

#### Scenario: 承認前は apply が実行されない

- **WHEN** 承認者が未承認の状態で master push が起きる
- **THEN** apply job は waiting 状態で停止し、`supabase db push` は実行されない

#### Scenario: 承認後に apply が実行される

- **WHEN** 翔太郎くんが prd-db-push environment を Approve する
- **THEN** apply job が再開し `supabase db push` で migration が prd に適用される

### Requirement: Supabase CLI への認証情報は GitHub Secrets 経由で渡し平文に書かない

apply job および dry-run job は Supabase 認証に必要な値を GitHub Secrets から `env` 経由で受け取らなければならない（SHALL）。Secret 名は最低限以下の 3 件を使用しなければならない（SHALL）: `SUPABASE_ACCESS_TOKEN`（CLI 認証用）、`SUPABASE_PRD_PROJECT_REF`（prd プロジェクト識別子）、`SUPABASE_DB_PASSWORD`（DB パスワード）。これら値をワークフロー YAML に平文で書いてはならず（SHALL NOT）、ジョブログにエコーしてはならない（SHALL NOT）。DB password はコマンドライン引数ではなく環境変数（`SUPABASE_DB_PASSWORD` または CLI の対応する env 名）で CLI に渡さなければならない（SHALL）。

#### Scenario: 平文の認証情報が YAML に存在しない

- **WHEN** `.github/workflows/db-push-prd.yml` を読み込む
- **THEN** Supabase の access token / project ref / DB password に該当する値が平文で書かれていない（`${{ secrets.* }}` 参照のみが存在する）

#### Scenario: DB password がコマンドライン引数として渡されない

- **WHEN** apply job の `supabase db push` 実行ステップを確認する
- **THEN** `--password <value>` 形式の引数指定が存在せず、環境変数経由で渡されている

### Requirement: dev Supabase への自動 push を行わない

ワークフローは dev Supabase プロジェクトへの `supabase db push` を実行してはならない（SHALL NOT）。dev 環境への migration 適用は引き続き翔太郎くんおよびレムの手動運用（`pnpm db:push`）を維持する。これは「dev はテスト用途で自由に汚していい」前提と整合する。

#### Scenario: dev project_ref が参照されない

- **WHEN** `.github/workflows/db-push-prd.yml` 全体を読み込む
- **THEN** dev Supabase プロジェクトを指す project ref または URL が登場しない（参照されるのは prd のみ）

### Requirement: ワークフロー失敗時に翔太郎くんへ通知が届く

apply job または dry-run job が失敗した際は、GitHub Actions 標準のジョブ失敗通知が翔太郎くん（リポジトリ Owner / 監視責任者）に届かなければならない（SHALL）。これはリポジトリ通知設定で「Actions: Failed workflows only」相当が有効化されている前提とし、ワークフロー側で明示的な通知ステップ（Slack や Sentry への送出）は実装しなくてよい。ただし将来追加可能なよう、failure 時のジョブ識別情報（job name / commit SHA / migration ファイル名一覧）を job summary に出力しなければならない（SHALL）。

#### Scenario: 失敗時に job summary に識別情報が出力される

- **WHEN** apply job が failure で終了する
- **THEN** GitHub Actions の job summary または job log に失敗ジョブ名・対象 commit SHA・対象 migration ファイル名が含まれる

### Requirement: rollback 手順がインフラ・CI/CD ドキュメントに記載される

`docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に prd 自動 db push 失敗時の rollback 手順を記載しなければならない（SHALL）。手順には最低限以下を含まなければならない（SHALL）: ①ワークフロー自体に問題があった場合のワークフロー revert 手順、②prd Supabase への適用が壊れた場合の Supabase Daily Backup からの point-in-time restore 手順、③暫定対応として手動でロールバック migration を作って再 apply する手順。

#### Scenario: rollback セクションが docs に存在する

- **WHEN** `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` を読み込む
- **THEN** prd 自動 db push に対する rollback 手順を含むセクションが存在し、ワークフロー revert / Daily Backup restore / 手動ロールバック migration の 3 観点が言及されている

### Requirement: 環境戦略ドキュメントの「手動運用」記述が自動化済みに更新される

`docs/08-移行/01-環境戦略・本番リリース計画.md` § 3.1 および § 5 にある「migrations は当面翔太郎くん手動 push」「Phase 3 別 Issue で検討」の記述を、本ワークフローが導入された旨と「dev のみ手動」「prd は GitHub Actions が承認ゲート付きで自動適用」に更新しなければならない（SHALL）。本ワークフローの対象 Issue 番号（#268）への参照を含まなければならない（SHALL）。

#### Scenario: 環境戦略 docs が自動化前提に更新されている

- **WHEN** `docs/08-移行/01-環境戦略・本番リリース計画.md` を読み込む
- **THEN** prd への migration 適用が GitHub Actions 自動化済みであることが明記され、本仕様の Issue 番号への参照が含まれる
