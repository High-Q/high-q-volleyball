# reservation-history-page Specification

## Purpose
予約履歴画面 `/history` を独立画面として提供し、会員が自分の参加統計と予約履歴（予約中 + 過去）を 1 画面で確認・管理できるようにする。Bottom Tab Bar の「履歴」タブの正規遷移先。プロフィール画面 (`/profile`) は会員自身の属性管理（LEVEL / ACCOUNT）と参加サマリ（集計 3 行）に専念する形に整理し、履歴 + 個別キャンセル動線は本画面に集約する。

## Requirements

### Requirement: `/history` ルートとアクセス制限

`apps/reservation` は `/history` ルートを SHALL 提供する。本ルートは **認証済 + プロフィール完成 + 本人確認書類提出済** の会員のみアクセス可能とする MUST。未認証 / プロフィール未完成 / 書類未提出のユーザーがアクセスした場合は、既存の auth guard チェーン（`/login` / `/signup/profile` / `/signup/identity`）に従ってリダイレクトされる SHALL。

ルート定義は `apps/reservation/src/app/router.ts` の `routes` 配列に `path: '/history'`, `name: 'history'`, `component: HistoryPage` で追加する MUST。`meta.public` は持たない MUST NOT。

#### Scenario: ルート定義の存在
- **WHEN** `apps/reservation/src/app/router.ts` の routes 配列を確認する
- **THEN** `path: '/history'` / `name: 'history'` のルート定義が存在する

#### Scenario: 未認証ユーザーのアクセス
- **WHEN** 未認証ユーザーが `/history` にアクセスする
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: プロフィール未完成ユーザーのアクセス
- **WHEN** 認証済 + `isProfileComplete === false` のユーザーが `/history` にアクセスする
- **THEN** auth guard により `/signup/profile` にリダイレクトされる

#### Scenario: 書類未提出ユーザーのアクセス
- **WHEN** 認証済 + プロフィール完成 + `hasIdentityDocument === false` のユーザーが `/history` にアクセスする
- **THEN** auth guard により `/signup/identity` にリダイレクトされる

#### Scenario: 完成会員の正常アクセス
- **WHEN** 認証済 + プロフィール完成 + 書類提出済のユーザーが `/history` にアクセスする
- **THEN** HistoryPage が描画される

### Requirement: 履歴画面ヘッダ

HistoryPage はヘッダ領域に以下を SHALL 表示する:

- 「履歴」の大見出し（`<h1>` / 既存 jp-serif トーン）
- 取得済み予約件数の `{N} ENTRIES` モノスペース注記（`reservations.length` を反映）
- パンくず（`widgets/page-breadcrumb/PageBreadcrumb` 1 箇所のみ・`マイページ > 履歴`）

#### Scenario: 件数注記の更新
- **WHEN** 会員が予約 7 件を持つ状態で `/history` を開く
- **THEN** ヘッダに「7 ENTRIES」と表示される

#### Scenario: 件数 0 の表示
- **WHEN** 会員が予約 0 件の状態で `/history` を開く
- **THEN** ヘッダに「0 ENTRIES」と表示される

### Requirement: Stats Strip（TOTAL / NEXT / STREAK）

HistoryPage はヘッダ直下に Stats Strip を SHALL 表示する。3 列グリッドで以下の 3 メトリクスを表示する MUST:

- **TOTAL**: `reservations.filter(r => r.status === 'attended').length`（単位「回 参加」）
- **NEXT**: 次回予定（`status='reserved'` AND `events.start_at > now()` で最早の予約）までの**カレンダー日数差**（時刻成分を 0 時に丸めた日付同士の差・単位「日後」）。同日中は 0 日 / 翌日 0 時以降は 1 日 / 5 日後 19 時は 5 日となる。次回予定が存在しないとき `—` を表示する MUST
- **STREAK**: `attended` の予約を `YYYY-MM` でユニーク化し、最新の参加月から逆順に**隣接月で連続している月数**をカウント（単位「ヶ月連続」）。`attended` 0 件のときは `0`

集計はクライアント側 pure function `computeHistoryStats(reservations, now)` で算出する MUST。`event_participants_view` 等の DB view には依存しない MUST NOT。

#### Scenario: TOTAL の集計
- **WHEN** `attended` 3 件 / `reserved` 2 件 / `cancelled` 1 件の会員が `/history` を開く
- **THEN** TOTAL に「3」が表示される

#### Scenario: NEXT の日数表示
- **WHEN** 現在時刻が `2026-05-07 09:00 JST` で、`status='reserved'` AND `events.start_at='2026-05-15 19:00 JST'` の予約がある
- **THEN** NEXT に「8」（日後）が表示される（カレンダー日数差: 5/15 − 5/7 = 8）

#### Scenario: NEXT の同日表示
- **WHEN** 現在時刻が `2026-05-07 09:00 JST` で、同日 `status='reserved'` AND `events.start_at='2026-05-07 21:00 JST'` の予約がある
- **THEN** NEXT に「0」（日後）が表示される

#### Scenario: NEXT の `—` 表示
- **WHEN** 未来の `reserved` 予約が 1 件もない
- **THEN** NEXT に「—」が表示される

#### Scenario: STREAK の連続月数
- **WHEN** `attended` の `start_at` が `2026-05-03` / `2026-04-12` / `2026-03-22` / `2026-01-10`（2 月飛ばし）の 4 件で、現在月が `2026-05`
- **THEN** STREAK に「3」（ヶ月連続）が表示される

#### Scenario: STREAK が 0 のケース
- **WHEN** `attended` 0 件、もしくは最新参加月が現在月および前月の双方を含まない
- **THEN** STREAK に「0」が表示される

### Requirement: 予約中グループ

HistoryPage は Stats Strip の下に「予約中」グループを SHALL 表示する。`status === 'reserved'` AND `Date.parse(event.startAt) > now()` を満たす予約を `events.start_at ASC`（直近予定が先頭）で並べる MUST。

グループ見出しは「— 予約中 · {N}」のモノスペース kicker（`N` は予約中グループの件数）。0 件のときグループ自体を非表示にする MUST。

各行には「予約中」バッジ（accent + dot）を配置する MUST。

#### Scenario: 予約中グループの並び順
- **WHEN** `status='reserved'` AND 未来の予約が 3 件（`2026-06-01` / `2026-05-20` / `2026-05-12`）ある
- **THEN** `2026-05-12` / `2026-05-20` / `2026-06-01` の順に並ぶ（ASC）

#### Scenario: 予約中 0 件の表示
- **WHEN** 予約中グループに該当する予約が 0 件
- **THEN** 「予約中」見出しと枠ごと描画されない

### Requirement: 過去グループ

HistoryPage は予約中グループの下に「過去」グループを SHALL 表示する。`status` が `'attended'` / `'cancelled'` / `'no_show'` / `'waitlist'`、または `status='reserved'` だが `event.startAt <= now()`（不整合）の予約を `events.start_at DESC`（最新が先頭）で並べる MUST。

グループ見出しは「— 過去 · {N}」のモノスペース kicker。

行のバッジは状態によって以下を表示する MUST:

- `'attended'` → 「参加済」（success + dot）
- `'cancelled'` → 「キャンセル」（neutral）
- `'no_show'` → 「未参加」（neutral）
- `'waitlist'` → 「キャンセル待ち」（neutral）
- `'reserved'`（過去・不整合）→ 「予約中」（accent + dot）+ 注記不要（描画はするが数は少ない想定）

`'cancelled'` の行はイベント名を取消線（`line-through`）+ muted 色で描画する MUST。

#### Scenario: 過去グループの並び順
- **WHEN** 過去グループに該当する予約が複数ある
- **THEN** `events.start_at` の降順に並ぶ

#### Scenario: キャンセル済の取消線表示
- **WHEN** `status='cancelled'` の行を確認する
- **THEN** イベント名が `line-through` + muted 色で描画される

#### Scenario: 状態バッジ
- **WHEN** 各 status の行を確認する
- **THEN** `attended`→「参加済」, `cancelled`→「キャンセル」, `no_show`→「未参加」, `waitlist`→「キャンセル待ち` のバッジが表示される

### Requirement: 履歴行の表示構成

各履歴行は以下を SHALL 表示する:

- 日付セル: `MM/DD` + 曜日（モノスペース・小文字 1 行ずつ・左端配置）
- イベント名（`events.name`）
- 会場名（`venues.name` を `events.venues` JOIN から取得）
- 開催時間（`events.start_at` の HH:mm）
- 予約番号（`#HQ-...` 形式・`formatReservationNumber(reservation.id)` で生成・既存ヘルパ流用）
- 状態バッジ（前述）

本 change 段階では行は **非リンク** として描画し、押下フィードバック（hover / cursor: pointer / active）を与えない MUST。詳細画面（Issue #213・MVP1）実装時に `<router-link :to="{ name: 'reservation-detail', params: { reservationId: row.id } }">` へ単純置換できる構造にする。

#### Scenario: 行の表示構成
- **WHEN** 任意の予約行を確認する
- **THEN** 日付セル / イベント名 / 会場 / 時間 / 予約番号 / 状態バッジ がすべて描画される

#### Scenario: 行は押下不可
- **WHEN** 履歴行をクリックする
- **THEN** 何も発生しない（遷移しない / cursor: pointer も付かない）

### Requirement: 予約中グループからのキャンセル動線

予約中グループの各行（`status='reserved'` AND `events.start_at > now()`）には「予約をキャンセル」ボタンが SHALL 配置される。押下で既存 `features/booking/CancelBookingDialog` を経由し、確定操作で `reservations.status` を `'reserved' → 'cancelled'` に UPDATE する MUST。

判定基準は `events.start_at` のみ。`events.cancel_deadline` 列は参照しない MUST NOT（reservation-booking-flow spec と整合）。

キャンセル成功時は対象行を UI 上で `status='cancelled'` に書き換え、再 fetch を発行しない SHALL。書き換えにより当該行は予約中グループから過去グループへ移動し、過去グループの先頭付近に「キャンセル」バッジ + 取消線で再描画される MUST。完了トーストを表示する MUST。

エラー時の文言は既存 `features/booking` の挙動を継承する SHALL（`rls`→「この予約はキャンセルできません」/ `network`→「通信エラーが発生しました。再試行してください」/ その他→「キャンセル処理に失敗しました」）。

#### Scenario: 予約中行のキャンセル成功
- **WHEN** 予約中グループの「予約をキャンセル」ボタンを押し、Dialog で「キャンセルする」を選択する
- **THEN** `reservations.status` が `'cancelled'` に UPDATE され、当該行は予約中グループから消え、過去グループに「キャンセル」バッジ + 取消線で表示される

#### Scenario: 過去グループにキャンセルボタンが存在しない
- **WHEN** 過去グループの任意の行を確認する
- **THEN** 「予約をキャンセル」ボタンは描画されない（DOM に存在しない）

#### Scenario: 予約中（不整合: 開始済）にキャンセルボタンが存在しない
- **WHEN** `status='reserved'` AND `event.startAt <= now()` の行（過去グループに分類される）を確認する
- **THEN** 「予約をキャンセル」ボタンは描画されない

### Requirement: 4 状態 UI

HistoryPage は以下 4 状態を SHALL 持つ:

- **Loading**: `member` 未確定または初回 `fetchMyReservations` 完了前。ヘッダ + Stats Strip + 2 グループ枠を skeleton 表示
- **Empty**: `reservations.length === 0`。Stats Strip は計算結果（TOTAL=0 / NEXT=`—` / STREAK=0）を表示し、グループ領域は「まだ予約がありません。`/events` から最初の予約を取りましょう。」を kicker 風 + `/events` への CTA で表示
- **Error**: 取得失敗時。画面上部に Error バナー（赤系）+ 「再試行」ボタンを表示
- **Success**: 通常表示

#### Scenario: Loading
- **WHEN** 初回ロード中（`member === null` または `loading === true`）
- **THEN** ヘッダ・Stats Strip 枠・予約中枠・過去枠が skeleton で描画される

#### Scenario: Empty
- **WHEN** 取得成功で `reservations` が空配列
- **THEN** Stats Strip は 0 / `—` / 0 を表示し、グループ領域に「まだ予約がありません」+ `/events` CTA が表示される

#### Scenario: Error
- **WHEN** `fetchMyReservations` が失敗する
- **THEN** 画面上部に Error バナーと再試行ボタンが表示される

### Requirement: RLS

`fetchMyReservations(uid)` は `reservations.member_id = auth.uid()` の RLS により他会員の行を返さない SHALL。アプリ層でも `member_id` 条件を明示的にクエリ条件に含めることで二重防衛とする MUST。

#### Scenario: 他会員の予約は取得されない
- **WHEN** 会員 A が `/history` を開いて取得した予約配列を確認する
- **THEN** すべての予約の `member_id` が `auth.uid()` に一致する

### Requirement: モバイルファースト + アクセシビリティ AA

HistoryPage は 390px viewport（mobile）を first target とする MUST。HQ デザイントークン（`var(--hq-*)` および Tailwind preset utility）のみを使用し、マジックナンバー（`#fbf8f1` / `16px` 等の直書き）を含めない MUST NOT。

カラーコントラスト比は AA（4.5:1）以上を満たす MUST。Stats Strip は `<dl>` / `<dt>` / `<dd>` でセマンティック化し、状態バッジには日本語ラベル（「予約中」「参加済」など）を `aria-label` または可視テキストで提供する MUST。

#### Scenario: 横スクロールなしで描画
- **WHEN** 390px viewport で `/history` を開く
- **THEN** ヘッダ・Stats Strip・両グループ・履歴行・Bottom Tab Bar が横スクロールなしで描画される

#### Scenario: デザイントークンの使用
- **WHEN** ソースコードを `grep` で検査する
- **THEN** マジックナンバー（直書きの色コード / px 値）は HistoryPage 配下の新規ファイルに存在しない

### Requirement: E2E（auth guard 統合）

履歴画面の E2E は **1 件のみ** 追加する MUST: 「未認証ユーザーが `/history` に直接アクセスすると `/login` にリダイレクトされる」。

集計ロジック / グループ分割 / キャンセル動線 / バッジ表示 / Bottom Tab Bar の active 判定の詳細検証は component test + unit test に押し下げる MUST（既存 reservation-profile-page spec と同じスケーラビリティ運用パターン）。

#### Scenario: 未認証で `/history` アクセス
- **WHEN** 未認証ユーザーが Playwright で `/history` を開く
- **THEN** `/login` にリダイレクトされ、URL が `/login` で停止する
