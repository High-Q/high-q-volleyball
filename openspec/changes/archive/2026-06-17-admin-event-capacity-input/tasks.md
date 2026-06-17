## 1. entities/event: 型と永続化の capacity 解禁（TDD）

- [x] 1.1 `EventUpdate` 型に `capacity?: number | null` を追加（`packages/shared`。`EventInsert` は既に capacity 保持済み）
- [x] 1.2 `eventQueries.spec.ts` を新契約に更新（createEvent が capacity を payload に通す / 空は null / updateEvent の allowlist に capacity が入る / null も通す）
- [x] 1.3 `createEvent` の `capacity: null` 固定を `capacity: input.capacity ?? null` に変更
- [x] 1.4 `updateEvent` の allowlist に `if ("capacity" in p) safe.capacity = p.capacity;` を追加（visibility / description / cancel_deadline の固定・除外は維持）

## 2. widgets/event-form: バリデーションスキーマ（TDD）

- [x] 2.1 `eventFormSchema.spec.ts` に定員バリデーションのテストを追加（空欄=有効/NULL、1 以上の整数のみ有効、0・負数・小数・非数は無効、編集時 reservedCount 未満は無効・以上は有効、reservedCount 取得失敗時は下限スキップ）
- [x] 2.2 `eventFormSchema.ts` に capacity フィールド + バリデーション（任意・1 以上整数・編集時下限 `reservedCount`）を追加。下限は `ValidationOptions` で受け取り、未取得時はスキップする純関数設計

## 3. widgets/event-form: 入力 UI と composable 配線

- [x] 3.1 `SectionBasic.vue` に定員入力を追加（`FormField` でラップ、`type="number"`、placeholder/hint「上限なし」、`aria-invalid` / `aria-describedby` 配線）
- [x] 3.2 `useEventForm.ts` に capacity の state 入出力を追加（`eventToState` で既存値反映、create/edit payload へ）
- [x] 3.3 `EventEditPage` で Edit マウント時に `event_detail_view` の `reserved_count` を取得し、`reservedCount` getter で `EventForm`→`useEventForm`→バリデーションに渡す。取得失敗は縮退（Error にしない）

## 4. 下流の検証（コード変更なし）

- [x] 4.1 残席 StatCard / RemainBar は capacity 非 NULL で描画される実装済み（コード変更不要）。実画面確認はローカル動作確認で実施
- [x] 4.2 満員 CTA「予約締切」/ 予約埋まり具合チップ「満員」は capacity 非 NULL かつ満員で機能する実装済み（コード変更不要）。実画面確認はローカル動作確認で実施

## 5. テスト + 最終確認（まとめて 1 回）

- [x] 5.1 Component テスト追加（`SectionBasic` の定員値反映 + emit + バリデーションエラー表示 + hint、`EventForm` 4 状態は既存テストで成立確認）
- [x] 5.2 Integration テスト追加（`useEventForm` Create / Update で capacity が payload に反映 / 空欄=null / 下限割れで submit ブロック）
- [x] 5.3 E2E happy path は本リポジトリ方針（CLAUDE.md E2E スケーラビリティ規約 + events-crud.e2e.ts の rationale）に従い component/integration へ押し下げ済み。重い E2E は追加せず e2e コメントを更新
- [x] 5.4 `pnpm --filter @high-q/admin test`（981 pass）/ `typecheck`（0 error）/ `lint`（0 error）/ `build`（成功）+ `@high-q/shared` typecheck・test（pass）を確認
