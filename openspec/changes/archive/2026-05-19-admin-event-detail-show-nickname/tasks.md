## 1. Setup

- [x] 1.1 ブランチ作成（`feature/271-event-detail-show-nickname`）

## 2. DB Migration — event_participants_view に nickname 列追加

- [x] 2.1 新規 migration `supabase/migrations/<YYYYMMDDHHMMSS>_add_nickname_to_event_participants_view.sql` を作成
  - `create or replace view public.event_participants_view with (security_invoker = true) as ...` で再定義
  - `select` 句に `m.nickname` を追加（LEFT JOIN 由来で member_id IS NULL の行は自動的に NULL）
  - 既存列の順序・名前は変えない（`create or replace` 制約のため末尾追加）
  - `revoke all on public.event_participants_view from anon; grant select on public.event_participants_view to authenticated;` を明示再付与
  - ロールバック手順をコメントで明記
- [x] 2.2 dev 環境に migration 適用
  - `pnpm db:push` をレム側で実行（memory: 翔太郎くんに振らない）
  - 適用後 `select reservation_id, display_name, nickname from event_participants_view limit 5;` で nickname 列が返ることを目視

## 3. Entity 型 / API layer の更新

- [x] 3.1 `apps/admin/src/entities/reservation/model/reservation.types.ts` の `ParticipantRow` に `nickname: string | null` を追加（既存列の順序は維持）
- [x] 3.2 `apps/admin/src/entities/reservation/api/reservationQueries.spec.ts` を確認し、mock row factory が `nickname` フィールドを返すようにする（あり / なしどちらでも型エラーが出ないこと）
- [x] 3.3 `eventDetailQueries` 側に変更は不要であることを確認（`event_detail_view` は影響範囲外）

## 4. Widget — 参加者テーブルに nickname 併記

- [x] 4.1 `apps/admin/src/widgets/event-participants/ui/EventParticipantsTable.vue` の名前セル描画を更新
  - `display_name` の直後に `（{nickname}）` を併記する template ロジックを追加
  - `nickname` が NULL または空文字の行では括弧自体を出さない（`v-if="row.nickname"` でガード）
  - 既存の `__initial`（アバター先頭文字）は `display_name.charAt(0)` のまま、nickname の影響を受けないことを確認
  - 名前セルの `whitespace-nowrap` は維持
- [x] 4.2 `apps/admin/src/widgets/event-participants/ui/EventParticipantsTable.vue` の component test を新規追加（または既存 spec を拡張）
  - nickname あり: `山田 太郎（たろちゃん）` の文字列が描画されること
  - nickname なし（null）: `佐藤 健太` のみで括弧が描画されないこと
  - 退会済み会員（display_name = "退会済み会員" / nickname = null）: 括弧が描画されないこと

## 5. Composable — 検索条件に nickname を追加

- [x] 5.1 `apps/admin/src/widgets/event-participants/composables/useEventParticipantsData.ts` の `applyFilter` を更新
  - `filter.q` の部分一致対象に `r.nickname` を追加
  - `r.nickname` が null の行は短絡評価でスキップ（空文字検索などでの誤マッチ防止）
- [x] 5.2 `useEventParticipantsData.spec.ts` に test を追加
  - `?q=たろ` で `nickname = 'たろちゃん'` の行のみがヒット（nickname null の同姓は含まれない）
  - `?q=<空文字>` 相当の挙動が壊れていない（filter.q.length > 0 ガードは維持）
  - nickname null のみの集団に対する検索で誤マッチが起きない（regression ガード）

## 6. ユーザー視点での確認準備

- [x] 6.1 dev 環境で nickname を持つ会員 / 持たない会員の 2 名以上を 1 つの event に予約させる seed / 手作業を用意
  - `supabase/seed/dev_event_detail_seed.sql` + 新規 `supabase/seed/dev_nickname_seed.sql` を `npx supabase db query --linked --file` で dev に投入済
  - event `206e0c59-...あああああ` に 5 名（nickname あり 3 / なし 2 / 過去 attended 1）が並ぶ状態を view で確認済
- [ ] 6.2 ローカル `/events/<id>` で表示 / 検索 / モバイル幅 (375px) の振る舞いを目視確認

## 7. 最終検証

- [x] 7.1 `pnpm exec vitest run --filter @high-q/admin` を実行し全パス
- [x] 7.2 `pnpm --filter @high-q/admin build` でビルド成功
- [ ] 7.3 PR 作成（base: master）+ Render PR Preview の URL で表示 / 検索を再確認
  - ⚠️ Render PR Preview は env var の sync:false で prd Supabase を向く想定。新規 view を使うため、PR Preview を回す前に prd へ migration 適用が必要（memory: prd Supabase 切替時は手動 sync 必須）。先に dev で検証完了後、PR Preview を回すタイミングで prd 適用するか、PR description で「PR Preview 適用前に prd db push 必須」と Test Plan に明記
- [ ] 7.4 翔太郎くんに動作確認手順を提示 → ship 合図を待つ

## 8. Ship 後の後始末

- [ ] 8.1 `/opsx:sync` で specs / docs 反映
- [ ] 8.2 `/opsx:archive` で change を archive へ
- [ ] 8.3 master へ merge + ブランチ削除 + Issue #271 クローズ
