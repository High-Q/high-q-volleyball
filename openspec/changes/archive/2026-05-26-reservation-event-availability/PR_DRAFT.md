# PR ドラフト (草稿、push 前に最終確認)

## タイトル候補
```
feat(reservation): 予約埋まり具合の表示を追加 (#277)
```

## Summary
- 会員サイトのイベント一覧 / 詳細に「予約埋まり具合」を表示。capacity NULL「N 名 予約中」/ capacity あり「あと N 名 募集」/ 満員「満員」の動的切替（参考デザイン B 案準拠、「席」表記なし）
- 満員時はイベント詳細の「予約に進む」CTA を disabled + 「予約締切」に切替
- 個人情報を漏らさない aggregate-only の `event_availability_view` を新設 (SECURITY DEFINER) し、会員ロールから全件集計を安全に開示。admin 用 `event_list_view` / `event_detail_view` は無改変
- NEXT カードには表示しない（自分の予約済イベントには情報意義が薄いため）
- 4 状態（Loading / Empty / Error / Success）を網羅。取得失敗時はチップだけ `—` で fallback、主データの描画は阻害しない

## Test plan

### CI で自動検証されること
- [ ] `pnpm --filter @high-q/reservation test` (691 tests 緑、本変更で新規追加: format-availability 8, event-client 8, AvailabilityChip 7, EventRow 拡張で 7 件追加, EventInfoBlock 6, EventStickyCta 3 件追加)
- [ ] `pnpm --filter @high-q/reservation typecheck`
- [ ] `pnpm -r build` (admin / reservation / lp 全パッケージ)

### Render Preview で目視確認すること
- [ ] 会員ログイン → ホーム → 「他のイベント」リストの各行に「N 名 予約中」チップが表示される（dev データは全イベント capacity NULL）
- [ ] 任意のイベント詳細を開き、facts grid に AVAILABILITY 行が追加され「N 名 予約中」が表示される
- [ ] 「予約に進む」CTA は通常通り押下可能（capacity NULL のため満員にならない）
- [ ] ブラウザ DevTools で `event_availability_view` のレスポンスを Block → チップが `—` fallback、主データ（イベント名 / 時刻 / 参加費）は表示継続
- [ ] NEXT カードに予約埋まり具合系の文言が表示されないこと
- [ ] モバイル幅（iPhone SE 等）でレイアウトが崩れないこと

### prd Supabase 切替時の手動 sync（マージ前に翔太郎くん実行）
- [ ] Render Dashboard 経由ではなく、ローカルで `supabase link --project-ref <prd-ref>` した状態で `supabase db push` を実行
  - 本変更は migration `20260526124434_event_availability_view.sql` のみ追加。GRANT / SECURITY DEFINER 設定込みで一括適用される
- [ ] 適用後、prd 上で `SELECT count(*) FROM event_availability_view;` を実行し events 件数と一致することを確認
- [ ] Render Preview / 本番 URL で再度上記目視チェック

## 既存仕様への影響
- `reservation-events-and-booking`: スコープオフ記述（満員 / 残席数の非描画）を撤回。経験レベルバッジのみ scope-off として残す
- `data-schema`: 新 view `event_availability_view` 追加（admin view は無改変）
- `rls-policies`: 新 view の権限契約追加

## Out of scope
- admin-events-crud の capacity 入力 UI 拡張（別 Issue）
- キャンセル待ち登録導線（#154）
- `apps/reservation` の Playwright E2E 整備（#201）
- 経験レベルバッジの復活
