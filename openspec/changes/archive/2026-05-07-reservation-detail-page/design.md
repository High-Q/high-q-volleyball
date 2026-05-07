## Context

Issue #211 で予約履歴画面 `/history` を独立化した際、各履歴行は意図的に**非リンク**として実装した。これは「履歴の各行を押下したときの遷移先となる詳細画面が存在しない」状態で押下フィードバックだけ与えると UX が壊れるためであり、本 change で詳細画面が完成し次第 `<router-link>` への単純置換が可能になる構造を維持してある。

並行して、MVP1 のキャンセル運用ポリシーが「実質的に開催前日中まで」であるのに対し、既存実装の `isCancellable` は `events.start_at > now()` 判定で「開催開始直前まで」を許してしまっており、運用実態と UI 文言の双方が乖離していた。本 change で詳細画面を作るタイミングに合わせて、判定ロジックと UI 文言の双方を「JST カレンダー基準で前日中まで」に統一する。

会員サイト `apps/reservation` には既に以下の関連レイヤーが揃っている:

- 予約成立直後の `BookingDonePage` (`/events/:id/book/done`) — 予約番号 + サマリ + 会場マップ + キャンセル動線
- `entities/reservation/api/myReservations.ts` — 予約**一覧**取得 API（履歴画面用）。単一取得 API は未整備
- `features/booking/CancelBookingDialog` + `useCancelBooking` — 共通キャンセル動線

本 change は履歴画面と Booking Done 画面の役割分担を改めて整理し、後者は「予約成立直後の祝祭」、前者と新規詳細画面は「予約成立後の運用導線」を担う形に再配置する。

設計サンプル `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` の `ScreenRReservation` (line 1199-1265) が UI 構造の出典。ただし、サンプルにある「カレンダーに追加 (.ics)」「会場の地図を見る」「開催 24 時間前まではキャンセル可能」「キャンセル料」表記は本 change では採用しない (理由は Decisions セクション参照)。

## Goals / Non-Goals

**Goals:**

- `/reservations/:reservationId` ルートを auth guard チェーン (認証 + プロフィール完成 + 書類提出済) 配下で公開し、自分の予約のみ閲覧可能にする
- 設計サンプルの構造のうち必要十分な範囲 (Reservation Header + Dark Fact Card + Meta テーブル + Cancel Policy + キャンセルボタン) を HQ デザイントークンのみで構築する
- 予約キャンセル可否判定を「JST カレンダー基準で前日中まで」に切り替える。共通 `isCancellable` を更新することで、完了画面 / 履歴画面 / 詳細画面の 3 経路すべてが同時に新ポリシーに整合する
- Cancel Policy ボックスと CancelBookingDialog の不可案内文言を新ポリシーに整合させる
- 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化し、「履歴 → 詳細 → キャンセル / 戻る」の双方向ナビゲーションを成立させる
- 4 状態 (Loading / 404 / Error / Success) を UI で明示し、他会員の予約 ID を踏んだ場合 (RLS 0 行) も 404 として吸収する

**Non-Goals:**

- カレンダー追加 (.ics ダウンロード) 動線 (本 change ではドロップ。MVP1 の優先度を実需と照らした結果、不要と判断)
- 会場地図リンク (本 change ではドロップ。Booking Done 画面に既存の地図導線があり、詳細画面で重複させる必要がない)
- 同伴者数 / 連絡事項の編集動線 (Issue #215 として MVP1 内で別 Issue 切出し済み)
- メール通知の自動送信 (MVP1 スコープアウト・既存 reservation-booking-flow spec と整合)
- `cancel_deadline` 列を参照する判定 (MVP1 スコープアウト方針を維持)
- 予約詳細画面からのイベント詳細画面 (`/events/:id`) への遷移 (本 change では「履歴 → 詳細」の遷移のみ追加)

## Decisions

### Decision 1: 単一取得 API は新設し、`fetchMyReservations` の流用は避ける

- **採用**: `entities/reservation/api/myReservation.ts` に `fetchMyReservation(reservationId, uid): Promise<MyReservationDetail | null>` を新設する。返却型 `MyReservationDetail` は履歴一覧用 `MyReservationItem` を拡張し、`createdAt` (予約日時表示用) / `member.experienceLevel` (Meta テーブル経験レベル列) を含む
- **却下案 A**: `fetchMyReservations` の戻り値配列から該当 ID を `find` で取り出す
  - 直リンク（ブックマーク等）からの流入時に全件取得が必要になり、N→1 の無駄
  - 加えて、詳細画面で必要な `createdAt` / `experienceLevel` が一覧 API には含まれない
- **却下案 B**: SECURITY DEFINER の RPC `get_my_reservation(reservation_id)` を新規作成
  - RLS で同等の制限ができるため RPC を増やす必要はない

### Decision 2: 0 行ヒット = 404 として UI で吸収する

- 他会員の予約 ID を踏んだ場合、RLS により 0 行となる。これを「Forbidden (403)」ではなく「Not Found (404)」として扱う MUST
- 理由: 403 を出すと「その予約が存在する」ことを攻撃者に漏らす情報漏洩経路となる。404 で吸収することで「存在しない / 自分のものではない」を区別不能にする
- UI 実装: `MyReservationDetail | null` を返す API 設計とし、`null` → `notFound = true` の状態に直結させる

### Decision 3: カレンダー追加 (.ics) と会場地図リンクは本 change ではドロップ

- **採用**: 詳細画面のメインアクションは「予約をキャンセル」のみとし、.ics / 地図導線は配置しない
- **却下案** (旧方針): デザインサンプル準拠で .ics / 地図を含める
  - .ics の実需が MVP1 ユーザー層 (社会人サークル参加者) で薄く、機能複雑度に見合わない
  - 地図導線は Booking Done 画面に既存しており、詳細画面で重複させる必要がない
  - 機能を絞ることで PR レビューコストと将来の保守コストの両方を下げる
- 後追いで .ics / 地図が必要になれば、別 Issue として個別 capability で追加する

### Decision 4: キャンセル可否判定を「JST 前日中まで」に切替

- **新ロジック**: `isCancellable(eventStartAt, now)` は `jstStartOfDay(now) < jstStartOfDay(eventStartAt)` のときのみ `true` を返す
  - `jstStartOfDay(d)` は JST カレンダー日の 0:00 を表すマーカー Date を返す既存ヘルパ
  - 「now の JST 日 < start_at の JST 日」= 「現在時刻 ≤ 前日 23:59:59 JST」を意味する
- **旧ロジック (`start.getTime() > now.getTime()`) からの変更理由**:
  - 旧ロジックは「開催当日 19:30 開始」のイベントを 19:29 までキャンセル可能としてしまう。運用上、当日キャンセルは現場準備に支障が出るため不可とする方針
  - 既存 spec / UI 文言にも「開催開始まで」「24 時間前まで」など複数の表現が混在しており、統一が必要
- **影響範囲**: `useCancelBooking.isCancellable` は完了画面 / 履歴画面 / 詳細画面の 3 経路から参照される。本 change で 1 箇所変更すれば 3 経路すべてが同時に新ポリシーに整合する
- **単体テスト**: 開催前日 23:59 JST = 可 / 開催当日 00:00 JST = 不可 / 当日 09:00 JST = 不可 / 開催後 = 不可 / 不正 ISO = 不可 / cancel_deadline 無視 の 7 ケース

### Decision 5: Cancel Policy 文言・Dialog 不可案内文言を新ポリシーに整合

- Cancel Policy ボックス: 「キャンセル期限は開催前日中です。当日キャンセルが必要な場合は LINE オープンチャット...までご連絡ください」
- CancelBookingDialog の不可案内: 「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません。やむを得ない事情がある場合は...」
- 旧文言「イベント開催が始まっているため」「開催 24 時間前まで」「キャンセル料」はいずれも現行ポリシーと不整合のため削除
- High Q はキャンセル料を取らない方針 (MVP1 段階では当日現金のため、未参加者から徴収する仕組み自体がない)

### Decision 6: キャンセル成功後は `/history` に `router.replace`

- **採用**: 詳細画面からの成功時は `/history` へ `router.replace`（履歴置換）して詳細画面に戻れない遷移に揃える
- **却下案**: 詳細画面に留まり「キャンセル済」状態を再描画
  - 詳細画面のメインアクション（キャンセル）が消失し、画面の主目的が薄くなる
  - 履歴画面に戻ったほうが「次の予約 / 過去履歴を確認する」という自然な後続動作に繋げやすい

### Decision 7: 履歴行の伝播抑制は `@click.stop.prevent` で行う

- 履歴行を `<router-link>` 化したとき、内部のキャンセルボタン押下が router-link クリックイベントを発火させてしまう
- **採用**: `<button @click.stop.prevent="onCancelClick">` で停止する方式
- HistoryRow の構造変更を最小化でき、`<router-link>` ラッパーは行の最外側 1 段階のみで済む

### Decision 8: 「経験レベル」は `members.experience_level` を都度参照する

- 予約時点のスナップショットは取らない (理由: スナップショット保存用の列が `reservations` に存在しない / 経験レベルは後追いで会員が更新する性質のフィールドであり、現在値の方が自然)
- ラベルマッピング: `'beginner'`→「初めて」/ `'intermediate'`→「経験あり」/ `'experienced'`→「上級」

### Decision 9: FSD レイヤー分割

- `pages/ReservationDetailPage.vue` — 状態管理 + 4 状態切替 + キャンセル成功後の `router.replace`
- `widgets/reservation-detail-card/` — Dark Fact Card / Meta テーブル / Cancel Policy ボックス（純表示）
- `features/booking` 既存流用 (CancelBookingDialog + useCancelBooking)
- `entities/reservation/api/myReservation.ts` — 単一取得 API

## Risks / Trade-offs

- **Risk**: `isCancellable` のロジック変更で履歴画面のキャンセル動線が「前日中まで」に強制される。既存ユーザーが当日キャンセルを試みていた場合、UX が突然変わる
  - **Mitigation**: 既存ユーザーは MVP1 リリース直後の小規模グループであり、本リリースの段階で「当日キャンセル可」を期待される運用は実装上も成立していなかった (運営側で電話連絡を求めていた)。リリースノート / LINE 案内で「キャンセル期限は前日中。当日連絡は LINE で」を明示する

- **Risk**: 0 行ヒットを 404 で吸収する設計を取ると、UI 上「自分の予約だがリロードや RLS の一時的な不整合で 0 行」となるエッジケースを区別できない
  - **Mitigation**: 「再試行」CTA を 404 状態にも併設する。これにより一時的な不整合は再 fetch で復旧できる

- **Trade-off**: カレンダー追加 / 会場地図リンクをドロップ
  - デザインサンプルから 2 機能を落とすため、画面の情報量と「行動可能性」が減る
  - 一方で、両機能とも MVP1 段階で実需が薄く、機能を入れずに先送りした方が PR / 保守コストの面で合理的
  - 必要になった時点で個別 Issue として追加する経路は閉ざさない

- **Trade-off**: `isCancellable` 変更が `reservation-booking-flow` spec の MODIFIED を必要とする
  - 当 change のスコープが広がるが、判定ロジックは 3 経路で共有されるため一括変更が筋
  - 判定だけ詳細画面で別実装にすると技術負債になる

## Migration Plan

DB スキーマ変更なし / RLS 変更なしのため、コードリリースのみで完結する。

リリース手順:

1. PR マージ → Render 自動デプロイ (`apps/reservation`)
2. デプロイ後、既存ユーザーは履歴画面 `/history` の各行から新ルートに遷移できる状態となる
3. キャンセル可否の運用変更 (前日中まで) は LINE オープンチャットに案内を投稿する

ロールバック観点:

- DB / RLS 変更がないため、コードロールバックで完全復旧
- ブックマーク `/reservations/<uuid>` を踏んだユーザーが revert 後にアクセスすると 404 になるが、認証ガードで `/login` または `/events` に流される (致命的ではない)

## Open Questions

- (Resolved) Dark Fact Card のカウントダウン分岐 (「あと N 日」/「— 当日」/「— 開催終了」)
- (Resolved) カレンダー追加 / 会場地図リンクの扱い → ドロップ
- (Resolved) Cancel Policy 文言 → 「キャンセル期限は開催前日中」
- (Resolved) 履歴画面 (#211) の `HistoryRow` を `<router-link>` 化する変更の同梱可否 → 同 PR 同梱
