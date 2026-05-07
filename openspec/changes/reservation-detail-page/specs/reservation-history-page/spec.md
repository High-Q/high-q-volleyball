## MODIFIED Requirements

### Requirement: 履歴行の表示構成

各履歴行は以下を SHALL 表示する:

- 日付セル: `MM/DD` + 曜日（モノスペース・小文字 1 行ずつ・左端配置）
- イベント名（`events.name`）
- 会場名（`venues.name` を `events.venues` JOIN から取得）
- 開催時間（`events.start_at` の HH:mm）
- 予約番号（`#HQ-...` 形式・`formatReservationNumber(reservation.id)` で生成・既存ヘルパ流用）
- 状態バッジ（前述）

行は予約詳細画面 (`reservation-detail-page` capability) への `<router-link :to="{ name: 'reservation-detail', params: { reservationId: row.id } }">` として描画する MUST。押下フィードバックとして cursor: pointer / hover スタイル / focus 可視リングを SHALL 提供する。

行内のキャンセルボタン（予約中グループのみ）押下時は親 router-link への伝播を `event.stopPropagation()` 相当で抑制する MUST。これにより「行クリック → 詳細遷移」「キャンセルボタンクリック → ダイアログ起動」が独立して動作する。

#### Scenario: 行の表示構成
- **WHEN** 任意の予約行を確認する
- **THEN** 日付セル / イベント名 / 会場 / 時間 / 予約番号 / 状態バッジ がすべて描画される

#### Scenario: 行押下で予約詳細へ遷移
- **WHEN** 履歴行をクリックする
- **THEN** `/reservations/<row.id>` に遷移する

#### Scenario: 押下フィードバック
- **WHEN** 履歴行にホバー / フォーカスする
- **THEN** cursor: pointer / hover スタイル / focus 可視リングが適用される

#### Scenario: キャンセルボタンの伝播抑制
- **WHEN** 予約中グループの「予約をキャンセル」ボタンを押下
- **THEN** CancelBookingDialog が開き、詳細画面への遷移は発生しない
