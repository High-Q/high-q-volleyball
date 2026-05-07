# reservation-detail-page Specification

## Purpose
TBD - created by archiving change reservation-detail-page. Update Purpose after archive.
## Requirements
### Requirement: `/reservations/:reservationId` ルートとアクセス制限

`apps/reservation` は `/reservations/:reservationId` ルートを SHALL 提供する。本ルートは **認証済 + プロフィール完成 + 本人確認書類提出済** の会員のみアクセス可能とする MUST。未認証 / プロフィール未完成 / 書類未提出のユーザーがアクセスした場合は、既存 auth guard チェーン（`/login` / `/signup/profile` / `/signup/identity`）に従ってリダイレクトされる SHALL。

ルート定義は `apps/reservation/src/app/router.ts` の `routes` 配列に `path: '/reservations/:reservationId'`, `name: 'reservation-detail'`, `component: ReservationDetailPage` で追加する MUST。`meta.public` は持たない MUST NOT。`reservationId` パラメータは UUID 形式を期待し、Branded Type `ReservationId` を経由して扱う MUST。

#### Scenario: ルート定義の存在
- **WHEN** `apps/reservation/src/app/router.ts` の routes 配列を確認する
- **THEN** `path: '/reservations/:reservationId'` / `name: 'reservation-detail'` のルート定義が存在する

#### Scenario: 未認証ユーザーのアクセス
- **WHEN** 未認証ユーザーが `/reservations/<uuid>` にアクセスする
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: プロフィール未完成ユーザーのアクセス
- **WHEN** 認証済 + `isProfileComplete === false` のユーザーが `/reservations/<uuid>` にアクセスする
- **THEN** auth guard により `/signup/profile` にリダイレクトされる

#### Scenario: 書類未提出ユーザーのアクセス
- **WHEN** 認証済 + プロフィール完成 + `hasIdentityDocument === false` のユーザーが `/reservations/<uuid>` にアクセスする
- **THEN** auth guard により `/signup/identity` にリダイレクトされる

#### Scenario: 完成会員の正常アクセス
- **WHEN** 認証済 + プロフィール完成 + 書類提出済のユーザーが自分の予約 ID で `/reservations/<uuid>` にアクセスする
- **THEN** ReservationDetailPage が描画される

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

### Requirement: パンくずナビゲーションと Top Bar

ReservationDetailPage はヘッダ領域に以下を SHALL 表示する:

- パンくず（`widgets/page-breadcrumb/PageBreadcrumb` 1 箇所のみ・`マイページ > 履歴 > 予約詳細`）
- Top Bar（戻る矢印 + 「予約詳細」見出し）。戻る矢印は `router.back()` 相当の挙動とし、直接 URL アクセス時は `/history` への代替遷移とする MUST

第 3 セグメント「予約詳細」は当該画面自身を示すラベルであり、リンクは持たない MUST NOT。「履歴」セグメントは `/history` への戻り導線を SHALL 提供し、双方向性ルールを満たす MUST。

#### Scenario: パンくず構造
- **WHEN** ReservationDetailPage にアクセス
- **THEN** 「マイページ > 履歴 > 予約詳細」の 3 段パンくずが画面ヘッダ領域に描画される

#### Scenario: 履歴リンクの動作
- **WHEN** パンくずの「履歴」を押下
- **THEN** `/history` に遷移する

#### Scenario: Top Bar 戻る矢印
- **WHEN** Top Bar の戻る矢印を押下する
- **THEN** ブラウザ履歴がある場合は前画面に、ない場合は `/history` に遷移する

### Requirement: Reservation Header（予約番号 kicker + イベント名）

ReservationDetailPage はメインコンテンツの先頭に Reservation Header を SHALL 表示する。Header は次の 2 要素で構成される MUST:

- 予約番号 kicker: `— Reservation #HQ-XXXX-XXXX` 形式（モノスペース）。`formatReservationNumber(reservation.id)` で生成し、生 UUID は描画しない MUST NOT
- イベント名見出し: ブランド和文セリフ書体、`<h1>` レベル

#### Scenario: 予約番号の表示形式
- **WHEN** ReservationDetailPage に到達
- **THEN** kicker に `— Reservation #HQ-XXXX-XXXX` 形式の予約番号が描画され、生 UUID は描画されない

#### Scenario: イベント名の表示
- **WHEN** ReservationDetailPage に到達
- **THEN** イベント名が `<h1>` で 1 度だけ描画される（パンくずの「予約詳細」と重複しない）

### Requirement: Dark Fact Card（あと N 日 + 開催日 + 時間 + 会場）

ReservationDetailPage は Reservation Header の直下に Dark Fact Card を SHALL 表示する。Card は ink 背景 + paper 文字色とし、以下を順序固定で表示する MUST:

- カウントダウン kicker: `— あと N 日` / `— 当日` / `— 開催終了`。`N` は `events.start_at` と現在時刻の **JST カレンダー日数差**（時刻成分を 0 時に丸めた日付差）。同日中は「— 当日」、`events.start_at` が現在時刻以降かつ同日でないときは `— あと N 日` (N >= 1)、`events.start_at <= now()` のときは `— 開催終了`
- 開催日: `MM / DD` 形式 + 曜日略号（`MON` / `TUE` 等の 3 文字大文字、モノスペース）
- 時間 + 会場: `HH:mm – HH:mm · {会場名}`（モノスペース時間 + 中点 + 和文会場名）

カウントダウン kicker の **色** は残日数に応じて出し分ける MUST:
- 「— 当日」および「— あと N 日 (N ≤ 7)」: accent 系（緊急性のあるトーン）
- 「— あと N 日 (N ≥ 8)」: muted 系（緊急性のない、落ち着いたトーン）
- 「— 開催終了」: muted 系

これは「2 ヶ月先の予約に accent 色を使うと緊急性のノイズになる」観点に基づく。

`events.start_at` / `events.end_at` の表示は JST 固定とする MUST（`@/shared/lib/jst-calendar` を流用）。

#### Scenario: 7 日以内のカウントダウンは accent 色
- **WHEN** 現在時刻が `2026-05-07 09:00 JST` で `events.start_at = 2026-05-12 19:30 JST` (= 5 日後)
- **THEN** Dark Fact Card に「— あと 5 日」が accent 系の色で描画される

#### Scenario: 8 日以上先のカウントダウンは muted 色
- **WHEN** 現在時刻が `2026-05-07 09:00 JST` で `events.start_at = 2026-05-15 19:30 JST` (= 8 日後)
- **THEN** Dark Fact Card に「— あと 8 日」が muted 系の色で描画され、accent 色は使われない

#### Scenario: 当日は accent 色
- **WHEN** 現在時刻が `events.start_at` と同日（JST カレンダー日付一致）
- **THEN** Dark Fact Card に「— 当日」が accent 色で描画される

#### Scenario: 開催開始以降の表示
- **WHEN** `events.start_at <= now()` の予約を表示
- **THEN** Dark Fact Card に「— 開催終了」が muted 色で描画される

### Requirement: Meta テーブル（参加費 / 同伴者 / 予約日時）

ReservationDetailPage は Dark Fact Card の下に Meta テーブルを SHALL 表示する。`<dl>` / `<dt>` / `<dd>` のセマンティック構造で以下 2 行を順序固定で表示する MUST:

- 参加費: `¥{fee}（当日現金）` 形式。`events.fee` が NULL のとき `venues.default_fee` を使用する MUST。両方 NULL のとき `—` を表示する MUST
- 同伴者: `{guest_count} 名`

「経験レベル」行は本テーブルから撤廃する MUST NOT (#212)。「予約日時」行も #215 で撤廃する MUST NOT — 重要度が低い割に行を専有しており、視認性向上のため削除する。予約日時自体は履歴画面で参照可能であり、必要があれば後続 change で詳細フッター注釈として再導入を検討する。

ラベル列はモノスペース大文字の kicker トーンを SHALL 使用する。値列は和文書体。マジックナンバーは禁止 MUST NOT。

#### Scenario: 2 行の描画
- **WHEN** ReservationDetailPage に到達
- **THEN** 参加費 / 同伴者 の 2 行が `<dl>` 構造で順序固定で描画される

#### Scenario: 参加費の COALESCE
- **WHEN** `events.fee = NULL` AND `venues.default_fee = 1000` の予約を表示
- **THEN** 参加費に「¥1,000（当日現金）」が描画される

#### Scenario: 経験レベル行の非表示
- **WHEN** ReservationDetailPage の Meta テーブル DOM を確認する
- **THEN** 「経験レベル」ラベルおよび `'初めて' / '経験あり' / '上級'` のいずれの値も描画されない

#### Scenario: 予約日時行の非表示
- **WHEN** ReservationDetailPage の Meta テーブル DOM を確認する
- **THEN** 「予約日時」ラベルは描画されず、`<dl>` の行数は 2 行以下となる

#### Scenario: 同伴者 0 名の表示
- **WHEN** `reservations.guest_count = 0` の予約を表示
- **THEN** 同伴者に「0 名」が描画される

### Requirement: Cancel Policy ボックス

ReservationDetailPage は Meta テーブルの下に Cancel Policy ボックスを SHALL 表示する。kicker `— CANCEL POLICY` + 説明文 1 段落で構成される MUST。

説明文は MVP1 のキャンセル運用ポリシー (キャンセル期限は **開催前日中**) と整合させる MUST。具体的には「キャンセル期限は開催前日中です。当日キャンセルが必要な場合は LINE オープンチャット社会人バレーボールサークル High Q までご連絡ください。」相当の文言とする。LINE オープンチャットの URL / 名称は `shared/lib/contact-channels` 経由で参照する MUST（ハードコード禁止 MUST NOT）。

LINE オープンチャットへのリンクは「文章に溶け込む控えめな装飾」を SHALL 採用する MUST: 下線は付けず、文字色は本文と同じ ink 系を基本とし、hover 時のみ accent 色に切り替える。カギ括弧（「」）でリンクテキストを囲む装飾は **使わない** MUST NOT — 過度な強調になるため。本ボックスは説明テキストであり、CTA ではないため、「リンクを目立たせて押させる」設計意図はないことを反映する。

デザインサンプル (`docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx`) の「開催 24 時間前まで」「キャンセル料」表記は本 capability では採用しない MUST NOT (運用実態と不整合 + High Q はキャンセル料を取らない方針)。

#### Scenario: Cancel Policy の表示
- **WHEN** ReservationDetailPage に到達
- **THEN** `— CANCEL POLICY` kicker と「キャンセル期限は開催前日中」を含む説明文段落が描画される

#### Scenario: 文言の整合性
- **WHEN** Cancel Policy 説明文を確認する
- **THEN** 「24 時間」「キャンセル料」等の運用と乖離する表現は含まれない

#### Scenario: LINE オープンチャットリンクは控えめな装飾
- **WHEN** Cancel Policy 説明文中の LINE オープンチャットリンクを確認
- **THEN** リンクは下線を持たず、カギ括弧で囲まれず、`HIGH_Q_OPEN_CHAT_URL` 経由で `target="_blank" rel="noopener noreferrer"` で新規タブを開く

### Requirement: 予約キャンセル動線

ReservationDetailPage はメインアクションの末尾に「予約をキャンセル」ボタンを SHALL 配置する。判定基準は `useCancelBooking.isCancellable(eventStartAt)` の戻り値とし、本関数は **JST カレンダー基準で `now の JST 日 < start_at の JST 日`** のときのみ `true` を返す MUST（= 開催前日 23:59 JST までキャンセル可、開催当日 00:00 JST 以降は不可）。`events.cancel_deadline` 列は参照しない MUST NOT。

押下で既存 `features/booking/CancelBookingDialog` を開き、確定操作で `useCancelBooking` 経由で `reservations.status` を `'reserved' → 'cancelled'` に UPDATE する MUST。コードは履歴画面 (#211) のキャンセル動線と完全共通化する MUST。

キャンセル成功時は `/history` に `router.replace`（履歴置換）で遷移し、完了トーストを表示する MUST。

`status !== 'reserved'` または `isCancellable === false` のとき、CancelBookingDialog 既存の「不可案内」UI（LINE オープンチャットへの誘導）を通る MUST。

エラー時の文言は既存 `features/booking` 挙動を継承する SHALL（`rls`→「この予約はキャンセルできません」/ `network`→「通信エラーが発生しました。再試行してください」/ その他→「キャンセル処理に失敗しました」）。

#### Scenario: 開催前日 23:59 JST はキャンセル可能
- **WHEN** `status='reserved'` AND 現在時刻が `events.start_at` の JST カレンダー日の前日 23:59 JST 以前の予約を表示
- **THEN** 「予約をキャンセル」ボタンが活性で描画される

#### Scenario: 開催当日 00:00 JST 以降はキャンセル不可
- **WHEN** `status='reserved'` AND 現在時刻が `events.start_at` の JST 開催日 00:00 以降の予約を表示
- **THEN** 「予約をキャンセル」ボタン押下時に CancelBookingDialog が「キャンセル期限を過ぎています」案内 (LINE オープンチャットリンク付き) を表示し、確定 CTA は描画されない

#### Scenario: キャンセル成功後の遷移
- **WHEN** ReservationDetailPage の「予約をキャンセル」を押し、Dialog で確定する
- **THEN** `reservations.status` が `'cancelled'` に UPDATE され、`/history` に `router.replace` で遷移し、完了トーストが表示される

#### Scenario: 既にキャンセル済予約の表示
- **WHEN** `status='cancelled'` の予約を表示
- **THEN** 「予約をキャンセル」ボタンは描画されない（DOM に存在しない）

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** `events.cancel_deadline` に過去日時が設定されているが現在時刻が `events.start_at` の JST 前日中の予約を表示
- **THEN** 「予約をキャンセル」ボタンは活性で描画され、押下で正常にキャンセルできる

### Requirement: 4 状態 UI

ReservationDetailPage は以下 4 状態を SHALL 持つ:

- **Loading**: 初回 `fetchMyReservation` 完了前。Top Bar + Reservation Header 枠 + Dark Fact Card 枠 + Meta テーブル枠を skeleton 表示
- **404 (Not Found)**: 0 行ヒット時。「予約が見つかりません」相当のメッセージと「履歴に戻る」CTA を表示。他会員の予約 ID を踏んだケースもここで吸収される
- **Error**: ネットワーク等の取得失敗時。Error バナーと「再試行」ボタンを表示
- **Success**: 通常表示

#### Scenario: Loading
- **WHEN** 初回ロード中（`reservation === null && error === null`）
- **THEN** Top Bar・Reservation Header 枠・Dark Fact Card 枠・Meta テーブル枠が skeleton で描画される

#### Scenario: 404
- **WHEN** `fetchMyReservation` が 0 行を返す
- **THEN** 「予約が見つかりません」メッセージと「履歴に戻る」CTA が描画される

#### Scenario: 他会員の予約 ID は 404 に吸収される
- **WHEN** 会員 A が会員 B の予約 ID で `/reservations/<B の予約 uuid>` にアクセス
- **THEN** RLS 0 行となり、UI は 404 状態を描画する（500 や白画面にならない）

#### Scenario: Error
- **WHEN** `fetchMyReservation` がネットワーク例外を投げる
- **THEN** Error バナーと「再試行」ボタンが描画される

### Requirement: 履歴画面からの遷移契約

履歴画面 (#211・`HistoryPage`) の `HistoryRow` を `<router-link :to="{ name: 'reservation-detail', params: { reservationId: row.id } }">` で囲み、押下時に本ルートへ遷移する MUST。`router-link` 化に伴い、cursor: pointer / hover フィードバック / focus 可視リングを解禁する MUST。

行内のキャンセルボタン（`features/booking/CancelBookingDialog` 起動）の `@click` ハンドラは `event.stopPropagation()` 相当の制御により親 link 遷移を抑制する MUST（行クリック → 詳細遷移 / キャンセルボタンクリック → ダイアログ起動 のみで完結）。

#### Scenario: 履歴行押下で詳細遷移
- **WHEN** `/history` で任意の履歴行を押下
- **THEN** `/reservations/<row.id>` に遷移する

#### Scenario: キャンセルボタンの伝播抑制
- **WHEN** 予約中グループの「予約をキャンセル」ボタンを押下
- **THEN** CancelBookingDialog が開き、詳細画面への遷移は発生しない

#### Scenario: 押下フィードバック
- **WHEN** 履歴行にホバーする
- **THEN** cursor: pointer + hover スタイル（背景・border 色変化）が適用される

### Requirement: モバイルファースト + アクセシビリティ AA

ReservationDetailPage は 390px viewport（mobile）を first target とする MUST。HQ デザイントークン（`var(--hq-*)` および Tailwind preset utility）のみを使用し、マジックナンバー（生の色コード / px 値 / rem 値の直書き）を含めない MUST NOT。

カラーコントラスト比は AA（4.5:1）以上を満たす MUST。Dark Fact Card は ink 背景 + paper 文字色のため、accent kicker と本文の双方で AA を満たす MUST。Meta テーブルは `<dl>` / `<dt>` / `<dd>` でセマンティック化する MUST。

#### Scenario: 横スクロールなしで描画
- **WHEN** 390px viewport で `/reservations/<uuid>` を開く
- **THEN** Top Bar・Reservation Header・Dark Fact Card・Meta テーブル・Cancel Policy・キャンセルボタンが横スクロールなしで描画される

#### Scenario: デザイントークンの使用
- **WHEN** 本 capability で新規追加するファイル群を `grep` で検査する
- **THEN** マジックナンバー（直書きの色コード / px 値）は存在しない

#### Scenario: AA コントラスト
- **WHEN** Dark Fact Card 内の accent kicker（カウントダウン）と paper 文字の本文を確認
- **THEN** 両者ともに ink 背景に対して 4.5:1 以上のコントラスト比を持つ

### Requirement: E2E（auth guard 統合）

ReservationDetailPage の E2E は **1 件のみ** 追加する MUST: 「未認証ユーザーが `/reservations/<任意 uuid>` に直接アクセスすると `/login` にリダイレクトされる」。

詳細表示 / Dark Fact Card のカウントダウン / Meta テーブルの COALESCE / キャンセル動線の詳細検証は component test + unit test に押し下げる MUST（既存 reservation-history-page / reservation-profile-page と同じスケーラビリティ運用パターン）。

#### Scenario: 未認証で `/reservations/<uuid>` アクセス
- **WHEN** 未認証ユーザーが Playwright で `/reservations/<任意 uuid>` を開く
- **THEN** `/login` にリダイレクトされ、URL が `/login` で停止する

### Requirement: 予約内容の編集動線

ReservationDetailPage は Meta テーブルの直下に「予約内容を変更する」CTA を SHALL 配置する。本 CTA はキャンセル CTA とは別に、同伴者数 (`reservations.guest_count`) と連絡事項 (`reservations.note`) の **2 項目に限定した後追い編集動線** を提供する。日時 / 会場 / イベント / 経験レベル等は本 CTA の編集対象外とする MUST NOT。

押下時の挙動は `reservation-booking-flow` capability の予約 Bottom Sheet を **edit モード** で起動する MUST。Sheet の入力体験 / 保存処理 / 期限判定はすべて当該 capability に委譲する。

編集可能性の判定基準は予約キャンセル可能性と完全一致させる MUST。具体的には `useCancelBooking.isCancellable(eventStartAt)` の戻り値（JST カレンダー基準で `now の JST 日 < events.start_at の JST 日`）を流用し、独自の判定ロジックを新設 SHALL NOT。`events.cancel_deadline` 列は参照 SHALL NOT。

`status !== 'reserved'` または `isCancellable === false` のとき、本 CTA は非活性で描画する MUST、または押下時にキャンセル不可ダイアログ相当の案内（LINE オープンチャットへの誘導を含む）を SHALL 表示する。いずれの実装を採用してもよいが、ユーザーが「期限切れの後追い操作はすべて LINE 連絡に集約される」と直感的に理解できる UX を保つ MUST。

CTA の視覚的強さは **primary 系 (黒塗り)** を SHALL 採用し、画面末尾のキャンセル CTA より目立たせる MUST。「予約内容を変更する」は前向きな日常調整アクションであり、ユーザーが選びやすい状態にする (= プライマリに昇格)。逆に「予約をキャンセル」は破壊的アクションだが、UI で誘発する設計はとらず、テキストリンク調 (ghost) に控える方針とする (#215 feedback で視線誘導の修正方針を確定)。マジックナンバー（直書きの色コード / px 値）は禁止 MUST NOT、HQ デザイントークンのみ使用する MUST。

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

ReservationDetailPage は同一画面に「予約内容を変更する」CTA と「予約をキャンセルする」CTA の 2 つを配置する。両 CTA はそれぞれ役割と破壊度が異なるため、視覚的階層を明確に分けて表示する MUST。

- 編集 CTA: Meta テーブル直下に配置し、**primary トーン (黒塗り)** を採用してユーザーが最も選びやすい状態にする MUST。前向きな日常調整アクションのため
- キャンセル CTA: 画面末尾に配置し、**ghost トーン (テキストリンク調・muted 文字)** を採用して誘発を控える MUST。破壊的アクションを赤塗りで目立たせる設計は採用 SHALL NOT (視線誘導が逆になり UX を毀損する)

両 CTA を視覚的に同列・同色で並べる SHALL NOT。CTA 内の文字サイズ・パディングなどは HQ デザイントークン経由で指定し、マジックナンバーを書かない MUST NOT。

#### Scenario: 配置の差別化
- **WHEN** ReservationDetailPage を表示
- **THEN** 編集 CTA は Meta テーブル直下に配置され、キャンセル CTA は画面末尾に配置されており、両者は同一ブロックに並列配置 SHALL NOT

#### Scenario: 視覚的トーンの差別化
- **WHEN** 両 CTA のスタイルを確認
- **THEN** 編集 CTA は primary (黒塗り) トーン、キャンセル CTA は ghost (テキストリンク調) トーンで描画され、キャンセル CTA は赤塗り (destructive / danger) トーンを使わない

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

