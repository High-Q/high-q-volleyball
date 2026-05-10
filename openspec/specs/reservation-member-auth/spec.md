# reservation-member-auth Specification

## Purpose
TBD - created by archiving change reservation-member-auth-magic-link. Update Purpose after archive.
## Requirements
### Requirement: 会員登録フロー = `/login` 段階 1 + `/signup/profile` 段階 2

会員登録フローは **3 段階** で構成する SHALL（#189 ゼロ滞留 signup フロー導入により段階 1 / 2 のルートが置き換わる）:
- 段階 1（`/signup`）: 全項目入力 + 利用規約同意 → 認証コード送信
- 段階 2（`/signup/verify`）: メールで届いた 6 桁コードを入力 → `auth.users` + `members` の一括作成
- 段階 3（`/signup/identity`）: 本人確認書類 1 点をアップロード（詳細は `reservation-identity-document-upload` capability を参照）

`/signup/profile` ルートは **撤廃** する SHALL（#189 で削除）。`/login` は既存会員ログイン専用となり、新規会員登録の入口は HomePlaceholder 等の「会員登録」CTA から `/signup` を指す MUST。

電話番号は事件・トラブル発生時の連絡先を確保する目的で **必須** とする。SMS による実在確認は MVP1 では実施しない。

ニックネームは**任意項目**であり、空欄のままで段階 1 を完了できる SHALL。空欄送信時はニックネーム属性が NULL として保持され、会員視点表示は氏名 fallback で行われる。

#### Scenario: /signup ルートが存在する
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup'` のルート定義が存在し、本 change の SignupPage を component に持つ

#### Scenario: /signup/profile ルートは存在しない
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/profile'` のルート定義は存在しない（撤廃済み）

#### Scenario: /signup/verify ルートが存在する
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/verify'` / `name: 'signup-verify'` のルートが定義されている (Step 2 / 3 として)

#### Scenario: /signup/identity ルートが存在する
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/identity'` / `name: 'signup-identity'` のルートが定義されている (Step 3 / 3 として)

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

`useAuthSession.signOut()` は `supabase.auth.signOut()` を呼び、ローカル state（`session` / `member` / `isProfileComplete` / `hasIdentityDocument`）をクリア SHALL する。サインアウト後、保護ルートにアクセスすれば `/login` にリダイレクト MUST。

ログアウト UI の主入口は **プロフィール画面 (`/profile`)** とする MUST（HomePlaceholder は #90 で廃止済）。プロフィール画面ではログアウトボタン押下後に ConfirmDialog を経由し、確定で `signOut()` を呼ぶ。詳細は `reservation-profile-page` capability の「ログアウト動線」要件に従う。

`/signup/profile` / `/signup/identity` 等の登録途中ページに既存のログアウトリンクが存在する場合、それらは「登録途中の離脱」用として維持してよい SHALL（プロフィール画面のログアウトと併存可）。

#### Scenario: プロフィール画面からの明示的サインアウト
- **WHEN** ログイン済 + プロフィール完成 + 書類提出済の member が `/profile` のログアウトボタンを押し、ConfirmDialog で確定する
- **THEN** session / member / isProfileComplete / hasIdentityDocument がクリアされ、`/login` にリダイレクトされる

#### Scenario: 登録途中ページからのサインアウト（既存導線の維持）
- **WHEN** プロフィール未完成 / 書類未提出の member が `/signup/profile` または `/signup/identity` のログアウトリンクを押す
- **THEN** session / member 関連 state がクリアされ、`/login` にリダイレクトされる

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

本 change 適用後、新規作成される `members` 行は INSERT 時点で常に `signup_completed: true` を持つため、新規会員は判定が常に true となる。フィールド自体は Phase 1 で作成された会員行（既に true がセット済み）および admin の上位互換扱いとの互換性のため維持する MUST。

#### Scenario: 新規会員行は完成判定
- **WHEN** `verify-signup` 成功で作成された `members` 行を `useAuthSession.fetchMyMember()` で取得
- **THEN** `isProfileComplete === true` が返る

#### Scenario: Phase 1 で作成された会員行も完成判定（互換性）
- **WHEN** Phase 1 期間に作成され `profile.signup_completed = true` を既にセット済みの `members` 行を取得
- **THEN** `isProfileComplete === true` が返る（フィールドの意味は変わらない）

#### Scenario: admin role は完成扱い（member の完全上位互換）
- **WHEN** `members.role = 'admin'` の行を `fetchMyMember()` で取得
- **THEN** `isProfileComplete === true` が返り、admin は reservation サイトで signup フローに誘導されない

### Requirement: プロフィール未完成会員の `/signup/profile` 強制誘導

本 change 適用後、`auth.users` に存在する会員は `verify-signup` 完了時点でプロフィール完成済み（`signup_completed = true`）となるため、Phase 1 の「認証済み + プロフィール未完成 → `/signup/profile` 強制誘導」分岐は **到達不能** となり、auth guard から削除する SHALL。`/signup/profile` ルート自体も撤廃される。

guard の分岐は以下に簡素化される MUST:
- `to.meta.public === true` のルート（`/login` / `/signup` / `/signup/verify` / `/auth/callback` / `/auth/link-sent`）は未認証でも通過
- 未認証 + 非公開ルート → `/login` にリダイレクト
- 認証済み + `/login` / `/signup` / `/signup/verify` → `/` にリダイレクト
- それ以外（認証済み + 任意ルート） → 通過

書類未提出（`hasIdentityDocument === false`）の guard 分岐は別 capability `reservation-identity-document-upload` の責務であり、本 change では変更 SHALL NOT する。

#### Scenario: プロフィール未完成分岐が削除されている
- **WHEN** `apps/reservation/src/app/router.ts` の auth guard 実装を確認する
- **THEN** 「プロフィール未完成 → `/signup/profile` 誘導」に相当する条件分岐は存在しない

#### Scenario: 認証済みで /signup にアクセス
- **WHEN** 認証済みユーザーが `/signup` にアクセス
- **THEN** `/` にリダイレクトされる（重複登録防止）

#### Scenario: 認証済みで /signup/verify にアクセス
- **WHEN** 認証済みユーザーが `/signup/verify` にアクセス
- **THEN** `/` にリダイレクトされる

### Requirement: 中途離脱ユーザーの 48h cleanup（後続 Issue で実装）

本 change 内では中途離脱ユーザー（`auth.users` unconfirmed / `members.profile.signup_completed != true`）を **削除しない** が、後続 Issue で実装される cleanup ジョブが本 change の `signup_completed` フラグを判定根拠に SHALL 利用する。本 Requirement は cleanup ジョブの**判定契約**を本 change で固定するためのもので、cleanup の実装自体は本 change のスコープ外（Issue #190）。

#### Scenario: cleanup ジョブの判定契約
- **WHEN** 後続 Issue (#190) の cleanup ジョブが日次実行される
- **THEN** `auth.users.created_at < now() - interval '48 hours'` AND (`email_confirmed_at IS NULL` OR `members.profile->>'signup_completed' != 'true'`) を満たす行を `auth.users` から DELETE し、`ON DELETE CASCADE` で `members` も連動削除する

#### Scenario: cleanup 対象外
- **WHEN** プロフィール完成済み（`profile.signup_completed = true`）または `role = 'admin'` のユーザー
- **THEN** `created_at` がどれだけ古くても cleanup 対象にならない

### Requirement: 会員プロフィールの取得とキャッシュ

`useAuthSession` は session 確立後、`members` テーブルから自分の行を 1 回 SELECT し、`member` reactive state にキャッシュ SHALL する。同時に `identity_documents` テーブルへの存在チェック (`select id from identity_documents where member_id = ? limit 1`) を並行で MUST 実行し、結果を `hasIdentityDocument` reactive state にキャッシュする。`onAuthStateChange` でセッションが変わるたび、または `refresh()` 明示呼び出しで両方再取得 MUST する。RLS により自分の行のみ返ることを前提とする。`member` reactive state は本 change で追加された任意の `nickname` 属性を MUST 含む。

#### Scenario: 初回 session 確立で member 取得
- **WHEN** session 確立後、`useAuthSession.ready()` が解決
- **THEN** `supabase.from('members').select('*').eq('id', auth.uid()).single()` が呼ばれ、`member` state に格納される

#### Scenario: 初回 session 確立で identity_documents 存在チェック
- **WHEN** session 確立後、`useAuthSession.ready()` が解決
- **THEN** `supabase.from('identity_documents').select('id').eq('member_id', auth.uid()).limit(1)` 相当のクエリが並行で呼ばれ、結果が `hasIdentityDocument` state に格納される

#### Scenario: refresh() 呼び出しで再取得
- **WHEN** `/signup/profile` または `/signup/identity` で UPDATE 完了後に `refresh()` を呼ぶ
- **THEN** members と identity_documents の両方から最新値が再取得され、`member` / `hasIdentityDocument` state が更新される

#### Scenario: signOut で member クリア
- **WHEN** `signOut()` を呼ぶ
- **THEN** `member` state が `null` に戻り、`hasIdentityDocument` も `false` に戻る

#### Scenario: nickname 属性が member state に含まれる
- **WHEN** ニックネームを保持する member の行が SELECT され state にキャッシュされる
- **THEN** `member.nickname` が文字列として参照可能になり、未設定時は `null` が返る

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

### Requirement: SignupProfilePage の footer 注記でデータ利用目的・関連ポリシーへのリンクを明示する

`apps/reservation` の `/signup/profile` ページは、本文末尾 (CTA 周辺) に MUST 以下の注記とリンクを表示する (個人情報保護法 + 改正電気通信事業法対応):

> ご入力いただいた情報は、本人確認・連絡・参加管理のためにのみ利用します。第三者への提供は法令に基づく場合を除き行いません。
>
> 詳細は[プライバシーポリシー](`<lp-origin>/privacy`)・[外部送信ポリシー](`<lp-origin>/external-transmission`) をご覧ください。

プライバシーポリシー / 外部送信ポリシーはともに LP に集約された単一 source of truth を別オリジンとして参照する MUST。reservation アプリ内に `/privacy` / `/external-transmission` ルートを持たない MUST NOT。

実装は `SignupIdentityPage` の既存 `PolicyFooter` コンポーネントを `apps/reservation/src/shared/ui/` に共通プリミティブとして抽出して再利用する SHALL。

#### Scenario: footer 注記の存在
- **WHEN** ユーザーが `/signup/profile` を開いて画面を最下部までスクロールする
- **THEN** 利用目的の注記とプライバシーポリシー / 外部送信ポリシーへのリンクが表示される

#### Scenario: 外部送信ポリシーリンクの遷移先
- **WHEN** ユーザーが「外部送信ポリシー」リンクを押下する
- **THEN** lp の `<lp-origin>/external-transmission` が新規タブで開かれる

#### Scenario: プライバシーポリシーリンクの遷移先
- **WHEN** ユーザーが「プライバシーポリシー」リンクを押下する
- **THEN** lp の `<lp-origin>/privacy` が新規タブで開かれる (`target="_blank"` + `rel="noreferrer"`)

#### Scenario: PolicyFooter コンポーネントの共通化
- **WHEN** `SignupIdentityPage` と `SignupProfilePage` の両方で PolicyFooter が描画される
- **THEN** 共通プリミティブ `apps/reservation/src/shared/ui/PolicyFooter.vue` が両ページで import されている (テキストや遷移先は同一)

### Requirement: 会員視点表示の名前優先ルール

会員サイト (`apps/reservation`) で会員自身の名前を画面に表示する際は、「ニックネームが設定されていればニックネーム、未設定（NULL）であれば氏名 (display_name)」の優先順で SHALL 描画する。本ルールは会員視点画面（自分のプロフィール表示・履歴・予約サマリ等、後続 Issue で実装される画面群）における正準ルールであり、各画面で独自の表示判定を行うことを SHALL NOT 許容する。

本 change の範囲では実画面での表示は行わない（現状切替対象画面が 0 件のため）。後続 Issue（プロフィール編集 #148 / 履歴 / 予約サマリ強化）で会員自身の名前を画面に出す際、本 Requirement に従い実装する MUST。

管理画面 (`apps/admin`) には本ルールを適用 MUST NOT する。admin は引き続き氏名 (display_name) を表示する（運営連絡・本人確認のため）。

#### Scenario: ニックネームが設定されている場合の表示
- **WHEN** 会員サイトの会員視点画面で、自身の `member.nickname` が `'ミサキ'` の状態で名前を描画する
- **THEN** 画面には「ミサキ」と表示される

#### Scenario: ニックネームが未設定の場合の氏名 fallback
- **WHEN** 会員サイトの会員視点画面で、自身の `member.nickname` が `null` で `member.displayName` が `'田中 美咲'` の状態で名前を描画する
- **THEN** 画面には「田中 美咲」と表示される

#### Scenario: 管理画面はルール適用対象外
- **WHEN** admin がイベント参加者一覧 / 会員一覧で member の名前を描画する
- **THEN** ニックネームの有無にかかわらず氏名 (display_name) が表示される（本ルールは admin に適用しない）

### Requirement: 認証コード発行 Edge Function `request-signup`

`apps/reservation` の `/signup` フォーム送信は、Supabase Edge Function `request-signup` を呼び出す SHALL。Function は以下の責務を持つ:

1. クライアントから受け取った payload（メール / 氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意タイムスタンプ）をサーバ側でバリデーションする
2. 同 email の既存 `auth.users` 行が**存在しないこと**を確認する（存在する場合はクライアントに「既に登録済みです。ログインへお進みください」を返す）
3. 6 桁の認証コードを生成し、**ハッシュ化**したものを `signup_pending` テーブルに保存する。原文は DB に保存 SHALL NOT
4. 保存される行は payload + コードハッシュ + 試行回数（初期値 0） + 期限（発行時刻 + 30 分）を含む
5. 同一メールアドレスの既存 `signup_pending` 行が存在する場合は、新しい行で上書きする MUST
6. 認証コード本文を含むメールを送信先メールアドレスへ送る（送信経路は Supabase 組み込み認証メール基盤）
7. クライアントには成功 / 既登録 / 入力エラー / レート制限超過のいずれかのステータスを返す MUST。auth.users / members は本ステップでは作成 SHALL NOT

#### Scenario: 新規メールアドレスでコード発行
- **WHEN** 未登録のメールアドレスで全項目を入力した signup フォームから `request-signup` が呼ばれる
- **THEN** `signup_pending` に該当 email の行が作成され、認証コードメールが送信され、`auth.users` / `members` には何も書かれない

#### Scenario: 既登録メールアドレスでコード発行を試みる
- **WHEN** 既存 `auth.users` に存在するメールアドレスで `request-signup` が呼ばれる
- **THEN** `signup_pending` に行は作成されず、メール送信もされず、クライアントに「既登録」エラーが返る

#### Scenario: 同 email で再送信
- **WHEN** 同じメールアドレスで `request-signup` が連続して呼ばれる（30 分以内）
- **THEN** 旧 `signup_pending` 行は新しい行で上書きされ、新しいコードのみが有効になる

#### Scenario: payload バリデーションエラー
- **WHEN** 氏名空 / 生年月日未来日 / 電話番号フォーマット異常などサーバ側バリデーションを満たさない payload が送られる
- **THEN** `signup_pending` に行は作成されず、クライアントにフィールド単位のエラー詳細が返る

#### Scenario: コードはハッシュで保管
- **WHEN** `signup_pending` テーブルを SELECT する
- **THEN** 6 桁コードの**ハッシュ値**のみが保管されており、原文の数字列は DB のどこにも存在しない

### Requirement: 認証コード検証 Edge Function `verify-signup`

`apps/reservation` の `/signup/verify` フォーム送信は、Supabase Edge Function `verify-signup` を呼び出す SHALL。Function は以下の責務を持つ:

1. クライアントから受け取った email + 6 桁コードに対し、`signup_pending` の該当行を SELECT する
2. 行が存在しない / 期限超過の場合は「コードが無効または期限切れ」エラーを返し、行は削除する
3. コードハッシュ照合に失敗した場合は試行回数をインクリメントし、上限到達時は行を削除する
4. 検証成功時のみ Supabase Auth admin API で `auth.users` を作成（`email_confirm: true`）し、続けて同 Function 内で `members` 行を payload の正式値で UPSERT する。`members.profile.signup_completed` は `true`、`profile.terms_agreed_at` は payload のタイムスタンプを保存 MUST
5. 検証成功後、`signup_pending` の該当行を DELETE する MUST
6. クライアントに新規セッション（access_token / refresh_token）を返し、クライアントは Supabase クライアントの `setSession` で保持する SHALL
7. 副作用として、自分以外の期限切れ `signup_pending` 行をベストエフォートで掃除してよい SHALL（pg_cron 依存はサービスIN時点では持ち込まない）

#### Scenario: 正しいコードでの検証成功
- **WHEN** 期限内・正しい 6 桁コード・期限切れでない `signup_pending` 行が存在する状態で `verify-signup` が呼ばれる
- **THEN** `auth.users` に `email_confirmed_at` セット済みの行が作成され、同 id で `members` 行が `signup_completed: true` を含む完成状態で作成され、`signup_pending` の該当行は削除され、クライアントに新規セッションが返る

#### Scenario: コード誤入力（上限未達）
- **WHEN** 期限内だが誤った 6 桁コードを送る
- **THEN** `signup_pending` 行の試行回数がインクリメントされ、`auth.users` / `members` は作成されず、クライアントに「コードが正しくありません」エラーが返る

#### Scenario: コード誤入力（上限到達）
- **WHEN** 試行回数が上限値に達した状態でさらに誤入力を送る
- **THEN** `signup_pending` 行は削除され、クライアントに「試行回数の上限に達しました。最初からやり直してください」エラーが返り、`/signup` への戻り導線が促される

#### Scenario: 期限切れコードでの検証
- **WHEN** `signup_pending` 行の期限が現在時刻を過ぎた状態で `verify-signup` が呼ばれる
- **THEN** 該当行は削除され、`auth.users` / `members` は作成されず、クライアントに「コードの有効期限が切れました。最初からやり直してください」エラーが返る

#### Scenario: 検証成功で signup_pending が削除される
- **WHEN** `verify-signup` が成功する
- **THEN** 該当 email の `signup_pending` 行が DB から消えていることを SELECT で確認できる

#### Scenario: members の必須項目はすべて payload から埋まる
- **WHEN** `verify-signup` 成功後に作成された `members` 行を確認する
- **THEN** `display_name` / `birthday` / `phone` / `experience_level` / `nickname`（任意）/ `profile.signup_completed = true` / `profile.terms_agreed_at` がすべて入った状態であり、placeholder 値や空欄は存在しない

### Requirement: `/signup` ページ（1 ページ全項目入力）

`apps/reservation` の `/signup` ページは、未認証ユーザー向けに以下の全項目を 1 ページで受け付ける SHALL:

- メールアドレス（必須・形式チェック）
- 氏名（必須・1〜50 文字）
- 生年月日（必須・過去日付かつ 100 年以内）
- 電話（必須・国内携帯番号フォーマット）
- 経験レベル（必須・`'beginner' | 'intermediate' | 'experienced'`）
- ニックネーム（任意・空欄可・既存 `reservation-member-auth` のニックネーム要件を踏襲）
- 利用規約同意（必須・チェックボックス OFF で CTA 非活性）
- PolicyFooter（プライバシーポリシー / 外部送信ポリシーへのリンク）

CTA 押下で Edge Function `request-signup` を呼び、成功で `/signup/verify?email=<encoded>` に遷移する SHALL。フォームバリデーションのエラーメッセージ・電話番号正規化・ニックネーム文字種制限などは既存 `reservation-member-auth` の要件を踏襲する。

#### Scenario: 全項目入力 + 同意 ON で送信
- **WHEN** 未認証ユーザーが `/signup` で全必須項目 + 同意 ON で CTA を押す
- **THEN** `request-signup` が呼ばれ、成功で `/signup/verify?email=<encoded>` に遷移する

#### Scenario: 同意 OFF で CTA 非活性
- **WHEN** 全項目入力済みだが利用規約同意 OFF
- **THEN** CTA は disabled のまま押下できない

#### Scenario: 必須フィールド未入力
- **WHEN** 氏名 / メール / 生年月日 / 電話 / 経験レベルのいずれかが空のまま CTA を押す
- **THEN** API は呼ばれず、該当フィールドにエラーメッセージが表示される

#### Scenario: 既登録メールでの送信
- **WHEN** 既登録メールアドレスで送信し `request-signup` が「既登録」エラーを返す
- **THEN** メールアドレスフィールド付近に「既に登録済みです。[ログインへ]」のリンク付き案内が表示される

#### Scenario: PolicyFooter 表示
- **WHEN** `/signup` ページを最下部までスクロールする
- **THEN** プライバシーポリシー / 外部送信ポリシーへのリンクが LP オリジン（`<lp-origin>/privacy` / `<lp-origin>/external-transmission`）を指して表示される

### Requirement: `/signup/verify` ページ（6 桁コード入力）

`apps/reservation` は `/signup/verify` ルートを SHALL 提供する。クエリパラメータ `email` を受け取り、6 桁コード入力欄 + 「認証する」CTA + 「コードを再送する」リンク + 「メールアドレスを変更する」（`/signup` に戻る）リンクを表示する MUST。

CTA 押下で Edge Function `verify-signup` を呼び、検証成功で session を確立して `/`（プロフィール完成済み）または `/signup/identity`（書類未提出のとき）へリダイレクトする SHALL。

「コードを再送する」押下で `request-signup` を再呼び出しし、新しいコードを発行する MUST（同 email の `signup_pending` 行を上書き）。

#### Scenario: 正しいコード入力で検証成功
- **WHEN** `/signup/verify?email=member@example.com` で正しい 6 桁コードを入力して「認証する」を押す
- **THEN** `verify-signup` が成功し、session が確立され、本人確認書類提出が必要な状態のため `/signup/identity` に遷移する

#### Scenario: 誤コード入力
- **WHEN** 誤った 6 桁コードを入力して CTA を押す
- **THEN** Error 状態で「コードが正しくありません」が表示され、コード入力欄がクリアされる

#### Scenario: 期限切れコード
- **WHEN** 30 分以上経過した後にコードを入力して CTA を押す
- **THEN** Error 状態で「コードの有効期限が切れました。最初からやり直してください」が表示され、`/signup` への戻り CTA が表示される

#### Scenario: 試行回数上限到達
- **WHEN** 連続誤入力で試行回数上限に達したコードを入力して CTA を押す
- **THEN** Error 状態で「試行回数の上限に達しました。最初からやり直してください」が表示され、`/signup` への戻り CTA が表示される

#### Scenario: コード再送
- **WHEN** ユーザーが「コードを再送する」リンクを押す
- **THEN** `request-signup` が同 email で再実行され、新しいコードがメール送信される。Loading 状態を経て Success 状態に戻る

#### Scenario: メールアドレス変更
- **WHEN** ユーザーが「メールアドレスを変更する」リンクを押す
- **THEN** `/signup` に戻り、フォームの内容は保持された状態で再表示される

#### Scenario: クエリパラメータ email なしでアクセス
- **WHEN** `/signup/verify` を `email` クエリなしで直接アクセス
- **THEN** `/signup` にリダイレクトされる

### Requirement: ログインフローはマジックリンク方式を維持

`apps/reservation` の `/login` ページおよびログイン経路は、Phase 1 で実装された Supabase 標準のマジックリンク方式（`signInWithOtp({ shouldCreateUser: false, emailRedirectTo: <origin>/auth/callback })`）を本 change で変更 SHALL NOT する。`/auth/callback` / `/auth/link-sent` / セッション復元 / ログアウトの動作も Phase 1 の挙動を維持する MUST。

#### Scenario: 既存会員のマジックリンクログイン
- **WHEN** 既存会員が `/login` でメールアドレスを入力して CTA を押す
- **THEN** `signInWithOtp` が `shouldCreateUser: false` で呼ばれ、マジックリンクが送信される

#### Scenario: 未登録メールでのログイン試行
- **WHEN** 未登録メールアドレスで `/login` から送信する
- **THEN** Supabase が「未登録」エラーを返し、Error バナーで「このメールアドレスは登録されていません。[新規会員登録へ]」のリンク付き案内が表示される

### Requirement: 4 状態 UI（`/signup` / `/signup/verify`）

`/signup` および `/signup/verify` の各ページは Empty / Loading / Error / Success の 4 状態を持ち、各状態で表示要素が明確に切り替わる SHALL。

#### Scenario: SignupPage Empty 状態
- **WHEN** `/signup` に初回アクセスする
- **THEN** 全フィールド入力欄 + 同意チェックボックス + 「コードを送信する」CTA + PolicyFooter が表示され、CTA は同意 OFF のため disabled

#### Scenario: SignupPage Loading 状態
- **WHEN** 全フィールド入力 + 同意 ON で CTA を押し、`request-signup` レスポンス到達前
- **THEN** CTA は無効化され、ラベルが「送信中…」に切り替わる

#### Scenario: SignupVerifyPage Empty 状態
- **WHEN** `/signup/verify?email=<encoded>` に到達
- **THEN** 6 桁コード入力欄 + 「認証する」CTA（disabled） + 再送リンク + メール変更リンクが表示される

#### Scenario: SignupVerifyPage Loading 状態
- **WHEN** 6 桁コード入力 + CTA を押し、`verify-signup` レスポンス到達前
- **THEN** CTA は無効化され、ラベルが「認証中…」に切り替わる

#### Scenario: SignupVerifyPage Success 状態
- **WHEN** `verify-signup` 成功
- **THEN** 「会員登録が完了しました」を一瞬表示してから `/signup/identity` または `/` にリダイレクトする

