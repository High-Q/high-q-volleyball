## 1. ヘルパ作成

- [x] 1.1 `e2e/lp/_helpers/` ディレクトリを新規作成
- [x] 1.2 `e2e/lp/_helpers/eventApi.ts` を新規作成し、`mockEventApi(page: Page, events: EventFixture[])` 関数を export する。`page.route('**/beta/event', ...)` で intercept、レスポンスは `{ body: JSON.stringify(events) }`（Lambda proxy 形式）を 200 で `route.fulfill` する
- [x] 1.3 `EventFixture` 型を `e2e/lp/_helpers/eventApi.ts` 内で `id / title / start_time / end_time / location` で定義し export する
- [x] 1.4 ヘルパファイルが `playwright.config.ts` の `testMatch: '**/*.e2e.ts'` で拾われないことを確認（`_helpers/eventApi.ts` は `.e2e.ts` 拡張子ではないため拾われないはず）— `pnpm test:e2e` 実行時に test 数が 3 件のままであることで間接確認

## 2. Empty 状態 E2E

- [x] 2.1 `e2e/lp/event-calendar.e2e.ts` を新規作成。describe タイトルは `Event Calendar`（`@smoke` を付けない）
- [x] 2.2 Empty 状態 test を追加: `mockEventApi(page, [])` で空配列を返すよう設定 → `/` を開く → カレンダー widget root (`[data-testid="event-calendar"]`) が visible → 「予定されているイベントはありません」のテキストが visible になることを assert
- [x] 2.3 ローカルで `pnpm exec playwright test e2e/lp/event-calendar.e2e.ts --reporter=list` を実行し、Empty 状態 test が PASS することを確認
- [x] 2.4 ローカルで `pnpm test:e2e:smoke` を実行し、Empty test が **filter で除外され実行されない**（smoke 1 件のみ実行）ことを確認

## 3. happy path E2E

- [x] 3.1 `e2e/lp/event-calendar.e2e.ts` に happy path test を追加。固定日は `2026-05-15T10:00:00Z`、fixture は 2026-05 月内の 2 件
- [x] 3.2 test 冒頭で `await page.clock.install({ time: new Date('2026-05-15T10:00:00Z') })` を呼び、その後 `mockEventApi(page, fixtures)` でイベントを注入
- [x] 3.3 `/` を開き、カレンダー widget root が visible、fixture 1 件目の `title` テキストが v-calendar 内に visible になることを assert
- [x] 3.4 fixture 1 件目のイベント要素 (`getByText(fixture.title)`) をクリック → `EventDetailDialog` が開く（`v-dialog` filter で title 含むものが visible）→ dialog 内に location テキストが表示されることを assert（注: 初回実装では fixture title に location 文字列が含まれており strict mode で衝突したため、title「土曜練習会」location「金町体育館」のように分離した）
- [x] 3.5 ローカルで `pnpm exec playwright test e2e/lp/event-calendar.e2e.ts --reporter=list` を実行し、happy path + Empty の 2 件すべてが PASS することを確認

## 4. ローカル統合確認

- [x] 4.1 ローカル `pnpm test:e2e` で全 E2E（smoke 1 件 + event-calendar 2 件 = 計 3 件）が PASS することを確認（3 passed in 3.6s）
- [x] 4.2 ローカル `pnpm test:e2e:smoke` で smoke 1 件のみが実行され、event-calendar 2 件が除外されていることを確認
- [x] 4.3 ローカル `pnpm exec playwright test --grep-invert '@smoke' --reporter=list` で event-calendar 2 件のみが実行されることを確認（dynamic 挙動 E2E が `@smoke` 不付与であることの間接検証）
- [x] 4.4 既存 `pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm -r build` をローカル実行し、本変更で他レイヤーが壊れていないことを確認

## 5. PR 作成と CI 動作確認

- [x] 5.1 ブランチ `feature/135-lp-e2e-catchup` を作成し commit（commit d220f91、PR #144）
- [x] 5.2 PR 作成、PR push トリガで `e2e` job が `pnpm test:e2e:smoke`（smoke 1 件のみ）を実行し緑になることを GitHub Actions ログで確認（run 24992659668、`playwright test --grep @smoke` のログで smoke 1 件のみ実行を確認）
- [x] 5.3 e2e job の wall time が PR 上で < 1 分目安に収まり、smoke のみ実行のため #136 ship 時とほぼ同じ時間であることを確認（e2e 50s、cache hit 後の安定値）
- [x] 5.4 master full の動作確認は本 PR merge 後の master push run で行うため、PR では smoke が変わらないことの確認に留める

## 6. 最終確認とレビュー準備

- [x] 6.1 `openspec validate lp-e2e-catchup --strict` を実行し、proposal / design / specs / tasks の整合性を確認（valid）
- [x] 6.2 PR を ready for review にして翔太郎くんに承認依頼（PR #144、最初から open）
- [ ] 6.3 merge 後、master push トリガで `e2e` job が `pnpm test:e2e`（3 件）を実行し緑になることを GitHub Actions ログで確認（master full の実証）— ship 後に確認
