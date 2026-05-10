## ADDED Requirements

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

## MODIFIED Requirements

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
