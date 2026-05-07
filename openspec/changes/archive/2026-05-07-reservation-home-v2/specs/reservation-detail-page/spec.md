## MODIFIED Requirements

### Requirement: 単一予約取得 API と RLS 二重防衛

会員サイトは予約単一取得 API `fetchMyReservation(reservationId, uid)` を `entities/reservation/api/` 配下で SHALL 提供する。`reservations × events × venues` を JOIN し、`reservations.id = reservationId` AND `reservations.member_id = auth.uid()` の条件で 1 行を取得する MUST。

`reservations` テーブルの SELECT RLS（`auth.uid() = member_id OR is_admin()`）により他会員の予約は 0 行となり、UI 層は 0 行ヒットを 404 として扱う MUST。アプリ層クエリでも `member_id` 条件を明示的に含めることで二重防衛とする MUST。

返却値はパンくず / Dark Fact Card / Meta テーブルの描画に必要な以下を含む MUST:

- 予約: `id` / `status` / `guestCount` / `createdAt`（予約日時表示用）/ `cancelledAt`
- イベント: `id` / `name` / `startAt` / `endAt` / `fee`（NULL なら `venues.default_fee` で COALESCE）/ `venueName`

会員プロフィールの `experienceLevel` は本 API の返却値に **含めない** MUST NOT。経験レベルは会員プロフィールの編集可能な現在値であり、予約のスナップショットでも予約画面の固有情報でもないため、予約詳細画面に表示する必然性がない (会員自身のプロフィール画面で参照・編集可能)。

#### Scenario: 自分の予約は取得できる
- **WHEN** 会員 A が自分の予約 ID で `fetchMyReservation` を呼び出す
- **THEN** 1 件のレコードが返り、`memberId` は `auth.uid()` に一致する

#### Scenario: 他会員の予約は 0 行ヒット
- **WHEN** 会員 A が会員 B の予約 ID を指定して `fetchMyReservation` を呼び出す
- **THEN** RLS により 0 行となり、API は 404 を意味する `null` を返す

#### Scenario: 存在しない予約 ID
- **WHEN** ランダム UUID で `fetchMyReservation` を呼び出す
- **THEN** 0 行となり、API は 404 を意味する `null` を返す

#### Scenario: アプリ層 member_id 条件の明示
- **WHEN** `fetchMyReservation` の実装ファイルを確認する
- **THEN** Supabase クエリチェーンに `.eq("member_id", uid)` 相当の条件が含まれる（RLS への単独依存を避け、二重防衛が成立している）

#### Scenario: 経験レベルは返却値に含まれない
- **WHEN** `fetchMyReservation` の戻り値型と SELECT 句を確認する
- **THEN** `members(experience_level)` JOIN や `member.experienceLevel` フィールドは存在しない

### Requirement: Meta テーブル（参加費 / 同伴者 / 予約日時）

ReservationDetailPage は Dark Fact Card の下に Meta テーブルを SHALL 表示する。`<dl>` / `<dt>` / `<dd>` のセマンティック構造で以下 3 行を順序固定で表示する MUST:

- 参加費: `¥{fee}（当日現金）` 形式。`events.fee` が NULL のとき `venues.default_fee` を使用する MUST。両方 NULL のとき `—` を表示する MUST
- 同伴者: `{guest_count} 名`
- 予約日時: `reservations.created_at` を `YYYY / MM / DD HH:mm` JST 形式で表示

「経験レベル」行は本テーブルから撤廃する MUST NOT。経験レベルは会員自身のプロフィール画面で参照・編集する情報であり、予約画面に再掲する UX 上の必然性がない。

ラベル列はモノスペース大文字の kicker トーンを SHALL 使用する。値列は和文書体。マジックナンバーは禁止 MUST NOT。

#### Scenario: 3 行の描画
- **WHEN** ReservationDetailPage に到達
- **THEN** 参加費 / 同伴者 / 予約日時 の 3 行が `<dl>` 構造で順序固定で描画される

#### Scenario: 参加費の COALESCE
- **WHEN** `events.fee = NULL` AND `venues.default_fee = 1000` の予約を表示
- **THEN** 参加費に「¥1,000（当日現金）」が描画される

#### Scenario: 経験レベル行の非表示
- **WHEN** ReservationDetailPage の Meta テーブル DOM を確認する
- **THEN** 「経験レベル」ラベルおよび `'初めて' / '経験あり' / '上級'` のいずれの値も描画されない

#### Scenario: 同伴者 0 名の表示
- **WHEN** `reservations.guest_count = 0` の予約を表示
- **THEN** 同伴者に「0 名」が描画される
