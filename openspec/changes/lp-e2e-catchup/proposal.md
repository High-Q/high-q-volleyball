## Why

#79 で Playwright E2E 基盤、#136 で CI 統合（PR=smoke / master=full のトリガー分離）が ship 済み。しかし既存テストは LP トップページの smoke 1 件のみで、**dynamic 挙動（API 取得結果に依存する画面）への E2E カバレッジがゼロ** の状態にある。

特にイベントカレンダー widget は LP の中核機能であり:
- AWS API Gateway から取得したイベントを月カレンダーに描画
- イベントクリックで詳細 dialog を開閉
- Loading / Empty / Error / Success の 4 状態を持つ
- 「今日」依存の挙動（`viewDate` のデフォルトが現在月）

これらは component test では「実際のレンダリング + ユーザー操作 + ネットワーク層」を統合的に確認できず、本番ビルド + Vuetify ランタイム + Vue Query の挙動を含めた E2E でしか検出できない回帰がある。本変更で `event-calendar` の主要な dynamic 挙動を Playwright でカバーし、テスト戦略 doc に記載された catch-up タスクを完遂する。

## What Changes

- `e2e/lp/event-calendar.e2e.ts` を新規追加（**2 件**：happy path 1 + 主要 edge case 1、機能あたり上限内）
  - Test 1: API モックでイベントを返す → カレンダーに描画される → イベントクリックで詳細 dialog が開く（happy path）
  - Test 2: API モックで空配列を返す → 「予定されているイベントはありません」Empty 状態が描画される（edge case）
- データ供給戦略: Playwright `page.route()` で AWS API Gateway エンドポイント (`/beta/event`) を intercept し、test inline fixture を返す方式（MSW は使わない）
- 時刻固定: Playwright `page.clock.install()` で「今日」を固定し、fixture イベント日付との整合を保つ
- 追加テストには **`@smoke` タグを付けない**（master full 専用、PR feedback loop と smoke 意味論を保護）
- LP 静的コンテンツ（Hero / Concept / Activities）への E2E 追加は本変更に含めない（既存 smoke でカバー済み or component test 領域）
- テストヘルパ `e2e/lp/_helpers/eventApi.ts` を新規追加（`page.route()` の reusable な fixture 注入関数）

スコープ外:
- 月切替の動的挙動テスト（happy path に含むかは design で判断、含めなければ追加 1 件のみで component test 化）
- Error 状態（fetchEvents が catch して `[]` を返す実装になっており、500 系を Empty と区別する E2E は実質不可能）
- 新規機能の E2E（その feature change で TDD）
- ビジュアル回帰（Phase 2）
- パフォーマンス回帰（Phase 2）

## Capabilities

### New Capabilities
- `lp-e2e-coverage`: LP の dynamic widget に対する E2E カバレッジを定義する capability。データ供給は Playwright `page.route()`、時刻固定は `page.clock`、smoke タグ付与判断ルールを明文化

### Modified Capabilities
- `playwright-e2e-baseline`: 既存の「smoke E2E は @smoke タグで識別」要件に加え、**「dynamic 挙動の E2E は @smoke を付けない」運用ルール** を要件として追加（master full 専用領域の明確化）

## Impact

- 影響コード:
  - `e2e/lp/event-calendar.e2e.ts`（新規）
  - `e2e/lp/_helpers/eventApi.ts`（新規、`page.route()` ヘルパ）
- 影響 spec:
  - `openspec/specs/lp-e2e-coverage/spec.md`（新規 capability）
  - `openspec/specs/playwright-e2e-baseline/spec.md`（@smoke タグの否定要件追加）
- 影響 docs:
  - `docs/07-テスト/01-テスト戦略・方針.md`（catch-up 完了の旨を追記、Sync で対応）
- CI 実行時間:
  - PR (smoke のみ): 影響なし（@smoke を付けないため、現状の 1 件のまま）
  - master push (full): + ~2〜5 秒見込み（テスト 2 件追加、API mock のため安定）
- 後続: テスト戦略 doc が言及する catch-up は本変更で完遂。次の E2E 追加は新規 feature の Apply で TDD で書く運用に移行
- 注意: Issue #135 本文の「Supabase 連携の動的挙動」は実体に合わせ「AWS API Gateway 連携」と読み替える（design.md で明記）
