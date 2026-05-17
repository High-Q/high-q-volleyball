## ADDED Requirements

### Requirement: admin サービスが検索エンジンインデックスを拒否する

システムは admin サービス（`apps/admin` / Render service `high-q-admin`）の本番および PR Preview の全 URL を、主要検索エンジンクローラがインデックスしないように構成しなければならない (MUST)。インデックス拒否は HTTP レスポンスヘッダー / HTML meta タグ / `robots.txt` の 3 層併用で宣言する。本要件は admin にのみ適用し、LP / reservation には適用しない（両者は公開サイトとして検索流入を必要とする）。

#### Scenario: admin の全パスに X-Robots-Tag ヘッダーが付与される

- **WHEN** `render.yaml` の `services[name=high-q-admin]` を確認する
- **THEN** `headers` セクションに `path: /*` / `name: X-Robots-Tag` / `value: noindex, nofollow` を持つエントリが定義されている

#### Scenario: admin の index.html に robots meta タグが含まれる

- **WHEN** `apps/admin/index.html` の `<head>` を確認する
- **THEN** `<meta name="robots" content="noindex, nofollow" />` が含まれている

#### Scenario: admin に robots.txt が配備される

- **WHEN** admin のビルド出力 `apps/admin/dist/robots.txt`（ソースは `apps/admin/public/robots.txt`）の内容を確認する
- **THEN** `User-agent: *` と `Disallow: /` の 2 行を含み、全 User-Agent に対し全パスのクロールを禁止している

#### Scenario: LP / reservation には同要件が適用されない

- **WHEN** `render.yaml` の LP サービス（`high-q-volleyball`）および reservation サービス（`high-q-reservation`）を確認する
- **THEN** いずれも `X-Robots-Tag: noindex` 系ヘッダーを持たず、`apps/lp/` および `apps/reservation/` の `index.html` に `noindex` を含む robots meta タグを持たない

#### Scenario: PR Preview にも同じ防御が効く

- **WHEN** admin の PR Preview をデプロイする
- **THEN** 本番と同じ `render.yaml` から生成されるため、`X-Robots-Tag` ヘッダー・`index.html` の meta タグ・`robots.txt` の 3 層すべてが Preview URL でも有効になる
