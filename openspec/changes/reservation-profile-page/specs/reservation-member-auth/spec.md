## MODIFIED Requirements

### Requirement: ログアウト

`useAuthSession.signOut()` は `supabase.auth.signOut()` を呼び、ローカル state（`session` / `member` / `isProfileComplete` / `hasIdentityDocument`）をクリア SHALL する。サインアウト後、保護ルートにアクセスすれば `/login` にリダイレクト MUST。

ログアウト UI の主入口は **プロフィール画面 (`/profile`)** とする MUST（HomePlaceholder は #90 で廃止済）。プロフィール画面ではログアウトボタン押下後に ConfirmDialog を経由し、確定で `signOut()` を呼ぶ。詳細は `reservation-profile-page` capability の「ログアウト動線」要件に従う。

`/signup/profile` / `/signup/identity` 等の登録途中ページに既存のログアウトリンクが存在する場合、それらは「登録途中の離脱」用として維持してよい SHALL（プロフィール画面のログアウトと併存可）。

#### Scenario: プロフィール画面からの明示的サインアウト
- **WHEN** ログイン済 + プロフィール完成 + 書類提出済の member が `/profile` のログアウトボタンを押し、ConfirmDialog で確定する
- **THEN** session / member / isProfileComplete / hasIdentityDocument がクリアされ、`/login` にリダイレクトされる

#### Scenario: 登録途中ページからのサインアウト（既存導線の維持）
- **WHEN** プロフィール未完成 / 書類未提出の member が `/signup/profile` または `/signup/identity` のログアウトリンクを押す
- **THEN** session / member 関連 state がクリアされ、`/login` にリダイレクトされる
