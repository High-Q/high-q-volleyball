# PR ドラフト

## タイトル候補
```
feat(reservation): NEXT カード・予約詳細画面に予約埋まり具合を表示 (#305)
```

## Summary
- 前回 #277 で「NEXT カードと予約詳細画面には出さない」と決めた D6 を反転
- NEXT カード（黒地ヒーロー）下端に availability strip を追加（dark トーン dot + 文言 + UNCAPPED or progress bar）
- 予約詳細画面の Meta テーブル直下に「予約状況」セクションを追加（動的セクションラベル: 予約状況 / あと何名 / 満員）
- 文言は全画面で完全統一（`formatAvailability` 関数を共有、自分視点補足「あなたを含む」等は付与しない）
- 満員時の予約詳細画面は中立的「満員」表記（「予約締切」とは書かない）
- `design-tokens` に dark トーン 3 色追加（`successOnDark` / `warnOnDark` / `dangerOnDark`）
- DB マイグレーション無し（前回 change の `event_availability_view` を再利用）

## OpenSpec change
`openspec/changes/reservation-mine-availability/`
- proposal.md / design.md / tasks.md / specs (reservation-events-and-booking / reservation-detail-page / design-tokens)

## Test plan

### CI で自動検証されること
- [ ] `pnpm --filter @high-q/reservation test` (82 files / 717 tests pass、本変更で 26 ケース新規 / 修正)
- [ ] `pnpm --filter @high-q/reservation typecheck`
- [ ] `pnpm --filter @high-q/design-tokens test` (13/13 緑、dark トーン値検証 + drift 検出)
- [ ] `pnpm --filter @high-q/tailwind-preset test` (8/8 緑、utility exposed 検証)
- [ ] `pnpm -r build` 全パッケージ成功

### Render Preview で目視確認すること（本番 URL で）
- [ ] ホームの NEXT カード下端に予約埋まり具合 strip が表示される
  - dev 観測値: 「第1回バレー会」14 名、「あああああ」7 名等。capacity NULL のため「N 名 予約中」+ UNCAPPED の組み合わせ
- [ ] 任意の予約詳細画面（`/reservations/:id`）で Meta テーブル直下に「予約状況」セクションが追加されている
- [ ] 全画面で「あなたを含む」「あなた」等の自分視点補足が出ないこと
- [ ] 満員時の予約詳細画面で「予約締切」表記が出ないこと（capacity NULL のみの dev データでは観察不可）
- [ ] DevTools で `event_availability_view` のレスポンスを Block → strip が「—」 fallback、主データは表示継続

### DB
- 新規 migration 無し。前回 change の `event_availability_view` を再利用

## Out of scope
- 「他のイベント」リストへの自分予約混在表示（MineBadge）
- 予約履歴一覧への availability 表示
- 経験レベルバッジの復活

Closes #305
