## 1. テスト実装

- [x] 1.1 `e2e/reservation/events-list.e2e.ts` を新規作成し、`installSupabaseGuard` を `beforeEach` で適用する describe (`reservation events-list`) を用意する
- [x] 1.2 「未認証で `/events` 直接アクセス → `/login` リダイレクト」test を 1 件追加し、URL / `<input type="email">` / 「メールでリンクを受け取る」ボタンの 3 要素を assert する
- [x] 1.3 既存 `e2e/reservation/{profile-page,history-page,reservation-detail-page,identity-document-upload}.e2e.ts` と describe / assertion 形状を揃える (関連 Issue / spec 参照コメントの形式も合わせる)
- [x] 1.4 `@smoke` タグを付けないことを確認 (test name / describe name に文字列を含めない)
- [x] 1.5 本 test 内で `_helpers/` 配下からの import が `installSupabaseGuard` のみであることを確認 (新規 helper ファイル作成禁止)

## 2. 検証

- [x] 2.1 ローカルで `pnpm exec playwright test e2e/reservation/events-list.e2e.ts --project=reservation` を実行し PASS することを確認 (1 passed / 344ms)
- [x] 2.2 ローカルで `pnpm test:e2e:smoke` を実行し、本 test が `@smoke` フィルタで除外される (実行されない) ことを確認 (`--list` で events-list が含まれないこと確認済み)
- [x] 2.3 ローカルで `pnpm test:e2e` を実行し、reservation project で本 test が実行され PASS することを確認 (18/18 passed / 11.8s)
- [x] 2.4 `playwright.config.ts` / `e2e/_global-setup.ts` / `e2e/reservation/_helpers/supabaseGuard.ts` および既存 `e2e/reservation/*.e2e.ts` に差分が無いことを `git diff` で確認 (新規追加 2 ファイルのみ)

## 3. CI 確認 / 後始末

- [ ] 3.1 PR push 後、CI の `e2e` ジョブ (smoke) が green であることを確認 (本 test は smoke 対象外なのでタイムロスは数秒以内のはず)
- [ ] 3.2 master push 時の full E2E で本 test が実行されることを (PR description / Issue クローズコメントで) 言及する
- [ ] 3.3 PR description に Issue #201 close 句 (`Closes #201`) を含める
