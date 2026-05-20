## MODIFIED Requirements

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`last_name` (text NOT NULL CHECK length >= 1)、`first_name` (text NOT NULL CHECK length >= 1)、`display_name` (text NOT NULL — `last_name || ' ' || first_name` をトリガで自動同期)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`admin_note` (text NULL — 運営側メモ、admin のみ閲覧・編集)、`created_at` / `updated_at` (timestamptz default now)。

`last_name` / `first_name` はそれぞれ 1 文字以上の必須属性で、片方欠落での INSERT / UPDATE は SHALL NOT 許容される。`display_name` は派生属性として残り、`last_name || ' ' || first_name`（半角スペース 1 個区切り）を BEFORE INSERT/UPDATE トリガ `sync_members_display_name()` が同期する SHALL。アプリ層から `display_name` を直接 UPDATE する経路は本 change 後に存在 SHALL NOT し、RLS の UPDATE 列ホワイトリストからも除外される（書き込みは `last_name` / `first_name` 経由のみ）。

本 change 適用後、新規会員の作成経路は **Edge Function `verify-signup` 経由のみ** となる SHALL。トリガー `on_auth_user_created` は引き続き存在するが、本フローでは Function 内で同一トランザクションで正式値に UPSERT 上書きされるため、placeholder 行が観測されることは SHALL NOT 起きる。Phase 1 で作成済みの既存会員行は、本 change のデータ移行で `last_name` / `first_name` が分離格納され、`display_name` はトリガ再計算により同一文字列を維持する MUST。

`admin_note` 列は別 change で追加済み。NULL 許容、DB レベルの CHECK 制約は付与 MUST NOT する（長さ制限はアプリ層で 500 文字）。新規会員作成時は NULL のまま作成され、admin が `/members` 画面の詳細 sheet 経由で UPDATE するときのみ値が入る。本人（非 admin）からの UPDATE は RLS WITH CHECK 句で拒否される（`rls-policies` capability に従う）。

#### Scenario: 新規会員行の作成経路
- **WHEN** 本 change 適用後に `auth.users` への INSERT が発生する
- **THEN** その経路は Edge Function `verify-signup` 内の admin API 呼び出しのみであり、`signup_pending` の payload で `members` 行も即座に正式値（`last_name` / `first_name` を含む）で埋まる

#### Scenario: trigger による display_name 同期
- **WHEN** 任意の `members` 行に対し `UPDATE members SET last_name = '田中', first_name = '美咲'` を実行
- **THEN** トリガ `sync_members_display_name()` により同行の `display_name` が `'田中 美咲'` に自動更新される

#### Scenario: 姓欠落の INSERT は拒否される
- **WHEN** `INSERT INTO members (id, email, last_name, first_name, birthday) VALUES (..., '', '美咲', ...)` を実行
- **THEN** CHECK 制約違反でエラーとなり、行は作成されない

#### Scenario: 名欠落の INSERT は拒否される
- **WHEN** `INSERT INTO members (id, email, last_name, first_name, birthday) VALUES (..., '田中', '', ...)` を実行
- **THEN** CHECK 制約違反でエラーとなり、行は作成されない

#### Scenario: 既存会員行の移行後の整合性
- **WHEN** 本 change のデータ移行完了後に Phase 1 から存在する任意の会員行を SELECT
- **THEN** `last_name` / `first_name` がそれぞれ 1 文字以上の値を持ち、`display_name = last_name || ' ' || first_name` の関係が成立する

#### Scenario: 分離不能行のフラグ立て
- **WHEN** 移行時に `display_name` を半角スペースで分割できない既存行（スペース無し / 連続スペースのみ等）が存在する
- **THEN** 当該行は `last_name = display_name` / `first_name = '(未設定)'` / `profile.name_split_needed = true` の状態で残され、運営が SELECT で抽出できる

#### Scenario: トリガ by-product の placeholder 行は観測されない
- **WHEN** 本 change 適用後の任意のタイミングで `members` を SELECT する
- **THEN** `display_name = ''` または `birthday = current_date` の placeholder 状態の行は存在しない

#### Scenario: admin の placeholder 創出（既存運用）
- **WHEN** Supabase Dashboard 経由で admin ユーザーを auth.users に手動追加する（運用作業）
- **THEN** その admin ユーザーは Edge Function を経由しないため `members` 行はトリガーで placeholder として作成され、運用手順に従って `last_name` / `first_name` / `role = 'admin'` / `profile.signup_completed = true` を手動セットする

#### Scenario: admin_note 列のデフォルト
- **WHEN** 任意の経路で新規 members 行が作成される
- **THEN** `admin_note` は NULL で作成される（明示的に値を指定する経路は存在しない）

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `UPDATE members SET admin_note = '左利き / 体験申込' WHERE id = :id` を発行
- **THEN** 1 行更新される（admin の UPDATE 権限は RLS で全件 / 全列許容）

#### Scenario: admin_note の空文字 / NULL 復元
- **WHEN** admin が `UPDATE members SET admin_note = NULL WHERE id = :id` を発行
- **THEN** 1 行更新され、`admin_note IS NULL` 状態に戻る

### Requirement: Branded Types との対応

システムは TypeScript 側で各テーブルの id 列を以下の Branded Types として表現 MUST する: `EventId` / `MemberId` / `ReservationId` / `VenueId` / `IdentityDocumentId`。各テーブルの行型は `Event` / `Member` / `Reservation` / `Venue` / `IdentityDocument` という型エイリアスで提供 SHALL する。`Member` 型は本 change で追加された任意の `nickname` 属性（`string | null`）、および姓・名分離 change で追加された `last_name` / `first_name` 属性（いずれも `string`、NOT NULL）を MUST 含む。`display_name` 属性は DB のトリガで自動同期される派生値だが、`Member` 型では引き続き `string` として読み出し可能な属性として提供される MUST。

#### Scenario: 型エイリアスから列名取得
- **WHEN** `Event['start_at']` を参照
- **THEN** `string` (ISO 8601 文字列) として型付けされる (Date オブジェクトへの変換は呼び出し側責任)

#### Scenario: VenueId と EventId の混入防止
- **WHEN** `EventId` を期待する関数に `VenueId` を渡す
- **THEN** 型エラーとなりコンパイルが通らない

#### Scenario: Member 型に nickname が含まれる
- **WHEN** `Member['nickname']` を参照
- **THEN** `string | null` として型付けされる（任意属性のため null 許容）

#### Scenario: Member 型に last_name / first_name が含まれる
- **WHEN** `Member['last_name']` および `Member['first_name']` を参照
- **THEN** いずれも `string` として型付けされる（必須属性のため null 不可）

### Requirement: signup_pending テーブル

システムは `signup_pending` テーブルを以下の要件で定義 MUST する:

- 主キー / ユニーク制約: メールアドレス（同 email の同時保留行は 1 件のみ。再送時は上書き）
- 列構成（論理）:
  - メールアドレス（必須・形式チェックは Edge Function 側で実施）
  - 入力 payload を保持する jsonb 列 1 つ（姓 / 名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 ISO8601 タイムスタンプ）
  - 認証コードのハッシュ値（原文は格納 SHALL NOT）
  - 試行回数（INTEGER、初期値 0）
  - 期限タイムスタンプ（発行時刻 + 30 分）
  - created_at / updated_at（既存の `set_updated_at()` トリガを適用 MUST）
- 列定義の具体型と CHECK 制約は migration ファイルで確定する SHALL（jsonb / timestamptz / text 等）
- 本テーブルは短期 KV 用途のため、既存の `members` / `reservations` 等のドメインテーブルとは性質が異なり、ドメインモデル（Branded Types / アプリ層型）を別途用意 SHALL NOT する。アプリ層からの直接アクセスは禁止される（RLS は別 capability `rls-policies` で規定）
- payload jsonb は `last_name` / `first_name` の 2 キーで姓・名を保持 MUST し、結合済み `display_name` キーを単独で保持 SHALL NOT する。旧 schema（`display_name` のみ）の行が migration 直後に残っていた場合は、`verify-signup` Function が 400 + 再発行案内で応答する MUST

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

#### Scenario: payload は姓・名 2 キーで保持される
- **WHEN** `request-signup` 成功直後に `signup_pending.payload` を SELECT
- **THEN** payload jsonb に `last_name` および `first_name` キーが含まれ、`display_name` 単独キーは含まれない

### Requirement: members 行は signup フロー完了時に正式値で作成される

本 change 適用後、`members` 行は Edge Function `verify-signup` 内で `auth.users` 作成と同一トランザクションで作成される SHALL。トリガー `on_auth_user_created` で作られる placeholder 行（Phase 1 設計）は、本フローでは即座に正式値で UPSERT 上書きされる MUST。

`members` の必須項目（`last_name` / `first_name` / `birthday` / `phone` / `experience_level` / `profile.signup_completed = true` / `profile.terms_agreed_at`）はすべて `signup_pending` の payload から埋まる SHALL。`display_name` はトリガ `sync_members_display_name()` により `last_name || ' ' || first_name` で同期される SHALL。Phase 1 のように placeholder 値（`display_name = ''` / `birthday = current_date`）が一時的にも残ることは SHALL NOT 許容される。

#### Scenario: 検証成功で members が完成状態で作成される
- **WHEN** `verify-signup` が成功した直後の `members` 行を SELECT する
- **THEN** `last_name` / `first_name` がそれぞれ 1 文字以上の値を持ち、`display_name = last_name || ' ' || first_name` の関係が成立し、`birthday` が payload の値、`phone` が国内携帯番号正規化後の値、`profile.signup_completed = true`、`profile.terms_agreed_at` がセット済みの状態である

#### Scenario: placeholder 行が残らない
- **WHEN** 検証フローのいずれかのステップで失敗（コード誤入力等）
- **THEN** `auth.users` も `members` も作成されないため、placeholder 行は DB のどこにも存在しない
