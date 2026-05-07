## MODIFIED Requirements

### Requirement: 予約キャンセル

会員サイトは自分の予約をキャンセルする操作を SHALL 提供する。MVP1 ではキャンセル動線を以下の 2 経路で MUST 提供する:

- 予約完了画面 (`booking-done`) の「予約をキャンセル」アクション（直近の予約用）
- 予約履歴画面 (`/history`) の予約中グループのキャンセルボタン、および予約詳細画面 (`/reservations/:reservationId`) のキャンセル CTA（後追い用）

3 経路の判定基準と挙動は同一とし、コードを共通化する MUST (`features/booking/composables/useCancelBooking.ts` の `isCancellable` 関数を全経路から参照)。

キャンセル可否は **JST カレンダー基準で「開催前日中」まで** とし、`isCancellable(eventStartAt, now)` は以下のロジックで判定する MUST:

- `now` の JST カレンダー日 < `events.start_at` の JST カレンダー日 のとき: キャンセル可能 (= 前日 23:59 JST まで)
- それ以外 (当日 0:00 JST 以降 / 開催以降): キャンセル不可

`events.cancel_deadline` 列は本 capability では参照しない MUST NOT (MVP1 スコープアウト方針を維持)。

キャンセル可能時は ConfirmDialog を経由し、確定操作で reservations.status を `'reserved' → 'cancelled'` に更新する MUST。`cancelled_at` は DB トリガー (`set_reservations_cancelled_at`) で自動設定される。成功時は完了トーストを表示し、完了画面経由のキャンセルではイベント一覧画面へ遷移する MUST、履歴画面経由のキャンセルでは同画面に留まり対象行を `'cancelled'` 表示に切り替える MUST、詳細画面経由のキャンセルでは履歴画面へ `router.replace` で遷移する MUST。

キャンセル不可時 (当日 0:00 JST 以降) はキャンセル CTA を無効化し、「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません。やむを得ない事情がある場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください」相当の案内文を SHALL 表示する。LINE オープンチャットへの外部リンクを案内文中に含める MUST。本 capability では admin への自動通知や問い合わせフォーム連携は行わない MUST NOT (MVP2)。

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（完了画面経由）
- **WHEN** 完了画面の「予約をキャンセル」を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（履歴画面 / 詳細画面経由）
- **WHEN** 履歴画面の予約中行 / 詳細画面のキャンセル CTA を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 完了画面経由のキャンセル成功後の遷移
- **WHEN** 完了画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、イベント一覧画面に遷移する

#### Scenario: 履歴画面経由のキャンセル成功後の挙動
- **WHEN** 履歴画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、画面遷移は行われず、対象行のバッジが「キャンセル済」に切り替わる

#### Scenario: 詳細画面経由のキャンセル成功後の遷移
- **WHEN** 詳細画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、`/history` に `router.replace` で遷移する

#### Scenario: 当日 0:00 JST 以降はキャンセル不可
- **WHEN** 現在時刻が `events.start_at` の JST 開催日 0:00 JST 以降の状態でキャンセル動線を確認する
- **THEN** どの経路でも CancelBookingDialog が「キャンセル期限を過ぎています」案内 (LINE オープンチャットリンク付き) を表示し、確定 CTA は描画されない

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** events.cancel_deadline に過去日時が設定されているが現在時刻が `events.start_at` の JST 前日中の予約に対してキャンセル操作
- **THEN** どの経路でもキャンセル可能として扱われる (cancel_deadline 列は判定に影響しない)

#### Scenario: 他人の予約のキャンセル試行
- **WHEN** ある会員が他人の reservation_id を改ざんしてキャンセル UPDATE を試行
- **THEN** RLS により拒否され、エラーが UI に表示される
