## 1. DB: get_event_availability 関数 + view DROP（TDD 検証つき）

- [x] 1.1 migration 作成: `public.get_event_availability(p_event_ids uuid[])` を `language sql` / `security definer` / `set search_path = public` で定義。返却 `table(event_id uuid, capacity int, reserved_count int)`、`public.events` LEFT JOIN `public.reservations`、`filter (status in ('reserved','attended'))`、`coalesce(...,0)`、`where e.id = any(p_event_ids)`、`group by e.id, e.capacity`
- [x] 1.2 権限: `revoke all on function ... from public` + `grant execute ... to anon, authenticated`
- [x] 1.3 同 migration で `drop view if exists public.event_availability_view;`。末尾 `-- ROLLBACK:` に「関数 DROP + 旧 view（security_invoker=false / grant select to anon,authenticated）再作成」SQL を記載
- [~] 1.4 dev 適用（`pnpm db:push`）→ シナリオ値検証。**非破壊の等価検証を先行実施済み**: 関数と等価な集計 SQL vs 既存 view を dev 実データで突合 → 52 events 全一致 / 不一致 0（reserved_count・capacity とも）。**実 migration 適用（view DROP を伴う）は ship 時に実施**（共有 dev の残席を壊すため翔太郎くん合意後）
- [x] 1.5 dev へアドホック適用し検証済み: `anon_exec=true / authed_exec=true / service_exec=false / is_secdef=true / search_path=public / view 消滅(0)`

## 2. アプリ: view SELECT → RPC 切替（LP / reservation 計3箇所）

- [x] 2.1 `apps/lp/src/entities/event/api/availabilityQueries.ts`: `.from("event_availability_view").select(...).in("event_id", ids)` → `.rpc("get_event_availability", { p_event_ids: ids })`。**失敗時は throw を廃し空 Map 返却（graceful）** に統一。spec（`availabilityQueries.spec.ts`）を追随
- [x] 2.2 `apps/reservation/src/entities/reservation/api/myReservations.ts`: 同様に `.rpc()` 化。spec 追随。**追加発見**: `apps/reservation/src/entities/event/api/event-client.ts`（batch + single の2クエリ）も view 消費側だったため同時に `.rpc()` 化 + spec 追随
- [x] 2.3 `apps/reservation/src/entities/reservation/api/myReservation.ts`: 同様に `.rpc()` 化（単一は `p_event_ids:[id]`→先頭行）。spec 追随
- [x] 2.4 view 名を参照するコメント（`event.types.ts` admin/reservation・AvailabilityChip/Strip.vue）を関数名へ追随（機能変更なし）

## 3. 最終確認

- [x] 3.1 影響 spec を vitest 実行 → 30 tests 全 pass（availabilityQueries / myReservation / myReservations / event-client）。両アプリ typecheck もクリーン
- [ ] 3.2 【翔太郎くんローカル確認】LP（anon）と reservation（authenticated）の残席表示が変更前と同値であることを確認（募集中「あと N 名 募集」/ 満員 / 定員無制限「N 名 予約中」）
- [x] 3.3 admin view・`reservations` RLS 不変を dev で確認: `event_list_view`/`event_detail_view` 存続 + `security_invoker=true`、`reservations` RLS 有効 + policy 4本
- [x] 3.4 ロールアウト窓の graceful 劣化は unit test で担保（LP: error→空Map / reservation: error→空Map・null）。実機での任意スポット確認は 3.2 に含める

## 4. ロールアウト（ship 時・承認ゲート）

- [ ] 4.1 ship 方式を確定（推奨: 1 PR + 短窓許容 / 代替: 2 PR ゼロ窓）— 翔太郎くん確認
- [ ] 4.2 merge → Render デプロイ → **prd migration 承認を速やかに実行**して不整合窓を最小化
- [ ] 4.3 prd で Supabase Advisor を再実行し `event_availability_view` の SECURITY DEFINER Critical 解消を確認 + 残席表示を確認
