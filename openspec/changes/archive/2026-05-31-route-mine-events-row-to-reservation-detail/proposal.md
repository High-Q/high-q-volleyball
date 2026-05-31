## Why

会員サイトホームの「他のイベント」セクションで、自分が既に予約済みのイベント行を押下しても今は通常のイベント詳細画面に遷移し、「予約に進む」CTA が出てしまう。会員視点では「予約済なのにもう一度予約しろと言われている」迷路になる (二重予約自体は DB UNIQUE 制約で阻止されるが、UX として破綻している)。自分の最早予約 1 件のみは NEXT カードに昇格して除外されるため、2 件目以降の自分予約だけがこの問題に該当する。

## What Changes

- 「他のイベント」リストの各行について、その行のイベントに対する自分の `reserved` 予約が存在する場合は、押下時の遷移先を `/reservations/{reservationId}` (予約詳細画面) に切り替える。存在しない場合は従来通り `/events/{id}` (イベント詳細画面) のまま
- 自分の予約済みであることが押下前に分かるよう、軽量な「予約済」表示を該当行に付与する (押下後の挙動と表示の予告を一致させ、迷路化を防ぐため)
- 上記判定に必要な「自分の予約一覧」は既にホームで取得済 (NEXT カード算出元) のため、ホーム側 composable の戻り値を「event_id → reservation_id」マップへ拡張する形で再利用する (追加 API コール無し)

## Capabilities

### New Capabilities
<!-- なし -->

### Modified Capabilities

- `reservation-events-and-booking`: 「他のイベント」行の押下動作と表示要件に、自分が予約済みのイベント行の分岐を追加する (遷移先が予約詳細、視覚的な予約済表示)

## Impact

- 会員サイト (`apps/reservation`) のみ。LP / 管理画面は影響なし
- ホーム画面の表示挙動と遷移先のみ変更。DB スキーマ / RLS / API / Edge Function は変更なし
- 既存の component test (`EventRow.spec.ts` / `EventsListPage.spec.ts`) と spec の「他のイベント行押下」シナリオに延長が入る
