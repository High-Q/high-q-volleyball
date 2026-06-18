## MODIFIED Requirements

### Requirement: reservations の閲覧と編集ポリシー

システムは MUST `reservations` テーブルに以下のポリシーを適用する:
- SELECT: 自分の予約のみ可。管理者は全件可
- INSERT: 自分の `member_id` を指定し、かつ新規行の `status` が会員設定可能ステータス `'reserved'` または `'waitlist'` のいずれかである場合のみ可。`status` を `'attended'` / `'no_show'` 等の管理者専用ステータス、または新規行としては無意味な `'cancelled'` で INSERT することは不可。管理者は全 status で INSERT 可（`member_id IS NOT NULL` の強制は「退会済み会員の予約行のアクセス制御」要件に従う）
- UPDATE: 自分の予約に対して、本人が編集可能な列 (`status` の会員設定可能ステータス間の切替 / `guest_count` / `note`) の UPDATE を可とする。会員設定可能ステータスは `'reserved'` / `'cancelled'` / `'waitlist'` の 3 値であり、これらの間の遷移（`'reserved' ↔ 'cancelled'` の予約キャンセル / 再予約、`'cancelled' → 'waitlist'` のキャンセル待ち再活性化を含む）を可とする。`status` を `'attended'` / `'no_show'` 等の管理者専用ステータスへ遷移させることは不可。管理者は全件・全列・全 status へ変更可
- DELETE: 管理者は全件可。会員は自分の `status='waitlist'` 行のみ DELETE 可（キャンセル待ちの撤回を行削除で表現するため）。会員から `'reserved'` / `'attended'` / `'no_show'` / `'cancelled'` 行の DELETE は不可

`guest_count` / `note` の本人編集を許容するのは、予約詳細画面からの後追い編集動線 (同伴者数・連絡事項の修正) を提供するため。INSERT 時の `status` を `'reserved'` / `'waitlist'` に閉じる制約、および UPDATE 時の遷移先 `status` を会員設定可能ステータス 3 値に閉じる制約は、いずれも WITH CHECK 句で担保される MUST。これにより会員による参加実績（`'attended'`）の自己設定を構造的に遮断しつつ、キャンセル待ち登録 (`reservation-waitlist-registration` capability) を会員権限の範囲で成立させる。

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

#### Scenario: 本人によるキャンセル待ち登録の INSERT
- **WHEN** member が `insert into reservations(event_id, member_id, status) values (?, auth.uid(), 'waitlist')`
- **THEN** WITH CHECK 句を満たし 1 行 INSERT される（`'waitlist'` は会員設定可能ステータス）

#### Scenario: 本人による attended の INSERT 試行
- **WHEN** member が `insert into reservations(event_id, member_id, status) values (?, auth.uid(), 'attended')`
- **THEN** WITH CHECK 句により拒否される（参加実績の自己設定は不可）

#### Scenario: 本人によるキャンセル済み行のキャンセル待ち再活性化
- **WHEN** member が自分の `status='cancelled'` 行に対して `update reservations set status = 'waitlist', cancelled_at = null where id = ? and member_id = auth.uid()`
- **THEN** WITH CHECK 句を満たし 1 行更新される（`'cancelled' → 'waitlist'` は会員設定可能ステータス間の遷移）

#### Scenario: 本人によるキャンセル待ちの撤回 (DELETE)
- **WHEN** member が自分の `status='waitlist'` 行に対して `delete from reservations where id = ? and member_id = auth.uid() and status = 'waitlist'`
- **THEN** DELETE ポリシーにより 1 行削除される（キャンセル待ちの撤回。`cancelled` 行として残さない）

#### Scenario: 本人による reserved 行の DELETE は不可
- **WHEN** member が自分の `status='reserved'` 行に対して DELETE を試みる
- **THEN** DELETE ポリシーの USING 句（`status='waitlist'` 限定）にマッチせず 0 行削除となる（確定予約は会員から削除不可）

#### Scenario: 他人の waitlist 行の DELETE は不可
- **WHEN** member A が member B の `status='waitlist'` 行に対して DELETE を試みる
- **THEN** `member_id = auth.uid()` を満たさず 0 行削除となる
