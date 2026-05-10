## ADDED Requirements

### Requirement: signup_pending テーブル

システムは `signup_pending` テーブルを以下の要件で定義 MUST する:

- 主キー / ユニーク制約: メールアドレス（同 email の同時保留行は 1 件のみ。再送時は上書き）
- 列構成（論理）:
  - メールアドレス（必須・形式チェックは Edge Function 側で実施）
  - 入力 payload を保持する jsonb 列 1 つ（氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 ISO8601 タイムスタンプ）
  - 認証コードのハッシュ値（原文は格納 SHALL NOT）
  - 試行回数（INTEGER、初期値 0）
  - 期限タイムスタンプ（発行時刻 + 30 分）
  - created_at / updated_at（既存の `set_updated_at()` トリガを適用 MUST）
- 列定義の具体型と CHECK 制約は migration ファイルで確定する SHALL（jsonb / timestamptz / text 等）
- 本テーブルは短期 KV 用途のため、既存の `members` / `reservations` 等のドメインテーブルとは性質が異なり、ドメインモデル（Branded Types / アプリ層型）を別途用意 SHALL NOT する。アプリ層からの直接アクセスは禁止される（RLS は別 capability `rls-policies` で規定）

#### Scenario: テーブル定義の存在
- **WHEN** `SELECT to_regclass('public.signup_pending')` を実行
- **THEN** NULL 以外（テーブルが存在する）が返る

#### Scenario: email がユニーク
- **WHEN** 同 email で 2 行 INSERT を試みる（service_role 経由）
- **THEN** 2 行目はユニーク制約違反でエラー、または UPSERT で 1 行目を上書きする

#### Scenario: 認証コード原文は保管されない
- **WHEN** `signup_pending` の全列をダンプして 6 桁数字の連続パターンを grep する
- **THEN** マッチしない（コードはハッシュ化されているため）

#### Scenario: 期限超過行は検証 Function で除去
- **WHEN** 期限を過ぎた `signup_pending` 行が存在する状態で `verify-signup` Edge Function が呼ばれる
- **THEN** Function 内で当該行が削除される（pg_cron に依存しない）

### Requirement: members 行は signup フロー完了時に正式値で作成される

本 change 適用後、`members` 行は Edge Function `verify-signup` 内で `auth.users` 作成と同一トランザクションで作成される SHALL。トリガー `on_auth_user_created` で作られる placeholder 行（Phase 1 設計）は、本フローでは即座に正式値で UPSERT 上書きされる MUST。

`members` の必須項目（`display_name` / `birthday` / `phone` / `experience_level` / `profile.signup_completed = true` / `profile.terms_agreed_at`）はすべて `signup_pending` の payload から埋まる SHALL。Phase 1 のように placeholder 値（`display_name = ''` / `birthday = current_date`）が一時的にも残ることは SHALL NOT 許容される。

#### Scenario: 検証成功で members が完成状態で作成される
- **WHEN** `verify-signup` が成功した直後の `members` 行を SELECT する
- **THEN** `display_name` が空文字でない、`birthday` が payload の値、`phone` が国内携帯番号正規化後の値、`profile.signup_completed = true`、`profile.terms_agreed_at` がセット済みの状態である

#### Scenario: placeholder 行が残らない
- **WHEN** 検証フローのいずれかのステップで失敗（コード誤入力等）
- **THEN** `auth.users` も `members` も作成されないため、placeholder 行は DB のどこにも存在しない

## MODIFIED Requirements

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`created_at` / `updated_at` (timestamptz default now)。

本 change 適用後、新規会員の作成経路は **Edge Function `verify-signup` 経由のみ** となる SHALL。トリガー `on_auth_user_created` は引き続き存在するが、本フローでは Function 内で同一トランザクションで正式値に UPSERT 上書きされるため、placeholder 行が観測されることは SHALL NOT 起きる。Phase 1 で作成済みの既存会員行は変更されず互換性を保つ MUST。

#### Scenario: 新規会員行の作成経路
- **WHEN** 本 change 適用後に `auth.users` への INSERT が発生する
- **THEN** その経路は Edge Function `verify-signup` 内の admin API 呼び出しのみであり、`signup_pending` の payload で `members` 行も即座に正式値で埋まる

#### Scenario: トリガー by-product の placeholder 行は観測されない
- **WHEN** 本 change 適用後の任意のタイミングで `members` を SELECT する
- **THEN** `display_name = ''` または `birthday = current_date` の placeholder 状態の行は存在しない

#### Scenario: admin の placeholder 創出（既存運用）
- **WHEN** Supabase Dashboard 経由で admin ユーザーを auth.users に手動追加する（運用作業）
- **THEN** その admin ユーザーは Edge Function を経由しないため `members` 行はトリガーで placeholder として作成され、運用手順に従って `role = 'admin'` + `profile.signup_completed = true` を手動セットする（既存運用と同等）
