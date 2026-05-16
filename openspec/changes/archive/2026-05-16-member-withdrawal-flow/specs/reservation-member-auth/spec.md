## ADDED Requirements

### Requirement: 退会済み会員のログイン拒否

`apps/reservation` の `/login` 画面および magic link コールバック（`/auth/callback`）は、退会済み会員のログイン試行を MUST 拒否する。退会した会員は `auth.users` 行が削除されているため、Supabase 標準の `signInWithOtp` は magic link を発行 SHALL NOT する（既存挙動）。万が一退会前の古いマジックリンクが残っており、callback で session が一時的に確立されても、`useAuthSession` の members 行取得時に「members 行不在」となるため、reservation アプリは MUST ログインを完了させない。

具体的な挙動として:

- magic link 発行時点（`signInWithOtp`）で `shouldCreateUser: false` のため、`auth.users` 不在のメールアドレスにはメールが届かない（既存）
- callback で session が確立した直後の `members` 行取得で 0 行の場合、reservation アプリは MUST 即座にサインアウトし、`/login?error=member_not_found` 等のエラー表示付きで `/login` に戻す
- エラー表示は「アカウントが見つかりません。退会済みの可能性があります」相当のメッセージを MUST 提示する

#### Scenario: 退会済みメールへの magic link 発行試行
- **WHEN** 退会済み会員のメールアドレスで `/login` から magic link 送信を試みる
- **THEN** Supabase は magic link メールを発行せず（`shouldCreateUser: false`）、UI は「ログインリンクを送信しました」相当の中立的な完了画面を表示する（既存挙動、攻撃者にアカウント有無を漏らさない）

#### Scenario: 退会前マジックリンクの遅延クリック
- **WHEN** 退会前に発行されたマジックリンクを退会後にクリックする（auth.users は削除済みだが Supabase 側のリンク有効期限内）
- **THEN** Supabase 側で auth.users 不在のためコールバックがエラーになるか、または session 確立後に members 行不在で reservation アプリが弾く。最終的に `/login?error=member_not_found` 相当の画面に遷移する

#### Scenario: 退会直後の自分のセッション無効化
- **WHEN** 自己退会フローを完了したクライアント
- **THEN** `withdraw-member` Function 成功後にクライアントが `supabase.auth.signOut()` を呼び、ローカルセッションがクリアされる

#### Scenario: 他ブラウザの退会済み会員セッション
- **WHEN** 会員 X が別ブラウザでログイン中に、admin が会員 X を強制削除する
- **THEN** 当該別ブラウザのセッションは次回 JWT refresh 時に Supabase 側で無効化され、`useAuthSession` の members 行取得で「members 行不在」となり、reservation アプリは自動サインアウトして `/login` に戻す
