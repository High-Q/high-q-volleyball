## ADDED Requirements

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

将来サービスを `services` 配列に追加する際、Supabase URL / anon key 等の環境変数は `render.yaml` に値を直接記述してはならない (MUST NOT)。値が必要な場合は `sync: false` 指定で枠だけ定義し、実際の値は Render Dashboard で手動設定する。

#### Scenario: Supabase 接続情報が sync: false で枠のみ定義される
- **WHEN** 将来 admin / reservation サービスで Supabase 接続情報が必要になり `services` に追加する
- **THEN** `render.yaml` には `key: VITE_SUPABASE_URL` 等を `sync: false` で定義し、値は Dashboard 側で設定する

### Requirement: SPA ルーティング対応の運用ルール

将来 vue-router の history mode を利用する SPA を `services` に追加する際、`routes` で未マッチパスを `/index.html` にリライトしなければならない (MUST)。

#### Scenario: SPA サービス追加時にリライトが必須となる
- **WHEN** vue-router history mode を利用する SPA（admin / reservation 等）を `services` に追加する
- **THEN** 当該サービスは `routes: [{ type: rewrite, source: /*, destination: /index.html }]` を含めなければならない
