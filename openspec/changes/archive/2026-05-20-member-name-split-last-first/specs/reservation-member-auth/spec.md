## MODIFIED Requirements

### Requirement: 認証コード発行 Edge Function `request-signup`

`apps/reservation` の `/signup` フォーム送信は、Supabase Edge Function `request-signup` を呼び出す SHALL。Function は以下の責務を持つ:

1. クライアントから受け取った payload（メール / 姓 / 名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意タイムスタンプ）をサーバ側でバリデーションする。姓・名はそれぞれ 1〜32 文字の必須属性として検証する MUST
2. 同 email の既存 `auth.users` 行が**存在しないこと**を確認する（存在する場合はクライアントに「既に登録済みです。ログインへお進みください」を返す）
3. 6 桁の認証コードを生成し、**ハッシュ化**したものを `signup_pending` テーブルに保存する。原文は DB に保存 SHALL NOT
4. 保存される行は payload + コードハッシュ + 試行回数（初期値 0） + 期限（発行時刻 + 30 分）を含む。payload jsonb には `last_name` / `first_name` の 2 キーで姓・名を格納 MUST し、結合済み `display_name` キーを格納 SHALL NOT
5. 同一メールアドレスの既存 `signup_pending` 行が存在する場合は、新しい行で上書きする MUST
6. 認証コード本文を含むメールを送信先メールアドレスへ送る（送信経路は Supabase 組み込み認証メール基盤）
7. クライアントには成功 / 既登録 / 入力エラー / レート制限超過のいずれかのステータスを返す MUST。auth.users / members は本ステップでは作成 SHALL NOT

#### Scenario: 新規メールアドレスでコード発行
- **WHEN** 未登録のメールアドレスで全項目（姓・名を含む）を入力した signup フォームから `request-signup` が呼ばれる
- **THEN** `signup_pending` に該当 email の行が作成され（payload に `last_name` / `first_name` を含む）、認証コードメールが送信され、`auth.users` / `members` には何も書かれない

#### Scenario: 既登録メールアドレスでコード発行を試みる
- **WHEN** 既存 `auth.users` に存在するメールアドレスで `request-signup` が呼ばれる
- **THEN** `signup_pending` に行は作成されず、メール送信もされず、クライアントに「既登録」エラーが返る

#### Scenario: 同 email で再送信
- **WHEN** 同じメールアドレスで `request-signup` が連続して呼ばれる（30 分以内）
- **THEN** 旧 `signup_pending` 行は新しい行で上書きされ、新しいコードのみが有効になる

#### Scenario: payload バリデーションエラー
- **WHEN** 姓空 / 名空 / 生年月日未来日 / 電話番号フォーマット異常などサーバ側バリデーションを満たさない payload が送られる
- **THEN** `signup_pending` に行は作成されず、クライアントにフィールド単位のエラー詳細（姓 / 名のどちらが NG かが分かる粒度）が返る

#### Scenario: 姓・名の片方欠落バリデーション
- **WHEN** `last_name` のみ入力（`first_name` 空）または `first_name` のみ入力（`last_name` 空）の payload が送られる
- **THEN** サーバ側バリデーションで該当フィールドのエラーが返り、`signup_pending` に行は作成されない

#### Scenario: コードはハッシュで保管
- **WHEN** `signup_pending` テーブルを SELECT する
- **THEN** 6 桁コードの**ハッシュ値**のみが保管されており、原文の数字列は DB のどこにも存在しない

### Requirement: 認証コード検証 Edge Function `verify-signup`

`apps/reservation` の `/signup/verify` フォーム送信は、Supabase Edge Function `verify-signup` を呼び出す SHALL。Function は以下の責務を持つ:

1. クライアントから受け取った email + 6 桁コードに対し、`signup_pending` の該当行を SELECT する
2. 行が存在しない / 期限超過の場合は「コードが無効または期限切れ」エラーを返し、行は削除する
3. コードハッシュ照合に失敗した場合は試行回数をインクリメントし、上限到達時は行を削除する
4. 検証成功時のみ Supabase Auth admin API で `auth.users` を作成（`email_confirm: true`）し、続けて同 Function 内で `members` 行を payload の正式値で UPSERT する。`members.last_name` / `members.first_name` は payload から、`members.profile.signup_completed` は `true`、`profile.terms_agreed_at` は payload のタイムスタンプを保存 MUST。`display_name` はトリガ `sync_members_display_name()` により自動同期されるため Function 側で明示的にセットしない MUST
5. 検証成功後、`signup_pending` の該当行を DELETE する MUST
6. クライアントに新規セッション（access_token / refresh_token）を返し、クライアントは Supabase クライアントの `setSession` で保持する SHALL
7. 副作用として、自分以外の期限切れ `signup_pending` 行をベストエフォートで掃除してよい SHALL（pg_cron 依存はサービスIN時点では持ち込まない）
8. payload jsonb に `last_name` / `first_name` キーが揃っていない旧 schema の行が存在した場合は、コード検証可否に関わらず該当行を削除した上で、クライアントに 400 + 「フォームから再度認証コードを発行してください」案内を返す MUST

#### Scenario: 正しいコードでの検証成功
- **WHEN** 期限内・正しい 6 桁コード・期限切れでない `signup_pending` 行が存在する状態で `verify-signup` が呼ばれる
- **THEN** `auth.users` に `email_confirmed_at` セット済みの行が作成され、同 id で `members` 行が `last_name` / `first_name` / `signup_completed: true` を含む完成状態で作成され（`display_name` はトリガで同期）、`signup_pending` の該当行は削除され、クライアントに新規セッションが返る

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
- **THEN** `last_name` / `first_name` / `birthday` / `phone` / `experience_level` / `nickname`（任意）/ `profile.signup_completed = true` / `profile.terms_agreed_at` がすべて入った状態であり、placeholder 値や空欄は存在しない。`display_name` はトリガにより `last_name || ' ' || first_name` の値が入っている

#### Scenario: 旧 schema の signup_pending 行に対する応答
- **WHEN** payload jsonb が `display_name` キーのみで `last_name` / `first_name` を含まない `signup_pending` 行に対し `verify-signup` が呼ばれる
- **THEN** 該当行は削除され、クライアントに 400 と「フォームから再度認証コードを発行してください」案内が返り、`auth.users` / `members` は作成されない

### Requirement: `/signup` ページ（1 ページ全項目入力）

`apps/reservation` の `/signup` ページは、未認証ユーザー向けに以下の全項目を 1 ページで受け付ける SHALL:

- メールアドレス（必須・形式チェック）
- 姓（必須・1〜32 文字、autocomplete `family-name`）
- 名（必須・1〜32 文字、autocomplete `given-name`）
- 生年月日（必須・過去日付かつ 100 年以内）
- 電話（必須・国内携帯番号フォーマット）
- 経験レベル（必須・`'beginner' | 'intermediate' | 'experienced'`）
- ニックネーム（任意・空欄可・既存 `reservation-member-auth` のニックネーム要件を踏襲）
- 利用規約同意（必須・チェックボックス OFF で CTA 非活性）
- PolicyFooter（プライバシーポリシー / 外部送信ポリシーへのリンク）

姓・名は **2 つの独立した入力欄** として描画 MUST し、レイアウトは横並び（モバイル 390px でも 2 入力が同一行に収まる grid 構造）を SHALL とする。各フィールドは独立した `shared/ui/FormField` でラップされ、ラベルは「姓」「名」と表記する MUST。「お名前」単一フィールドは SHALL NOT 残る。

CTA 押下で Edge Function `request-signup` を呼び、成功で `/signup/verify?email=<encoded>` に遷移する SHALL。フォームバリデーションのエラーメッセージ・電話番号正規化・ニックネーム文字種制限などは既存 `reservation-member-auth` の要件を踏襲する。

#### Scenario: 全項目入力 + 同意 ON で送信
- **WHEN** 未認証ユーザーが `/signup` で全必須項目（姓・名を含む）+ 同意 ON で CTA を押す
- **THEN** `request-signup` が呼ばれ、成功で `/signup/verify?email=<encoded>` に遷移する

#### Scenario: 同意 OFF で CTA 非活性
- **WHEN** 全項目入力済みだが利用規約同意 OFF
- **THEN** CTA は disabled のまま押下できない

#### Scenario: 必須フィールド未入力
- **WHEN** 姓 / 名 / メール / 生年月日 / 電話 / 経験レベルのいずれかが空のまま CTA を押す
- **THEN** API は呼ばれず、該当フィールドにエラーメッセージが表示される

#### Scenario: 姓だけ入力して名が空のまま送信を試みる
- **WHEN** 姓に「田中」、名に空欄、その他必須項目を入力した状態で CTA を押す
- **THEN** API は呼ばれず、名のフィールドに「名を入力してください」のエラーが表示される

#### Scenario: 既登録メールでの送信
- **WHEN** 既登録メールアドレスで送信し `request-signup` が「既登録」エラーを返す
- **THEN** メールアドレスフィールド付近に「既に登録済みです。[ログインへ]」のリンク付き案内が表示される

#### Scenario: PolicyFooter 表示
- **WHEN** `/signup` ページを最下部までスクロールする
- **THEN** プライバシーポリシー / 外部送信ポリシーへのリンクが LP オリジン（`<lp-origin>/privacy` / `<lp-origin>/external-transmission`）を指して表示される

#### Scenario: autocomplete 属性の設定
- **WHEN** `/signup` の姓・名フィールドのレンダリング後に DOM を検査する
- **THEN** 姓フィールドに `autocomplete="family-name"`、名フィールドに `autocomplete="given-name"` が付与されている
