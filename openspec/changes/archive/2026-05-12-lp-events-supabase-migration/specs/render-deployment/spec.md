## MODIFIED Requirements

### Requirement: LP サービスの定義

システムは `apps/lp` を Render Static Site としてデプロイする定義を `render.yaml` の `services` 配列に持たなければならない (MUST)。サービス名は既存の `high-q-volleyball` を維持する。LP も Supabase に接続するため、`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を admin / reservation と同じ `sync: false` + `previewValue` の 2 段構造で `envVars` に定義しなければならない (MUST)。

#### Scenario: LP サービスが既存名で維持される

- **WHEN** `render.yaml` に LP サービスを定義する
- **THEN** `name: high-q-volleyball`、`rootDir: apps/lp`、`runtime: static`、`branch: master`、`staticPublishPath: dist` を指定する

#### Scenario: name 変更による二重作成が防止される

- **WHEN** 開発者が LP サービスの設定を変更する
- **THEN** `name` は変更してはならない (MUST NOT)。`name` 変更は Blueprint mode で新規サービスを二重作成する原因となる（#125 で経験済）

#### Scenario: LP サービスが dev/prd 切替の envVars 構造を持つ

- **WHEN** LP サービスの `envVars` を確認する
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` で本番値の Dashboard 設定枠を確保し、かつ `previewValue` に dev プロジェクトの実値を持つ

#### Scenario: LP サービスの previewValue が admin / reservation と同一の dev プロジェクトを参照する

- **WHEN** LP サービスと admin / reservation サービスの `previewValue` を比較する
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の `previewValue` 値はそれぞれ完全一致している（dev は単一プロジェクト共有方針 — `docs/08-移行/01-環境戦略・本番リリース計画.md` §3.2）

#### Scenario: LP サービスの previewValue に Secret Key が含まれない

- **WHEN** LP サービスの全 `previewValue` を確認する
- **THEN** `service_role`、`secret`、`sbs_` プレフィックスのいずれも含まれない
