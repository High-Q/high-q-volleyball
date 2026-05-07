## ADDED Requirements

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

会員サイトは予約単一取得 API `fetchMyReservation(reservationId, uid)` を `entities/reservation/api/` 配下で SHALL 提供する。`reservations × events × venues × members` を JOIN し、`reservations.id = reservationId` AND `reservations.member_id = auth.uid()` の条件で 1 行を取得する MUST。

`reservations` テーブルの SELECT RLS（`auth.uid() = member_id OR is_admin()`）により他会員の予約は 0 行となり、UI 層は 0 行ヒットを 404 として扱う MUST。アプリ層クエリでも `member_id` 条件を明示的に含めることで二重防衛とする MUST。

返却値はパンくず / Dark Fact Card / Meta テーブルの描画に必要な以下を含む MUST:

- 予約: `id` / `status` / `guestCount` / `note` / `createdAt`（予約日時表示用）/ `cancelledAt`
- イベント: `id` / `name` / `startAt` / `endAt` / `fee`（NULL なら `venues.default_fee` で COALESCE）
- 会場: `id` / `name` / `address` / `mapUrl`（地図リンク fallback 用）
- 会員: `experienceLevel`（経験レベル表示用 — `members.experience_level` を都度参照する）

#### Scenario: 自分の予約は取得できる
- **WHEN** 会員 A が自分の予約 ID で `fetchMyReservation` を呼び出す
- **THEN** 1 件のレコードが返り、`memberId` は `auth.uid()` に一致する

#### Scenario: 他会員の予約は 0 行ヒット
- **WHEN** 会員 A が会員 B の予約 ID を指定して `fetchMyReservation` を呼び出す
- **THEN** RLS により 0 行となり、API は 404 を意味する `NotFound` 型の Result / null を返す

#### Scenario: 存在しない予約 ID
- **WHEN** ランダム UUID で `fetchMyReservation` を呼び出す
- **THEN** 0 行となり、API は 404 を意味する `NotFound` 型の Result / null を返す

#### Scenario: アプリ層 member_id 条件の明示
- **WHEN** `fetchMyReservation` の実装ファイルを確認する
- **THEN** Supabase クエリチェーンに `.eq("member_id", uid)` 相当の条件が含まれる（RLS への単独依存を避け、二重防衛が成立している）

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

`events.start_at` / `events.end_at` の表示は JST 固定とする MUST（`@/shared/lib/jst-calendar` を流用）。

#### Scenario: 開催前 8 日後の表示
- **WHEN** 現在時刻が `2026-05-07 09:00 JST` で `events.start_at = 2026-05-15 19:30 JST`
- **THEN** Dark Fact Card に「— あと 8 日」「05 / 15」「THU」「19:30 – 21:30 · {会場名}」が描画される

#### Scenario: 開催当日の表示
- **WHEN** 現在時刻が `events.start_at` と同日（JST カレンダー日付一致）
- **THEN** Dark Fact Card に「— 当日」が描画される

#### Scenario: 開催開始以降の表示
- **WHEN** `events.start_at <= now()` の予約を表示
- **THEN** Dark Fact Card に「— 開催終了」が描画される

### Requirement: Meta テーブル（参加費 / 同伴者 / 経験レベル / 予約日時）

ReservationDetailPage は Dark Fact Card の下に Meta テーブルを SHALL 表示する。`<dl>` / `<dt>` / `<dd>` のセマンティック構造で以下 4 行を順序固定で表示する MUST:

- 参加費: `¥{fee}（当日現金）` 形式。`events.fee` が NULL のとき `venues.default_fee` を使用する MUST。両方 NULL のとき `—` を表示する MUST
- 同伴者: `{guest_count} 名`
- 経験レベル: `members.experience_level` を日本語ラベル化（`'beginner'`→「初めて」/ `'intermediate'`→「経験あり」/ `'experienced'`→「上級」）
- 予約日時: `reservations.created_at` を `YYYY / MM / DD HH:mm` JST 形式で表示

ラベル列はモノスペース大文字の kicker トーンを SHALL 使用する。値列は和文書体。マジックナンバーは禁止 MUST NOT。

#### Scenario: 4 行の描画
- **WHEN** ReservationDetailPage に到達
- **THEN** 参加費 / 同伴者 / 経験レベル / 予約日時 の 4 行が `<dl>` 構造で順序固定で描画される

#### Scenario: 参加費の COALESCE
- **WHEN** `events.fee = NULL` AND `venues.default_fee = 1000` の予約を表示
- **THEN** 参加費に「¥1,000（当日現金）」が描画される

#### Scenario: 経験レベルの日本語化
- **WHEN** `members.experience_level = 'intermediate'` の会員が自分の予約詳細を表示
- **THEN** 経験レベルに「経験あり」が描画される

#### Scenario: 同伴者 0 名の表示
- **WHEN** `reservations.guest_count = 0` の予約を表示
- **THEN** 同伴者に「0 名」が描画される

### Requirement: カレンダー追加（.ics ダウンロード）

ReservationDetailPage は「カレンダーに追加 (.ics)」CTA を SHALL 提供する。押下でクライアントサイドで `.ics` ファイルを生成し、ブラウザのダウンロード動作で会員のローカルに保存させる MUST。

`.ics` ファイル仕様:

- `VERSION:2.0` / `PRODID` 固定値（例: `-//High Q//Reservation//JP`）
- 単一 `VEVENT` ブロック
- `UID`: `reservation-{reservationId}@high-q.example` 形式（再ダウンロード時にカレンダー側で同一イベントとして上書きされる）
- `DTSTART` / `DTEND`: UTC で出力（`YYYYMMDDTHHMMSSZ` 形式）。タイムゾーン VTIMEZONE ブロックは持たない MUST NOT（Apple / Google / Outlook 全てで JST 表示が再現されるため UTC 単独で十分）
- `SUMMARY`: `events.name` をそのまま使用
- `LOCATION`: `{venues.name} / {venues.address}` 形式（住所が NULL のときは会場名のみ）
- `DESCRIPTION`: 予約番号 `#HQ-XXXX-XXXX` を 1 行目に含める

ファイル名は `high-q-{reservationNumber}.ics`（例: `high-q-HQ-2605-A8F2.ics`）とする MUST。

サーバー API は介在しない MUST NOT（クライアント完結）。`.ics` 生成は手書き TS モジュール `features/calendar-export/lib/build-ics.ts` で実装する MUST。

#### Scenario: .ics ダウンロードの起動
- **WHEN** 会員が「カレンダーに追加 (.ics)」CTA を押下
- **THEN** `text/calendar` MIME のファイルダウンロードが起動し、ファイル名は `high-q-{reservationNumber}.ics` となる

#### Scenario: VEVENT 内容
- **WHEN** ダウンロードされた `.ics` ファイルを確認
- **THEN** `VERSION:2.0` / `PRODID` / `BEGIN:VEVENT` / `UID` / `DTSTART` / `DTEND` / `SUMMARY` / `LOCATION` / `DESCRIPTION` / `END:VEVENT` の各行が含まれる

#### Scenario: UID の同一性
- **WHEN** 同一予約に対して `.ics` ダウンロードを 2 回実行
- **THEN** 両ファイルの `UID` 行は完全一致し、カレンダー側で同一イベントとして扱える

#### Scenario: タイムゾーン表現
- **WHEN** `events.start_at = 2026-05-15 19:30 JST`（= `2026-05-15 10:30 UTC`）の予約を `.ics` ダウンロード
- **THEN** `DTSTART` 行は `DTSTART:20260515T103000Z` 形式で出力される（UTC + Z サフィックス）

#### Scenario: 開催終了済イベントでも .ics は生成可
- **WHEN** `events.start_at <= now()` の過去予約で「カレンダーに追加 (.ics)」CTA を押下
- **THEN** `.ics` ファイルは正常にダウンロードされる（過去開催イベントの記録目的を許容する）

### Requirement: 会場地図リンク

ReservationDetailPage は「会場の地図を見る」リンクを SHALL 提供する。押下で `target="_blank" rel="noopener noreferrer"` の新規タブ遷移とする MUST。

遷移先 URL は以下の優先順で MUST 決定する:

1. `venues.map_url` が NULL でなく長さ 1 以上 → そのまま使用
2. それ以外 → `https://www.google.com/maps/search/?api=1&query={encodeURIComponent(会場名 + " " + 住所)}` の Google Maps 検索 URL を生成。住所が NULL のときは会場名のみで検索

`venues.map_url` 列の参照のみで会場名固有のハードコード分岐は行わない MUST NOT。

#### Scenario: map_url 登録済の優先
- **WHEN** `venues.map_url = "https://maps.example.com/kameido"` の予約で「会場の地図を見る」を押下
- **THEN** 当該 URL が新規タブで開かれる

#### Scenario: map_url 未登録時の Google Maps fallback
- **WHEN** `venues.map_url = NULL` AND `venues.name = "亀戸スポーツセンター"` AND `venues.address = "東京都江東区亀戸..."` の予約で「会場の地図を見る」を押下
- **THEN** `https://www.google.com/maps/search/?api=1&query=` で始まり、会場名 + 住所が URI エンコードされたクエリパラメータを持つ URL が新規タブで開かれる

#### Scenario: 住所未登録時の fallback
- **WHEN** `venues.map_url = NULL` AND `venues.address = NULL` の予約で「会場の地図を見る」を押下
- **THEN** Google Maps 検索 URL のクエリは会場名のみとなる

#### Scenario: 新規タブで開く
- **WHEN** 「会場の地図を見る」リンクの DOM 属性を確認
- **THEN** `target="_blank"` AND `rel="noopener noreferrer"` が設定されている

### Requirement: Cancel Policy ボックス

ReservationDetailPage はアクション群の下に Cancel Policy ボックスを SHALL 表示する。kicker `— CANCEL POLICY` + 説明文 1 段落で構成される MUST。

説明文は MVP1 の実挙動に整合させ、`events.cancel_deadline` を参照しない事実を反映する MUST。具体的には「開催開始までキャンセル可能です。やむを得ず当日キャンセルが必要な場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください。」相当の文言とする。LINE オープンチャットの URL / 名称は `shared/lib/contact-channels` 経由で参照する MUST（ハードコード禁止 MUST NOT）。

デザインサンプル (`docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx`) の「開催 24 時間前まで」表記は本 capability では採用しない MUST NOT（cancel_deadline 列を参照しない MVP1 方針との不整合を避けるため）。

#### Scenario: Cancel Policy の表示
- **WHEN** ReservationDetailPage に到達
- **THEN** `— CANCEL POLICY` kicker と説明文段落が描画される

#### Scenario: 文言の整合性
- **WHEN** Cancel Policy 説明文を確認する
- **THEN** 「開催 24 時間前」「24 時間以内」等の cancel_deadline 由来の表現は含まれない

#### Scenario: LINE オープンチャットへの誘導
- **WHEN** Cancel Policy 説明文中の LINE オープンチャットリンクを確認
- **THEN** `HIGH_Q_OPEN_CHAT_URL` 経由で参照され、`target="_blank" rel="noopener noreferrer"` で新規タブを開く

### Requirement: 予約キャンセル動線

ReservationDetailPage はメインアクションの末尾に「予約をキャンセル」ボタンを SHALL 配置する。判定基準は `events.start_at > now()` のみ MUST（`events.cancel_deadline` 列は参照しない MUST NOT — 既存 reservation-booking-flow / reservation-history-page 方針と整合）。

押下で既存 `features/booking/CancelBookingDialog` を開き、確定操作で `useCancelBooking` 経由で `reservations.status` を `'reserved' → 'cancelled'` に UPDATE する MUST。コードは履歴画面 (#211) のキャンセル動線と完全共通化する MUST。

キャンセル成功時は `/history` に `router.replace`（履歴置換）で遷移し、完了トーストを表示する MUST。詳細画面に留まらない理由: 当該予約は既にキャンセル済となり「キャンセル」CTA が再度押せない状態となるため、上位リストへ戻すのが自然な導線である。

`status !== 'reserved'` または `events.start_at <= now()` のとき、ボタンは disabled となり、CancelBookingDialog 既存の「不可案内」UI（LINE オープンチャットへの誘導）を通る MUST。

エラー時の文言は既存 `features/booking` 挙動を継承する SHALL（`rls`→「この予約はキャンセルできません」/ `network`→「通信エラーが発生しました。再試行してください」/ その他→「キャンセル処理に失敗しました」）。

#### Scenario: キャンセル可能時の表示
- **WHEN** `status='reserved'` AND `events.start_at > now()` の予約を表示
- **THEN** 「予約をキャンセル」ボタンが活性で描画される

#### Scenario: キャンセル成功後の遷移
- **WHEN** ReservationDetailPage の「予約をキャンセル」を押し、Dialog で確定する
- **THEN** `reservations.status` が `'cancelled'` に UPDATE され、`/history` に `router.replace` で遷移し、完了トーストが表示される

#### Scenario: キャンセル不可時の表示
- **WHEN** `events.start_at <= now()` の予約を表示
- **THEN** 「予約をキャンセル」ボタンは disabled となり、押下しても CancelBookingDialog の不可案内 UI が表示される

#### Scenario: 既にキャンセル済予約の表示
- **WHEN** `status='cancelled'` の予約を表示
- **THEN** 「予約をキャンセル」ボタンは描画されない（DOM に存在しない）か disabled となる

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** `events.cancel_deadline` に過去日時が設定されているが `events.start_at` は未来の予約を表示
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

カラーコントラスト比は AA（4.5:1）以上を満たす MUST。Dark Fact Card は ink 背景 + paper 文字色のため、accent kicker と本文の双方で AA を満たす MUST。Meta テーブルは `<dl>` / `<dt>` / `<dd>` でセマンティック化する MUST。`.ics` ダウンロードボタンは `<button type="button">`、会場地図リンクは `<a href>`（ボタン的見た目でも `<a>` を SHALL 使用）。

#### Scenario: 横スクロールなしで描画
- **WHEN** 390px viewport で `/reservations/<uuid>` を開く
- **THEN** Top Bar・Reservation Header・Dark Fact Card・Meta テーブル・アクション 2 つ・Cancel Policy・キャンセルボタンが横スクロールなしで描画される

#### Scenario: デザイントークンの使用
- **WHEN** 本 capability で新規追加するファイル群を `grep` で検査する
- **THEN** マジックナンバー（直書きの色コード / px 値）は存在しない

#### Scenario: AA コントラスト
- **WHEN** Dark Fact Card 内の accent kicker（カウントダウン）と paper 文字の本文を確認
- **THEN** 両者ともに ink 背景に対して 4.5:1 以上のコントラスト比を持つ

### Requirement: E2E（auth guard 統合）

ReservationDetailPage の E2E は **1 件のみ** 追加する MUST: 「未認証ユーザーが `/reservations/<任意 uuid>` に直接アクセスすると `/login` にリダイレクトされる」。

詳細表示 / Dark Fact Card のカウントダウン / Meta テーブルの COALESCE / .ics 生成 / 会場地図リンクの fallback / キャンセル動線の詳細検証は component test + unit test に押し下げる MUST（既存 reservation-history-page / reservation-profile-page と同じスケーラビリティ運用パターン）。

#### Scenario: 未認証で `/reservations/<uuid>` アクセス
- **WHEN** 未認証ユーザーが Playwright で `/reservations/<任意 uuid>` を開く
- **THEN** `/login` にリダイレクトされ、URL が `/login` で停止する
