# reservation-profile-page Specification

## Purpose
TBD - created by archiving change reservation-profile-page. Update Purpose after archive.
## Requirements
### Requirement: `/profile` ルートとアクセス制限

`apps/reservation` は `/profile` ルートを SHALL 提供する。本ルートは **認証済 + プロフィール完成 + 本人確認書類提出済** の会員のみアクセス可能とする MUST。未認証 / プロフィール未完成 / 書類未提出のユーザーがアクセスした場合は、既存の auth guard チェーン（`/login` / `/signup/profile` / `/signup/identity`）に従ってリダイレクトされる SHALL。

ルート定義は `apps/reservation/src/app/router.ts` の `routes` 配列に `path: '/profile'`, `name: 'profile'`, `component: ProfilePage` で追加する MUST。`meta.public` は持たない MUST NOT。

#### Scenario: ルート定義の存在
- **WHEN** `apps/reservation/src/app/router.ts` の routes 配列を確認する
- **THEN** `path: '/profile'` / `name: 'profile'` のルート定義が存在する

#### Scenario: 未認証ユーザーのアクセス
- **WHEN** 未認証ユーザーが `/profile` にアクセスする
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: プロフィール未完成ユーザーのアクセス
- **WHEN** 認証済 + `isProfileComplete === false` のユーザーが `/profile` にアクセスする
- **THEN** auth guard により `/signup/profile` にリダイレクトされる

#### Scenario: 書類未提出ユーザーのアクセス
- **WHEN** 認証済 + プロフィール完成 + `hasIdentityDocument === false` のユーザーが `/profile` にアクセスする
- **THEN** auth guard により `/signup/identity` にリダイレクトされる

#### Scenario: 完成会員の正常アクセス
- **WHEN** 認証済 + プロフィール完成 + 書類提出済のユーザーが `/profile` にアクセスする
- **THEN** ProfilePage が描画される

### Requirement: プロフィール画面ヘッダ

ProfilePage はヘッダ領域に以下を SHALL 表示する:

- 円形アバター（表示名の先頭 1 文字をイニシャルとして描画。HQ accentSoft 背景・accent 文字色）
- 大見出しの表示名（`nickname ?? display_name`、reservation-member-auth の「会員視点表示の名前優先ルール」に従う）
- メールアドレス（`members.email`）
- ID 表示（`members.id` の末尾 4 文字を大文字英数で `ID · XXXX` 形式で表示）

アバターのイニシャルも表示名と同じ優先ルール（`nickname ?? display_name`）の先頭 1 文字とする MUST。

#### Scenario: ニックネーム設定済の表示
- **WHEN** `members.nickname = 'ミサキ'` / `display_name = '田中 美咲'` の会員が `/profile` を開く
- **THEN** 大見出しに「ミサキ」、アバターイニシャルに「ミ」、メールに `members.email` の値、ID に `members.id` の末尾 4 文字が表示される

#### Scenario: ニックネーム未設定の表示
- **WHEN** `members.nickname = null` / `display_name = '田中 美咲'` の会員が `/profile` を開く
- **THEN** 大見出しに「田中 美咲」、アバターイニシャルに「田」が表示される

#### Scenario: ID 末尾 4 文字の表示形式
- **WHEN** `members.id = '0a8f2d3c-1234-5678-90ab-cdef01234567'` の会員が `/profile` を開く
- **THEN** ヘッダに `ID · 4567` (末尾 4 文字を大文字に揃えた表示) が描画される

### Requirement: LEVEL セクション（経験レベル変更）

ProfilePage は LEVEL セクションで `members.experience_level` を変更可能にする SHALL。3 択ラジオ（`'beginner' = 初めて` / `'intermediate' = 中級` / `'experienced' = 経験者`）と各選択肢のサブテキスト（説明文）を表示する MUST。

選択肢の押下で即時保存（`supabase.from('members').update({ experience_level: <value> }).eq('id', auth.uid())`）を行い、成功で `useAuthSession.refresh()` を呼ぶ MUST。「変更ボタン」を別途設けない（即時保存方式）。

説明文「当日のチーム分けと、初心者向けイベントのご案内に使います。いつでも変更できます。」をセクション冒頭に表示する MUST。

#### Scenario: 初期表示
- **WHEN** 会員が `/profile` を開いて LEVEL セクションを確認する
- **THEN** 3 つのラジオが表示され、現在の `members.experience_level` に対応する選択肢が選択状態になる

#### Scenario: 経験レベルの即時変更
- **WHEN** 「中級」ラジオを押下する
- **THEN** `members.experience_level` が `'intermediate'` に UPDATE され、UI も「中級」が選択状態に切り替わる

#### Scenario: 保存失敗時のロールバック
- **WHEN** 経験レベル変更時に UPDATE が失敗（ネットワークエラー / RLS 違反等）
- **THEN** UI 上の選択は元の値に戻り、Error バナーで「変更を保存できませんでした。再試行してください」が表示される

#### Scenario: enum 外の値を弾く
- **WHEN** Smart constructor `createExperienceLevel('unknown')` が経験レベル UPDATE 前に呼ばれる
- **THEN** 例外が投げられ、UPDATE は発行されない

### Requirement: ACCOUNT セクション（アカウント情報の表示と編集）

ProfilePage は ACCOUNT セクションで以下 4 行を SHALL 表示する:

- 「お名前」 = `members.display_name`
- 「ニックネーム」 = `members.nickname ?? '未設定'`
- 「メール」 = `members.email`
- 「電話番号」 = `members.phone`

各行右端に「編集」リンクを配置し、押下でフィールド単独の編集モーダル（shadcn-vue Dialog）を開く MUST。生年月日 (`members.birthday`) は本セクションに表示しない MUST NOT。

各モーダルは以下を含む:

- ラベル + 現在値プリフィル + バリデーションエラー表示
- 「キャンセル」ボタン（モーダルを閉じる）
- 「保存」CTA

#### Scenario: ACCOUNT セクションの 4 行構成
- **WHEN** 会員が `/profile` を開いて ACCOUNT セクションを確認する
- **THEN** お名前 / ニックネーム / メール / 電話番号 の 4 行が表示され、生年月日の行は描画されない

#### Scenario: ニックネーム未設定の表示
- **WHEN** `members.nickname = null` の会員が `/profile` を開く
- **THEN** ACCOUNT セクションのニックネーム行に「未設定」と灰色の小さい文字で表示される

### Requirement: 氏名編集モーダル

「お名前」行の編集モーダルは `members.display_name` を更新する SHALL。空欄送信は不可で、Smart constructor `createDisplayName()` のバリデーションを通る値のみ保存される MUST。

#### Scenario: 氏名変更成功
- **WHEN** モーダルで「田中 美咲」→「田中 美希」に変更し「保存」を押す
- **THEN** `members.display_name` が UPDATE され、モーダルが閉じてヘッダ大見出し（ニックネーム未設定時）と ACCOUNT 行が新しい値に更新される

#### Scenario: 空欄送信
- **WHEN** モーダルで氏名を空欄にして「保存」を押す
- **THEN** API は呼ばれず、フィールドに「お名前を入力してください」のエラーが表示される

### Requirement: ニックネーム編集モーダル

「ニックネーム」行の編集モーダルは `members.nickname` を更新する SHALL。文字種・文字数のバリデーションは reservation-member-auth および data-schema spec の既存ルール（1〜15 文字 / 日本語+ASCII英字のみ / 数字・記号・絵文字禁止）に従う MUST。

モーダルには「ニックネームをクリア」ボタンを併置し、押下で `nickname = NULL` に UPDATE する MUST。空文字で「保存」を押した場合も NULL 化として扱う SHALL。

#### Scenario: ニックネーム新規設定
- **WHEN** ニックネーム未設定の会員が「ミサキ」を入力して「保存」を押す
- **THEN** `members.nickname = 'ミサキ'` に UPDATE され、ヘッダ大見出しが「ミサキ」に切り替わる

#### Scenario: ニックネームクリア（明示ボタン）
- **WHEN** 設定済の会員が「ニックネームをクリア」ボタンを押す
- **THEN** `members.nickname = null` に UPDATE され、ヘッダ大見出しが氏名 fallback に戻る

#### Scenario: ニックネームクリア（空文字保存）
- **WHEN** 設定済の会員が入力欄を空にして「保存」を押す
- **THEN** `members.nickname = null` に UPDATE される

#### Scenario: 文字種違反
- **WHEN** 「たろ123」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「ニックネームは日本語と英字のみで入力してください（数字・記号・絵文字は使えません）」のエラーが表示される

#### Scenario: 文字数違反
- **WHEN** 16 文字以上の値を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「ニックネームは 15 文字以内で入力してください」のエラーが表示される

### Requirement: メール編集モーダル

「メール」行の編集モーダルは Supabase Auth のメール変更フローを SHALL 起動する。新メール入力 → 「保存」押下で `supabase.auth.updateUser({ email: <newEmail> })` を呼ぶ MUST。成功時はモーダル内で「<newEmail> 宛に確認メールを送信しました。新しいアドレスのリンクから確認してください」を表示し、モーダルは閉じない MUST（ユーザーが「閉じる」ボタンで明示的に閉じる）。

`members.email` は Supabase 側の確認完了後、既存の `auth.users -> members` 同期トリガーで自動更新される。本モーダル送信時点では `members.email` は更新しない MUST NOT。

形式不正なメール / 現在のメールと同一 / Supabase rate-limit エラー はモーダル内で inline error として表示する SHALL。

#### Scenario: メール変更リクエスト送信成功
- **WHEN** 新メール `new@example.com` を入力して「保存」を押す
- **THEN** `supabase.auth.updateUser({ email: 'new@example.com' })` が呼ばれ、モーダルが Success 状態に遷移して「<newEmail> 宛に確認メールを送信しました」が表示される（モーダルは開いたまま）

#### Scenario: 形式不正のメール
- **WHEN** `not-an-email` を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「メールアドレスの形式が正しくありません」のエラーが表示される

#### Scenario: 現在のメールと同一
- **WHEN** 現在の `members.email` と完全一致するメールを入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「現在のメールアドレスと同じです」のエラーが表示される

#### Scenario: Supabase rate-limit エラー
- **WHEN** updateUser 呼び出しが `over_email_send_rate_limit` を返す
- **THEN** モーダル内に「送信回数の上限に達しました。約 60 秒お待ちいただいてから再試行してください」のエラーが表示される

#### Scenario: members.email は即時更新されない
- **WHEN** メール変更リクエスト送信成功直後の DB を確認
- **THEN** `members.email` は変更前の値のまま保持される（Supabase 確認完了後にトリガー経由で同期される）

### Requirement: 電話番号編集モーダル

「電話番号」行の編集モーダルは `members.phone` を更新する SHALL。Smart constructor `createPhone()` のバリデーション（070/080/090 から始まる携帯番号 / 桁数チェック / ハイフン正規化）を通る値のみ保存される MUST。

#### Scenario: 電話番号変更成功（区切りなし入力）
- **WHEN** 「09098765432」を入力して「保存」を押す
- **THEN** `createPhone()` で正規化された `'090-9876-5432'` が `members.phone` に UPDATE される

#### Scenario: 固定電話を弾く
- **WHEN** 「03-1234-5678」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください」のエラーが表示される

#### Scenario: 桁数不足
- **WHEN** 「090-1234」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「電話番号の桁数が正しくありません」のエラーが表示される

### Requirement: STATS セクション（参加統計）

ProfilePage は STATS セクションで以下 3 行のみを SHALL 表示する:

- 累計参加回数（`status = 'attended'` の予約数）
- 最終参加日（`status = 'attended'` の中で `events.start_at` が最大の日付。0 件のとき「—」）
- 次回予定（`status = 'reserved'` AND `events.start_at > now()` の中で最早の `events.start_at` + イベント名。0 件のとき「—」）

集計はクライアント側で予約配列から JS で算出する MUST。`event_participants_view` には依存しない MUST NOT。

予約履歴一覧（個別行）と個別行のキャンセルボタンは本セクションに表示しない MUST NOT。これらは別画面 `/history` (reservation-history-page spec) に移管されている。

#### Scenario: 統計値の表示
- **WHEN** 会員が `attended` 3 件 / `reserved`（未来）2 件 / `cancelled` 1 件 を持つ状態で `/profile` を開く
- **THEN** 累計参加「3 回」/ 最終参加（attended の最新の events.start_at）/ 次回予定（reserved の最早 events.start_at + イベント名） の 3 行が表示される

#### Scenario: 参加履歴 0 件の表示
- **WHEN** 予約を 1 件も持たない会員が `/profile` を開く
- **THEN** STATS の数値部分は「— / — / —」が表示される

#### Scenario: 履歴一覧が描画されない
- **WHEN** プロフィール画面で STATS セクションを確認する
- **THEN** 個別予約行のリスト（開催日 / イベント名 / 状態バッジを含む各行）は描画されない

#### Scenario: 個別キャンセルボタンが描画されない
- **WHEN** プロフィール画面の STATS セクションを確認する
- **THEN** 「予約をキャンセル」ボタン（行ごとの個別キャンセル UI）は描画されない（DOM に存在しない）

#### Scenario: 他人の予約は表示されない（RLS）
- **WHEN** 会員 A が `/profile` を開いて取得した予約配列を確認する
- **THEN** すべての予約の `member_id` が `auth.uid()` に一致する（RLS により他会員の行は返らない）

### Requirement: ログアウト動線

ProfilePage は画面下部に「ログアウト」ボタンを SHALL 配置する。押下で ConfirmDialog（「ログアウトしますか？」）を経由し、確定で `useAuthSession.signOut()` を呼ぶ MUST。サインアウト後は `/login` に `router.push` で遷移する MUST。

`signOut()` 呼び出し後、ローカル state（session / member / hasIdentityDocument）はクリアされる（既存 reservation-member-auth spec の挙動に準拠）。

#### Scenario: ログアウト動線
- **WHEN** 「ログアウト」ボタンを押し、ConfirmDialog で確定する
- **THEN** `signOut()` が呼ばれ、`/login` にリダイレクトされる

#### Scenario: ログアウトキャンセル
- **WHEN** 「ログアウト」ボタンを押し、ConfirmDialog で「キャンセル」を選択する
- **THEN** ダイアログが閉じ、ProfilePage に留まる

### Requirement: 4 状態 UI

ProfilePage は Loading / Empty / Error / Success の 4 状態を SHALL 持つ:

- **Loading**: 初回ロード時はヘッダと各セクションをスケルトン表示
- **Empty**: 予約履歴 0 件のとき STATS の数値部分を「—」表示し、履歴一覧領域は「まだ参加履歴がありません」を表示
- **Error**: 取得失敗時は画面上部に Error バナー + 再取得 CTA を表示
- **Success**: 取得成功時は通常表示（ヘッダ + 3 セクション + ログアウト）

#### Scenario: Loading 状態
- **WHEN** `/profile` に初回アクセスしてデータ取得中
- **THEN** ヘッダ・LEVEL・ACCOUNT・STATS の各領域がスケルトン表示される

#### Scenario: Error 状態（取得失敗）
- **WHEN** 予約一覧の取得が失敗（ネットワークエラー）
- **THEN** 画面上部に Error バナー「データの取得に失敗しました」+ 「再試行」CTA が表示される

#### Scenario: Empty 状態（予約 0 件）
- **WHEN** 予約を 1 件も持たない会員が `/profile` を開く
- **THEN** STATS の数値が「—」、履歴領域に「まだ参加履歴がありません」が表示される（ただし LEVEL / ACCOUNT セクションは通常表示される）

### Requirement: モバイルファースト + アクセシビリティ AA

ProfilePage は **390px 幅の iPhone 表示を基準**として設計される MUST。Section コンポーネント（kicker + 子要素のグループ化）はデザインサンプル `ScreenRProfile` の構造を踏襲する SHALL。すべてのインタラクティブ要素はキーボード操作可能で、ラベル / aria 属性が適切に付与される MUST。色のコントラスト比は WCAG AA を満たす MUST。

デザイントークンは `@high-q/design-tokens` の CSS 変数 (`var(--hq-*)`) のみを使用する MUST。マジックナンバーの色 / spacing / radius を直接書く MUST NOT。

#### Scenario: 390px 表示
- **WHEN** Playwright の viewport 390x844 で `/profile` を開く
- **THEN** ヘッダ・各セクション・履歴一覧・ログアウトボタンが横スクロールなしで描画される

#### Scenario: パンくず
- **WHEN** ProfilePage の DOM を確認する
- **THEN** Page header に `widgets/page-breadcrumb/PageBreadcrumb` が 1 箇所のみ配置されている（独自 `<nav aria-label="パンくず">` の実装は存在しない）

### Requirement: E2E (auth guard 統合)

`apps/reservation` の E2E テスト（Playwright）は `/profile` への auth guard 統合を SHALL 1 件カバーする:

> 未認証ユーザーが `/profile` に直接アクセスすると `/login` にリダイレクトされ、ログインフォームが描画される

詳細バリデーション（経験レベル変更 / アカウント編集 4 種 / 履歴キャンセル / ログアウト / モーダル UX / バリデーションメッセージ等）は component test / unit test に押し下げ、E2E は本 1 件のみとする MUST（既存 reservation-identity-document-upload と同じスケーラビリティ運用パターン）。

#### Scenario: E2E auth guard 統合テストの存在
- **WHEN** `e2e/reservation/` 配下で Profile 関連 spec を確認する
- **THEN** 「未認証 → /profile アクセス → /login リダイレクト」を確認する spec が 1 件定義されており、CI で実行される

#### Scenario: E2E スコープの上限
- **WHEN** `e2e/reservation/` 配下の Profile 関連 spec を確認する
- **THEN** Profile 関連 E2E ファイルは 1 件、または 2 件以内に収まる

