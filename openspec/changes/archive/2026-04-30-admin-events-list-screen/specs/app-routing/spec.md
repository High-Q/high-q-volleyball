# app-routing Spec Delta — admin-events-list-screen

## ADDED Requirements

### Requirement: `/events` ルート（apps/admin のみ）

`apps/admin` は `path: '/events'` ルートを SHALL 持ち、`EventsListPage.vue` を描画する。本ルートは admin 認証下のルートであり、既存の auth guard により AAL2 + admin role を満たすユーザーのみアクセス可能で、未認証 / AAL1 / 非 admin の各ケースで `/login` / `/mfa` / `/mfa/setup` / `/login?reason=not-admin` に redirect される。

#### Scenario: events ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/events'`、`name: 'events'`、`component: EventsListPage` が含まれる

#### Scenario: 未認証アクセスは /login に redirect される

- **WHEN** 未認証ユーザーが `/events` にアクセス
- **THEN** auth guard により `/login` に redirect される

#### Scenario: 認証済 admin はそのまま描画

- **WHEN** AAL2 + admin role のユーザーが `/events` にアクセス
- **THEN** `EventsListPage.vue` が描画される

### Requirement: `/events/new` ルート予約（apps/admin のみ）

`apps/admin` は `path: '/events/new'` ルートを SHALL 予約する。本 change ではプレースホルダコンポーネント（"準備中"）を表示すれば足り、実体（イベント編集フォーム）は #86 で実装される。本ルートも admin 認証下のルート。

#### Scenario: events/new ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/events/new'` のルートエントリが存在する

### Requirement: ルート `/` から `/events` への redirect

`apps/admin` のトップルート `/` は、admin 認証済ユーザーに対して `/events` への redirect を SHALL 行う。これにより `HomePlaceholder.vue` の "準備中" 表示は本 change の archive 後に役目を終え、ホームは実機能（イベント一覧）が描画される。

#### Scenario: 認証済 admin の / アクセス

- **WHEN** AAL2 + admin role のユーザーが `/` にアクセス
- **THEN** auth guard 通過後、router が `/events` に redirect する

#### Scenario: 未認証の / アクセス

- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** 既存の auth guard により `/login` に redirect される（redirect 先が `/events` を経由するか直接 `/login` かは guard の実装次第だが、最終的に未認証は `/login` に到達する）
