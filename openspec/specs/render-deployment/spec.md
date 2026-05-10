# Render Deployment Spec

## Purpose

Render を Static Site ホスティングとして採用し、`render.yaml` を Blueprint mode の真実の源として運用する。LP / admin は本番デプロイ済、reservation は #140 で追加予定。dev / prd 切替の `envVars` 構造、PR Preview 自動生成、未完成アプリの商用公開禁止ガバナンスなど、安全なデプロイ運用に必要な要件を定義する。
## Requirements
### Requirement: render.yaml が真実の源 (Blueprint mode)

システムは Render Blueprint mode を採用し、`render.yaml`（リポジトリルート）を Render サービス設定の唯一の真実の源 (single source of truth) として運用しなければならない (MUST)。Dashboard 側での個別設定変更は禁止し、すべての変更は本ファイルへの PR 経由で管理する。

#### Scenario: render.yaml の編集が PR 経由で反映される
- **WHEN** `render.yaml` を変更する PR が master にマージされる
- **THEN** Render Blueprint Instance の Auto-sync により、定義された全サービスへ即時反映される

#### Scenario: Dashboard での個別変更が禁止される
- **WHEN** 開発者が設定変更を必要とする
- **THEN** Render Dashboard ではなく `render.yaml` を編集する PR を作成しなければならない

### Requirement: LP サービスの定義

システムは `apps/lp` を Render Static Site としてデプロイする定義を `render.yaml` の `services` 配列に持たなければならない (MUST)。サービス名は既存の `high-q-volleyball` を維持する。

#### Scenario: LP サービスが既存名で維持される
- **WHEN** `render.yaml` に LP サービスを定義する
- **THEN** `name: high-q-volleyball`、`rootDir: apps/lp`、`runtime: static`、`branch: master`、`staticPublishPath: dist` を指定する

#### Scenario: name 変更による二重作成が防止される
- **WHEN** 開発者が LP サービスの設定を変更する
- **THEN** `name` は変更してはならない (MUST NOT)。`name` 変更は Blueprint mode で新規サービスを二重作成する原因となる（#125 で経験済）

### Requirement: admin サービスの定義

システムは `apps/admin` を Render Static Site としてデプロイする定義を `render.yaml` の `services` 配列に持たなければならない (MUST)。サービス名は `high-q-admin` とし、SPA history routing 用のリライト・dev/prd 切替の `envVars` 構造・LP と同等のビルド設定を備える。

#### Scenario: admin サービスが services 配列に定義される
- **WHEN** `render.yaml` の `services` 配列を確認する
- **THEN** `name: high-q-admin`、`rootDir: apps/admin`、`runtime: static`、`branch: master`、`staticPublishPath: dist` を持つ service が含まれている

#### Scenario: admin サービスが SPA リライトを持つ
- **WHEN** admin サービスの `routes` 設定を確認する
- **THEN** `routes: [{ type: rewrite, source: /*, destination: /index.html }]` が設定されている

#### Scenario: admin サービスが LP と同一の build / 自動デプロイ規約に従う
- **WHEN** admin サービスの設定を確認する
- **THEN** `buildCommand` は `corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/admin build` 形式であり、`autoDeployTrigger: checksPass`、`previews.generation: automatic`、`envVars` に `NODE_VERSION: "22"` と `SKIP_INSTALL_DEPS: "true"` を含む

#### Scenario: admin サービスが dev/prd 切替の envVars 構造を持つ
- **WHEN** admin サービスの `envVars` を確認する
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` で本番値の Dashboard 設定枠を確保し、かつ `previewValue` に dev プロジェクトの実値を持つ

#### Scenario: admin サービスの previewValue に Secret Key が含まれない
- **WHEN** admin サービスの全 `previewValue` を確認する
- **THEN** `service_role`、`secret`、`sbs_` プレフィックスのいずれも含まれない

### Requirement: モノレポ対応のビルドコマンド

サービスのビルドコマンドは pnpm workspace のフィルタ機能を使い、対象アプリのみをビルドしなければならない (MUST)。`corepack enable` で root の `packageManager` フィールド (pnpm@10.33.2) を強制し、`--prod --frozen-lockfile --ignore-scripts` フラグを付与する。

#### Scenario: ビルドコマンドが pnpm workspace のフィルタを使う
- **WHEN** Render が指定されたサービスをビルドする
- **THEN** `corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm --filter <package-name> build` の形式でコマンドが実行される

#### Scenario: lifecycle script が install 時に実行されない
- **WHEN** `pnpm install` が実行される
- **THEN** `--ignore-scripts` により jsdom の `prepare` (convert-idl) や wireit など問題のある lifecycle script は実行されない

### Requirement: 自動デプロイトリガーは checksPass

サービスは `autoDeployTrigger: checksPass` を設定しなければならない (MUST)。GitHub Actions CI が緑になった時のみ Render が deploy を起動する安全側挙動とする。

#### Scenario: CI 失敗時にデプロイが起動しない
- **WHEN** master へのマージで GitHub Actions CI が失敗する
- **THEN** Render は当該サービスのデプロイを起動しない

#### Scenario: CI 成功時にデプロイが起動する
- **WHEN** master へのマージで GitHub Actions CI が全パスし、`rootDir` 配下に変更がある
- **THEN** Render は当該サービスをデプロイする

### Requirement: PR Preview 環境の自動生成

サービスは `previews.generation: automatic` を設定しなければならない (MUST)。これにより全 PR に対して Preview 環境が自動起動される。

#### Scenario: PR 作成時に Preview が生成される
- **WHEN** 任意のブランチから master 向けに PR が作成される
- **THEN** Render は当該サービスに対し独立した Preview URL を生成する

### Requirement: Node バージョンの統一

サービスは `envVars` で `NODE_VERSION: "22"` を設定しなければならない (MUST)。

#### Scenario: Node 22 でサービスがビルドされる
- **WHEN** Render がビルド環境を準備する
- **THEN** 環境変数 `NODE_VERSION` が `22` に設定され、Node 22.x がインストールされる

### Requirement: 未完成アプリの商用公開禁止

`render.yaml` の `services` 配列に追加するサービスは、商用公開可能な状態でなければならない (MUST)。スキャフォールド状態や認証ゲート未実装のアプリを `services` 配列に追加してはならない (MUST NOT)。

Render Static Site はデフォルトで完全公開され URL を知っていれば誰でもアクセス可能なため、未完成アプリの追加は情報漏洩・将来の攻撃面拡大に直結する。

#### Scenario: スキャフォールド段階のアプリが services に追加されない
- **WHEN** 開発者が新規アプリ（admin / reservation 等）を `services` 配列に追加しようとする
- **THEN** 当該アプリは認証ゲート（管理画面の場合）または最低限の機能実装と公開判断（公開サイトの場合）が完了していなければならない

#### Scenario: 雛形コメントが追加判断のチェックリストを伴う
- **WHEN** `render.yaml` 末尾に将来追加予定サービスの雛形コメントを記載する
- **THEN** コメントには「追加時のチェックリスト」（認証ゲート完了 / スキャフォールド非該当 / env var の sync:false 運用 / SPA リライト / PR レビュー時の公開判断）を含めなければならない

### Requirement: 機密情報のコード非管理

将来サービスを `services` 配列に追加する際、Supabase URL / Publishable key 等の環境変数は `render.yaml` に prd の値を直接記述してはならない (MUST NOT)。本番値は `sync: false` 指定で枠だけ定義し Render Dashboard で手動設定する。一方、PR Preview 用の dev 値のみ `previewValue` フィールドに記載することは許容する（dev Publishable Key は公開キーで RLS 保護されるため）。`secret` キー（旧 service_role 相当）は `previewValue` を含むあらゆる場所に書いてはならない (MUST NOT)。

#### Scenario: Supabase 本番接続情報が sync: false で枠のみ定義される
- **WHEN** 将来 admin / reservation サービスで Supabase 接続情報が必要になり `services` に追加する
- **THEN** `render.yaml` には `key: VITE_SUPABASE_URL` および `key: VITE_SUPABASE_PUBLISHABLE_KEY` を `sync: false` で定義し、本番値（prd）は Dashboard 側で設定する

#### Scenario: dev 値は previewValue で git にコミットしてよい
- **WHEN** admin / reservation サービスの `envVars` に `previewValue` を設定する
- **THEN** dev プロジェクトの `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の値を `previewValue` として記載してよい（Publishable Key は公開キーであり RLS で保護されるため）

#### Scenario: secret キーが previewValue に書かれない
- **WHEN** `render.yaml` の `previewValue` を含む全 envVars を確認
- **THEN** `service_role` または `secret` プレフィックスのキー文字列は含まれない

### Requirement: SPA ルーティング対応の運用ルール

将来 vue-router の history mode を利用する SPA を `services` に追加する際、`routes` で未マッチパスを `/index.html` にリライトしなければならない (MUST)。

#### Scenario: SPA サービス追加時にリライトが必須となる
- **WHEN** vue-router history mode を利用する SPA（admin / reservation 等）を `services` に追加する
- **THEN** 当該サービスは `routes: [{ type: rewrite, source: /*, destination: /index.html }]` を含めなければならない

### Requirement: admin / reservation 雛形コメントは dev/prd 切替構造を含む

`render.yaml` 末尾の reservation 雛形コメントは、`envVars` セクションに `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方を含み、各エントリに `sync: false` および `previewValue: <dev-value>` の 2 段構造を含めなければならない (MUST)。これにより #140 でコメント解除して `services` 配列に移すだけで正しい dev/prd 切替構造が立ち上がる。admin の雛形コメントは services 配列への昇格に伴い削除される (MUST)。

#### Scenario: reservation 雛形が dev/prd 切替構造を持つ
- **WHEN** `render.yaml` 末尾の reservation 雛形コメントを確認
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` と `previewValue` を持つ形式でコメント記載されている

#### Scenario: 雛形コメントの previewValue は dev の URL コメントヒントを含む
- **WHEN** reservation 雛形コメントの `previewValue` 行を確認
- **THEN** dev プロジェクトの URL を `previewValue: https://<dev-project-ref>.supabase.co` 等のコメントヒントとして含み、#140 着手者がそのまま埋められる状態である

#### Scenario: admin 雛形コメントは末尾から削除されている
- **WHEN** `render.yaml` 末尾の雛形コメント領域を確認
- **THEN** admin 用の雛形ブロックは存在せず、reservation 用ブロックのみが残っている
