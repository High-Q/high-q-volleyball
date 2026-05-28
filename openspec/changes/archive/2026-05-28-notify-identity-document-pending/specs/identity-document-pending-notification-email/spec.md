## ADDED Requirements

### Requirement: オーナー宛 pending 通知メールの送信

会員サイト (`apps/reservation`) は `identity_documents` 行が `status='pending'` で新規 INSERT されアップロードが成功した直後に、オーナー宛メールを SHALL 送信する。送信対象イベントは以下の **両方** を MUST 含む:

- 会員が `/signup/identity` で初回提出した書類が成立した時
- 過去に差し戻された (`status='rejected'`) 会員が再撮影し再アップロードして新規 `pending` 行が成立した時

送信先は **`OWNER_NOTIFICATION_EMAIL` secret に登録された 1 アドレス** とする MUST。当該 secret が未設定の場合、Edge Function は送信処理を実行せず構造化ログに「未設定のためスキップ」を残す MUST。

メール件名は **固定文言** とする MUST。document_type / 会員名 / 提出日時等を件名に埋め込まない MUST NOT (件名スキャナビリティと予測可能性を優先)。

メール本文に **MUST 含める** 要素:

- 会員の `display_name` (members から join 取得)
- 提出日時 (`identity_documents.uploaded_at` を JST フォーマット)
- admin 詳細画面への直リンク (`{ADMIN_BASE_URL}/identity-documents/{identityDocumentId}` 形式、`ADMIN_BASE_URL` secret 経由)

メール本文に **MUST NOT 含める** 要素:

- 会員のメールアドレス / 電話 / birthday / 住所等の追加個人情報
- `document_type` の生 enum 値または日本語ラベル (本文・件名いずれも禁止)
- 書類画像本体 / 画像の signed URL
- 生 UUID (`identityDocumentId` を URL 構成要素として含む直リンクは許可、UUID 単独表示は禁止)
- 運営の他連絡先 / 他会員情報 / Service Role キー等のシークレット

送信は Supabase Edge Function を経由し、`supabase/functions/_shared/mailer.ts` の `sendMail` を利用する MUST。直接 SMTP 接続を会員サイト側で開いてはならない MUST NOT。

#### Scenario: 初回提出時の送信
- **WHEN** 会員が `/signup/identity` で書類アップロードに成功し、identity_documents に新規 `status='pending'` 行が成立
- **THEN** `OWNER_NOTIFICATION_EMAIL` 宛にオーナー通知メールが送信され、本文には会員 display_name / 提出日時 (JST) / admin 詳細画面 URL が含まれる

#### Scenario: 再提出時の送信
- **WHEN** 差し戻し後の会員が再アップロードに成功し、新たな `status='pending'` 行が成立
- **THEN** 初回提出時と同様にオーナー通知メールが送信される (再提出と初回提出を区別する文言は本文に含まれない)

#### Scenario: 件名の固定化
- **WHEN** 任意の書類 (運転免許証 / マイナンバーカード等) の pending 通知が送信される
- **THEN** 件名は document_type / 会員名 / 提出日時を含まない固定文言である

#### Scenario: 個人情報の非露出
- **WHEN** 送信されたメール本文を確認
- **THEN** 会員メールアドレス / 電話 / birthday / document_type の値 / 書類画像 URL は本文・件名のどこにも存在しない

#### Scenario: OWNER_NOTIFICATION_EMAIL 未設定時のスキップ
- **WHEN** `OWNER_NOTIFICATION_EMAIL` secret が未設定の状態で Edge Function が呼ばれる
- **THEN** sendMail は呼ばれず、構造化ログに「OWNER_NOTIFICATION_EMAIL 未設定のためスキップ」が出力され、HTTP 200 + `{ ok: false, error: 'no-owner-email' }` が返る

### Requirement: 呼び出し元の認証と本人検証

本 Edge Function は MUST Authorization ヘッダー (Bearer JWT) を要求 SHALL する。Edge Function 内で以下を順に検証する:

1. JWT が有効かつ `auth.uid()` が取得できること (失敗時 HTTP 401)
2. payload `identityDocumentId` で指定された行が存在し、`member_id === auth.uid()` であること (不一致時 HTTP 403)

第三者の `identityDocumentId` を投げてオーナー宛 spam を発生させる経路を持たせない MUST NOT。

#### Scenario: 認証なし
- **WHEN** Authorization ヘッダーなしで Edge Function を呼ぶ
- **THEN** HTTP 401 + `{ error: 'unauthorized' }` が返る

#### Scenario: 他会員の id を指定
- **WHEN** 自分以外の会員の `identityDocumentId` を指定して Edge Function を直接呼ぶ
- **THEN** HTTP 403 + `{ error: 'forbidden' }` が返り、メールは送信されない

#### Scenario: 自分の id を指定
- **WHEN** 自分の `identityDocumentId` を指定して呼ぶ
- **THEN** Edge Function は送信処理に進む

### Requirement: 送信失敗が呼び出し元に伝播しない

本 Edge Function は MUST 内部の SMTP 失敗 / レンダラ失敗 / DB SELECT 失敗を HTTP 5xx ではなく HTTP 200 + `{ ok: false, error: <code> }` の構造化 body で表現する SHALL。`member_id` 改ざんガード違反のみ HTTP 403 を返す SHALL。

呼び出し元 (会員サイト) は本 Edge Function を fire-and-forget で呼び、`await` せず upload 成功画面に遷移する MUST。通知失敗が upload 成功判定 / 画面遷移を覆してはならない MUST NOT。

#### Scenario: SMTP 失敗時の HTTP 200
- **WHEN** Gmail SMTP がエラーを返す
- **THEN** HTTP 200 + `{ ok: false, error: 'mail-failed' }` が返り、Edge Function ログにエラー詳細が出力される

#### Scenario: 呼び出し元の upload 成功表示
- **WHEN** Edge Function が `{ ok: false, error: 'mail-failed' }` を返す
- **THEN** 会員サイトの upload 成功画面が通常通り表示され、UI にエラーは描画されない

### Requirement: 送信成功 / 失敗のログ記録と Sentry 連携

本 Edge Function は MUST 送信成功 / 失敗を Edge Function ログに SHALL 記録する。記録する相関キーは `identityDocumentId` / `memberId` / 送信種別識別子 (`identity-document-pending`)。

例外的失敗 (レンダラ throw / SMTP throw 等) は MUST `_shared/sentry.ts` の `captureException` で Sentry に記録 SHALL する。会員のメールアドレスを Sentry / ログに残してはならない MUST NOT (オーナーアドレスはログに残してよい)。

#### Scenario: 成功時のログ
- **WHEN** 送信成功
- **THEN** ログに「成功」「memberId」「identityDocumentId」「種別 (identity-document-pending と判別可能な値)」が出力される

#### Scenario: 失敗時の Sentry 記録
- **WHEN** SMTP 例外が throw される
- **THEN** Sentry に例外がスタックトレース付きで記録され、ログにもエラーコードと相関キーが出力される

### Requirement: 環境別の送信抑制 (既存 mailer-policy 流用)

本 Edge Function は MUST 既存 `_shared/mailer-policy.ts` の `loadMailPolicy` / `shouldSuppressSend` を流用 SHALL し、`MAIL_SUPPRESS_SEND` / `MAIL_ALLOWED_RECIPIENTS` 環境変数に従う。

dev / preview 環境では既定で `MAIL_SUPPRESS_SEND=true` を設定し、実送信されない SHALL。本番では当該設定 OFF で通常送信される MUST。

#### Scenario: 抑制モードでの skip
- **WHEN** `MAIL_SUPPRESS_SEND=true` の環境で Edge Function が呼ばれる
- **THEN** sendMail は呼ばれず、ログに「抑制モードのためスキップ」が残る

#### Scenario: allowList でオーナーのみ送信
- **WHEN** preview で `MAIL_ALLOWED_RECIPIENTS` にオーナーアドレスのみ設定
- **THEN** オーナー宛は実送信される (preview 動作確認用)

### Requirement: 文面レンダラの純粋関数化

オーナー宛 pending 通知メールの文面生成は副作用を持たない純粋関数として `supabase/functions/_shared/mailer-templates.ts` に SHALL 配置する。入力は構造化データ (`{ memberDisplayName, uploadedAtIso, detailUrl }`) のみ、出力は `{ subject, body }` 形式の文字列ペアとする MUST。

レンダラは送信本体 (SMTP / Edge Function ハンドラ) から独立してテスト可能でなければならない MUST。

#### Scenario: 同一入力で同一出力
- **WHEN** 同一の会員 / 提出日時 / URL でレンダラを 2 回呼ぶ
- **THEN** subject / body が完全一致する

#### Scenario: レンダラのユニットテスト
- **WHEN** vitest でレンダラを直接呼ぶ
- **THEN** SMTP / DB / Supabase client モックなしで文面が検証できる

### Requirement: 提出日時の JST 表記

本文中の提出日時は MUST JST (Asia/Tokyo) でフォーマット SHALL する。フォーマットは「YYYY/MM/DD HH:mm」相当の人間可読形とし、ISO 文字列の生表示は MUST NOT。

#### Scenario: JST フォーマット
- **WHEN** `uploaded_at='2026-05-29T10:30:00Z'` の書類で本文を生成
- **THEN** 本文中の提出日時は JST に換算された「2026/05/29 19:30」相当が描画される
