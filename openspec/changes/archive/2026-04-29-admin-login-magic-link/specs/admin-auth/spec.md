## ADDED Requirements

### Requirement: マジックリンク送信フロー

`apps/admin` の `/login` ページは、ユーザーが入力したメールアドレスに対して Supabase Auth の `signInWithOtp` を呼び、マジックリンクメールを送信 SHALL する。送信時は `shouldCreateUser: false` を指定し、`emailRedirectTo` は `window.location.origin + '/auth/callback'` とする。

#### Scenario: 有効なメールでマジックリンクを送信
- **WHEN** ユーザーが `/login` で `owner@high-q.club` を入力し「マジックリンクを送る」を押す
- **THEN** `supabase.auth.signInWithOtp` が `{ email: 'owner@high-q.club', options: { shouldCreateUser: false, emailRedirectTo: 'http://<host>/auth/callback' } }` で呼ばれる

#### Scenario: 空のメールで送信を試みる
- **WHEN** メール入力が空のまま CTA を押す
- **THEN** API は呼ばれず、Error 状態で「メールアドレスを入力してください」が表示される

#### Scenario: 形式不正のメール
- **WHEN** `not-an-email` のような形式不正なメールで CTA を押す
- **THEN** API は呼ばれず、Error 状態で「メールアドレスの形式が正しくありません」が表示される

### Requirement: 4 状態 UI

`/login` ページは Empty / Loading / Success / Error の 4 状態を持ち、各状態で表示要素が明確に切り替わる SHALL。

#### Scenario: Empty 状態（初期表示）
- **WHEN** `/login` に初回アクセスする
- **THEN** メール入力フォームと「マジックリンクを送る」CTA が表示され、CTA は活性

#### Scenario: Loading 状態（送信中）
- **WHEN** CTA を押し、API レスポンス到達前
- **THEN** CTA は無効化され、ラベルが「送信中…」または同等の表現に切り替わる

#### Scenario: Success 状態（送信成功）
- **WHEN** `signInWithOtp` が解決（エラーなし）
- **THEN** フォームが「<入力メール> 宛にメールを送信しました。リンクをクリックしてください」のメッセージに置き換わり、「別のメールアドレスを使う」リンクで Empty 状態に戻れる

#### Scenario: Error 状態（API エラー）
- **WHEN** `signInWithOtp` がエラーを返す
- **THEN** フォームの上にエラーバナーが表示され、CTA は再活性、入力値は保持される

### Requirement: マジックリンク戻り先 `/auth/callback`

`apps/admin` は `/auth/callback` ルートを SHALL 提供する。Supabase クライアントが `detectSessionInUrl: true` で構成されているため、ページマウント時に URL hash 内のトークンが消化されてセッションが確立する。`AuthCallbackPage` は session 確立を待ち、admin 判定の結果に応じてリダイレクト MUST する。

#### Scenario: admin としてセッション確立
- **WHEN** マジックリンクをクリックして `/auth/callback#access_token=...` に到達し、`is_admin()` が `true` を返す
- **THEN** `/`（home）にリダイレクトされる

#### Scenario: 非 admin としてセッション確立
- **WHEN** `/auth/callback` でセッションは確立したが `is_admin()` が `false` を返す
- **THEN** 自動的にサインアウトされ、`/login?reason=not-admin` にリダイレクトされる

#### Scenario: マジックリンクが期限切れ・無効
- **WHEN** `/auth/callback` でセッション確立に失敗（リンク期限切れ、トークン無効等）
- **THEN** `/login?reason=link-invalid` にリダイレクトされ、Error バナーで「リンクの有効期限が切れたか、無効です。再送信してください」が表示される

### Requirement: admin 判定（`is_admin()` RPC）

セッション確立後、システムは Supabase RPC `is_admin()` を呼び、戻り値で admin かどうかを判定 SHALL する。判定結果は `useAuthSession` の reactive state にキャッシュされ、`onAuthStateChange` のたびに再評価される MUST。クライアント側で email アロウリストを直接持つことを SHALL NOT。

#### Scenario: admin ユーザーの判定
- **WHEN** `members.role = 'admin'` のユーザーが認証され `is_admin()` を呼ぶ
- **THEN** `true` が返り、`useAuthSession.isAdmin` が `true` になる

#### Scenario: 非 admin ユーザーの判定
- **WHEN** `members.role = 'member'` または `members` 行が存在しないユーザーで `is_admin()` を呼ぶ
- **THEN** `false` が返り、`useAuthSession.isAdmin` が `false` になる

#### Scenario: ハードコードされた email を判定根拠に使うことを禁止
- **WHEN** `apps/admin` のコード全体を grep する
- **THEN** `'owner@high-q.club'` などオーナー email リテラルが認証判定ロジックに登場しない（テスト fixture や docs を除く）

### Requirement: セッション復元

ブラウザ再訪時、Supabase の `localStorage` 永続セッションから自動復元され、`useAuthSession` が判定結果を更新するまで guard は遷移を保留 SHALL する。

#### Scenario: 既ログイン状態でリロード
- **WHEN** admin としてログイン済みのブラウザで `/` をリロード
- **THEN** ロード完了後そのまま `/` が描画される（`/login` への一瞬のリダイレクトが起きない）

#### Scenario: セッション切れ後のアクセス
- **WHEN** session の有効期限が切れた状態（refresh token 失敗）で `/` にアクセス
- **THEN** `/login` にリダイレクトされる

### Requirement: ログアウト

`useAuthSession.signOut()` は `supabase.auth.signOut()` を呼び、ローカル state（session / isAdmin）をクリア SHALL する。サインアウト後、保護ルートにアクセスすれば `/login` にリダイレクト MUST。

#### Scenario: 明示的サインアウト
- **WHEN** ログイン済みユーザーが `signOut()` を呼ぶ
- **THEN** session / isAdmin がクリアされ、保護ルート（例: `/`）にアクセスすると `/login` にリダイレクトされる

### Requirement: マジックリンク有効期限 15 分

マジックリンクの有効期限は 15 分（900 秒）SHALL。これは Supabase Dashboard 側で設定する運用要件であり、コード上の挙動としてはリンク無効時に `link-invalid` reason で `/login` に戻る。

#### Scenario: 期限切れリンクの挙動
- **WHEN** 15 分以上経過したマジックリンクをクリックして `/auth/callback` に到達
- **THEN** session 確立に失敗し、`/login?reason=link-invalid` にリダイレクトされる

### Requirement: E2E から本番 Supabase へ通信が届かないこと

`apps/admin` の E2E (Playwright) は SHALL 本番 Supabase に対して 1 本も HTTP リクエストを送らない。多層防御を MUST 実装する:

- E2E env (`.env.e2e` 等) は `VITE_SUPABASE_URL` を DNS 解決不可なドメイン (例: `https://e2e-dummy.invalid`) とする
- Playwright global setup は `VITE_SUPABASE_URL` に `.supabase.co` が含まれていたら fail-fast で全テスト中止
- 各テスト fixture は `page.route('**/auth/v1/**', ...)` / `page.route('**/rest/v1/**', ...)` / `page.route('**/storage/v1/**', ...)` で Supabase 全 API パスを mock
- 未マッチの HTTP は `page.route('**/*', route => route.abort())` で全 abort

#### Scenario: env 誤注入の即時検知
- **WHEN** E2E ジョブで `VITE_SUPABASE_URL=https://xxx.supabase.co` のように本番値が誤って渡される
- **THEN** Playwright global setup の assertion により全テストが中止される

#### Scenario: 未マッチ HTTP の遮断
- **WHEN** E2E 中に Supabase 以外の予期しない外部 URL へリクエストが発生
- **THEN** `route.abort()` により遮断される

#### Scenario: CI 運用
- **WHEN** GitHub Actions の E2E ジョブを実行
- **THEN** 本番 Supabase の secrets は環境変数として渡されない（CI 設定で意図的に分離）

### Requirement: features/auth スライスの Public API

`apps/admin/src/features/auth/index.ts` は `useAuthSession` / `useSendMagicLink` / `useSignOut` / `useMfaEnrollment` / `useMfaChallenge` / `useIdleTimeout` / `installAuthSession` / 関連型を export SHALL する。他レイヤーは内部の `composables/` や `api/` を直接 import SHALL NOT。

#### Scenario: 適切な Public API 経由の import
- **WHEN** `apps/admin` の他レイヤーが auth feature を利用する
- **THEN** `import { useAuthSession } from '@/features/auth'` のように index 経由で import する

### Requirement: TOTP MFA Enrollment（初回登録）

`apps/admin` は admin ユーザーが初回ログイン時に TOTP factor を登録する画面 `/mfa/setup` を SHALL 提供する。AAL1 状態で MFA factor が未登録（`hasMfaFactor === false`）のユーザーが保護ルートにアクセスすると、guard により `/mfa/setup` にリダイレクト MUST される。

`MfaSetupPage` は以下の流れで TOTP factor を登録する:

1. マウント時に `supabase.auth.mfa.enroll({ factorType: 'totp' })` を呼び、`{ id, totp: { qr_code, secret, uri } }` を取得
2. QR コード（svg 文字列）と secret テキストを表示し、認証アプリでのスキャンを案内
3. ユーザーが認証アプリの 6 桁を入力 → `mfa.challenge({ factorId })` → `mfa.verify({ factorId, challengeId, code })`
4. verify 成功で AAL2 に到達、`/`（home）にリダイレクト

#### Scenario: factor 未登録の admin が保護ルートにアクセス
- **WHEN** AAL1 状態で MFA factor が未登録のユーザーが `/` にアクセス
- **THEN** `/mfa/setup` にリダイレクトされ、QR コードと 6 桁入力欄が表示される

#### Scenario: 正しいコードで verify 成功
- **WHEN** ユーザーが認証アプリで生成した正しい 6 桁コードを入力
- **THEN** `mfa.verify` が成功し、AAL2 に到達して `/` にリダイレクトされる

#### Scenario: 誤ったコードで verify 失敗
- **WHEN** ユーザーが誤った 6 桁コードを入力
- **THEN** Error 状態で「コードが正しくありません」が表示され、入力欄はクリアされて再入力可能

#### Scenario: 4 状態 UI
- **WHEN** `/mfa/setup` を遷移する
- **THEN** Empty（QR コード + 入力欄）/ Loading（verify 中の spinner / disabled 入力）/ Success（成功表示 → 自動遷移）/ Error（バナー + 再入力可）の 4 状態が明示される

### Requirement: TOTP MFA Challenge（既存 factor で再認証）

`apps/admin` は既に TOTP factor を登録済みの admin が再ログインする際の認証画面 `/mfa` を SHALL 提供する。AAL1 状態で MFA factor 登録済み（`hasMfaFactor === true`）のユーザーが保護ルートにアクセスすると、guard により `/mfa` にリダイレクト MUST される。

`MfaChallengePage` は以下の流れで factor を検証する:

1. マウント時に `supabase.auth.mfa.listFactors()` で factor を取得し、`mfa.challenge({ factorId })` を呼ぶ
2. ユーザーが認証アプリの 6 桁を入力 → `mfa.verify({ factorId, challengeId, code })`
3. verify 成功で AAL2 に到達、`/`（または初期到達ルート）にリダイレクト

#### Scenario: 登録済み factor を持つ admin が保護ルートにアクセス
- **WHEN** AAL1 状態で MFA factor 登録済みのユーザーが `/` にアクセス
- **THEN** `/mfa` にリダイレクトされ、6 桁入力欄が表示される

#### Scenario: 正しいコードで verify 成功
- **WHEN** ユーザーが認証アプリで生成した正しい 6 桁コードを入力
- **THEN** `mfa.verify` が成功し、AAL2 に到達して `/` にリダイレクトされる

#### Scenario: 誤ったコードで verify 失敗
- **WHEN** ユーザーが誤った 6 桁コードを入力
- **THEN** Error 状態で「コードが正しくありません」が表示され、入力欄はクリアされて再入力可能

### Requirement: AAL2 強制ガード

`apps/admin` の保護ルート（`meta.public !== true` のルート）は AAL2 を SHALL 必須とする。AAL1 状態でアクセスすれば、`hasMfaFactor` の有無に応じて `/mfa` または `/mfa/setup` にリダイレクト MUST される。`is_admin()` RPC は AAL2 到達後にのみ呼ばれる SHALL。

#### Scenario: AAL1 で保護ルートにアクセス（factor 未登録）
- **WHEN** AAL1 + factor 未登録のユーザーが `/` にアクセス
- **THEN** `/mfa/setup` にリダイレクトされる

#### Scenario: AAL1 で保護ルートにアクセス（factor 登録済み）
- **WHEN** AAL1 + factor 登録済みのユーザーが `/` にアクセス
- **THEN** `/mfa` にリダイレクトされる

#### Scenario: AAL2 admin で保護ルートにアクセス
- **WHEN** AAL2 + admin のユーザーが `/` にアクセス
- **THEN** そのまま描画される

#### Scenario: AAL2 非 admin で保護ルートにアクセス
- **WHEN** AAL2 + 非 admin のユーザーが `/` にアクセス
- **THEN** 自動サインアウトされ、`/login?reason=not-admin` にリダイレクトされる

#### Scenario: AAL1 中は is_admin() を呼ばない
- **WHEN** ユーザーが AAL1 状態のまま
- **THEN** `is_admin()` RPC は呼ばれず、`useAuthSession.isAdmin` は `null`（未判定）のまま

### Requirement: JWT 30 分 + idle timeout 15 分

セッションの JWT 有効期限は 30 分（1800 秒）SHALL。これは Supabase Dashboard 側の設定だが、コードは `autoRefreshToken: true` により refresh token から自動更新する。さらにクライアント側で **idle timeout 15 分**を MUST 実装する: 最後のユーザー操作（`mousedown` / `keydown` / `touchstart` / `scroll` のいずれか）から 15 分経過で `signOut` を呼ぶ。

#### Scenario: アクティブ操作中はサインアウトされない
- **WHEN** ユーザーが定期的にクリック・キー入力を行っている
- **THEN** idle timer がリセットされ続け、サインアウトされない

#### Scenario: 15 分放置で auto signOut
- **WHEN** ユーザーが 15 分間一切の操作を行わない
- **THEN** `signOut` が呼ばれ、保護ルートにアクセスすれば `/login` にリダイレクトされる

#### Scenario: JWT 自動更新
- **WHEN** ユーザーがアクティブな状態で 30 分以上操作を続ける
- **THEN** Supabase SDK が refresh token から JWT を自動更新し、ユーザーは再ログインを求められない

### Requirement: TOTP factor 紛失時の運用

`apps/admin` のコード上では TOTP factor 削除機能を SHALL NOT 実装する（オーナーが factor 紛失時にログインできなくなった場合の運用は Supabase Dashboard で factor 削除 → 次回ログインで再 setup）。リカバリーコード生成も MVP1 では実装しない。

#### Scenario: コードに factor 削除 API が存在しない
- **WHEN** `apps/admin` のコード全体を grep する
- **THEN** `mfa.unenroll` の呼び出しが `auth-client.ts` 含めて存在しない
