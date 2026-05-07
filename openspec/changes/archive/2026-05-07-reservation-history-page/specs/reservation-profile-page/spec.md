## MODIFIED Requirements

### Requirement: STATS セクション（参加統計）

ProfilePage は STATS セクションで以下 3 行のみを SHALL 表示する:

- 累計参加回数（`status = 'attended'` の予約数）
- 最終参加日（`status = 'attended'` の中で `events.start_at` が最大の日付。0 件のとき「—」）
- 次回予定（`status = 'reserved'` AND `events.start_at > now()` の中で最早の `events.start_at` + イベント名。0 件のとき「—」）

集計はクライアント側で予約配列から JS で算出する MUST。`event_participants_view` には依存しない MUST NOT。

予約履歴一覧（個別行）と個別行のキャンセルボタンは本セクションに表示しない MUST NOT。これらは別画面 `/history` (reservation-history-page spec) に移管されている。

#### Scenario: 統計値の表示
- **WHEN** 会員が `attended` 3 件 / `reserved`（未来）2 件 / `cancelled` 1 件 を持つ状態で `/profile` を開く
- **THEN** 累計参加「3 回」/ 最終参加（attended の最新の events.start_at）/ 次回予定（reserved の最早 events.start_at + イベント名） の 3 行が表示される

#### Scenario: 参加履歴 0 件の表示
- **WHEN** 予約を 1 件も持たない会員が `/profile` を開く
- **THEN** STATS の数値部分は「— 回 / — / —」が表示される

#### Scenario: 履歴一覧が描画されない
- **WHEN** プロフィール画面で STATS セクションを確認する
- **THEN** 個別予約行のリスト（開催日 / イベント名 / 状態バッジを含む各行）は描画されない

#### Scenario: 個別キャンセルボタンが描画されない
- **WHEN** プロフィール画面の STATS セクションを確認する
- **THEN** 「予約をキャンセル」ボタン（行ごとの個別キャンセル UI）は描画されない（DOM に存在しない）

#### Scenario: 他人の予約は表示されない（RLS）
- **WHEN** 会員 A が `/profile` を開いて取得した予約配列を確認する
- **THEN** すべての予約の `member_id` が `auth.uid()` に一致する（RLS により他会員の行は返らない）

## REMOVED Requirements

### Requirement: 予約履歴からのキャンセル動線

**Reason**: 予約履歴の表示と個別行からのキャンセル動線は、独立画面 `/history` (reservation-history-page spec の「予約中グループからのキャンセル動線」要件) に移管されたため、ProfilePage 配下からは削除する。プロフィール画面の役割は会員自身の属性管理（LEVEL / ACCOUNT）と参加サマリ（集計 3 行）に絞る。

**Migration**: 既存ユーザーの導線は Bottom Tab Bar の「履歴」タブに移行する（暫定リンク `/profile` を `/history` に切り替える）。キャンセル機能自体は失われず、`features/booking` の `useCancelBooking` + `CancelBookingDialog` を新画面が再利用する。
