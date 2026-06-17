## Why

イベント作成/編集フォームに定員（`capacity`）入力経路が無く、全 event が `capacity = NULL`（上限なし）で固定されている。そのため「満員」概念が成立せず、残席表示・RemainBar・満員時 CTA・キャンセル待ちといった capacity 前提の機能が実装済みでも永久に発火しない。本変更で定員入力 UI を復活させ、これらの下流機能を有効化する。

## What Changes

- イベント作成/編集フォームの「01 基本情報」セクションに **定員（任意）入力フィールド**を追加する（`FormField` でラップ）。
- 空欄保存で `capacity = NULL`（上限なし運用を維持）、数値入力で当該値を INSERT / UPDATE する。
- バリデーション: 入力時は 1 以上の整数。**編集時は現在の有効予約人数（本人 + 同伴）を下回る定員を設定できない**（残席が負にならないよう保存をブロック）。
- `createEvent` / `updateEvent` の payload に `capacity` を通す（現状は固定 NULL / allowlist 除外）。
- 下流の残席 StatCard / RemainBar（admin）・満員 CTA / 予約埋まり具合チップ（reservation）は capacity 対応済みのため、capacity 非 NULL の event で自動的に機能することを検証する（コード変更なし）。

スコープ外: 紹介文 / サムネイル / キャンセル期限 / 公開設定（引き続き MVP1 スコープオフのまま）。

## Capabilities

### New Capabilities
<!-- なし -->

### Modified Capabilities
- `admin-events-crud`: フォームに定員フィールドを追加（「1 セクション構成のフォーム」「バリデーション」「4 状態」要件の更新）。

## Impact

- **admin アプリ**: `widgets/event-form`（`SectionBasic.vue` に定員入力 / `eventFormSchema.ts` にバリデーション / `useEventForm.ts` に capacity 入出力 + 編集時予約数取得）、`entities/event/api/eventQueries.ts`（`createEvent` / `updateEvent` の capacity 対応 + `EventInsert` / `EventUpdate` 型）。
- **編集時の予約数**: `event_detail_view.reserved_count`（本人 + 同伴の active 集計）を取得し、定員下限の判定に使う。
- **DB**: `events.capacity` 列は既存。migration / RLS 変更なし。
- **下流（検証のみ）**: `admin-event-detail`（残席 / RemainBar）・`reservation-events-and-booking`（満員 CTA）。spec 変更なし。
- **前提解消**: 本変更は #344（予約側キャンセル待ち登録）/ #154（キャンセル待ち管理）の前提（満員概念の成立）。
