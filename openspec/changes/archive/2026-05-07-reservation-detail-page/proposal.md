## Why

Issue #211 で予約履歴画面 `/history` を独立画面として切り出した際、各履歴行を**非リンク**として実装した。これは「履歴を確認した会員がそこから個別予約に対するアクション (キャンセル) を取れる経路」が未整備のためであり、履歴行が「見るだけで何もできない」状態にとどまっている。

本 change は履歴行の遷移先となる予約詳細画面 `/reservations/:reservationId` を新設し、当該予約に紐づく必要十分な情報とキャンセル動線を 1 画面に集約する。あわせて、MVP1 のキャンセル運用ポリシー (キャンセル期限は **開催前日中**) を実装と UI 文言の双方で正しく規定し直す。

Epic #170「メンバーが High Q に参加し、繰り返す」のジャーニー後半 (予約成立後の運用) を完成させ、予約完了画面の役割を「成立直後の祝祭」に純化する。

## What Changes

- 会員サイトに予約詳細画面 `/reservations/:reservationId` を新設し、auth guard チェーン (認証済 + プロフィール完成 + 本人確認書類提出済) の制限下に置く
- 詳細画面に以下を表示する: パンくず (`マイページ > 履歴 > 予約詳細`) / 予約番号 kicker + イベント名 / Dark Fact Card (開催までの日数 + 開催日 + 時間 + 会場名) / Meta テーブル (参加費 / 同伴者 / 経験レベル / 予約日時) / Cancel Policy ボックス / 「予約をキャンセル」ボタン
- 予約キャンセル可否判定を「**開催前日中まで可能**」(JST カレンダー基準で `now の JST 日 < start_at の JST 日`) に変更する。既存の `events.start_at > now()` 判定はキャンセル運用を当日 0:00 直前まで許してしまうため、運用実態と乖離していた
- `useCancelBooking.isCancellable` の判定ロジックを上記方針に切り替える。本関数は履歴画面 (#211) と詳細画面の双方で共有されるため、両画面のキャンセル動線が同時に新ポリシーに整合する
- Cancel Policy ボックスの説明文を「キャンセル期限は開催前日中です。当日キャンセルが必要な場合は LINE オープンチャットへ」に統一する
- CancelBookingDialog のキャンセル不可案内文言を「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません」に変更する (旧文言「イベント開催が始まっているため」は実装挙動と乖離していた)
- 4 状態 (Loading / 404 / Error / Success) を UI に明示する。404 は他会員の予約 ID を踏んだ場合の RLS 0 行ヒットも含む
- 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化し、押下フィードバック (cursor: pointer / hover) を解禁したうえで本ルートへ遷移するようにする
- `apps/reservation` の RLS / クエリ層に予約単一取得 API (`fetchMyReservation(reservationId)`) を追加する。RLS により他会員の予約は 0 行ヒットとなり、UI で 404 として扱う

## What This Change Does NOT Include (Non-Goals)

- カレンダー追加 (.ics ダウンロード) 動線 (本 change ではドロップ。デザインサンプルにはあるが、MVP1 の優先度を実需と照らした結果、不要と判断)
- 会場地図リンク (本 change ではドロップ。Booking Done 画面に既存の地図導線があり、詳細画面で重複させる必要がない)
- 同伴者数 / 連絡事項の編集動線 (Issue #215 として MVP1 内で別 Issue 切出し済み)

## Capabilities

### New Capabilities

- `reservation-detail-page`: 予約詳細画面 `/reservations/:reservationId` のルート / 表示要素 / キャンセル動線 / Cancel Policy 文言 / 4 状態 / RLS 二重防衛 / 履歴画面からの遷移契約 / E2E カバレッジを規定する

### Modified Capabilities

- `reservation-history-page`: 履歴行を「非リンク MUST」から「予約詳細画面への `<router-link>` MUST」に切り替える要件変更を加える。押下フィードバック (hover / cursor: pointer) を解禁する
- `reservation-booking-flow`: 予約キャンセル可否判定を「`events.start_at > now()`」から「JST カレンダー基準で前日中まで」に変更する。Cancel 不可案内文言も新ポリシーに整合させる

## Impact

- **影響レイヤー (FSD)**:
  - `app/router.ts` (新ルート追加)
  - 新規 `pages/ReservationDetailPage.vue`
  - 新規 `widgets/reservation-detail-card/` (Dark Fact Card / Meta テーブル / Cancel Policy ボックス)
  - 既存変更 `features/booking/composables/useCancelBooking.ts` (`isCancellable` の判定ロジック変更)
  - 既存変更 `features/booking/ui/CancelBookingDialog.vue` (不可案内文言)
  - 既存流用 `features/booking` (CancelBookingDialog / useCancelBooking)
  - `entities/reservation/` に単一取得 API (`fetchMyReservation`) を追加
  - 既存 `features/history-list/ui/HistoryRow.vue` を `<router-link>` 化
- **DB / RLS**: 新規テーブル / 列追加 / RLS 変更なし。既存 `reservations` の SELECT RLS (`auth.uid() = member_id OR is_admin()`) で本機能の権限要件は満たされている
- **依存関係**: 新規依存追加なし
- **テスト**: component test (Vitest + @vue/test-utils) で各セクション描画 / 4 状態 / 履歴画面行の遷移契約 / `isCancellable` の JST 前日境界を検証。E2E (Playwright) は本機能あたり 1 件 (auth guard: 未認証 → `/login`) に限定する
