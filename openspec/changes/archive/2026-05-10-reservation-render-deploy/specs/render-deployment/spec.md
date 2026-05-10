## ADDED Requirements

### Requirement: reservation サービスの定義

システムは `apps/reservation` を Render Static Site としてデプロイする定義を `render.yaml` の `services` 配列に持たなければならない (MUST)。サービス名は `high-q-reservation` とし、SPA history routing 用のリライト・dev/prd 切替の `envVars` 構造・LP / admin と同等のビルド設定を備える。

#### Scenario: reservation サービスが services 配列に定義される
- **WHEN** `render.yaml` の `services` 配列を確認する
- **THEN** `name: high-q-reservation`、`rootDir: apps/reservation`、`runtime: static`、`branch: master`、`staticPublishPath: dist` を持つ service が含まれている

#### Scenario: reservation サービスが SPA リライトを持つ
- **WHEN** reservation サービスの `routes` 設定を確認する
- **THEN** `routes: [{ type: rewrite, source: /*, destination: /index.html }]` が設定されている

#### Scenario: reservation サービスが LP / admin と同一の build / 自動デプロイ規約に従う
- **WHEN** reservation サービスの設定を確認する
- **THEN** `buildCommand` は `corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/reservation build` 形式であり、`autoDeployTrigger: checksPass`、`previews.generation: automatic`、`envVars` に `NODE_VERSION: "22"` と `SKIP_INSTALL_DEPS: "true"` を含む

#### Scenario: reservation サービスが dev/prd 切替の envVars 構造を持つ
- **WHEN** reservation サービスの `envVars` を確認する
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` で本番値の Dashboard 設定枠を確保し、かつ `previewValue` に dev プロジェクトの実値を持つ

#### Scenario: reservation サービスの previewValue が admin と同一の dev プロジェクトを参照する
- **WHEN** reservation サービスと admin サービスの `previewValue` を比較する
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の `previewValue` 値はそれぞれ完全一致している（dev は単一プロジェクト共有方針 — `docs/08-移行/01-環境戦略・本番リリース計画.md` §3.2）

#### Scenario: reservation サービスの previewValue に Secret Key が含まれない
- **WHEN** reservation サービスの全 `previewValue` を確認する
- **THEN** `service_role`、`secret`、`sbs_` プレフィックスのいずれも含まれない

## REMOVED Requirements

### Requirement: admin / reservation 雛形コメントは dev/prd 切替構造を含む

**Reason**: admin (#139) と reservation (本変更) が `services` 配列の正式メンバーへ昇格し、`render.yaml` 末尾の雛形コメントは完全に消化された。雛形コメントを保持する必要が消失したため、関連 Requirement を削除する。

**Migration**: 新たな Static Site アプリを追加する際は、本 spec の「LP サービスの定義」「admin サービスの定義」「reservation サービスの定義」のいずれかを参照テンプレートとして利用し、雛形コメントに依存しない。dev/prd 切替の構造規約は各サービス Requirement の Scenario「dev/prd 切替の envVars 構造を持つ」が継続的に保証する。
