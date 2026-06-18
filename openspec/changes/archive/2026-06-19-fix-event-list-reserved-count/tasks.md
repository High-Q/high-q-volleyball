## 1. Migration: event_list_view の集計式統一

- [x] 1.1 `supabase/migrations/<timestamp>_event_list_view_v2_headcount.sql` を新規追加。`create or replace view public.event_list_view with (security_invoker = true) as ...` で再定義し、LATERAL 集計サブクエリを `select coalesce(sum(1 + r.guest_count), 0)::int as reserved_count from public.reservations r where r.event_id = e.id and r.status in ('reserved','attended')` に差し替える。列名・列順・型・`security_invoker = true` は既存（`20260430120000_event_list_view.sql`）と完全一致を維持。
- [x] 1.2 migration 冒頭に `-- ROLLBACK:` コメントで旧定義（`count(*) filter (status='reserved')`）への差し戻し手順を記載。
- [x] 1.3 dev DB へ適用（履歴不整合のため `db query --linked` でビュー DDL を直接適用）。一覧×詳細ビューの reserved_count を 51 イベント全件で突き合わせ、不一致 0・完全同値を確認。`supabase db query --linked` で `select id, reserved_count from event_list_view` と `event_detail_view` を同一 event で突き合わせ、同値を確認。

## 2. Spec 反映

- [ ] 2.1 specs delta（`event_list_view ビュー` 要件の reserved_count 定義・集計サブクエリ文・シナリオ）は Propose で作成済み。Apply 完了後の Sync フェーズで `openspec/specs/data-schema/spec.md` へ反映する（このタスクは Sync 時に実施）。

## 3. UI 微修正

- [x] 3.1 `apps/admin/src/widgets/events-list/ui/EventsTable.vue` の `capacity === null` 分岐（デスクトップ行 162-170 付近 / モバイルカード 223-231 付近の 2 箇所）の `{{ row.reserved_count }} 件` を `{{ row.reserved_count }} 名` に修正。RemainBar への `:taken="row.reserved_count"` はそのまま（capacity と単位が席数→人数で揃う）。
- [x] 3.2 型定義 `apps/admin/src/entities/event/model/event.types.ts` の `EventListRow.reserved_count` はコメントのみ確認（列構成不変のため型変更なし。コメントが「件数」を示唆していれば「本人+同伴の人数」へ更新）。

## 4. テスト更新

- [x] 4.1 `apps/admin/src/widgets/events-list/ui/EventsTable.spec.ts` の「N 件」期待値テスト 2 件（`capacity: null` 行・カード）を「N 名」へ更新。
- [x] 4.2 `supabase/tests/verify_*.sql` の慣習に倣い `supabase/tests/verify_event_list_view.sql` を追加（一覧×詳細 reserved_count 同値性 + 権限マトリクスの smoke 検証）。dev で実行し権限 anon=false/authenticated=true、同値性 mismatch=0 を確認。

## 5. 最終確認

- [x] 5.1 `apps/admin` で `pnpm exec vitest run`（EventsTable / eventQueries）を実行し緑（62 件 pass）。
- [x] 5.2 `pnpm build`（admin ビルド）成功・エラーなし。
- [ ] 5.3 dev でパスワードレスログイン（`pnpm dev:login` 系）→ `/events` 一覧で、定員あり/なし・同伴あり予約・チェックイン後の各ケースで残席表示が人数ベースかつチェックイン後に減らないことを目視確認。
