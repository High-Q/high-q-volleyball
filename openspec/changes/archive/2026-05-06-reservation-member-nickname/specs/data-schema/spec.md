## MODIFIED Requirements

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`created_at` / `updated_at` (timestamptz default now)。

`nickname` 列は本 change で追加 MUST する。文字数 1〜15 文字、文字種は日本語（ひらがな・カタカナ・CJK 統合漢字基本ブロックの漢字）+ 半角英字 ASCII のみを許容し、絵文字・数字・記号は禁止 MUST する。NULL は許容 SHALL（任意項目）。一意性制約は付与 MUST NOT する（同名 OK の運用）。

#### Scenario: auth.users との 1:1 紐付け
- **WHEN** Supabase Auth で新規ユーザーがサインアップする
- **THEN** トリガー `on_auth_user_created` により `members` に同じ id で行が自動作成される。ただし `display_name` / `birthday` は会員登録フォームで明示入力が必要なため、トリガーは `display_name = ''` / `birthday = current_date` の placeholder で作成し、登録フォーム送信時に UPDATE で正式値を入れる。`nickname` は NULL のまま作成され、登録フォームで任意入力された場合のみ UPDATE で値が入る

#### Scenario: 生年月日の必須化
- **WHEN** 会員登録フォームから display_name / birthday 未入力で UPDATE
- **THEN** アプリ側バリデーションで拒否される (DB 側は NOT NULL のため、placeholder からの UPDATE は許容するが空文字 / 不正値はアプリ層で防ぐ)

#### Scenario: 経験レベルの選択
- **WHEN** member が experience_level を 'beginner' / 'intermediate' / 'experienced' のいずれかに UPDATE
- **THEN** 行は更新される。それ以外の値は CHECK 制約違反でエラーとなる

#### Scenario: role の管理
- **WHEN** 管理者ユーザーが `role = 'admin'` の行を直接更新で作成
- **THEN** その members は admin として扱われる (自己昇格は RLS で禁止)

#### Scenario: ニックネーム未入力での登録完了
- **WHEN** 会員登録フォームから nickname を空欄のまま登録 UPDATE を実行
- **THEN** 行は更新され、nickname は NULL のまま保持される（任意項目のため）

#### Scenario: ニックネームの正常入力
- **WHEN** nickname に「たろ」「ミサキ」「Taro」「タロウ太郎」のような日本語 + 英字のみ・1〜15 文字の値を UPDATE
- **THEN** 行は正常に更新される

#### Scenario: ニックネームの文字数下限違反
- **WHEN** nickname を空文字（0 文字）ではなく半角空白のみで UPDATE しようとする
- **THEN** CHECK 制約違反でエラーとなる（空白のみの値は不可）

#### Scenario: ニックネームの文字数上限違反
- **WHEN** nickname に 16 文字以上の値を UPDATE しようとする
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: ニックネームの文字種違反（数字）
- **WHEN** nickname に「たろ123」「Taro2026」のような数字を含む値を UPDATE しようとする
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: ニックネームの文字種違反（記号）
- **WHEN** nickname に「たろ★」「Taro_san」「たろ・ちゃん」のような記号を含む値を UPDATE しようとする
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: ニックネームの文字種違反（絵文字）
- **WHEN** nickname に「たろ🏐」「⭐ミサキ」のような絵文字を含む値を UPDATE しようとする
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: ニックネームの一意性は強制されない（同名許容）
- **WHEN** 既に同じ nickname を持つ別の member が存在する状態で、別の member の nickname を同値で UPDATE
- **THEN** 行は正常に更新される（UNIQUE 制約は付与しない MVP1 運用）

### Requirement: Branded Types との対応

システムは TypeScript 側で各テーブルの id 列を以下の Branded Types として表現 MUST する: `EventId` / `MemberId` / `ReservationId` / `VenueId` / `IdentityDocumentId`。各テーブルの行型は `Event` / `Member` / `Reservation` / `Venue` / `IdentityDocument` という型エイリアスで提供 SHALL する。`Member` 型は本 change で追加された任意の `nickname` 属性（`string | null`）を MUST 含む。

#### Scenario: 型エイリアスから列名取得
- **WHEN** `Event['start_at']` を参照
- **THEN** `string` (ISO 8601 文字列) として型付けされる (Date オブジェクトへの変換は呼び出し側責任)

#### Scenario: VenueId と EventId の混入防止
- **WHEN** `EventId` を期待する関数に `VenueId` を渡す
- **THEN** 型エラーとなりコンパイルが通らない

#### Scenario: Member 型に nickname が含まれる
- **WHEN** `Member['nickname']` を参照
- **THEN** `string | null` として型付けされる（任意属性のため null 許容）
