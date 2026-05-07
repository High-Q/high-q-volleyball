## Why

Issue #211 で予約履歴画面 `/history` を独立画面として切り出した際、各履歴行を**非リンク**として実装した。これは「履歴を確認した会員がそこから個別予約に対するアクション (カレンダー追加 / 会場マップ確認 / キャンセル) を取れる経路」が未整備のためであり、履歴行が「見るだけで何もできない」状態にとどまっている。

本 change は履歴行の遷移先となる予約詳細画面 `/reservations/:reservationId` を新設し、当該予約に紐づく必要十分な情報と 3 系統のアクション (カレンダー追加 / 会場地図 / キャンセル) を 1 画面に集約する。Epic #170「メンバーが High Q に参加し、繰り返す」のジャーニー後半 (予約成立後の運用) を完成させ、予約完了画面の役割を「成立直後の祝祭」に純化する。

## What Changes

- 会員サイトに予約詳細画面 `/reservations/:reservationId` を新設し、auth guard チェーン (認証済 + プロフィール完成 + 本人確認書類提出済) の制限下に置く
- 詳細画面に以下を表示する: パンくず (`マイページ > 履歴 > 予約詳細`) / 予約番号 kicker + イベント名 / Dark Fact Card (開催までの日数 + 開催日 + 時間 + 会場名) / Meta テーブル (参加費 / 同伴者 / 経験レベル / 予約日時) / カレンダー追加 (.ics) と会場地図の 2 アクション / Cancel Policy ボックス / 「予約をキャンセル」ボタン
- カレンダー追加はクライアントサイドで `.ics` ファイルを生成し、当該予約のイベントを単一の VEVENT として保存できるようにする
- 会場地図は `venues.map_url` 登録済ならそれを、未登録なら会場名 + 住所からの Google Maps 検索 URL を、新規タブで開く
- 予約キャンセル動線は既存 `features/booking/CancelBookingDialog` + `useCancelBooking` をそのまま流用し、判定基準は `events.start_at > now()` のみとする (`cancel_deadline` は MVP1 では参照しない既存方針を踏襲)
- Cancel Policy ボックスの説明文は MVP1 の実挙動に合わせて「開催開始までキャンセル可能」相当の文言に統一する (デザインサンプルの「開催 24 時間前まで」表記は cancel_deadline を必要とするため採用しない)
- 4 状態 (Loading / 404 / Error / Success) を UI に明示する。404 は他会員の予約 ID を踏んだ場合の RLS 0 行ヒットも含む
- 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化し、押下フィードバック (cursor: pointer / hover) を解禁したうえで本ルートへ遷移するようにする
- `apps/reservation` の RLS / クエリ層に予約単一取得 API (`fetchMyReservation(reservationId)`) を追加する。RLS により他会員の予約は 0 行ヒットとなり、UI で 404 として扱う

## Capabilities

### New Capabilities

- `reservation-detail-page`: 予約詳細画面 `/reservations/:reservationId` のルート / 表示要素 / アクション (カレンダー追加・会場地図・キャンセル) / 4 状態 / RLS 二重防衛 / 履歴画面からの遷移契約 / E2E カバレッジを規定する

### Modified Capabilities

- `reservation-history-page`: 履歴行を「非リンク MUST」から「予約詳細画面への `<router-link>` MUST」に切り替える要件変更を加える。押下フィードバック (hover / cursor: pointer) を解禁する

## Impact

- **影響レイヤー (FSD)**:
  - `app/router.ts` (新ルート追加)
  - 新規 `pages/ReservationDetailPage.vue`
  - 新規 `widgets/reservation-detail-card/` (Dark Fact Card / Meta テーブル / Cancel Policy ボックス)
  - 新規 `features/calendar-export/` (.ics 生成 + ダウンロード)
  - 新規 `features/venue-map-link/` (map_url 優先 / Google Maps 検索 fallback)
  - 既存流用 `features/booking` (CancelBookingDialog / useCancelBooking)
  - `entities/reservation/` に単一取得 API (`fetchMyReservation`) を追加
  - 既存 `features/history-list/ui/HistoryRow.vue` を `<router-link>` 化
- **DB / RLS**: 新規テーブル / 列追加 / RLS 変更なし。既存 `reservations` の SELECT RLS (`auth.uid() = member_id OR is_admin()`) で本機能の権限要件は満たされている
- **依存関係**: `.ics` 生成は手書き (依存追加なし)。会場地図リンクは既存 `venues.map_url` / `venues.address` を参照
- **テスト**: component test (Vitest + @vue/test-utils) で各セクション描画 / 4 状態 / .ics 生成 / 履歴画面行の遷移契約を検証。E2E (Playwright) は本機能あたり 1 件 (auth guard: 未認証 → `/login`) に限定し、詳細表示と .ics ダウンロードは component test に押し下げる
