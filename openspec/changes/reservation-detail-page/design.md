## Context

Issue #211 で予約履歴画面 `/history` を独立化した際、各履歴行は意図的に**非リンク**として実装した。これは「履歴の各行を押下したときの遷移先となる詳細画面が存在しない」状態で押下フィードバックだけ与えると UX が壊れるためであり、本 change で詳細画面が完成し次第 `<router-link>` への単純置換が可能になる構造を維持してある。

会員サイト `apps/reservation` には既に以下の関連レイヤーが揃っている:

- 予約成立直後の `BookingDonePage` (`/events/:id/book/done`) — 予約番号 + サマリ + 会場マップ + キャンセル動線を持つが、URL は「イベント ID + 完了画面」の組合せであり、後追いで「自分の任意の予約」を表示する経路ではない
- `entities/reservation/api/myReservations.ts` — 予約**一覧**取得 API（履歴画面用）。単一取得 API は未整備
- `features/booking/CancelBookingDialog` + `useCancelBooking` — `events.start_at > now()` のみで判定するキャンセル動線（cancel_deadline 不参照）

本 change は履歴画面と Booking Done 画面の役割分担を改めて整理し、後者は「予約成立直後の祝祭」、前者と新規詳細画面は「予約成立後の運用導線」を担う形に再配置する。

設計サンプル `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` の `ScreenRReservation` (line 1199-1265) が UI 構造の出典。ただし、サンプルにある「開催 24 時間前まではキャンセル可能」の Cancel Policy 文言は MVP1 が cancel_deadline を参照しない方針 (`reservation-booking-flow` spec) と矛盾するため、本 change では文言を実挙動に合わせて修正する。

## Goals / Non-Goals

**Goals:**

- `/reservations/:reservationId` ルートを auth guard チェーン (認証 + プロフィール完成 + 書類提出済) 配下で公開し、自分の予約のみ閲覧可能にする
- 設計サンプル準拠の UI 構造 (Reservation Header + Dark Fact Card + Meta テーブル + 2 アクション + Cancel Policy + キャンセルボタン) を HQ デザイントークンのみで構築する
- カレンダー追加 (.ics) をクライアントサイド完結で実装し、サーバー API を介在させない
- 会場地図リンクを `venues.map_url` 優先 / Google Maps 検索 fallback の 2 段で解決し、会場名固有のハードコード分岐を発生させない
- 予約キャンセル動線を履歴画面 (#211) と完全共通化する (CancelBookingDialog + useCancelBooking のまま流用)
- Cancel Policy 文言を MVP1 の実挙動 (`events.start_at > now()` のみで判定) と整合させ、デザインサンプルの cancel_deadline 由来表現を採用しない
- 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化し、「履歴 → 詳細 → キャンセル / 戻る」の双方向ナビゲーションを成立させる
- 4 状態 (Loading / 404 / Error / Success) を UI で明示し、他会員の予約 ID を踏んだ場合 (RLS 0 行) も 404 として吸収する

**Non-Goals:**

- メール通知の自動送信 (MVP1 スコープアウト・既存 reservation-booking-flow spec と整合)
- `cancel_deadline` 列を参照するキャンセル可否判定 (MVP1 スコープアウト)
- 予約詳細画面からのイベント詳細画面 (`/events/:id`) への遷移 (本 change では「履歴 → 詳細」の遷移のみ追加)
- `.ics` ファイルへの VTIMEZONE ブロックの埋め込み (UTC 単独で十分。Apple / Google / Outlook で JST 表示される)
- サーバーサイド `.ics` 生成 API (クライアント完結)
- BookingDonePage への .ics アクション追加 (Booking Done は MVP1 スコープアウト方針を維持)
- 予約変更機能 (同伴者数 / 連絡事項の編集 — キャンセル → 再予約で代替)
- E2E の詳細表示 / .ics / 地図 / キャンセルの個別シナリオ追加 (1 件: auth guard のみ)

## Decisions

### Decision 1: 単一取得 API は新設し、`fetchMyReservations` の流用は避ける

- **採用**: `entities/reservation/api/myReservation.ts` に `fetchMyReservation(reservationId, uid): Promise<MyReservationDetail | null>` を新設する。返却型 `MyReservationDetail` は履歴一覧用 `MyReservationItem` を拡張し、`note` / `createdAt` / 会場の `address` / `mapUrl` / 会員の `experienceLevel` を含む
- **却下案 A**: `fetchMyReservations` の戻り値配列から該当 ID を `find` で取り出す
  - 一見軽量だが、履歴画面を経由しない直リンク（ブックマーク等）からの流入時に全件取得が必要になり、N→1 の無駄
  - 加えて、詳細画面で必要な `note` / `address` / `mapUrl` / `experienceLevel` が一覧 API には含まれないため、いずれにせよ別 SELECT が必要
- **却下案 B**: SECURITY DEFINER の RPC `get_my_reservation(reservation_id)` を新規作成
  - RLS で同等の制限ができるため RPC を増やす必要はない。プロジェクト方針 (Supabase RLS 直接利用) と整合

### Decision 2: 0 行ヒット = 404 として UI で吸収する

- 他会員の予約 ID を踏んだ場合、RLS により 0 行となる。これを「Forbidden (403)」ではなく「Not Found (404)」として扱う MUST
- 理由: 403 を出すと「その予約が存在する」ことを攻撃者に漏らす情報漏洩経路となる。404 で吸収することで「存在しない / 自分のものではない」を区別不能にする
- UI 実装: `MyReservationDetail | null` を返す API 設計とし、`null` → `notFound = true` の状態に直結させる

### Decision 3: `.ics` 生成は手書き TS モジュール (依存追加なし)

- **採用**: `features/calendar-export/lib/build-ics.ts` を新規作成し、文字列連結で `.ics` を生成する
- **却下案 A**: `ics` (npm パッケージ)
  - `.ics` の必要部分は VEVENT 1 件 + 限定フィールドのみ。手書きでも 50 行程度で書ける
  - パッケージ追加は依存と bundle サイズを増やす方向で、トレードオフが見合わない
- **採用**: タイムゾーンは UTC + Z サフィックス単独（`DTSTART:20260515T103000Z` 形式）。VTIMEZONE ブロックは持たない
  - 理由: Apple Calendar / Google Calendar / Outlook いずれも UTC 表記から閲覧者のローカルタイムゾーン (= JST) で表示する。VTIMEZONE は冗長
- ファイル名は `high-q-{reservationNumber}.ics`。Blob → URL.createObjectURL → `<a download>` クリックの DOM 経由でダウンロードを起動する

### Decision 4: 会場地図リンクは map_url 優先 / Google Maps 検索 URL fallback

- **優先 1**: `venues.map_url` が登録されていればそのまま使用
- **fallback**: 未登録時は `https://www.google.com/maps/search/?api=1&query={encodeURIComponent(name + " " + address)}`
- これにより admin (#151 会場マスタ CRUD) で map_url が後追い登録されたら自動的にそちらが使われる
- 既存 `BookingDoneSummary` は map_url 未登録時に「会場マップを開く」アクションを**非表示**にする実装だが、本 capability では fallback を持たせる方針を採る (理由: 詳細画面は履歴後追いで参照される画面であり、地図への到達手段を常に提供する価値が高い)

### Decision 5: Cancel Policy 文言はデザインサンプルから乖離する

- デザインサンプル文言: 「開催 24 時間前まではキャンセル可能です。それ以降は満額のキャンセル料がかかります。」
- 本 capability 採用文言（相当）: 「開催開始までキャンセル可能です。やむを得ず当日キャンセルが必要な場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください。」
- **理由**: MVP1 は `events.cancel_deadline` を参照しない既存方針 (`reservation-booking-flow` spec / `reservation-history-page` spec) と整合させる必要がある。「24 時間前」表記は cancel_deadline を実質的に「開催 24 時間前 default」と解釈させる暗黙ルールを誘発し、後続の運用ぶれの温床になる
- **High Q はキャンセル料を取らない方針**である (MVP1 段階では当日現金のため、未参加者から徴収する仕組み自体がない)。サンプル文言の「キャンセル料」も実態と合わない

### Decision 6: キャンセル成功後は `/history` に `router.replace`

- **採用**: 成功時に `/history` へ `router.replace`（履歴置換）して詳細画面に戻れない遷移に揃える
- **却下案**: 詳細画面に留まり「キャンセル済」状態を再描画
  - 詳細画面のメインアクション (.ics + 地図 + キャンセル) のうちキャンセルが消失し、画面の主目的が薄くなる
  - 履歴画面に戻ったほうが「次の予約 / 過去履歴を確認する」という自然な後続動作に繋げやすい
- 完了画面 (`BookingDonePage`) のキャンセル後遷移先は `/events`（イベント一覧）だが、本画面の遷移先は `/history` とする (来た経路に戻すのが自然)

### Decision 7: 履歴行の伝播抑制は `event.stopPropagation()` 相当

- 履歴行を `<router-link>` 化したとき、内部のキャンセルボタン押下が router-link クリックイベントを発火させてしまう
- Vue Router の `<RouterLink custom>` を使う / または `<button @click.stop>` で停止する 2 案あり
- **採用**: `<button @click.stop="onCancelClick">` で停止する方式。理由: HistoryRow の構造変更を最小化でき、`<router-link>` ラッパーは行の最外側 1 段階のみで済む

### Decision 8: 「経験レベル」は `members.experience_level` を都度参照する

- デザインサンプルでは Meta 行に「経験レベル: 初めて」が含まれる
- 本 capability では `members.experience_level` を `fetchMyReservation` の JOIN で取得し、表示時点の最新値を表示する
- 予約時点のスナップショットは取らない (理由: スナップショット保存用の列が `reservations` に存在しない / 経験レベルは後追いで会員が更新する性質のフィールドであり、現在値の方が自然)
- ラベルマッピング: `'beginner'`→「初めて」/ `'intermediate'`→「経験あり」/ `'experienced'`→「上級」

### Decision 9: FSD レイヤー分割

- `pages/ReservationDetailPage.vue` — 状態管理 + 4 状態切替 + キャンセル成功後の `router.replace`
- `widgets/reservation-detail-card/` — Dark Fact Card / Meta テーブル / Cancel Policy ボックス（純表示）
- `features/calendar-export/` — `.ics` 生成 (`lib/build-ics.ts`) + ダウンロード起動 composable (`composables/useIcsDownload.ts`) + 「カレンダーに追加」ボタン UI
- `features/venue-map-link/` — `lib/build-map-url.ts` (map_url 優先 / Google Maps fallback) + 「会場の地図を見る」リンク UI
- `features/booking` 既存流用 (CancelBookingDialog + useCancelBooking)
- `entities/reservation/api/myReservation.ts` — 単一取得 API

## Risks / Trade-offs

- **Risk**: `.ics` の UTC 表記が Outlook desktop の特定バージョンで意図せず別タイムゾーン表示される可能性
  - **Mitigation**: Apple Calendar / Google Calendar / Outlook (web) で動作検証する。問題が出たら VTIMEZONE ブロック追加を別 Issue 化（MVP1 では UTC 単独で運用開始）

- **Risk**: 履歴画面の HistoryRow を `<router-link>` 化する変更で、既存 component test (押下不可シナリオ) が壊れる
  - **Mitigation**: tasks.md で「履歴画面の押下不可スペックを `→ 詳細遷移する` シナリオに置換」を 1 タスクとして明示。spec も MODIFIED で対応済

- **Risk**: 0 行ヒットを 404 で吸収する設計を取ると、UI 上「自分の予約だがリロードや RLS の一時的な不整合で 0 行」となるエッジケースを区別できない
  - **Mitigation**: 「再試行」CTA を 404 状態にも併設する。これにより一時的な不整合は再 fetch で復旧できる

- **Risk**: 会場地図リンクの Google Maps 検索 URL fallback が、address が部分的にしか登録されていない会場で意図しない検索結果に飛ぶ
  - **Mitigation**: 会場名 + 住所の連結を URI エンコードして Google Maps 検索に投げる。仮に意図と異なる場所がヒットしても、ユーザーが Google Maps 上で再検索可能。admin の会場マスタ運用 (#151) で `map_url` を埋めれば本問題は完全解消する

- **Risk**: `event.stopPropagation()` で router-link の遷移を抑制する実装が、キーボード Enter 押下時にも正しく動くか
  - **Mitigation**: `<button>` の `@click.stop` は keydown.enter からの synthetic click でも発火するため期待通り。component test で keydown.enter シナリオを追加する

- **Trade-off**: Cancel Policy 文言をデザインサンプルから乖離させる
  - サンプルは PO レビュー済の意匠だが、文言だけは MVP1 の実挙動と整合させる必要がある。意匠 (色 / レイアウト / 書体) は完全踏襲し、文言のみ実装に合わせる方針で押し切る。design-system 系の意匠サンプル変更は本 change のスコープ外

- **Trade-off**: 単一取得 API の新規追加 vs 一覧 API の拡張
  - 一覧 API (`fetchMyReservations`) を拡張して詳細用の列を追加する案もあるが、履歴画面で表示しない情報まで全件分取得することになり N×無駄。新規 API でクエリを分けるほうが結果的にコストが低い

## Migration Plan

DB スキーマ変更なし / RLS 変更なしのため、コードリリースのみで完結する。

リリース手順:

1. PR マージ → Render 自動デプロイ (`apps/reservation`)
2. デプロイ後、既存ユーザーは履歴画面 `/history` の各行から新ルートに遷移できる状態となる
3. 既存予約への新規列追加なし → ロールバックは PR revert のみで完全に元に戻る

ロールバック観点:

- DB / RLS 変更がないため、コードロールバックで完全復旧
- ブックマーク `/reservations/<uuid>` を踏んだユーザーが revert 後にアクセスすると 404 になるが、認証ガードで `/login` または `/events` に流される (致命的ではない)

## Open Questions

- (Open) Dark Fact Card の「あと N 日」表現を、N=0 のときは「— 当日」、N<0 のときは「— 開催終了」と分岐させる方針で良いか? → spec に MUST として記載済 / 翔太郎くんの確認後に最終確定
- (Open) `.ics` の `LOCATION` 行に address を含めるか会場名のみにするか → 含める方針で spec に記載 (Google Maps 連携時に address があると地図ヒット率が高い)
- (Open) 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化する変更を本 change の同 PR に同梱するか別 PR に分けるか → 「詳細画面の完成 = 履歴行のリンク化」が 1 セットなので同 PR 推奨。tasks.md でも同 PR 内タスクとして配置
