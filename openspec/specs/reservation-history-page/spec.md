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

HistoryPage は「キャンセル済み」グループの下に「過去」グループを SHALL 表示する。`status` が `'attended'` / `'no_show'`、または `status='waitlist'` だが `event.startAt <= now()`（開催済みの待機）、または `status='reserved'` だが `event.startAt <= now()`（不整合）の予約を `events.start_at DESC`（最新が先頭）で並べる MUST。**未来の `status='waitlist'`（`event.startAt > now()`）は過去グループに含めず、キャンセル待ちグループへ振り分ける** MUST。

`status === 'cancelled'` の予約は受付可否を問わず「キャンセル済み」グループに集約するため、過去グループには **含めない** MUST NOT。

グループ見出しは「— 過去 · {N}」のモノスペース kicker。

行のバッジは状態によって以下を表示する MUST:

- `'attended'` → 「参加済」（success + dot）
- `'no_show'` → 「未参加」（neutral）
- `'waitlist'`（過去・開催済み）→ 「キャンセル待ち」（neutral）
- `'reserved'`（過去・不整合）→ 「予約中」（accent + dot）+ 注記不要（描画はするが数は少ない想定）

#### Scenario: 過去グループの並び順
- **WHEN** 過去グループに該当する予約が複数ある
- **THEN** `events.start_at` の降順に並ぶ

#### Scenario: 状態バッジ
- **WHEN** 各 status の行を確認する
- **THEN** `attended`→「参加済」, `no_show`→「未参加」, 過去 `waitlist`→「キャンセル待ち」 のバッジが表示される

#### Scenario: キャンセル済は過去グループに含まれない
- **WHEN** `status='cancelled'` の予約（受付可能・受付終了いずれも）がある
- **THEN** 当該行は過去グループには描画されず、「キャンセル済み」グループに描画される

#### Scenario: 未来のキャンセル待ちは過去グループに含まれない
- **WHEN** `status='waitlist'` AND `event.startAt > now()` の予約が存在する
- **THEN** 当該予約は過去グループには描画されず、キャンセル待ちグループに振り分けられる

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

### Requirement: キャンセル済みグループ

HistoryPage は「予約中」グループの下、「過去」グループの上に「キャンセル済み」グループを SHALL 表示する。本グループには **`status === 'cancelled'` の予約すべて**（受付可否を問わず）を集約し、過去グループから分離する MUST。

並び順は **受付可能（再予約可）な行を先頭に `events.start_at ASC`、続いて受付不可な行を `events.start_at DESC`** とし、再予約できる予約を上に前面化する MUST。受付可能の判定は以下をすべて満たすこととする MUST:

- `Date.parse(event.startAt) > now()`（イベント未開催）
- 満席でない（`formatAvailability(event.availability).isFull === false`）

受付可否の判定述語はクライアント側の純関数として実装し、グループ分割（`splitReservations`）の中で「キャンセル済み」グループの分離と並び替えに用いる MUST。同一予約を「キャンセル済み」と「過去」の双方に二重掲載しない MUST NOT。

グループ見出しは「— キャンセル済み · {N}」のモノスペース kicker（`N` は本グループの件数）。0 件のときグループ自体を非表示にする MUST。

各行のバッジは「キャンセル」（neutral）を表示し、イベント名は取消線（`line-through`）+ muted 色で描画する MUST。

各行のうち **受付可能（未開催かつ非満席）な行にのみ** 「再予約する」CTA を SHALL 配置する。受付終了（開催済）または満席の行には「再予約する」CTA を描画しない MUST NOT。「再予約する」CTA 押下で対象イベント詳細画面（`event-detail`）へ遷移し、予約 Sheet（create モード）を自動オープンするディープリンク経路を起動する MUST（経路の詳細は `reservation-booking-flow` capability の「予約 Sheet のディープリンク起動」要件に従う）。CTA 押下時は親 router-link への伝播を `event.stopPropagation()` 相当で抑制する MUST。

#### Scenario: キャンセル済みグループの集約
- **WHEN** `status='cancelled'` の予約が複数（受付可能・受付終了が混在）ある状態で `/history` を開く
- **THEN** すべてのキャンセル済予約が「キャンセル済み」グループに表示され、「過去」グループには 1 件も表示されない

#### Scenario: キャンセル済みグループの並び順
- **WHEN** キャンセル済みグループに受付可能な行（`2026-06-25` / `2026-06-20`・未開催非満席）と受付終了の行（`2026-05-10` / `2026-05-01`・開催済）がある
- **THEN** 受付可能を先頭に `2026-06-20` / `2026-06-25`（ASC）、続いて受付終了を `2026-05-10` / `2026-05-01`（DESC）の順に並ぶ

#### Scenario: 受付可能な行に「再予約する」CTA を表示
- **WHEN** `status='cancelled'` かつ `event.startAt > now()` かつ非満席の行を確認する
- **THEN** 当該行に「再予約する」CTA が描画される

#### Scenario: 受付終了・満席の行に「再予約する」CTA を出さない
- **WHEN** `status='cancelled'` かつ（`event.startAt <= now()`（開催済）または満席（`isFull === true`））の行を確認する
- **THEN** 当該行に「再予約する」CTA は描画されない（DOM に存在しない）

#### Scenario: キャンセル済み 0 件の表示
- **WHEN** `status='cancelled'` の予約が 0 件
- **THEN** 「キャンセル済み」見出しと枠ごと描画されない

#### Scenario: 「再予約する」CTA でイベント詳細へディープリンク
- **WHEN** キャンセル済みグループの受付可能な行の「再予約する」CTA を押下する
- **THEN** 対象イベント詳細画面へ遷移し、予約 Sheet（create モード）自動オープンのディープリンクが起動され、予約詳細画面への遷移は発生しない

#### Scenario: 「再予約する」CTA の伝播抑制
- **WHEN** キャンセル済みグループの受付可能な行の「再予約する」CTA を押下する
- **THEN** 親 router-link（予約詳細画面への遷移）は発火しない

### Requirement: キャンセル待ちグループ

HistoryPage は予約中グループの下、過去グループの上に「キャンセル待ち」グループを SHALL 表示する。`status === 'waitlist'` AND `Date.parse(event.startAt) > now()` を満たす予約を `events.start_at ASC`（直近予定が先頭）で並べる MUST。

グループ見出しは「— キャンセル待ち · {N}」のモノスペース kicker（`N` はキャンセル待ちグループの件数）。0 件のときグループ自体を非表示にする MUST。

各行には「キャンセル待ち」バッジを配置する MUST。未来のキャンセル待ちは「過去」ではないため、過去グループに混入させては SHALL NOT ならない。

#### Scenario: 未来のキャンセル待ちはキャンセル待ちグループに入る
- **WHEN** `status='waitlist'` AND 未来の予約が存在する状態で `/history` を開く
- **THEN** 当該予約はキャンセル待ちグループに `events.start_at ASC` で描画され、過去グループには現れない

#### Scenario: キャンセル待ち 0 件の表示
- **WHEN** 未来のキャンセル待ちが 0 件
- **THEN** 「キャンセル待ち」見出しと枠ごと描画されない

### Requirement: キャンセル待ちグループからの取り消し動線

キャンセル待ちグループの各行には「キャンセル待ちを取り消す」ボタンが SHALL 配置される。押下で確認ダイアログを経由し、確定操作で当該 `waitlist` 行を **DELETE** する MUST。

通常予約のキャンセルと異なり、開催日基準の期限ゲートは適用 SHALL NOT する（いつでも取り消せる）。取り消し時にメール通知は送信 SHALL NOT する。

取り消し成功時は対象行を UI 上の一覧から除去し、再 fetch を発行しない SHALL。撤回した待機はキャンセル待ちグループから消え、過去グループにも `'cancelled'` として現れては SHALL NOT ならない（行が削除されるため）。完了フィードバックを表示する MUST。

#### Scenario: キャンセル待ち行の取り消し成功
- **WHEN** キャンセル待ちグループの「キャンセル待ちを取り消す」を押し、ダイアログで確定する
- **THEN** 当該 `waitlist` 行が DELETE され、当該行はキャンセル待ちグループから消え、過去グループにも「キャンセル」として現れない

#### Scenario: 撤回した待機は過去グループに残らない
- **WHEN** キャンセル待ちを撤回した後に履歴を再読み込みする
- **THEN** 当該イベントは過去グループにキャンセル済みとして現れない（DELETE により行が存在しない）

#### Scenario: 過去グループにキャンセル待ち取り消しボタンが存在しない
- **WHEN** 過去グループの任意の行を確認する
- **THEN** 「キャンセル待ちを取り消す」ボタンは描画されない

