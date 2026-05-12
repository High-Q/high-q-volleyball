## ADDED Requirements

### Requirement: 認証フローにおける `next` クエリの引き継ぎ

`apps/reservation` の認証フロー (`/login` / `/signup` / `/signup/verify` / `/signup/identity` / `/auth/callback`) は、URL に付与された `next` クエリパラメータを受け取り、認証が完了した時点で `next` 先へ navigate する責務を SHALL 負う。本要件は LP から渡されたイベント識別子 (例: `/events/<id>`) を認証完了後に意図どおり再現させる目的を持つ。

`next` 値の取り扱いは以下に従う MUST:

1. 各画面は `useRoute().query.next` から値を読み、画面 mount 時に `shared/lib/safeNextPath` で正規化する
2. `safeNextPath` が `null` を返した場合、`next` は無効として破棄し、既定の遷移先 (`/` 相当) を採用する
3. 同一フロー内の遷移 (例: `/signup` → `/signup/verify` → `/signup/identity`) では `router.push` のクエリに `next` を引き継ぐ
4. マジックリンク送信時、Supabase の `signInWithOtp` の `emailRedirectTo` に `next` を含めた `/auth/callback?next=<encoded>` を渡す
5. `/auth/callback` はトークン消化後の navigate 先を、`safeNextPath` を通過した `next` の値で上書きする (既定値: プロフィール完成済みは `/`、未完成は `/signup/profile` または `/signup/identity`)
6. `next` の有効寿命は当該ブラウザセッション内に限り、サーバー側に永続化 SHALL NOT する

#### Scenario: ログイン画面が `next` を保持する

- **WHEN** ユーザーが `/login?next=%2Fevents%2Fabc-123` に到達し、メール入力 → 「ログインリンクを送る」を押下する
- **THEN** Supabase の `signInWithOtp` 呼び出しで `emailRedirectTo` が `<origin>/auth/callback?next=%2Fevents%2Fabc-123` となる

#### Scenario: 新規会員登録画面が `next` を保持する

- **WHEN** ユーザーが `/signup?next=%2Fevents%2Fabc-123` に到達し、全項目入力 + 同意 ON で「コードを送信する」を押下する
- **THEN** `/signup/verify?email=<encoded>&next=%2Fevents%2Fabc-123` に navigate される

#### Scenario: 認証コード検証画面が `next` を保持する

- **WHEN** ユーザーが `/signup/verify?email=<encoded>&next=%2Fevents%2Fabc-123` で正しい 6 桁コードを入力し検証成功
- **THEN** 書類未提出のため `/signup/identity?next=%2Fevents%2Fabc-123` に navigate される

#### Scenario: 本人確認書類提出画面が `next` を保持する

- **WHEN** ユーザーが `/signup/identity?next=%2Fevents%2Fabc-123` で書類アップロードを完了する
- **THEN** `/events/abc-123` に navigate される（書類提出完了後の navigate 先が `next` で上書きされる）

#### Scenario: `/auth/callback` が `next` を尊重する

- **WHEN** マジックリンクメールから `/auth/callback?next=%2Fevents%2Fabc-123` に到達し、トークン消化と `isProfileComplete` 判定が完了する
- **THEN** プロフィール完成済みなら `/events/abc-123` に、プロフィール未完成なら `/signup/profile?next=%2Fevents%2Fabc-123` に navigate される

#### Scenario: 不正な `next` 値を持つ `/auth/callback` の振る舞い

- **WHEN** `/auth/callback?next=https%3A%2F%2Fevil.example.com` のように同一 origin 外を指す `next` で到達する
- **THEN** `safeNextPath` が `null` を返し、既定の遷移先 (`/` 相当) に navigate される（外部サイトには遷移しない）

#### Scenario: `next` 未指定での既存挙動の維持

- **WHEN** ユーザーが `next` クエリを伴わずに `/login` / `/signup` / `/auth/callback` に到達する
- **THEN** 既存の navigate 挙動 (プロフィール完成済みは `/`、未完成は `/signup/profile`、書類未提出は `/signup/identity`) と同一になる

#### Scenario: 認証済みで `next` 付き `/login` にアクセス

- **WHEN** プロフィール完成済みの認証済みユーザーが `/login?next=%2Fevents%2Fabc-123` にアクセス
- **THEN** auth guard により `/events/abc-123` に直接 navigate される（`/` を経由しない）

#### Scenario: 認証済みで存在しない / 非公開イベント ID を `next` に持つアクセス

- **WHEN** プロフィール完成済みの認証済みユーザーが `/login?next=%2Fevents%2Fnonexistent` にアクセス
- **THEN** auth guard により `/events/nonexistent` に navigate され、EventDetailPage の「該当なし」状態が描画される（一覧へ戻る導線は既存）
