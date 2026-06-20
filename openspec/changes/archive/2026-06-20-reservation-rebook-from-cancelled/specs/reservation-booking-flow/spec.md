## ADDED Requirements

### Requirement: 予約 Sheet のディープリンク起動 (再予約導線)

会員サイトはイベント詳細画面 (`event-detail`) に対し、**クエリパラメータによる予約 Sheet（create モード）の自動オープン** を SHALL 提供する。これは再予約導線（履歴の「再予約する」/ 完了画面の「やっぱり予約する」）の共通着地点とする MUST。

イベント詳細画面はマウント時に所定の自動オープンクエリを検知し、**対象イベントが受付可能なときに限り** create モードの予約 Sheet を自動オープンする MUST。受付可能の判定は新規予約と同一基準（`events.start_at > now()`（未開催）かつ 満席でない（`formatAvailability(availability).isFull === false`））とする MUST。受付不可（受付終了 / 満席）のときは Sheet を開かず、通常のイベント詳細（締切表示を含む）を描画する MUST。

自動オープン後はブラウザ戻る操作等による再発火を防ぐため、当該クエリパラメータを履歴から除去する MUST（`router.replace` 相当でクエリを除く）。

自動オープンで開いた Sheet の挙動（入力欄 / 合計金額 / localStorage 復元 / 確定経路 / 重複・再活性化処理）は通常の create モードと同一とする MUST。すなわち過去キャンセル済予約があれば確定時に既存行が再活性化される（「予約確認 Bottom Sheet」要件の create モード挙動に従う）。

#### Scenario: 受付可能イベントでの自動オープン
- **WHEN** 受付可能（未開催かつ非満席）なイベントの詳細画面に自動オープンクエリ付きで遷移する
- **THEN** create モードの予約 Sheet が自動的に立ち上がる

#### Scenario: 受付不可イベントでは自動オープンしない
- **WHEN** 受付終了（開催済）または満席のイベントの詳細画面に自動オープンクエリ付きで遷移する
- **THEN** 予約 Sheet は開かず、通常のイベント詳細（締切表示）が描画される

#### Scenario: 自動オープンクエリの除去
- **WHEN** 自動オープンクエリで予約 Sheet が開いた直後に URL を確認する
- **THEN** 自動オープンクエリは URL から除去されており、ブラウザ戻る操作で Sheet が再オープンされない

#### Scenario: 自動オープン経由でのキャンセル後再予約
- **WHEN** 過去キャンセル済予約 (`status='cancelled'`) を持つ会員が自動オープンで開いた create Sheet で予約を確定する
- **THEN** 既存行が `'reserved'` に再活性化され、完了画面へ遷移する（通常 create モードと同一の再活性化挙動）

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

キャンセル可能時は ConfirmDialog を経由し、確定操作で reservations.status を `'reserved' → 'cancelled'` に更新する MUST。`cancelled_at` は DB トリガー (`set_reservations_cancelled_at`) で自動設定される。成功時は完了トーストを表示し、経路ごとに以下の遷移挙動を取る MUST:

- **完了画面経由**: キャンセルした **イベントが受付可能（未開催かつ非満席）なとき**は、イベント一覧へ遷移せず、完了画面上に「やっぱり予約する」再予約導線を含む結果表示へ切り替える MUST。「やっぱり予約する」は対象イベント詳細へ遷移し、予約 Sheet（create モード）自動オープンのディープリンク（「予約 Sheet のディープリンク起動」要件）を起動する MUST。結果表示には「イベント一覧へ」の退出導線も併存させる MUST。**イベントが受付不可（開催済 / 満席）なとき**は、従来どおりイベント一覧画面へ遷移する MUST
- **履歴画面経由**: 同画面に留まり対象行を `'cancelled'` 表示に切り替える MUST（当該行は「キャンセル済み」グループへ移動し、受付可能なら再予約導線を持つ）
- **詳細画面経由**: 履歴画面へ `router.replace` で遷移する MUST

キャンセル不可時 (当日 0:00 JST 以降) はキャンセル CTA を無効化し、「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません。やむを得ない事情がある場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください」相当の案内文を SHALL 表示する。LINE オープンチャットへの外部リンクを案内文中に含める MUST。本 capability では admin への自動通知や問い合わせフォーム連携は行わない MUST NOT (MVP2)。

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（完了画面経由）
- **WHEN** 完了画面の「予約をキャンセル」を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（履歴画面 / 詳細画面経由）
- **WHEN** 履歴画面の予約中行 / 詳細画面のキャンセル CTA を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 完了画面経由のキャンセル成功後の遷移（受付不可イベント）
- **WHEN** 完了画面からのキャンセル確定が成功し、対象イベントが受付不可（開催済 / 満席）
- **THEN** 完了トーストが表示され、イベント一覧画面に遷移する

#### Scenario: 完了画面経由のキャンセル成功後の再予約導線（受付可能イベント）
- **WHEN** 完了画面からのキャンセル確定が成功し、対象イベントが受付可能（未開催かつ非満席）
- **THEN** イベント一覧へは遷移せず、完了画面上に「やっぱり予約する」導線と「イベント一覧へ」退出導線を含む結果表示が描画される

#### Scenario: 完了画面の「やっぱり予約する」でディープリンク起動
- **WHEN** 完了画面のキャンセル後結果表示で「やっぱり予約する」を押下する
- **THEN** 対象イベント詳細へ遷移し、予約 Sheet（create モード）自動オープンのディープリンクが起動される

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
- **THEN** RLS により 0 行更新となり、エラーが UI に表示される
