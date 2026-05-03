# reservation-member-auth Specification

## Purpose
TBD - created by archiving change reservation-member-auth-magic-link. Update Purpose after archive.
## Requirements
### Requirement: マジックリンク送信フロー（Login = Signup 段階1 兼用）

`apps/reservation` の `/login` ページは、既存会員のログインと新規会員のサインアップ段階 1 を **兼用** する SHALL。ユーザーが入力したメールアドレスに対して Supabase Auth の `signInWithOtp` を呼び、`shouldCreateUser: true` で送信する。`emailRedirectTo` は `window.location.origin + '/auth/callback'`。Supabase 側の email 既存判定により、既存会員にはログインリンク、新規にはサインアップリンクが自動的に送信される。

#### Scenario: 既存会員 / 新規共通でマジックリンク送信
- **WHEN** ユーザーが `/login` で `member@example.com` を入力し「ログインリンクを送る」を押す
- **THEN** `supabase.auth.signInWithOtp` が `{ email: 'member@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'http://<host>/auth/callback' } }` で呼ばれる（既存会員ならログイン、新規ならサインアップに Supabase 側で自動振り分け）

#### Scenario: 空のメールで送信を試みる
- **WHEN** メール入力が空のまま CTA を押す
- **THEN** API は呼ばれず、Error 状態で「メールアドレスを入力してください」が表示される

#### Scenario: 形式不正のメール
- **WHEN** `not-an-email` のような形式不正なメールで CTA を押す
- **THEN** API は呼ばれず、Error 状態で「メールアドレスの形式が正しくありません」が表示される

#### Scenario: 未登録のメールでも送信成功（新規ユーザー扱い）
- **WHEN** `auth.users` に存在しないメールで CTA を押す（`shouldCreateUser: true`）
- **THEN** Supabase が `auth.users` に未確認状態で行を作成 + マジックリンク送信、UI は Success 状態に遷移し「ログインリンクを送信しました」と表示される

### Requirement: 会員登録フロー = `/login` 段階 1 + `/signup/profile` 段階 2

会員登録フローは **2 段階** で構成する SHALL:
- 段階 1: `/login` でメール送信（上記 Requirement と兼用 — 既存会員ログインと共通フォーム）
- 段階 2（`/signup/profile`）: マジックリンク認証完了後、氏名 / 生年月日 / 電話 / 経験レベル / 利用規約同意を入力 → `members` UPDATE

`/signup` 単独ルートは **撤廃** する SHALL（段階 1 は `/login` で兼用するため）。HomePlaceholder 等の「会員登録」CTA は `/login` を指す。

電話番号は事件・トラブル発生時の連絡先を確保する目的で **必須** とする。SMS による実在確認は MVP1 では実施しない（Phase 2 で再評価。詳細は design.md D12 参照）。

#### Scenario: /signup ルートは存在しない
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup'` のルート定義は存在しない（撤廃済み）

### Requirement: 会員登録フロー段階 2（プロフィール入力）

`apps/reservation` の `/signup/profile` ページは、認証済み + `isProfileComplete === false` の会員のみアクセス可能 SHALL。氏名 / 生年月日 / 電話（必須・国内携帯番号） / 経験レベル / 利用規約同意の入力を受け付け、同意 ON で CTA「登録する」が活性化する。CTA 押下で `members` テーブルを UPDATE し、`profile.signup_completed = true` + `profile.terms_agreed_at` を既存 jsonb にマージする MUST。成功で `useAuthSession.refresh()` を呼び `/` に遷移する。

#### Scenario: 全フィールド入力 + 同意 ON で登録
- **WHEN** 認証済み + プロフィール未完成のユーザーが `/signup/profile` で氏名「田中 美咲」/ 生年月日 `1995-03-15` / 電話 `090-1234-5678` / 経験レベル「初めて」/ 同意 ON で CTA を押す
- **THEN** `members` UPDATE が `{ display_name: '田中 美咲', birthday: '1995-03-15', phone: '090-1234-5678', experience_level: 'beginner', profile: { ...existing, signup_completed: true, terms_agreed_at: '<ISO8601>' } }` で実行され、成功後 `/` に遷移する

#### Scenario: 利用規約同意なしで登録を試みる
- **WHEN** 全フィールドを入力したが同意チェックボックスが OFF の状態で CTA を押そうとする
- **THEN** CTA は disabled のまま押下できない

#### Scenario: 必須フィールド未入力（氏名）
- **WHEN** 氏名が空で生年月日 / 電話 / 経験レベル / 同意 ON でも CTA を押す
- **THEN** API は呼ばれず、氏名フィールドに「お名前を入力してください」のエラーが表示される

#### Scenario: 生年月日が未来日
- **WHEN** 生年月日に明日の日付を入力して CTA を押す
- **THEN** API は呼ばれず、生年月日フィールドに「生年月日は過去の日付を入力してください」のエラーが表示される

#### Scenario: 生年月日が 100 年以上前
- **WHEN** 生年月日に 1900 年の日付を入力して CTA を押す
- **THEN** API は呼ばれず、生年月日フィールドに「生年月日が正しくありません」のエラーが表示される

#### Scenario: 経験レベル enum 外の値
- **WHEN** Smart constructor `createExperienceLevel('unknown')` が呼ばれる
- **THEN** 例外が投げられる（`'beginner' | 'intermediate' | 'experienced'` 以外を弾く）

#### Scenario: 電話番号未入力
- **WHEN** 電話番号を空のまま、他の必須フィールドと同意 ON で CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「電話番号を入力してください（当日連絡用）」のエラーが表示される

#### Scenario: 電話番号が固定電話（携帯ではない）
- **WHEN** 電話番号に `03-1234-5678` を入力して CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください」のエラーが表示される

#### Scenario: 電話番号フォーマット異常（桁数不足）
- **WHEN** 電話番号に `090-1234` のような桁数不足を入力して CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「電話番号の桁数が正しくありません」のエラーが表示される

#### Scenario: 電話番号の入力ゆらぎを正規化
- **WHEN** 電話番号に `09012345678`（ハイフンなし）/ `０９０-１２３４-５６７８`（全角）/ `+819012345678`（国際表記）のいずれかを入力して CTA を押す
- **THEN** Smart constructor が `090-1234-5678`（半角ハイフン区切り）に正規化し、UPDATE にはこの正規化済みの値が送られる

#### Scenario: 未認証ユーザーが /signup/profile にアクセス
- **WHEN** 未認証ユーザーが `/signup/profile` を直接 URL アクセス
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: プロフィール完成済みユーザーが /signup/profile にアクセス
- **WHEN** 認証済み + プロフィール完成済みのユーザーが `/signup/profile` にアクセス
- **THEN** auth guard により `/` にリダイレクトされる

### Requirement: マジックリンク戻り先 `/auth/callback`

`apps/reservation` は `/auth/callback` ルートを SHALL 提供する。Supabase クライアントが `detectSessionInUrl: true` で構成されているため、ページマウント時に URL hash 内のトークンが消化されてセッションが確立する。`AuthCallbackPage.vue` は session 確立を待ち、`isProfileComplete` 判定の結果に応じてリダイレクトする MUST。

#### Scenario: session 確立 + プロフィール完成済み
- **WHEN** マジックリンクをクリックして `/auth/callback#access_token=...` に到達し、session 確立後 `isProfileComplete === true`（既存会員 / admin）
- **THEN** `/` にリダイレクトされる

#### Scenario: session 確立 + プロフィール未完成
- **WHEN** `/auth/callback` で session 確立、`isProfileComplete === false`（新規会員 / トリガー直後）
- **THEN** `/signup/profile` にリダイレクトされる（情報入力誘導）

#### Scenario: マジックリンクが期限切れ・無効
- **WHEN** `/auth/callback` でセッション確立に失敗（リンク期限切れ、トークン無効等）
- **THEN** `/login?reason=link-invalid` にリダイレクトされ、Error バナーで「リンクの有効期限が切れたか、無効です。再送信してください」が表示される

### Requirement: マジックリンク送信完了画面（LinkSent）

`apps/reservation` は `signInWithOtp` 成功後に **送信先メールアドレス + 再送ボタン + 別メールで送り直すリンク** を持つ画面（`/auth/link-sent`）を SHALL 表示する。

#### Scenario: 送信先メールアドレス表示
- **WHEN** `signInWithOtp` 成功で `/auth/link-sent?email=<encoded>` に遷移
- **THEN** 「<入力メール> 宛にログインリンクを送信しました。メール内のリンクから続行してください。」が表示される

#### Scenario: メール再送
- **WHEN** ユーザーが「メールを再送する」ボタンを押す
- **THEN** 同じメールアドレスで `signInWithOtp` (`shouldCreateUser: true`) が再実行され、Loading 状態を経て Success に戻る（または rate-limit エラーで Error 状態）

#### Scenario: rate-limit エラー時の表示
- **WHEN** 再送ボタン押下で Supabase が rate-limit エラー（`over_email_send_rate_limit`）を返す
- **THEN** Error バナーで「送信回数の上限に達しました。約 60 秒お待ちいただいてから再試行してください」が表示される

#### Scenario: 別アドレスを使う
- **WHEN** ユーザーが「別のアドレスを使う」リンクを押す
- **THEN** `/login` 画面に戻り、入力欄がクリアされる

### Requirement: 4 状態 UI

`/login` / `/signup/profile` / `/auth/link-sent` / `/auth/callback` の各ページは Empty / Loading / Error / Success の 4 状態を持ち、各状態で表示要素が明確に切り替わる SHALL。

#### Scenario: LoginPage Empty 状態
- **WHEN** `/login` に初回アクセスする
- **THEN** メール入力欄 + 「メールでリンクを受け取る →」CTA + サービス紹介 + ABOUT カードが表示される

#### Scenario: LoginPage Loading 状態
- **WHEN** メール入力 + CTA を押し、API レスポンス到達前
- **THEN** CTA は無効化され、ラベルが「送信中…」に切り替わる

#### Scenario: LoginPage Error 状態（reason クエリ）
- **WHEN** `/login?reason=link-invalid` にアクセス
- **THEN** Error バナーで「リンクの有効期限が切れたか、無効です。再送信してください」が表示され、URL からは `replaceState` で query が除去される

#### Scenario: SignupProfilePage Empty 状態
- **WHEN** `/signup/profile` に初回アクセスする
- **THEN** 全フィールド入力欄 + 同意チェックボックス + 「登録する」CTA が表示され、CTA は同意 OFF のため disabled

#### Scenario: SignupProfilePage Loading 状態
- **WHEN** 全フィールド入力 + 同意 ON で CTA を押し、API レスポンス到達前
- **THEN** CTA は無効化され、ラベルが「登録中…」に切り替わる

#### Scenario: AuthCallbackPage Loading 状態
- **WHEN** `/auth/callback#access_token=...` に到達
- **THEN** HQ paper 背景の中央寄せで「サインインしています…」が表示される

### Requirement: セッション復元

ブラウザ再訪時、Supabase の `localStorage` 永続セッションから自動復元され、`useAuthSession` が member 取得を完了するまで guard は遷移を保留 SHALL する。

#### Scenario: 既ログイン + プロフィール完成済みでリロード
- **WHEN** プロフィール完成済みの member としてログイン済みのブラウザで `/` をリロード
- **THEN** ロード完了後そのまま `/` が描画される（`/login` への一瞬のリダイレクトが起きない）

#### Scenario: セッション切れ後のアクセス
- **WHEN** session の有効期限が切れた状態（refresh token 失敗）で保護ルートにアクセス
- **THEN** `/login` にリダイレクトされる

### Requirement: ログアウト

`useAuthSession.signOut()` は `supabase.auth.signOut()` を呼び、ローカル state（`session` / `member` / `isProfileComplete`）をクリア SHALL する。サインアウト後、保護ルートにアクセスすれば `/login` にリダイレクト MUST。

#### Scenario: 明示的サインアウト
- **WHEN** ログイン済み member が `HomePlaceholder` のログアウトボタンを押す
- **THEN** session / member / isProfileComplete がクリアされ、`/login` にリダイレクトされる

### Requirement: マジックリンク有効期限 15 分

マジックリンクの有効期限は 15 分（900 秒）SHALL。これは Supabase Dashboard 側で設定する運用要件であり、コード上の挙動としてはリンク無効時に `link-invalid` reason で `/login` に戻る。

#### Scenario: 期限切れリンクの挙動
- **WHEN** 15 分以上経過したマジックリンクをクリックして `/auth/callback` に到達
- **THEN** session 確立に失敗し、`/login?reason=link-invalid` にリダイレクトされる

### Requirement: `/` ルートは認証必須（ランディング廃止）

`/`（HomePlaceholder）は **認証必須** とする SHALL（2026-05-04 翔太郎くん指示でランディング画面を廃止）。`meta.public` を持たず、未認証ユーザーは auth guard により `/login` にリダイレクトされる。会員ダッシュボードのプレースホルダ「準備中」表示は認証済み + プロフィール完成済みのユーザーのみが見る。

#### Scenario: 未認証で / にアクセス
- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる（ランディング画面は表示されない）

#### Scenario: 認証済み + プロフィール完成で / にアクセス
- **WHEN** 認証済み + プロフィール完成済みのユーザーが `/` にアクセス
- **THEN** 「準備中」メッセージとログアウトボタンが描画される（後続 #90 でイベント一覧に置き換え予定）

#### Scenario: 認証済み + プロフィール未完成で / にアクセス
- **WHEN** 認証済み + プロフィール未完成のユーザーが `/` にアクセス
- **THEN** auth guard により `/signup/profile` にリダイレクトされる（情報入力誘導）

### Requirement: プロフィール完成判定 = `signup_completed === true` OR `role === 'admin'`

システムは以下の OR 条件で「プロフィール完成」とみなす SHALL:
1. `members.profile->>'signup_completed' = 'true'`
2. `members.role = 'admin'`（admin は member の **完全上位互換**として常に完成扱い）

トリガー `on_auth_user_created` が作る placeholder 行（`profile = '{}'::jsonb` + `role = 'member'`）は両条件とも満たさず、未完成扱いとなる。`/signup/profile` の登録 CTA で `members` UPDATE 時、`profile` jsonb をマージ更新で `{ signup_completed: true, terms_agreed_at: <ISO8601> }` を設定する MUST。

#### Scenario: 新規 placeholder 行は未完成判定
- **WHEN** トリガー `on_auth_user_created` で作成された直後の `members` 行（`profile = '{}'`、`role = 'member'`）を `useAuthSession.fetchMyMember()` で取得
- **THEN** 両条件とも満たさないため `isProfileComplete === false` が返る

#### Scenario: 完成フラグセット後は完成判定
- **WHEN** `members.profile->>'signup_completed' = 'true'` の行を `fetchMyMember()` で取得
- **THEN** `isProfileComplete === true` が返る

#### Scenario: admin role は完成扱い（member の完全上位互換）
- **WHEN** `members.role = 'admin'` の行を `fetchMyMember()` で取得（`profile.signup_completed` が未セットでも）
- **THEN** `isProfileComplete === true` が返り、admin は reservation サイトで `/signup/profile` 強制誘導されない

#### Scenario: 既存 profile キーを保持したマージ
- **WHEN** 更新前の `profile` に他のキーが既存している場合に `/signup/profile` の登録 UPDATE を実行
- **THEN** 既存キーは保持され、`signup_completed` と `terms_agreed_at` のみ追加・上書きされる（クライアント側で現在値を SELECT してマージしてから UPDATE）

#### Scenario: display_name の placeholder 値（メール由来）と無関係
- **WHEN** `display_name = 'misaki.t'`（トリガーが入れたメール @ 前部分）かつ `profile = '{}'::jsonb` かつ `role = 'member'`
- **THEN** `display_name` が空文字でなくても `isProfileComplete === false` が返る（判定基準は `signup_completed` フラグまたは admin role のみ）

### Requirement: プロフィール未完成会員の `/signup/profile` 強制誘導

認証済みだが `isProfileComplete === false` の会員が `/signup/profile` 以外のルートにアクセスした場合、auth guard により `/signup/profile` に MUST リダイレクトする。`/signup/profile` 自体および `/auth/callback` へのアクセスは通過する。

#### Scenario: プロフィール未完成で `/` にアクセス
- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/` にアクセス
- **THEN** `/signup/profile` にリダイレクトされる

#### Scenario: プロフィール未完成で `/signup/profile` にアクセス
- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/signup/profile` にアクセス
- **THEN** `/signup/profile` のフォームが描画される（無限ループしない）

### Requirement: 中途離脱ユーザーの 48h cleanup（後続 Issue で実装）

本 change 内では中途離脱ユーザー（`auth.users` unconfirmed / `members.profile.signup_completed != true`）を **削除しない** が、後続 Issue で実装される cleanup ジョブが本 change の `signup_completed` フラグを判定根拠に SHALL 利用する。本 Requirement は cleanup ジョブの**判定契約**を本 change で固定するためのもので、cleanup の実装自体は本 change のスコープ外（Issue #190）。

#### Scenario: cleanup ジョブの判定契約
- **WHEN** 後続 Issue (#190) の cleanup ジョブが日次実行される
- **THEN** `auth.users.created_at < now() - interval '48 hours'` AND (`email_confirmed_at IS NULL` OR `members.profile->>'signup_completed' != 'true'`) を満たす行を `auth.users` から DELETE し、`ON DELETE CASCADE` で `members` も連動削除する

#### Scenario: cleanup 対象外
- **WHEN** プロフィール完成済み（`profile.signup_completed = true`）または `role = 'admin'` のユーザー
- **THEN** `created_at` がどれだけ古くても cleanup 対象にならない

### Requirement: 会員プロフィールの取得とキャッシュ

`useAuthSession` は session 確立後、`members` テーブルから自分の行を 1 回 SELECT し、`member` reactive state にキャッシュ SHALL する。`onAuthStateChange` でセッションが変わるたび、または `refresh()` 明示呼び出しで再取得 MUST する。RLS により自分の行のみ返ることを前提とする。

#### Scenario: 初回 session 確立で member 取得
- **WHEN** session 確立後、`useAuthSession.ready()` が解決
- **THEN** `supabase.from('members').select('*').eq('id', auth.uid()).single()` が呼ばれ、`member` state に格納される

#### Scenario: refresh() 呼び出しで再取得
- **WHEN** `/signup/profile` で UPDATE 完了後に `refresh()` を呼ぶ
- **THEN** members から最新の行が再取得され、`member` state が更新される

#### Scenario: signOut で member クリア
- **WHEN** `signOut()` を呼ぶ
- **THEN** `member` state が `null` に戻る

### Requirement: 利用規約同意の記録

会員登録フォームの利用規約同意は **必須**。同意した時点の ISO 8601 タイムスタンプを `members.profile.terms_agreed_at` に SHALL 保存する。同意なしでは送信不可。

#### Scenario: 同意 ON で送信
- **WHEN** 同意チェックボックスを ON にして CTA を押す
- **THEN** UPDATE で `members.profile.terms_agreed_at` に ISO 8601 タイムスタンプが保存される（同時に `signup_completed: true` も保存される）

#### Scenario: profile jsonb の他キーを保持
- **WHEN** signup 時 / 後続のプロフィール編集 (#92) で `terms_agreed_at` / `signup_completed` 以外の jsonb キーが既に存在する場合、UPDATE は他キーを上書きしない
- **THEN** クライアント側マージ（更新前 SELECT → JS マージ → UPDATE）により他キーが保持される

### Requirement: ハードコードされた email を判定根拠に使うことを禁止

`apps/reservation` のコード全体を grep して、`'owner@high-q.club'` などオーナー email リテラルが認証判定ロジックに登場 SHALL NOT する（テスト fixture や docs を除く）。会員ロールの判定は `member.role` および `profile.signup_completed` のみで行う。

#### Scenario: コード grep
- **WHEN** `apps/reservation/src/` を `'owner@high-q.club'` で grep
- **THEN** マッチが 0 件、またはコメント / spec ファイルのみ
