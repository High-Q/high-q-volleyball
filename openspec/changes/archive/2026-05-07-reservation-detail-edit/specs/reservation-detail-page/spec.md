## MODIFIED Requirements

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

## ADDED Requirements

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
