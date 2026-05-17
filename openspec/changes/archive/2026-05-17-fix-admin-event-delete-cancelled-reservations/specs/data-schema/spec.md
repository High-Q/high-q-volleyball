## MODIFIED Requirements

### Requirement: reservations テーブル

システムは `reservations` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`event_id` (uuid NOT NULL references events(id) ON DELETE CASCADE)、`member_id` (uuid NULL references members(id) ON DELETE SET NULL — NULL は退会済み会員の過去予約を匿名化する場合のみ)、`status` (text CHECK in `'reserved'`,`'cancelled'`,`'attended'`,`'no_show'`,`'waitlist'`、default `'reserved'`)、`guest_count` (smallint NOT NULL default 0 CHECK >= 0 AND <= 5)、`phone_at_booking` (text NULL — 予約時点のスナップショット)、`note` (text)、`checked_in_at` (timestamptz NULL — null = 未チェックイン)、`cancelled_at` (timestamptz NULL)、`created_at` / `updated_at` (timestamptz default now)。

`status` enum に `'waitlist'` を追加 MUST (キャンセル待ち管理 #154 用)。

新規 INSERT 時は `member_id IS NOT NULL` を CHECK 制約相当のアプリ層バリデーション + RLS WITH CHECK 句で MUST 強制する。`member_id` が NULL になる経路は **退会実行に伴う ON DELETE SET NULL のみ** であり、それ以外の経路で NULL 行が生まれる SHALL NOT。

`member_id IS NULL` の行は member-withdrawal capability の規定により、退会済み会員の過去予約として残された痕跡である。当該行は `phone_at_booking IS NULL` AND `note IS NULL` を MUST 満たす（退会実行時に member-withdrawal capability が両列を明示的に NULL 化する）。当該行に対する UPDATE / DELETE は admin のみ可能（rls-policies capability に従う）。

`event_id` の FK を `ON DELETE CASCADE` とする理由: イベント本体が削除された時点で当該予約は実体を失う。admin の削除操作は AlertDialog 二段階確認 + 予約内訳の事前表示で誤操作を防いでおり、DB レベルの RESTRICT による追加防御は不要と判断する。本変更により orphan な reservations 行（cancelled / no_show を含む）が残る経路が排除される。

#### Scenario: 1 イベント・1 会員に対して 1 予約
- **WHEN** 同じ (event_id, member_id) で 2 件目の reservations を INSERT
- **THEN** UNIQUE 制約違反でエラーとなる (キャンセル後の再予約は status の更新で対応)

#### Scenario: events 削除時の連鎖削除
- **WHEN** reservations が指す events を DELETE
- **THEN** ON DELETE CASCADE により当該 event に紐づく全 reservations 行（reserved / cancelled / attended / no_show / waitlist いずれも）が同時に削除される

#### Scenario: members 削除時の匿名化
- **WHEN** reservations が指す members を DELETE
- **THEN** ON DELETE SET NULL により当該 reservations 行は残り、`member_id` のみ NULL に書き換わる

#### Scenario: 退会後の個人情報列が NULL
- **WHEN** member-withdrawal Edge Function による退会が完了した後に、当該会員の過去予約行を SELECT
- **THEN** すべての行で `member_id` / `phone_at_booking` / `note` がいずれも NULL である

#### Scenario: 新規予約は member_id 必須
- **WHEN** `member_id IS NULL` で reservations を INSERT
- **THEN** RLS WITH CHECK 句で拒否される (NULL は退会経路でのみ生まれる)

#### Scenario: 同伴者数の範囲
- **WHEN** guest_count が負数または 6 以上の行を INSERT
- **THEN** CHECK 制約違反でエラーとなる (0 〜 5 の範囲のみ許容)

#### Scenario: チェックイン操作
- **WHEN** 管理者が checked_in_at を now() に UPDATE
- **THEN** 行は更新され、UI 側で「済」表示になる (UPDATE 権限は RLS で admin のみ)

#### Scenario: キャンセル時のタイムスタンプ
- **WHEN** member or admin が status を 'cancelled' に変更
- **THEN** トリガー `set_reservations_cancelled_at` により cancelled_at が now() に自動設定される
