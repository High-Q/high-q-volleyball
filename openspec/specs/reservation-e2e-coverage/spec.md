## ADDED Requirements

### Requirement: イベント一覧画面のルートガード統合 E2E が存在する

`e2e/reservation/events-list.e2e.ts` に、未認証ユーザーが `/events` に直接アクセスした際に `/login` へリダイレクトされ、ログインフォームが描画されることを検証する Playwright test が 1 件以上存在しなければならない（SHALL）。当該 test は以下を満たさなければならない（SHALL）:

- `e2e/reservation/_helpers/supabaseGuard.ts` の `installSupabaseGuard` を `beforeEach` で適用する
- 追加の `page.route()` モックや `localStorage` 操作を伴わない (本 test の責務はルートガード統合の検証に閉じる)
- `/events` を `page.goto()` で開く
- URL が `/login` に遷移すること、`<input type="email">` が visible であること、「メールでリンクを受け取る」ボタンが visible であることを assert する

`@smoke` タグを付けてはならない（SHALL NOT、既存 reservation ガード統合 E2E (profile-page / history-page / reservation-detail-page / identity-document-upload) の運用方針に揃える）。

#### Scenario: 未認証で /events へ直接アクセスすると /login にリダイレクトされる

- **WHEN** Playwright が `installSupabaseGuard` 適用下で `/events` を開く
- **THEN** URL が `/login` を含む形に遷移し、`<input type="email">` および「メールでリンクを受け取る」ボタンが visible になる

#### Scenario: ガード統合 test に @smoke タグが付与されていない

- **WHEN** `e2e/reservation/events-list.e2e.ts` の test name および describe name を読み込む
- **THEN** `@smoke` 文字列が含まれていない

### Requirement: 本 E2E は新規 helper を導入せず既存 supabaseGuard のみを利用する

`e2e/reservation/events-list.e2e.ts` は既存 `e2e/reservation/_helpers/supabaseGuard.ts` のみを import しなければならず（SHALL）、本 change で `e2e/reservation/_helpers/` 配下に新規ファイルを追加してはならない（SHALL NOT）。これにより既存 reservation E2E のヘルパ構成と一貫性を保ち、ログイン済み session 注入や events モックといった新方式の立ち上げを後続 Issue の判断に委ねる。

#### Scenario: events-list.e2e.ts が supabaseGuard 以外の helper を import しない

- **WHEN** `e2e/reservation/events-list.e2e.ts` の import 文を確認する
- **THEN** `_helpers/` 配下からの import は `installSupabaseGuard` のみで、新規 helper ファイルへの import が含まれない

#### Scenario: 本 change で _helpers/ 配下に新規ファイルが追加されない

- **WHEN** 本 change のコミット差分を確認する
- **THEN** `e2e/reservation/_helpers/` 配下のファイルは追加・変更されていない

### Requirement: 本 E2E は既存 E2E 基盤ファイルを変更しない

本 change は新規 E2E ファイル (`e2e/reservation/events-list.e2e.ts`) の追加のみで構成されなければならず（SHALL）、`playwright.config.ts` / `e2e/_global-setup.ts` / `e2e/reservation/_helpers/supabaseGuard.ts` / 既存 `e2e/reservation/*.e2e.ts` には変更を加えてはならない（SHALL NOT）。これにより `playwright-e2e-baseline` capability の既存 Requirement 群、および既存 reservation E2E の挙動は本 change の影響を受けない。

#### Scenario: 既存 E2E 基盤ファイルが本 change で変更されない

- **WHEN** 本 change のコミット差分を確認する
- **THEN** `playwright.config.ts` / `e2e/_global-setup.ts` / `e2e/reservation/_helpers/supabaseGuard.ts` および既存 `e2e/reservation/*.e2e.ts` が変更ファイル一覧に含まれない
