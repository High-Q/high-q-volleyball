## ADDED Requirements

### Requirement: `/members` ルート（apps/admin のみ）

`apps/admin` は `path: '/members'` ルートを SHALL 持ち、`MembersListPage.vue` を描画する。本ルートは admin 認証下のルートであり、既存の auth guard により AAL2 + admin role を満たすユーザーのみアクセス可能で、未認証 / AAL1 / 非 admin の各ケースで `/login` / `/mfa` / `/mfa/setup` / `/login?reason=not-admin` に redirect される。

詳細 sheet の表示は URL クエリ `?detail=:id` で同期 SHALL する。フィルタ・検索・ソート・ページネーションも同一画面の URL クエリで同期される（`admin-members-list` capability に従う）。

#### Scenario: members ルートが定義されている
- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/members'`、`name: 'members'`、`component: MembersListPage` が含まれる

#### Scenario: 未認証アクセスは /login に redirect される
- **WHEN** 未認証ユーザーが `/members` にアクセス
- **THEN** auth guard により `/login` に redirect される

#### Scenario: AAL1 ユーザーは /mfa に redirect される
- **WHEN** AAL1 ユーザーが `/members` にアクセス
- **THEN** auth guard により `/mfa` または `/mfa/setup` に redirect される（factor 登録有無による）

#### Scenario: 非 admin は /login?reason=not-admin に redirect される
- **WHEN** AAL2 + 非 admin ユーザーが `/members` にアクセス
- **THEN** auth guard により `signOut` 後 `/login?reason=not-admin` に redirect される

#### Scenario: 認証済 admin はそのまま描画
- **WHEN** AAL2 + admin role のユーザーが `/members` にアクセス
- **THEN** `MembersListPage.vue` が描画される

#### Scenario: 詳細 sheet 同期
- **WHEN** AAL2 + admin が `/members?detail=<uuid>` を直接開く
- **THEN** ページが描画され、当該会員の詳細 sheet が初期状態で開く
