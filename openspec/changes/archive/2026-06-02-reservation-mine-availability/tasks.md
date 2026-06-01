## 1. 事前調査

- [x] 1.1 `apps/reservation/src/widgets/home-next-card/ui/HomeNextCard.vue` の現状レイアウト構造を把握し、availability strip を border-top で差し込む位置を確定
  - 結論: 現状 `予約番号 / 詳細を見る` 行の上に新規 strip 行を挿入する。border-top 区切りで既存と同じパターン
- [x] 1.2 `apps/reservation/src/widgets/reservation-detail-card/` 配下のレンダリング構造を把握し、Meta テーブル直下に「予約状況」セクションを挟む位置を確定
  - 結論: `ReservationDetailPage.vue` の DarkFactCard → ReservationMetaTable → 編集 CTA → CancelPolicyBox の順。`MetaTable` の直後、編集 CTA の前に新規セクションを差し込む
- [x] 1.3 `entities/reservation/api/myReservation.ts` / `myReservations.ts` のクエリ構造を把握し、availability merge を追加する形を決定
  - 結論: 前回 `event-client.ts` で確立した「主クエリ + 別途 availability 取得 + Map で merge」パターンを踏襲

## 2. design-tokens の dark トーン追加

- [x] 2.1 `packages/design-tokens/src/index.ts` の color object に dark トーン 3 個を追加
- [x] 2.2 `tokens.css` を `build:tokens` で再生成、CSS variable `--hq-color-success-on-dark` 等が追加されたことを確認
- [x] 2.3 `index.test.ts` に dark トーンの存在 / 値検証を追加 (13/13 緑、drift 検出テストも自動で通る)
- [x] 2.4 `tailwind-preset/index.test.ts` で `success-on-dark` 等の utility キーが exposed されていることを検証 (8/8 緑)

## 3. entities/reservation: 型と API に availability を merge

- [x] 3.1 `MyReservationItem.event` に `availability: EventAvailability | null` を追加
- [x] 3.2 `MyReservationDetail.event` に同じく `availability` を追加
- [x] 3.3 `fetchMyReservations` で event_id 群を集めて `event_availability_view` から in-list 取得 + Map merge
- [x] 3.4 `fetchMyReservation` で単一 event_id に対し `event_availability_view` から取得 + merge
- [x] 3.5 spec に availability 取得成功 / 失敗 / クエリ非発行 の 3 ケースずつ追加 (myReservations 8/8, myReservation 10/10 緑)

## 4. 共通 UI: AvailabilityStrip コンポーネント

- [x] 4.1 `apps/reservation/src/shared/ui/AvailabilityStrip.vue` を新設 (dark / light variant + dot + 文言 + bar / UNCAPPED)
- [x] 4.2 `AvailabilityStrip.spec.ts` 作成 (10/10 緑)
  - 文言は前回 `formatAvailability` の出力をそのまま使用 (「あと N 名 募集」「満員」)。spec ファイルも実装に整合させた

## 5. NEXT カード への組み込み

- [x] 5.1 `HomeNextCard.vue` に `AvailabilityStrip variant="dark"` を予約番号行の上に border-top 区切りで追加
- [x] 5.2 `HomeNextCard.spec.ts` に予約埋まり具合 strip 描画 5 ケース追加 (NULL / 残あり / 満員 / 取得失敗 / 「あなた」非含有) (7/7 緑)

## 6. 予約詳細画面 への組み込み

- [x] 6.1 `ReservationAvailabilityStatus.vue` を新設 (動的セクションラベル + AvailabilityStrip variant="light" 内蔵) し、`ReservationDetailPage` の Meta テーブル直下、編集 CTA の手前に配置
- [x] 6.2 `ReservationAvailabilityStatus.spec.ts` を新設 (capacity NULL / 残あり / 満員 / 取得失敗 / 「あなた」非含有) (5/5 緑)
- [x] 6.3 「あなた」「あなたを含む」が全状態で描画されないことを spec で明示 (上記 5 番目のケースで担保)

## 7. 統合確認

- [x] 7.1 `pnpm --filter @high-q/reservation test` 緑 (82 files / 717 tests pass、本変更で 26 ケース新規 / 修正)
- [x] 7.2 `pnpm --filter @high-q/reservation typecheck` 緑
- [x] 7.3 `pnpm --filter @high-q/design-tokens test` 緑 (13/13、dark トーン値検証 + drift 検出緑)
- [x] 7.4 `pnpm --filter @high-q/tailwind-preset test` 緑 (8/8、utility exposed 検証)
- [x] 7.5 `pnpm -r build` 全パッケージ成功
- [ ] 7.6 dev 環境で `pnpm dev` 起動し目視確認
  - 翔太郎くんが PR Preview 確認時に実施する想定（Render Preview は prd を向くため本番反映後でないと完全機能は見られない）

## 8. spec / docs / archive 準備

- [x] 8.1 PR 説明文ドラフトを作成 (PR_DRAFT.md)
- [x] 8.2 PR レビュー OK 後の Sync / Archive 計画を確認 (`/opsx-ship` で 1 サイクル完結)
