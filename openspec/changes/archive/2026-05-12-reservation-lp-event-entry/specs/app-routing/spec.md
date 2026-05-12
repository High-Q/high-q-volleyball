## MODIFIED Requirements

### Requirement: auth guard 実装（apps/reservation のみ）

`apps/reservation/src/app/router.ts` は `router.beforeEach` で auth guard を SHALL 実装する。`admin-reservation-ui-foundation` change で残された `// TODO: auth guard をここに追加（reservation の会員認証）` コメントは本 change で除去される MUST。

guard は以下の判定を行う:

1. `useAuthSession.ready()` を await し、Supabase session の初期復元と member 取得を待つ
2. `to.meta.public === true` のルート（`/login` / `/auth/callback` / `/auth/link-sent`）は **未認証でも通過**。ただし認証済み + プロフィール完成済みが `/login` にアクセスした場合は `/` にリダイレクト（`/auth/callback` / `/auth/link-sent` は除外）。`/` 自体は public ではない（ランディング廃止）
3. 非公開ルートは未認証なら `/login` にリダイレクトする。このとき、元の遷移先（`to.fullPath`）を **同一 origin のパスとして安全と判定できる場合に限り** `next` クエリに付与して `/login?next=<encoded>` の形でリダイレクトする SHALL。元が `/login` 自身および `/auth/*` 系の場合は付与しない MUST NOT
4. 認証済み + プロフィール未完成（`isProfileComplete === false`）で `/signup/profile` 以外のルートにアクセスした場合 → `/signup/profile` にリダイレクト（`/auth/callback` は除外: callback 内でリダイレクト判定するため）
5. 認証済み + プロフィール完成済みが `/signup/profile` にアクセスしたら `/` にリダイレクト
6. それ以外（認証済み + プロフィール完成 + 任意ルート）は通過

guard は遷移先 URL の検証に共通 open redirect ガード関数 (`shared/lib/safeNextPath`) を MUST 用いる。検証に失敗した値はクエリから落とす MUST。

#### Scenario: 未認証で `/` にアクセス（ランディング廃止により認証必須）

- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる（`/` は `meta.public` を持たない）。`/` は安全と判定されるため `next=/` がクエリに付与される

#### Scenario: 未認証で保護ルートにアクセス（将来）

- **WHEN** 未認証ユーザーが `meta.public` 未設定のルートにアクセス
- **THEN** `/login?next=<encoded-original-path>` にリダイレクトされる

#### Scenario: 未認証で `/events/:id` にアクセス（LP 経由の主要動線）

- **WHEN** 未認証ユーザーが `/events/<id>` にアクセス
- **THEN** `/login?next=%2Fevents%2F<id>` にリダイレクトされる

#### Scenario: 未認証で `/login` 自身にアクセス

- **WHEN** 未認証ユーザーが `/login` に直接アクセス
- **THEN** そのまま `/login` が描画される（自己参照の `next` は付与されない）

#### Scenario: 未認証で `/auth/callback` にアクセス

- **WHEN** 未認証ユーザーが `/auth/callback` に直接アクセス
- **THEN** auth guard でブロックされず、`AuthCallbackPage` が描画される（meta.public により通過、`next` 付与の対象外）

#### Scenario: 認証済み + プロフィール未完成で `/` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/` にアクセス
- **THEN** `/signup/profile` にリダイレクトされる（情報入力強制）

#### Scenario: 認証済み + プロフィール未完成で `/signup/profile` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/signup/profile` にアクセス
- **THEN** `SignupProfilePage` が描画される（無限ループしない）

#### Scenario: 認証済み + プロフィール完成済みで `/login` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/login` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで `/signup/profile` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/signup/profile` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで保護ルート（将来）にアクセス

- **WHEN** プロフィール完成済みのユーザーが `meta.public` 未設定のルート（将来の予約ルート等）にアクセス
- **THEN** そのまま該当ページが描画される

#### Scenario: 不正な next 値は無視される

- **WHEN** 何らかの理由で `next` クエリに同一 origin のパス以外（絶対 URL / 別 origin / プロトコル文字列等）が含まれた状態で guard が起動する
- **THEN** guard は `next` を無視し、認証成功後の navigate 先として既定値（`/` 相当）を採用する

## ADDED Requirements

### Requirement: open redirect 防止ヘルパ `safeNextPath`

`apps/reservation/src/shared/lib/safeNextPath.ts` に open redirect 攻撃を防ぐパス検証ヘルパを SHALL 配置する。本ヘルパは guard / auth 系画面の各所から共通参照され、`next` クエリ値を信頼可能なパスに正規化または却下する責務を持つ MUST。

判定ルール:

1. 値が `string` でない場合は却下 (`null` を返す)
2. 値が `/` で始まらない場合は却下 (相対パス / 絶対 URL を含む)
3. 値が `//` で始まる場合は却下 (protocol-relative URL を防ぐ)
4. 値に改行・タブ・制御文字を含む場合は却下
5. デコード後の値が `/login` / `/login/...` / `/auth/...` / `/signup` / `/signup/...` で始まる場合は却下 (認証導線への循環を防ぐ)
6. 上記すべてを通過した値はそのまま返す

#### Scenario: 同一 origin の通常パスを受理

- **WHEN** `safeNextPath('/events/abc-123')` を呼ぶ
- **THEN** `'/events/abc-123'` がそのまま返る

#### Scenario: 絶対 URL を却下

- **WHEN** `safeNextPath('https://evil.example.com/phish')` を呼ぶ
- **THEN** `null` が返る

#### Scenario: protocol-relative URL を却下

- **WHEN** `safeNextPath('//evil.example.com')` を呼ぶ
- **THEN** `null` が返る

#### Scenario: 認証導線への循環を却下

- **WHEN** `safeNextPath('/login?reason=x')` または `safeNextPath('/signup/verify')` を呼ぶ
- **THEN** いずれも `null` が返る（既定値での navigate にフォールバックさせるため）

#### Scenario: 非文字列入力を却下

- **WHEN** `safeNextPath(undefined)` / `safeNextPath(['/events'])` 等を呼ぶ
- **THEN** `null` が返る
