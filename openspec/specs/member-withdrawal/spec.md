# member-withdrawal Specification

## Purpose
TBD - created by archiving change member-withdrawal-flow. Update Purpose after archive.
## Requirements
### Requirement: 退会の意味論

システムは「退会」を次の意味で MUST 定義する: 対象会員の `members` 行 / `auth.users` 行 / `identity_documents` 行 / Supabase Storage 上の本人確認書類オブジェクトを物理削除し、当該会員の `reservations` 行は **個人情報をすべて NULL 化した匿名状態**（`member_id = NULL` / `phone_at_booking = NULL` / `note = NULL`）で残す。未来日時の予約は退会実行直前に `status = 'cancelled'` に状態遷移させる。

「論理削除」「アカウント休止」「一時停止」等の中間状態は MUST NOT 提供する。退会は完全削除のみであり、復元手段は提供 MUST NOT する。

退会後に `reservations` テーブルに残る情報は、「いつ / どのイベントに / 何人で参加したか」という個人を特定できない集計用データのみであることを MUST 保証する。

#### Scenario: 退会で削除されるリソース
- **WHEN** ある会員の退会が完了する
- **THEN** 当該会員の `members` 行 / `auth.users` 行 / `identity_documents` 行 / Storage 上の本人確認書類オブジェクトがすべて存在しなくなる

#### Scenario: 退会で残るリソースは匿名化されている
- **WHEN** ある会員の退会が完了する
- **THEN** 当該会員の過去予約は `reservations` テーブルに `member_id = NULL` / `phone_at_booking = NULL` / `note = NULL` の状態で残り続け、events 側の参加者数集計には引き続き 1 件として計上される

#### Scenario: 個人情報列がすべて NULL
- **WHEN** 退会完了後の `reservations` テーブルに対して `SELECT phone_at_booking, note FROM reservations WHERE event_id IN (...退会者が予約していた event...) AND member_id IS NULL` を実行
- **THEN** すべての行で `phone_at_booking` と `note` が NULL である

#### Scenario: 復元できない
- **WHEN** 退会済み会員と同じメールアドレスで再度会員登録される
- **THEN** Auth / members は新規に作成され、退会前の予約履歴とは紐付かない（過去予約は匿名化されたまま）

### Requirement: 退会の実行経路は Edge Function `withdraw-member` に集約

システムは退会の実行を Supabase Edge Function `withdraw-member` に集約 MUST する。reservation アプリ / admin アプリ / 運営手作業のいずれも、退会は同 Function を呼び出すことで実施される。Function 外（クライアントから DB 直接 DELETE / Auth admin API 直接呼び出し）からの退会は MUST NOT 許容する。

`withdraw-member` Function は次の責務を持つ:

1. 呼び出し元 JWT を検証し、`auth.uid() = target_member_id`（本人）または `members.role = 'admin'`（admin）であることを確認する。それ以外の呼び出しは 403 を返す。
2. 対象会員の `status IN ('reserved', 'waitlist')` の予約を `status = 'cancelled'` + `cancelled_at = now()` に UPDATE する。
3. 対象会員の全 `reservations` 行に対して `phone_at_booking = NULL` / `note = NULL` を UPDATE する（Step 5 の `ON DELETE SET NULL` は `member_id` のみを NULL 化するため、個人情報列は明示的に消去する必要がある）。
4. Supabase Storage の `identity-documents/<member_id>/` 配下のオブジェクトを列挙して削除する。
5. `members` 行を DELETE する（`identity_documents` は ON DELETE CASCADE、`reservations.member_id` は ON DELETE SET NULL で連鎖）。
6. `auth.users` を Auth admin API で DELETE する。
7. 上記の実行ログ（対象 member_id / 実行者 / 実行時刻 / 成功 or 失敗）を Function ログに記録する。

Function は冪等性を MUST 持つ: target が既に存在しなければ 204 を返し、エラーにはしない。

#### Scenario: 本人からの呼び出し
- **WHEN** 認証済み会員が自分の `member_id` を引数に `withdraw-member` を呼び出す
- **THEN** Function は処理を実行し、200 を返す

#### Scenario: admin からの呼び出し
- **WHEN** `role = 'admin'` の会員が他人の `member_id` を引数に `withdraw-member` を呼び出す
- **THEN** Function は処理を実行し、200 を返す

#### Scenario: 第三者からの呼び出し
- **WHEN** `role = 'member'` の会員が他人の `member_id` を引数に `withdraw-member` を呼び出す
- **THEN** Function は 403 を返し、削除を実行しない

#### Scenario: 既に削除済み
- **WHEN** 既に存在しない `member_id` を引数に `withdraw-member` を呼び出す
- **THEN** Function は 204 を返し、エラーにしない

#### Scenario: 未認証
- **WHEN** Authorization ヘッダなしで `withdraw-member` を呼び出す
- **THEN** Function は 401 を返す

### Requirement: 退会前の未来予約は自動キャンセル

システムは退会実行時に、対象会員の `status IN ('reserved', 'waitlist')` の予約を `status = 'cancelled'` + `cancelled_at = now()` に MUST 遷移させる。状態遷移は `members` 行の DELETE より前に実行 MUST する（順序保証）。

ウェイトリスト繰り上げ / 他参加者への通知メールは本 change のスコープ外とする（既存キャンセルロジックに依存）。

#### Scenario: 未来予約のキャンセル
- **WHEN** 会員が `status = 'reserved'` の未来予約を 2 件持った状態で退会する
- **THEN** 退会完了時点で当該 2 件は `status = 'cancelled'` + `cancelled_at IS NOT NULL` になっており、`member_id` は NULL に変わっている

#### Scenario: 過去予約はキャンセルしない
- **WHEN** 会員が `status = 'attended'` の過去予約を持った状態で退会する
- **THEN** 退会完了時点で当該行の `status` は `'attended'` のまま、`member_id` のみ NULL に変わっている

### Requirement: 退会失敗時の整合性ガード

システムは `withdraw-member` Function 内で次の順序を MUST 保証する: 未来予約キャンセル → reservations 個人情報列 NULL 化 → Storage オブジェクト削除 → `members` DELETE → `auth.users` DELETE。`members` DELETE より前のステップが失敗した場合、`members` DELETE 以降を MUST NOT 実行し、Function は 500 を返す。`members` DELETE が成功し `auth.users` DELETE が失敗した場合、Function は 500 を返すが DB の削除は維持される（Auth user 単体の孤児状態として運営に通知する運用に倒す）。

reservations 個人情報列 NULL 化は `members` DELETE より前に MUST 実行する。Step 順序を逆転させると `WHERE member_id = :id` でマッチする行が無くなり、`phone_at_booking` / `note` が個人情報のまま残る不整合が発生する。

#### Scenario: 個人情報列 NULL 化失敗で DB を保護
- **WHEN** `withdraw-member` 実行中に reservations の `phone_at_booking` / `note` NULL 化 UPDATE が失敗する
- **THEN** Storage 削除 / `members` DELETE / `auth.users` DELETE は実行されず、Function は 500 を返す

#### Scenario: Storage 削除失敗で DB を保護
- **WHEN** `withdraw-member` 実行中に Storage オブジェクト削除が失敗する
- **THEN** `members` 行と `auth.users` 行は削除されず、Function は 500 を返す

#### Scenario: auth.users 削除失敗時の孤児
- **WHEN** `members` DELETE 成功後に `auth.users` DELETE が失敗する
- **THEN** Function は 500 を返すが `members` の削除は維持される。当該 auth user は次回ログイン試行時に「members 行不在」で弾かれる

### Requirement: 退会後のセッション無効化

システムは退会成功後、対象会員の Supabase Auth セッションを次のいずれかの方法で MUST 無効化する:

- 本人退会: クライアントが Function 成功レスポンス受信後に `supabase.auth.signOut()` を呼ぶ
- admin 強制削除: `auth.users` が削除されたことで、対象会員の既存 JWT は次回 refresh 時に Supabase 側で無効化される

#### Scenario: 自己退会直後のクライアント遷移
- **WHEN** 会員が自己退会フローを完了した直後
- **THEN** クライアントはサインアウトされ、LP（公開トップ）にリダイレクトされる

#### Scenario: admin 強制削除後の対象会員ブラウザ
- **WHEN** admin が会員 X を強制削除した時点で、会員 X が別ブラウザでログインセッションを持っている
- **THEN** 当該セッションは次回 JWT refresh 時に無効化され、会員 X はログイン画面に戻される

