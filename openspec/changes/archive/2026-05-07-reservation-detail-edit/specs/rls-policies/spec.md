## MODIFIED Requirements

### Requirement: reservations の閲覧と編集ポリシー

システムは MUST `reservations` テーブルに以下のポリシーを適用する:
- SELECT: 自分の予約のみ可。管理者は全件可
- INSERT: 自分の `member_id` を指定する場合のみ可
- UPDATE: 自分の予約のうち `status` が `'reserved'` または `'cancelled'` の範囲に収まる行に対して、本人が編集可能な列 (`status` の `'reserved' ↔ 'cancelled'` 切替 / `guest_count` / `note`) の UPDATE を可とする。`status` を `'attended'` / `'no_show'` / `'waitlist'` 等の管理者専用ステータスへ遷移させることは不可。管理者は全件・全列・全 status へ変更可
- DELETE: 管理者のみ可

`guest_count` / `note` の本人編集を許容するのは、予約詳細画面からの後追い編集動線 (同伴者数・連絡事項の修正) を提供するため。`status` 切替を `'reserved' ↔ 'cancelled'` の範囲に閉じる制約は WITH CHECK 句で担保される MUST。

#### Scenario: 自分の予約を一覧
- **WHEN** ログイン中の member が `select * from reservations where member_id = auth.uid()`
- **THEN** 該当の予約のみ返る

#### Scenario: 他人を予約させようとする
- **WHEN** member が `insert into reservations(event_id, member_id) values (?, '<other-member-id>')`
- **THEN** RLS WITH CHECK で拒否

#### Scenario: 予約をキャンセル
- **WHEN** member が `update reservations set status = 'cancelled' where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新

#### Scenario: 自分の予約の同伴者数を編集
- **WHEN** member が自分の `status='reserved'` 予約に対して `update reservations set guest_count = 1 where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新（本人による後追い編集動線として許容される）

#### Scenario: 自分の予約の連絡事項を編集
- **WHEN** member が自分の `status='reserved'` 予約に対して `update reservations set note = '...' where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新

#### Scenario: 他人の予約の編集試行
- **WHEN** member A が member B の予約に対して `update reservations set guest_count = 5 where id = '<B の予約>'`
- **THEN** RLS により 0 行更新となり、変更は反映されない

#### Scenario: 本人による attended 切替の試行
- **WHEN** member が自分の予約に対して `update reservations set status = 'attended' where id = ? and member_id = auth.uid()`
- **THEN** WITH CHECK 句により拒否される（管理者専用ステータスへの遷移は不可）

#### Scenario: 管理者が attended に更新
- **WHEN** admin が任意の予約の status を `'attended'` に UPDATE
- **THEN** 行が更新される
