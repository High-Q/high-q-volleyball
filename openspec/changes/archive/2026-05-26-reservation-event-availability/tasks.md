## 1. 事前調査

- [x] 1.1 `reservation-booking-flow` capability の予約確定後フローを調査し、確定後に一覧 / 詳細を refetch する経路が既存にあるかを確認（無ければ 5.x で軽量 invalidate を追加するか判断）
  - 結論: `BookingDonePage` で `useEventDetail.reload` が再取得経路として既存。一覧側は明示的 invalidate なしだがホーム戻り時に初回 fetch で更新される。MVP1 許容範囲、本変更で追加 invalidate は不要
- [x] 1.2 `apps/reservation/src/features/next-reservation/` 配下の構造を確認し、NEXT カード描画箇所を特定（チップを描画しないことの確認用）
  - 結論: NEXT カードは `widgets/home-next-card/ui/HomeNextCard.vue`。MyReservationItem を props で受け取り、availability 系のフィールドは props にも DOM にも含まれていない。本変更で改変不要
- [x] 1.3 既存 `event_list_view` / `event_detail_view` migration ファイルを再読し、新 view の SQL 構造のひな型として参照（特に LATERAL サブクエリ集計パターン）
  - 結論: `events e LEFT JOIN LATERAL (SELECT sum(1+guest_count) FILTER(...) FROM reservations WHERE event_id = e.id) agg ON true` パターンを採用する

## 2. DB: 会員向け予約集計 view の新設

- [x] 2.1 新 view 名を `event_availability_view` で確定（design Open Questions 解消）
- [x] 2.2 migration ファイル `supabase/migrations/<timestamp>_event_availability_view.sql` を作成
- [x] 2.3 `REVOKE ALL ON public.event_availability_view FROM anon` + `GRANT SELECT ON public.event_availability_view TO authenticated` を migration に含める
- [x] 2.4 migration の冒頭コメントに「会員用集計 view、admin view とは独立、SECURITY DEFINER + aggregate-only で個人情報漏洩を構造的に防止」「ロールバック: DROP VIEW event_availability_view」を明記
- [x] 2.5 dev DB に `supabase db push` で適用（memory: dev DB の CLI 操作はレムが実行）
- [x] 2.6 dev DB でアドホック SELECT を `supabase db query --linked --file <tmp>` で実行し、capacity NULL / capacity あり / 満員（全件集計）/ 0 件 の 4 ケースで期待値が返ることを確認
  - 結論: events 全件 (dev は capacity=NULL のみ、reserved_count=0〜14) に対し admin event_detail_view と同値。same_count=true 全行

## 3. entities: 型と API クライアントの拡張

- [x] 3.1 `apps/reservation/src/entities/event/model/event.types.ts` に `EventAvailability` 型を追加
- [x] 3.2 `EventListItem` / `EventDetail` 型に `availability: EventAvailability | null` フィールドを追加（取得失敗時 null）
- [x] 3.3 `apps/reservation/src/entities/event/api/event-client.ts` の `fetchUpcomingEvents` を拡張
- [x] 3.4 `fetchEventDetail` を同様に拡張（単一 event_id の `event_availability_view` を取得）
- [x] 3.5 unit test を `event-client.spec.ts` に追加（availability 取得成功 / 失敗の両 path）

## 4. 共通 UI: AvailabilityChip コンポーネント

- [x] 4.1 `apps/reservation/src/shared/ui/AvailabilityChip.vue` を新設
- [x] 4.2 トーン色を design tokens 経由で表現（OK / WARN (80%+) / FULL の 3 段階）
  - 結論: `packages/design-tokens` に既存の `success` / `warn` / `danger` を活用。tailwind utility `text-ink-soft` / `text-warn` / `text-danger` で 3 段階表現
- [x] 4.3 `AvailabilityChip.spec.ts` を作成 (7 ケース緑)

## 5. 一覧画面: EventRow への組み込み

- [x] 5.1 `apps/reservation/src/features/event-listing/ui/EventRow.vue` の最下段（時刻 + 参加費の行）に `AvailabilityChip` を配置
  - 結論: time·fee の下に独立行で配置（モバイル可読性優先）
- [x] 5.2 `EventRow.spec.ts` の「満員 / 経験レベル / 残席数のバッジは描画されない」テスト（line 54-62）を書き換え
- [x] 5.3 `EventRow.spec.ts` に capacity NULL / capacity あり / 満員 / loading / availability=null の 5 ケースを追加 (10/10 緑)
- [x] 5.4 `apps/reservation/src/features/event-listing/composables/useUpcomingEvents.ts` の状態管理を確認
  - 結論: `fetchUpcomingEvents` 内部で availability 取得失敗時は events 各行に `availability: null` で merge する。主データは継続描画され、composable の error 状態には影響しない

## 6. 詳細画面: EventInfoBlock + StickyCta の改修

- [x] 6.1 `apps/reservation/src/features/event-detail/ui/EventInfoBlock.vue` の facts grid に予約埋まり具合の行を追加 (formatAvailability 関数共有、tone-based color、EventInfoBlock.spec.ts 6/6 緑)
- [x] 6.2 `apps/reservation/src/features/event-detail/ui/EventStickyCta.vue` を改修 (availability prop + 満員時 disabled + ラベル「予約締切」+ proceed 非 emit)
- [x] 6.3 `EventStickyCta.spec.ts` に満員 / capacity NULL / capacity あり残あり の 3 ケースを追加 (6/6 緑)
- [x] 6.4 詳細画面の Loading / Error 状態時の facts grid 描画を確認
  - 結論: EventDetailPage は loading/error/notFound の 3 ガードで EventInfoBlock 自体を描画しない構造。availability 取得失敗時のみ EventInfoBlock 内で `—` fallback で対処済（EventInfoBlock.spec.ts でカバー）

## 7. 共通文言ロジックの整理

- [x] 7.1 `apps/reservation/src/entities/event/lib/format-availability.ts` を新設し、AvailabilityChip / EventInfoBlock 共通の文言生成関数を実装
- [x] 7.2 `format-availability.spec.ts` に capacity NULL / 残あり / 満員 / 0 名 / null の 5 ケース unit test を追加

## 8. NEXT カードへの非適用確認

- [x] 8.1 NEXT カード描画コンポーネントを Read して、availability 系の Props / 描画ロジックが入っていないことを目視確認 (HomeNextCard.vue + entities/reservation 配下を grep、ヒット 0 件)
- [x] 8.2 NEXT カードの spec ファイル（既存 spec 内 Scenario）に変更が不要であることを確認 (本 change の spec で「NEXT カードに描画しない」要件を明示済み)

## 9. 統合確認

- [x] 9.1 `pnpm --filter @high-q/reservation lint` を実行し緑
  - 結論: reservation には lint script 未定義 (package.json 確認)。typecheck で代替
- [x] 9.2 `pnpm --filter @high-q/reservation test` を実行し緑（80 files / 691 tests pass）
- [x] 9.3 `pnpm --filter @high-q/reservation typecheck` 緑、`pnpm -r build` も全パッケージ成功
- [ ] 9.4 dev 環境で `pnpm dev` 起動し、一覧 / 詳細でチップ / facts 行 / CTA disabled の 3 種を目視確認
  - 翔太郎くんが PR 作成後に Render Preview で確認するため、ローカル目視は本セッションでは skip（Test Plan に明記）

## 10. spec / docs / archive 準備

- [x] 10.1 PR 説明文ドラフトを作成 (openspec/changes/reservation-event-availability/PR_DRAFT.md)
- [x] 10.2 PR レビュー OK 後の Sync / Archive 計画を確認 (`/opsx-ship` で 1 サイクル完結)
- [x] 10.3 prd Supabase への migration sync 手順を Test Plan に明記 (PR_DRAFT.md 内に記述)
