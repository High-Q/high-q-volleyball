## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: admin / reservation 雛形コメントは dev/prd 切替構造を含む

`render.yaml` 末尾の admin / reservation 雛形コメントは、`envVars` セクションに `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方を含み、各エントリに `sync: false` および `previewValue: <dev-value>` の 2 段構造を含めなければならない (MUST)。これにより #139 / #140 でコメント解除して `services` 配列に移すだけで正しい dev/prd 切替構造が立ち上がる。

#### Scenario: admin 雛形が dev/prd 切替構造を持つ
- **WHEN** `render.yaml` 末尾の admin 雛形コメントを確認
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` と `previewValue` を持つ形式でコメント記載されている

#### Scenario: reservation 雛形が dev/prd 切替構造を持つ
- **WHEN** `render.yaml` 末尾の reservation 雛形コメントを確認
- **THEN** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の両方が `sync: false` と `previewValue` を持つ形式でコメント記載されている

#### Scenario: 雛形コメントの previewValue は dev の実値プレースホルダではなく、dev の URL コメントヒントを含む
- **WHEN** 雛形コメントの `previewValue` 行を確認
- **THEN** dev プロジェクトの URL を `previewValue: https://<dev-project-ref>.supabase.co` 等のコメントヒントとして含み、#139 / #140 着手者がそのまま埋められる状態である（実値の埋め込みは #139 / #140 で行う）
