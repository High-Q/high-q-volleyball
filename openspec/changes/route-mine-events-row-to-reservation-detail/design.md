## Context

会員サイトホームには NEXT カード (最早の自分予約 1 件) と「他のイベント」リストがある。後者は upcoming events 全件のうち NEXT の event_id を除いて並べる素朴な実装で、各行は `EventRow.vue` が `/events/{eventId}` への router-link を一意にレンダリングしている。

2 件目以降の自分予約は NEXT に昇格しないため「他のイベント」に紛れて出てしまい、押下するとイベント詳細→「予約に進む」CTA という、ユーザーから見れば二度予約させようとされる体験になる。DB 側は `reservations.(event_id, member_id)` の UNIQUE 制約で実害なく弾かれているが、UX 観点では戻り経路と「予約済」表示のない迷路状態。

NEXT カードの算出元である `useNextReservation(uid)` は内部で `fetchMyReservations(uid)` を呼び、結果配列を最早 1 件にフィルタしている。同 API を再利用することで、追加ネットワークコールなしに「自分の予約済イベント全件」のマップが手に入る。

## Goals / Non-Goals

**Goals:**
- 「他のイベント」行のうち自分予約済みのものを押下した場合、`/reservations/{reservationId}` に遷移させる
- 押下前から「予約済」と判別できる軽量な視覚表示を該当行に付与し、押下後の遷移先と表示の期待を一致させる
- 既存の NEXT カード抽出ロジックと `fetchMyReservations` 呼び出しを再利用し、API コール / RLS / DB 変更ゼロで実現する

**Non-Goals:**
- 過去予約 (`status = 'attended' / 'cancelled' / 'no_show'`) の行に対する遷移先変更 (履歴系は別動線、別 Issue)
- 履歴一覧画面 (`/history`) の押下先変更 (同上、別 Issue)
- 「他のイベント」リストから自分予約イベントを丸ごと除外する案 (NEXT 除外を 1 件 → 全件に拡張する案)。Issue は遷移先切替を採用しており、ユーザー視点でも「他で参加予定があったな」と俯瞰できる利点があるため除外案は採らない
- 参考デザイン `MineBadge` の左境界線 + 行背景色変更などフル装飾。MVP1 では過剰

## Decisions

### D1: 自分予約マップは `useNextReservation` の戻り値拡張で得る

`useNextReservation(uid)` は既に `fetchMyReservations(uid)` を呼んでおり、戻り配列を最早 1 件にフィルタしている。同じ配列を 2 度評価する形で `eventId → reservationId` の対応 Map も同時に返せば、追加 API コール無しで全要件が満たされる。

**戻り値拡張案:**

```ts
type NextReservationState = {
  reservation: Ref<MyReservationItem | null>;
  /** event_id → reservation_id (status='reserved' かつ未来。NEXT に昇格した最早 1 件も含む) */
  mineByEventId: Ref<ReadonlyMap<EventId, ReservationId>>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
};
```

呼び出し側 (`EventsListPage`) では既存の `nextReservation` 取得に加えて Map を購読し、`otherEvents` の各 row に対して props 経由で `reservationId` を渡す。Map に最早 1 件も含めるかは「NEXT は別 widget でルーティング解決済」のため不要だが、含めても呼び出し側で害がないため含める (Map 操作の素直さを優先)。

**代替案: 別 composable `useMyReservationMap` を新設**

API 二重呼び出しになるため不採用。NEXT 算出元と自分予約マップは同じデータソースから派生する関係であり、両者を分離する必然性はない。

**代替案: composable をリネーム (`useMyUpcomingReservations` 等)**

呼び出し側の import 文書き換えが派生変更として広がる。今回のスコープでは戻り値拡張のみに留め、リネームは将来の Issue で行う。Doc コメントには「最早 1 件 + 全件 Map を返す」旨を追記する。

### D2: `EventRow` に optional props `reservationId` を追加し router-link 先を分岐

`EventRow.vue` の `<router-link :to>` は今 `{ name: 'event-detail', params: { id: event.id } }` でハードコード。これを computed に切り出し、props.reservationId が truthy なら `{ name: 'reservation-detail', params: { reservationId } }` に切り替える。

```ts
const linkTo = computed(() =>
  props.reservationId !== null && props.reservationId !== undefined
    ? { name: 'reservation-detail', params: { reservationId: props.reservationId } }
    : { name: 'event-detail', params: { id: props.event.id } }
);
```

Router の `reservation-detail` route は既に `apps/reservation/src/app/router.ts:79-80` で定義済 (`/reservations/:reservationId`)。reservation 詳細画面の実装も既にあるため、route 名解決と遷移先画面側の処理は追加実装不要。

### D3: 「予約済」視覚表示は軽量チップ 1 つに留める

参考デザインの `MineBadge` は行背景色変更 + 左境界線 + バッジの 3 要素で構成されているが、MVP1 では行装飾の差別化は過剰。`AvailabilityChip` の隣に「予約済」とだけ書かれた軽量 chip を 1 つ並べる方針とする。

色は HQ デザイントークン `accent-soft` 背景 + `accent` 文字色 (= 右上アバターと同じ配色) を使う。背景色変更が必要ならば後続 Issue で扱う。

実装場所: `EventRow.vue` 内 `AvailabilityChip` の直前または直後に Vue template で `<span v-if="reservationId !== null">予約済</span>` を追加。data-testid は `event-row-mine-badge` とする。

### D4: フィルタ条件は `status === 'reserved'` かつ `startAt > now`

Map に入れる予約は NEXT カードの条件と同じ「reserved かつ未来」に揃える。理由:

- `attended` / `no_show` はイベントが既に過去なので、`useUpcomingEvents` が返す upcoming events と event_id で交差しない (Map に含めても無害だが意味がない)
- `cancelled` を含めると、キャンセル済予約のあるイベント行が予約詳細に飛んでしまい、ユーザーが混乱する
- `waitlist` は MVP1 では実質運用していない (実装上は wave 1 後の話)

`reserved` + 未来 のみが「現在ユーザーが予約を持っている」状態であり、これを基準とするのが最も safe。`useNextReservation` の `pickNext` フィルタと完全に同じ条件を使う (共通ヘルパに切り出す)。

## Risks / Trade-offs

- **[Risk] Map に空 `event_id` が混ざる** → `fetchMyReservations` の戻りは `events` JOIN が null のものを既にフィルタ済 (`myReservations.ts:76`)。`event.id` は brand 化された `EventId` で型保証されるため Map のキーは確実に有効
- **[Risk] reservation-detail route の name が将来変わる可能性** → router 定義 (`router.ts:79-80`) は既に確定済で他所からも依存されている。名称変更が必要なら別 Issue で一括対応
- **[Trade-off] 「予約済」 chip を AvailabilityChip と並べる場所選定** → 並べると行が縦に膨らむ可能性。実装時に視覚バランスを確認し、必要なら `AvailabilityChip` と横並びにする (apply 中に微調整)
- **[Trade-off] 自分予約イベントを除外する代替案を採らない** → 「自分予約あり行が他のイベントに出る」のは UX の俯瞰性を担保する選択。除外案を採れば bug は消えるが、「他にこのイベントもあった」と気づける情報を奪う

## Migration Plan

- DB / RLS / Edge Function 変更なし。コード変更のみで完結
- Render PR Preview 上で次の手順で確認可能:
  1. テスト会員でログイン
  2. 未来の異なる 2 イベントに事前予約を入れた状態でホームを開く
  3. NEXT カードに最早 1 件、「他のイベント」リストに 2 件目の自分予約と他会員も予約可能な空きイベントが混在表示されること
  4. 自分予約のある行を押下 → `/reservations/{id}` に遷移すること
  5. 自分予約のない行を押下 → `/events/{id}` に遷移すること (従来挙動維持)
  6. 自分予約あり行のみに「予約済」 chip が描画されていること

## Open Questions

- 「予約済」 chip の文言として「予約済」「予約あり」のどちらが自然か → デフォルトは「予約済」(完了形で確定済を示す)。Apply 中の UI 確認段階で違和感があれば差し替え
