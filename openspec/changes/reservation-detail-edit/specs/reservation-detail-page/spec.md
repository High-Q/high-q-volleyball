## MODIFIED Requirements

### Requirement: 単一予約取得 API と RLS 二重防衛

会員サイトは予約単一取得 API `fetchMyReservation(reservationId, uid)` を `entities/reservation/api/` 配下で SHALL 提供する。`reservations × events × venues` を JOIN し、`reservations.id = reservationId` AND `reservations.member_id = auth.uid()` の条件で 1 行を取得する MUST。

`reservations` テーブルの SELECT RLS（`auth.uid() = member_id OR is_admin()`）により他会員の予約は 0 行となり、UI 層は 0 行ヒットを 404 として扱う MUST。アプリ層クエリでも `member_id` 条件を明示的に含めることで二重防衛とする MUST。

返却値はパンくず / Dark Fact Card / Meta テーブル / 編集 sheet 初期値供給に必要な以下を含む MUST:

- 予約: `id` / `status` / `guestCount` / `note` / `createdAt`（予約日時表示用）/ `cancelledAt`
- イベント: `id` / `name` / `startAt` / `endAt` / `fee`（NULL なら `venues.default_fee` で COALESCE）/ `venueName`

`note` は MVP1 の予約詳細画面 Meta テーブルでは表示しないが、編集 sheet を edit モードで開く際の初期値供給に必要なため返却値に含める MUST。

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

#### Scenario: note が返却値に含まれる
- **WHEN** `fetchMyReservation` の戻り値型と SELECT 句を確認する
- **THEN** `note` フィールドが SELECT 句および返却型に含まれる（編集 sheet 初期値供給のため）

## ADDED Requirements

### Requirement: 予約内容の編集動線

ReservationDetailPage は Meta テーブルの直下に「予約内容を変更する」CTA を SHALL 配置する。本 CTA はキャンセル CTA とは別に、同伴者数 (`reservations.guest_count`) と連絡事項 (`reservations.note`) の **2 項目に限定した後追い編集動線** を提供する。日時 / 会場 / イベント / 経験レベル等は本 CTA の編集対象外とする MUST NOT。

押下時の挙動は `reservation-booking-flow` capability の予約 Bottom Sheet を **edit モード** で起動する MUST。Sheet の入力体験 / 保存処理 / 期限判定はすべて当該 capability に委譲する。

編集可能性の判定基準は予約キャンセル可能性と完全一致させる MUST。具体的には `useCancelBooking.isCancellable(eventStartAt)` の戻り値（JST カレンダー基準で `now の JST 日 < events.start_at の JST 日`）を流用し、独自の判定ロジックを新設 SHALL NOT。`events.cancel_deadline` 列は参照 SHALL NOT。

`status !== 'reserved'` または `isCancellable === false` のとき、本 CTA は非活性で描画する MUST、または押下時にキャンセル不可ダイアログ相当の案内（LINE オープンチャットへの誘導を含む）を SHALL 表示する。いずれの実装を採用してもよいが、ユーザーが「期限切れの後追い操作はすべて LINE 連絡に集約される」と直感的に理解できる UX を保つ MUST。

CTA の視覚的強さはキャンセル CTA より控えめなトーン（neutral / outlined 系）を SHALL 採用し、画面末尾の destructive 系キャンセル CTA との階層を明確に分ける MUST。マジックナンバー（直書きの色コード / px 値）は禁止 MUST NOT、HQ デザイントークンのみ使用する MUST。

保存成功時は本 capability 側で Meta テーブルが新値で再描画される MUST。具体的には、edit sheet からの保存成功通知を受けて、表示中の `guest_count` / `note` の値をローカルキャッシュ更新（楽観的）または `fetchMyReservation` 再呼び出しで反映する。完了トースト（「変更を保存しました」相当）は本 capability の予約詳細画面側で表示する MUST。トースト表示の責務は予約詳細画面に集約し、BookingSheet 側は完了トーストを直接発火 SHALL NOT（二重表示防止）。

#### Scenario: 編集 CTA の存在
- **WHEN** `status='reserved'` AND 現在時刻が `events.start_at` の JST カレンダー日の前日 23:59 JST 以前の予約を表示
- **THEN** Meta テーブル直下に「予約内容を変更する」CTA が活性で描画される

#### Scenario: 編集 CTA 押下で edit モードの sheet が開く
- **WHEN** 「予約内容を変更する」CTA を押下
- **THEN** 予約 Bottom Sheet が edit モードで起動し、同伴者数 stepper・連絡事項 textarea には現在の `reservations.guest_count` / `reservations.note` の値が初期表示される

#### Scenario: 開催当日 00:00 JST 以降は編集不可
- **WHEN** `status='reserved'` AND 現在時刻が `events.start_at` の JST 開催日 00:00 以降の予約を表示
- **THEN** 「予約内容を変更する」CTA は非活性で描画される、または押下時にキャンセル不可ダイアログ相当の案内（LINE オープンチャットリンク付き）が表示される

#### Scenario: キャンセル済予約には編集 CTA が描画されない
- **WHEN** `status='cancelled'` の予約を表示
- **THEN** 「予約内容を変更する」CTA は描画されない（DOM に存在しない）

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** `events.cancel_deadline` に過去日時が設定されているが現在時刻が `events.start_at` の JST 前日中の予約を表示
- **THEN** 「予約内容を変更する」CTA は活性で描画され、押下で edit sheet が開く

#### Scenario: 編集対象列の限定
- **WHEN** edit モードの sheet で同伴者数と連絡事項以外の項目（日時 / 会場 / 経験レベル / 電話番号等）を変更しようとする
- **THEN** そのような UI は提供されておらず、編集は同伴者数と連絡事項の 2 項目に限定される

#### Scenario: 保存成功で Meta テーブルが新値で再描画される
- **WHEN** edit モードの sheet で同伴者数を 0 → 1 に変更して保存が成功
- **THEN** sheet が閉じた後、Meta テーブルの「同伴者」行が「1 名」と再描画される（リロード不要）

#### Scenario: 保存成功時の完了トースト表示
- **WHEN** edit モードの sheet で保存が成功
- **THEN** 予約詳細画面の successNotice 等で「変更を保存しました」相当の完了トーストが 1 つだけ表示される（BookingSheet 側からは直接発火されない）

### Requirement: 編集 CTA とキャンセル CTA の視覚的階層

ReservationDetailPage は同一画面に「予約内容を変更する」CTA と「予約をキャンセル」CTA の 2 つを配置する。両 CTA はそれぞれ役割と破壊度が異なるため、視覚的階層を明確に分けて表示する MUST。

- 編集 CTA: Meta テーブル直下に配置し、neutral / outlined 系のトーンで「日常的な調整操作」として控えめに見せる MUST
- キャンセル CTA: 画面末尾（メインアクション末尾）に配置し、destructive 系のトーンで「予約取消」の重さを伝える MUST

両 CTA を視覚的に同列・同色で並べる SHALL NOT。CTA 内の文字サイズ・パディングなどは HQ デザイントークン経由で指定し、マジックナンバーを書かない MUST NOT。

#### Scenario: 配置の差別化
- **WHEN** ReservationDetailPage を表示
- **THEN** 編集 CTA は Meta テーブル直下に配置され、キャンセル CTA は画面末尾に配置されており、両者は同一ブロックに並列配置 SHALL NOT

#### Scenario: 視覚的トーンの差別化
- **WHEN** 両 CTA のスタイルを確認
- **THEN** キャンセル CTA は destructive 系トーン、編集 CTA はそれより控えめなトーンで描画される

### Requirement: 編集動線の自動テストカバレッジ

予約内容の編集動線は component test レベルで SHALL 自動検証される。E2E は本 capability で新規追加 SHALL NOT（既存 reservation-detail-page の auth guard E2E を継続流用する）。

検証対象シナリオ（各 1〜2 件まで）:

- 編集可能期限内の予約で編集 CTA が活性表示され、押下で edit sheet が開く
- 期限切れ予約で編集 CTA が非活性 / 押下時に LINE 案内ダイアログが表示される
- edit sheet で値を変更して保存成功、Meta テーブルが新値で再描画される
- 差分がない状態で保存 CTA が非活性であること
- RLS 0 行更新 / ネットワークエラー時のエラー表示

#### Scenario: component test の整備
- **WHEN** `pnpm --filter @high-q/reservation test` を実行
- **THEN** 上記シナリオに対応する component / unit テストが pass する
