## 0. 旧スコープ（title-only）の巻き戻し

- [x] 0.1 旧 `splitEventTitle`（name パース版）と spec を撤去: `apps/reservation/src/entities/event/lib/split-event-title.ts` / `.spec.ts` を削除し、`entities/event/index.ts` の export を除去
- [x] 0.2 `EventDetailPage.vue` の旧見出し変更（`splitEventTitle` 利用・name パース）を一旦戻す（vol カラム版で作り直すため）。`EventDetailPage.spec.ts` の旧 editorial テストも除去

## 1. DB migration（vol カラム + 採番 + backfill・TDD）

- [x] 1.1 SQL テストを先に用意（`supabase/tests/` に検証 SQL）: (a) backfill で `第74回ゆる練`→vol=74/name=ゆる練・`ゆる練 vol.43`→vol=43・非定型→vol=NULL、(b) 未開催の連番が過去最大 vol に続く、(c) 早い日付の割り込みで以降 +1 シフト・過去不変、(d) 未開催 cancelled で番号解放し以降詰まる・過去 cancelled は凍結、(e) 部分一意制約違反
- [x] 1.2 新規 migration を作成（`supabase/templates/` 流儀・先頭に `-- ROLLBACK:` 手順明記）: `events.vol smallint NULL` 追加 + 部分一意 index `events_vol_unique` + `public.resequence_future_event_vols()`（`SECURITY DEFINER`・design D2 擬似コード）+ statement-level トリガ（`AFTER INSERT OR DELETE OR UPDATE OF start_at, status`）+ 関数への anon/authenticated/service_role 明示 GRANT
- [x] 1.3 同 migration 内で既存データ backfill: `第(\d+)回` / `vol\.?\s*(\d+)` をパースして vol 格納・name 分離（trim）、パース不能は据え置き、最後に `resequence_future_event_vols()` を 1 回実行
- [x] 1.4 `scripts/static-checks/migrations/check-rls.sh` 等の migration-safety を意識（ALTER のため RLS 新規不要だが rollback コメント必須）。必要なら allowlist 追記理由を明記
- [x] 1.5 dev へ `pnpm db:push`（レム実行）→ 1.1 の検証 SQL を `supabase db query --linked` で実行し全観点 green を確認

## 2. view への vol 追加

- [x] 2.1 `event_list_view` / `event_detail_view` を `vol` 列を返すよう再定義する migration（`SECURITY INVOKER` / 既存集計列は不変）
- [x] 2.2 dev へ push 後 `select vol from event_list_view / event_detail_view` で vol 取得を確認

## 3. reservation 取得・型・表示

- [x] 3.1 `entities/event` の `EventDetail` 型に `vol: number | null` を追加し、単一取得（`fetchEventDetail` / `event_detail_view` 経由）の SELECT・マッピングに vol を含める。`EventRow` 等関連型も追従
- [x] 3.2 `EventDetailPage.vue` の見出しを vol カラム版に実装: `event.vol !== null` なら `event.name` を大見出し（`font-jp-display text-4xl`）+ 改行 `vol.{vol}` を `font-mono text-accent` で表示、NULL なら名前のみ大見出し（fallback）。トークン utility のみ
- [x] 3.3 `EventDetailPage.spec.ts` に component test: vol あり（`vol.74` が mono+accent span・name 大見出し）/ vol なし（fallback・vol 行なし）

## 4. admin フォーム・型

- [x] 4.1 `useVolumeSuggest.ts` と `useVolumeSuggest.spec.ts` を削除し、`EventForm` / `SectionBasic` からタイトルプレースホルダ補完の参照を除去
- [x] 4.2 `EventForm` のタイトル欄を「シリーズ名（回号を含めない）」に変更し、「vol は自動採番」hint を追加。編集画面で確定済み `vol` を読み取り専用表示（未採番は未採番表示）
- [x] 4.3 admin の event 型 / `event_list_view`・`event_detail_view` 取得（`useEventsListData` / `useEventDetailData` 周辺）に `vol` を追従。表示が必要な箇所（一覧 / 詳細）で読み取り専用に出す
- [x] 4.4 影響テスト更新: `EventForm.spec.ts` / `SectionBasic.spec.ts` / `useEventForm.spec.ts` / pages の vol.XX 前提・型 fixture（`vol` 追加）を修正

## 5. 最終確認

- [x] 5.1 `pnpm --filter @high-q/reservation exec vitest run` 全 green
- [x] 5.2 `pnpm --filter @high-q/admin exec vitest run` 全 green
- [x] 5.3 `pnpm --filter @high-q/reservation build` / `pnpm --filter @high-q/admin build` 成功
- [x] 5.4 両アプリの変更ファイルに eslint / stylelint 違反なし（トークン経由・マジックナンバーなし）
- [ ] 5.5 dev で採番の探索的確認（admin で未開催イベントを 2 件作成→早い日付で割り込み→以降 +1 シフト / 予約サイト詳細で `vol.NN` 強調表示 / 中止で番号解放）

## 6. admin 一覧への vol 表示（追加要望）

- [x] 6.1 `EventListRow` に `vol` を追加（`event_list_view` の select("*") で取得済み）
- [x] 6.2 `EventsTable` のタイトル下に `vol.NN`（mono/muted）を desktop / mobile card 両方で表示。NULL は非表示。component test 追加

## 7. LP への vol 表示（追加要望）

- [x] 7.1 LP `eventQueries` の SELECT に `vol` を追加し `LpEvent` / view-model に vol を付与
- [x] 7.2 `EventList.vue` のカードに `vol.NN`（mono/accent kicker）を表示。NULL は非表示。query テストに vol 観点追加
- [x] 7.3 Hero 直下の `NextSessionStrip`（次回開催 NEXT バー）でイベント名の右横に `vol.NN`（accent・タイトルと同フォントサイズ）を表示。NULL は非表示

## 8. 予約サイトホームへの vol 表示（追加要望）

- [x] 8.1 `EventListItem` に `vol` を集約（`EventDetail` の重複削除）。`fetchUpcomingEvents` / `fetchMyReservations` の SELECT・マッピングに vol を追加。`MyReservationItem.event` に vol
- [x] 8.2 `EventRow`（他イベント行）と `HomeNextCard`（次回予約カード）に `vol.NN` を表示。NULL は非表示。両者に component test 追加
