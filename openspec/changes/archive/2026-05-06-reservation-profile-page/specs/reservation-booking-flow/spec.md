## MODIFIED Requirements

### Requirement: 予約キャンセル

会員サイトは自分の予約をキャンセルする操作を SHALL 提供する。MVP1 ではキャンセル動線を以下の 2 経路で MUST 提供する:

- 予約完了画面 (`booking-done`) の「予約をキャンセル」アクション（直近の予約用）
- プロフィール画面 (`/profile`) の予約履歴一覧の各行のキャンセルボタン（後追い用）

両経路の判定基準と挙動は同一とし、コードを共通化する MUST。プロフィール画面側の詳細仕様は `reservation-profile-page` capability に委ねる SHALL。

キャンセル可否はイベント開催開始時刻 (`events.start_at`) と現在時刻の比較で判定する MUST:

- `events.start_at > now()` (開催前) のとき: キャンセル可能
- `events.start_at <= now()` (開催開始以降) のとき: キャンセル不可

`events.cancel_deadline` 列は本 capability では参照しない MUST NOT (MVP1 スコープアウト)。

キャンセル可能時は ConfirmDialog を経由し、確定操作で reservations.status を `'reserved' → 'cancelled'` に更新する MUST。`cancelled_at` は DB トリガー (`set_reservations_cancelled_at`) で自動設定される。成功時は完了トーストを表示し、完了画面経由のキャンセルではイベント一覧画面へ遷移する MUST、プロフィール画面経由のキャンセルでは同画面に留まり対象行を `'cancelled'` 表示に切り替える MUST。

キャンセル不可時 (開催開始以降) はキャンセル CTA を無効化し、「イベント開催が始まっているためキャンセルできません。やむを得ない事情がある場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください」相当の案内文を SHALL 表示する。LINE オープンチャットへの外部リンクを案内文中に含める MUST。本 capability では admin への自動通知や問い合わせフォーム連携は行わない MUST NOT (MVP2)。

#### Scenario: キャンセル可能時の動線（完了画面経由）
- **WHEN** 完了画面の「予約をキャンセル」を押下し、現在時刻が events.start_at より前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: キャンセル可能時の動線（プロフィール画面経由）
- **WHEN** プロフィール画面の予約履歴一覧で未来予約のキャンセルボタンを押下する
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 完了画面経由のキャンセル成功後の遷移
- **WHEN** 完了画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、イベント一覧画面に遷移する

#### Scenario: プロフィール画面経由のキャンセル成功後の挙動
- **WHEN** プロフィール画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、画面遷移は行われず、対象行のバッジが「キャンセル済」に切り替わる

#### Scenario: 開催開始以降はキャンセル不可
- **WHEN** 現在時刻が events.start_at 以降の状態でキャンセル動線を確認する
- **THEN** どの経路でも「予約をキャンセル」CTA は disabled となり、High Q 公式チャットへの問い合わせ案内が表示される（プロフィール画面ではキャンセルボタン自体が非表示）

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** events.cancel_deadline に過去日時が設定されているが events.start_at が未来の予約に対してキャンセル操作
- **THEN** どの経路でもキャンセル可能として扱われる (cancel_deadline 列は判定に影響しない)

#### Scenario: 他人の予約のキャンセル試行
- **WHEN** ある会員が他人の reservation_id を改ざんしてキャンセル UPDATE を試行
- **THEN** RLS により拒否され、エラーが UI に表示される
