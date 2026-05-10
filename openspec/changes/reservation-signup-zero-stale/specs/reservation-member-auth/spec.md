## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: 会員登録フロー = `/signup` 段階 1 + `/signup/verify` 段階 2 + `/signup/identity` 段階 3

会員登録フローは **3 段階** で構成する SHALL:
- 段階 1（`/signup`）: 全項目入力 + 利用規約同意 → 認証コード送信
- 段階 2（`/signup/verify`）: メールで届いた 6 桁コードを入力 → `auth.users` + `members` の一括作成
- 段階 3（`/signup/identity`）: 本人確認書類 1 点をアップロード（詳細は `reservation-identity-document-upload` capability を参照）

`/signup/profile` ルートは **撤廃** する SHALL（本 change で削除）。`/login` は既存会員ログイン専用となり、新規会員登録の入口は HomePlaceholder 等の「会員登録」CTA から `/signup` を指す MUST。

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

### Requirement: プロフィール未完成会員の auth guard 分岐は撤廃

本 change 適用後、`auth.users` に存在する会員は `verify-signup` 完了時点でプロフィール完成済み（`signup_completed = true`）となるため、Phase 1 の「認証済み + プロフィール未完成 → `/signup/profile` 強制誘導」分岐は **到達不能** となり、auth guard から削除する SHALL。

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

## REMOVED Requirements

### Requirement: マジックリンク送信フロー（Login = Signup 段階1 兼用）

**Reason**: 本 change で signup フローを Edge Function + 6 桁コード方式に置き換えたため、`/login` は既存会員ログイン専用となり、新規 signup と兼用しない。`/login` でのマジックリンク送信は `shouldCreateUser: false` のままだが、新規ユーザー判定の責務は `/signup` 側に移管された。

**Migration**: 新規会員は `/signup` で全項目入力 → `/signup/verify` で 6 桁コード検証のフローを使う。`/login` は既存会員のマジックリンクログインのみを提供する。HomePlaceholder の「会員登録」CTA は `/signup` を指すよう更新される。

### Requirement: 会員登録フロー段階 2（プロフィール入力）

**Reason**: 本 change で全項目入力を `/signup` 1 ページに集約したため、Phase 1 の `/signup/profile` 段階（マジックリンク認証完了後にプロフィール入力する 2 段階目）は不要となった。

**Migration**: プロフィール入力は `/signup` 段階 1 で完了する。`SignupProfilePage.vue` および `/signup/profile` ルートは削除される。フォームバリデーション（電話番号正規化・ニックネーム文字種制限・生年月日範囲チェック等）は `/signup` 側に移植する。

### Requirement: マジックリンク戻り先 `/auth/callback`

**Reason**: 本 change の signup フローではマジックリンクを使用しないため、`/auth/callback` は signup の戻り先としては不要になる。ただし**ログインフロー**ではマジックリンクを継続利用するため、`/auth/callback` ルート自体は維持され、Phase 1 の挙動を保つ。

**Migration**: `AuthCallbackPage.vue` の責務は「ログイン用マジックリンクの session 確立 + リダイレクト」に限定される。`isProfileComplete === false` 分岐は到達不能となるため削除し、session 確立失敗時は `/login?reason=link-invalid` に、成功時は `/`（または `/signup/identity`）にリダイレクトする。

### Requirement: マジックリンク送信完了画面（LinkSent）

**Reason**: 本 change の signup フローではマジックリンクを使用しないため、signup での LinkSent 画面利用はなくなる。ただし**ログインフロー**では引き続きマジックリンクを使うため、`/auth/link-sent` ルートと `LinkSentPage.vue` は維持され、ログイン用途で機能する。

**Migration**: `LinkSentPage.vue` のテキストは「ログインリンクを送信しました」に統一する（Phase 1 では「ログイン or サインアップ」両方を兼ねていたが、本 change 以降はログイン用途のみ）。「別アドレスを使う」リンクの戻り先は `/login` のままとする。

### Requirement: マジックリンク有効期限 15 分

**Reason**: signup フローはマジックリンクを使わなくなったため、本要件は signup には適用されない。

**Migration**: ログイン用マジックリンクは引き続き 15 分有効。signup の認証コードは TTL 30 分（`signup_pending` テーブルの期限列で管理）。両者は別系統のタイムアウトを持つ。
