## 1. スコープオフ確認 & 既存資産の棚卸し

- [x] 1.1 関連 spec (`admin-events-crud` / `data-schema` / `reservation-events-and-booking` / `reservation-detail-page`) を再確認し、満員 / 経験レベル / 残席数 / 紹介文 / サムネイル / cancel_deadline が MVP1 でデータ未投入である事実を proposal Non-Goals と照合する
- [x] 1.2 再利用する既存資産 (`fetchMyReservations` / `useUpcomingEvents` / `formatCountdownLabel` / `formatReservationNumber` / `resolveMemberDisplayName` / `formatJaDate` / `formatTimeRange` / `formatFee` / `jstStartOfDay`) を一覧化し、import パスを確認する

## 2. 自分の最早未来予約 composable

- [x] 2.1 `apps/reservation/src/features/event-listing/composables/useNextReservation.ts` を新設し、`fetchMyReservations(uid)` を呼んで `status === 'reserved'` かつ `event.startAt > now()` を満たす最早 1 件を返す関数を実装する。戻り値は `{ reservation, loading, error, reload }` の Ref 型。0 件のときは `reservation = null`
- [x] 2.2 `useNextReservation.spec.ts` を追加し、(a) 予約 0 件 (b) 過去予約のみ (c) cancelled 予約のみ (d) 未来予約 1 件 (e) 未来予約 2 件で先頭が選ばれる の 5 ケースを Vitest + MSW で検証する
- [x] 2.3 `apps/reservation/src/features/event-listing/index.ts` から `useNextReservation` を Public API として export する

## 3. NEXT カードウィジェット

- [x] 3.1 `apps/reservation/src/widgets/home-next-card/` を新設し、`ui/HomeNextCard.vue` / `index.ts` を作成する。propsは `MyReservationItem` をそのまま受け取る形で実装する
- [x] 3.2 HomeNextCard.vue 内で以下を描画する: 右上 NEXT 円形バッジ / カウントダウン kicker (`formatCountdownLabel` 利用) / 月日 + 曜日 + 時刻 / イベント名 / 会場名 / フッタの予約番号 (`formatReservationNumber` 利用) + 「詳細を見る →」アフォーダンス。カード全体は `router-link :to="{ name: 'reservation-detail', params: { reservationId: reservation.id } }"` で予約詳細画面に遷移する
- [x] 3.3 スタイリングは `bg-ink text-paper rounded-hq-lg` ベース、HQ デザイントークンと Tailwind preset utility のみで構成。マジックナンバー (生 px / hex) を含めない
- [x] 3.4 `HomeNextCard.spec.ts` で (a) 主要要素描画 (b) リンク先が `/reservations/:reservationId` (c) data-testid 経由でのアクセサビリティ確認 を検証する

## 4. ホームヘッダウィジェット

- [x] 4.1 `apps/reservation/src/widgets/home-header/` を新設し、`ui/HomeHeader.vue` / `index.ts` を作成する。propsは `Member` (Pick で必要列のみ) を受け取る
- [x] 4.2 HomeHeader.vue は左に「High Q」(`font-jp-display`) + 「EST.21」相当のサブテキスト (`font-mono`)、右に円形アバター (`bg-accent-soft text-accent`、表示文字は `resolveMemberDisplayName(member)` の頭 1 文字)。アバターは `router-link :to="{ name: 'profile' }"` で `/profile` へ遷移する
- [x] 4.3 アバターの `aria-label="プロフィール"` をセットし、フォーカスリングをデザイントークン経由で当てる (`focus-visible:ring-accent`)
- [x] 4.4 `HomeHeader.spec.ts` で (a) 表示名イニシャル描画 (b) アバター押下で `/profile` へ navigate (c) ニックネーム未設定時は表示名にフォールバック を検証する

## 5. 「他のイベント」行コンポーネント

- [x] 5.1 `apps/reservation/src/features/event-listing/ui/EventRow.vue` を新設し、props で `EventListItem` を受け取る
- [x] 5.2 レイアウトは「日付ブロック (月日 + 曜日縦積み) | イベント名 + 時刻 + 参加費 (右寄せ or 左寄せ) | (バッジ領域は MVP1 では空)」の横並び。`router-link :to="{ name: 'event-detail', params: { id: event.id } }"`
- [x] 5.3 `bg-paper-warm` 相当の Tailwind preset utility と `border border-hairline rounded-hq-md` で統一感を出す。マジックナンバー禁止
- [x] 5.4 `features/event-listing/index.ts` から `EventRow` を Public API として export する
- [x] 5.5 `EventRow.spec.ts` で (a) 日付・名前・時刻・参加費の描画 (b) 押下で `/events/:id` へ navigate (c) 満員 / 経験レベル / 残席数のバッジが描画されないことを assert する

## 6. ホームページの再構成

- [x] 6.1 `apps/reservation/src/pages/EventsListPage.vue` を全面的に書き換える。`useAuthSession` から会員情報、`useNextReservation` から NEXT 予約、`useUpcomingEvents` から upcoming events を取得する
- [x] 6.2 「他のイベント」リストは `useUpcomingEvents` の結果から `useNextReservation` の `reservation.event.id` を除外する `computed` で組み立てる
- [x] 6.3 既存の `<PageBreadcrumb>` 呼び出しを削除する。代わりに `<HomeHeader :member="..." />` を画面トップに配置する
- [x] 6.4 NEXT カードあり時は `<HomeNextCard :reservation="..." />` を、なし時は描画しない (`v-if`)。「こんにちは、<表示名>さん」kicker は常に NEXT カードの直上 (NEXT がないときはヘッダ直下) に置く
- [x] 6.5 「他のイベント」セクションは Kicker (`— 他のイベント · {count}`) + `<EventRow>` の v-for で構成。truncate なし全件
- [x] 6.6 4 状態の UI を実装する: (a) Loading (NEXT カード代替プレースホルダ + 行プレースホルダ × 3) (b) Error (再試行ボタン) (c) NEXT 0 件 + 他 0 件 (Empty メッセージ + 再読込) (d) 正常 (NEXT あり / なしの 3 サブパターンを上記要件に従って描画)

## 7. ホームページのテスト

- [x] 7.1 `EventsListPage.spec.ts` を新設 (現状は無いはず) し、router + MSW モックで以下を検証する: (a) NEXT カード描画 (b) NEXT 0 件で NEXT カード非描画 (c) 他のイベントから NEXT のイベントが除外される (d) パンくずが描画されない (e) Loading / Error / Empty / Success の 4 状態 (f) アバター押下で `/profile` (g) NEXT カード押下で `/reservations/:id` (h) EventRow 押下で `/events/:id`
- [x] 7.2 既存の `App.spec.ts` / `router.spec.ts` でホーム到達後の DOM 期待値を含むテストがあれば、新しいレイアウトに合わせて更新する
- [x] 7.3 認証ガードのホームルートに対するテスト (`router.spec.ts`) が引き続き pass することを確認する

## 7B. 予約詳細画面 Meta テーブルから「経験レベル」行を撤廃

- [x] 7B.1 `entities/reservation/api/myReservation.ts` の SELECT 句から `members(experience_level)` JOIN を削除し、`MyReservationDetailRow` / `MyReservationDetail` 型から `members` / `member.experienceLevel` を削除する
- [x] 7B.2 `entities/reservation/model/reservation.types.ts` の `MyReservationDetail` 型から `member` フィールドを削除する (実装と型を同期)
- [x] 7B.3 `widgets/reservation-detail-card/ui/ReservationMetaTable.vue` から `experienceLevel` prop / EXPERIENCE_LEVEL_LABEL マップ / 経験レベル行 (rows の 'level' エントリ) を削除する
- [x] 7B.4 `pages/ReservationDetailPage.vue` から `:experience-level="reservation.member.experienceLevel"` の prop 渡しを削除する
- [x] 7B.5 既存テスト (`ReservationMetaTable.spec.ts` / `ReservationDetailPage.spec.ts` / `myReservation.spec.ts` 等) で経験レベル関連の assertion / fixture を削除し、3 行構成に整合させる

## 8. 仕上げ確認

- [x] 8.1 `pnpm --filter @high-q/reservation lint` と `pnpm --filter @high-q/reservation typecheck` (or 同等のスクリプト) を実行し、新規追加ファイルのレイヤー境界 / 型エラーを 0 にする (lint script 未定義のため typecheck + build で代替、いずれも pass)
- [x] 8.2 `pnpm --filter @high-q/reservation test` を実行し、新規 + 既存テストがすべて pass することを確認する (494 / 494 pass)
- [x] 8.3 `apps/reservation` をローカル起動し、390px viewport で (a) 予約あり (b) 予約なし の 2 シナリオを実機表示確認する。NEXT カードの黒地・カウントダウン・予約番号・「詳細を見る →」が崩れていないこと、アバター・kicker・他のイベント行の縦リズムが揃っていることを目視確認する (翔太郎くん確認済)
- [x] 8.4 アクセシビリティ AA (キーボード Tab 巡回 / コントラスト) を簡易確認する。Bottom Tab Bar・アバター・NEXT カード・各 EventRow がフォーカス可能で Enter で遷移すること (翔太郎くん確認済)
- [x] 8.5 `openspec validate reservation-home-v2 --strict` を実行し、change パッケージが整合していることを確認する
