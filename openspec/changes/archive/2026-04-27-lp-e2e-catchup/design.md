## Context

### 既存基盤の状態（2026-04-27 時点）

- **#79 (playwright-e2e-baseline)** ship 済み: ローカル `pnpm test:e2e` 動作、smoke 1 件のみ
- **#136 (playwright-e2e-ci-integration)** ship 済み: PR=smoke / master=full のトリガー分離が CI で稼働、`@smoke` タグ運用と `pnpm test:e2e:smoke` script が確立、ブラウザバイナリ cache + 失敗時 artifact upload も稼働
- 既存テスト戦略 (`docs/07-テスト/01-テスト戦略・方針.md`): 機能あたり E2E 1〜2 件、テストピラミッド原則、catch-up は本 #135 で実施

### LP のイベント取得アーキテクチャ

`apps/lp/src/entities/event/api/eventQueries.js` を確認した結果:

```js
const API_URL = import.meta.env.DEV
  ? '/api/event'
  : 'https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event'
```

- **本番（vite preview / E2E が回るビルド）**: 直接 AWS API Gateway を叩く
- レスポンス形式: Lambda proxy integration → `{ body: "<JSON 文字列>" }` ラップ
- LP 側で `JSON.parse(json.body)` してから `id / title / start_time / end_time / location` を取り出し
- `@tanstack/vue-query` でキャッシュ管理、`useEventCalendar` composable が UI 側に流す

**Issue #135 本文に「Supabase 連携」と書かれているのは記述ミス**。LP の event 取得は AWS Lambda であり Supabase ではない（管理画面 / 予約サイトが将来 Supabase を使うが LP は別系統）。本変更では実体に従い「AWS API Gateway 連携」として扱う。

### イベントカレンダー widget の構造

`apps/lp/src/widgets/event-calendar/`:
- `model/useEventCalendar.js`: `useQuery(eventQueryOptions.list())` を呼び、`calendarEvents / isPending / isError / isEmpty` を露出
- `ui/EventCalendar.vue`:
  - root: `[data-testid="event-calendar"]`
  - 月ナビゲーション（prev / next / 「今日」ボタン）
  - 4 状態分岐: `isPending` → `v-skeleton-loader` / `isError` → `v-alert` / `isEmpty` → 「予定されているイベントはありません」/ Success → `v-calendar` 描画
  - `v-calendar` の event slot で各イベントを `<div class="event-item" @click="openDialog(event)">{{ event.name }}</div>` 表示
- `ui/EventDetailDialog.vue`: `v-dialog` 内に `event.name` / `start` / `end` / `location` を表示、「閉じる」ボタンあり

`fetchEvents` のエラーハンドリング:
```js
try { res = await fetch(API_URL) } catch { return [] }
if (!res.ok) throw new Error(...)
```
→ **CORS / ネットワーク不達は `[]` で代替、HTTP エラーは throw**。throw は Vue Query で `isError = true` になる。Empty 状態と区別される。

## Goals / Non-Goals

**Goals:**
- 既存の dynamic E2E カバレッジ 0 → イベントカレンダーの主要シナリオ 2 件（happy + Empty）を追加
- データ供給に Playwright `page.route()` を使い、追加依存ゼロで API モックを実現
- `page.clock` で「今日」を固定し、fixture 月との整合を保ってフレークレスにする
- 共通ヘルパ `e2e/lp/_helpers/eventApi.ts` で `page.route()` 呼び出しの重複を防ぎ、将来 #135 以降の LP E2E でも再利用可能にする
- master full 専用（`@smoke` 不付与）として PR feedback loop と smoke 意味論を保護
- 「dynamic 挙動には `@smoke` を付けない」運用ルールを spec として明文化し、将来の追加時に判断のブレを防ぐ

**Non-Goals:**
- 新規機能の E2E（その feature change 内で TDD）
- LP 静的コンテンツ（Hero / Concept / Activities / Footer）への E2E 追加（component test 領域、Phase 1 では smoke の DOM 存在 assert で十分）
- Error 状態の E2E（実装側が `[]` を返すパスがあり、HTTP エラーシナリオを E2E から作るには `route.fulfill({ status: 500 })` で intercept する必要がある — 後続検討）
- 月ナビゲーション（prev / next / 今日）の動的挙動 E2E（happy path に含めず、必要なら component test で代替）
- MSW を E2E 側に導入する設計（service worker setup の複雑化に見合うリターンが薄い、Phase 1 では Playwright `page.route()` で十分）
- ビジュアル回帰 / パフォーマンス回帰（Phase 2）
- CI トリガー戦略の変更（#136 で確立済み、本変更は新規 test 追加のみ）

## Decisions

### Decision 1: データ供給は Playwright `page.route()` の inline fixture

**選択**: 案 A（Playwright 標準機能）

**比較**:
| 案 | 内容 | 評価 |
|---|---|---|
| A | `page.route('**/beta/event', route => route.fulfill({...}))` で intercept、fixture を test ファイル内に inline 定義 | ✅ Phase 1 で最小コスト、追加依存なし、test ごとに fixture をカスタマイズできる |
| B | MSW を service worker mode で E2E に導入 | △ unit / E2E でハンドラ共有可能だが、setup コスト（service worker 配信 / Vite で sw 登録 / dev/preview 両対応）が大きい。catch-up 2 件のために導入はオーバーキル |
| C | 静的 fixture を `apps/lp/public/test-fixtures/events.json` に配置し、E2E 時のみ Vite proxy で差し替え | ✗ ビルド成果物を E2E 専用に汚す。モック粒度の test ごとカスタマイズが効かない |

**意思決定の根拠**: catch-up は 2 件で完結する小さなスコープ。MSW 導入は将来「unit / E2E でハンドラ共有したい」という具体的なニーズが立った段階で別 Issue で行う。本変更では追加依存ゼロを優先。

### Decision 2: 時刻固定は `page.clock.install({ time: ... })`

**選択**: `page.clock.install()` で `setSystemTime` 相当を行い、test 開始時点で固定

**理由**:
- イベントカレンダー UI は `viewDate = ref(new Date())` から始まり、それを `v-calendar` に渡す。fixture イベントが「今月」に含まれるためには「今月」をブラウザの現在時刻で制御する必要がある
- Playwright 1.59+ は `page.clock` API がサポートされており、本プロジェクトは `^1.59.1`（root devDependency）→ 利用可能
- 代替案として fixture 側を「現在月の動的計算」で組み立てる方法もあるが、test の readability が落ちる + フレーク発生時のデバッグが難化する → 時刻固定の方が clean

**固定する時刻**: 2026-05-15T10:00:00Z（fixture イベントが 2026-05 月内に並ぶ前提）。setup 時に `await page.clock.install({ time: new Date('2026-05-15T10:00:00Z') })` を呼ぶ。

### Decision 3: テストヘルパは `e2e/lp/_helpers/eventApi.ts` に集約

**選択**: `mockEventApi(page, events)` 関数 1 本

**API 設計案**:
```ts
import type { Page } from '@playwright/test'

type EventFixture = {
  id: string | number
  title: string
  start_time: string  // ISO 8601
  end_time: string
  location: string
}

export async function mockEventApi(page: Page, events: EventFixture[]): Promise<void> {
  await page.route('**/beta/event', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ body: JSON.stringify(events) }),
    })
  })
}
```

**理由**:
- LP の `fetchEvents` が期待する Lambda proxy 形式（`{ body: "<JSON 文字列>" }`）の二重 JSON.stringify を抽象化することで、テスト本体の readability を保つ
- `**/beta/event` のパターンは AWS API Gateway URL の path 部分にマッチ。本番ドメイン変更時もこのヘルパ 1 箇所を直すだけで済む
- ヘルパディレクトリ `_helpers/` の prefix は Playwright が test 自動検出で拾わないようアンダースコア命名（既存の `testMatch: '**/*.e2e.ts'` パターンには合致しないので拾われないが、明示性のため）

**型ファイル拡張子**: `.ts`（root の `playwright.config.ts` は TS、`@playwright/test` は TS をネイティブ実行できる。`tsconfig` は不要、ts-node 等の追加依存も不要）。

### Decision 4: テスト粒度は 2 件で打ち切り、月ナビは component test に押し下げ

**選択**: happy（events 描画 + dialog 開閉）+ Empty の 2 件のみ

**理由**:
- CLAUDE.md および `docs/07-テスト/01-テスト戦略・方針.md` の「機能あたり 1〜2 件上限」に厳密に従う
- 月切替（prev / next / 今日）は本質的に Vuetify v-calendar の制御テストであり、Vue Query や API レイヤーが絡まない → component test で十分
- Error 状態は `fetchEvents` の実装上 CORS/ネットワーク不達で吸収されるため、E2E から発火させる純粋なエラー UI は HTTP 5xx に限定される。route.fulfill で 500 を返す追加 1 件は将来検討余地ありだが、今回は scope 外
- 「迷ったら少なく」が四半期リトラクトの精神に合致

### Decision 5: `@smoke` タグは付けない（master full 専用）

**選択**: 本変更で追加する 2 件すべて `@smoke` 不付与

**理由**:
- データ依存（`page.route()` 必須）かつユーザー操作 assert（クリック → dialog）を含むため、smoke の意味論「データ非依存・壊滅検出」から外れる
- PR の `pnpm test:e2e:smoke` 実行対象から除外され、PR feedback loop（< 3 分閾値）を保護
- master push 時の `pnpm test:e2e` で full 実行されるためリリース前回帰検出に組み込まれる
- 「dynamic 挙動の E2E に @smoke を付けない」を **spec として明文化** し、将来の追加判断時のブレを防ぐ（`playwright-e2e-baseline` capability に追加）

### Decision 6: テストファイル名は `event-calendar.e2e.ts`、smoke と同居

**選択**: `e2e/lp/event-calendar.e2e.ts`（smoke と同じ階層）

**理由**:
- 既存 `e2e/lp/smoke.e2e.ts` と同階層に置くことで widget 単位のテストファイル分離を保つ
- ファイル名で対象 widget が一目で識別できる
- 将来 catch-up が増えた場合（reservation など他アプリ）は `e2e/<app>/<widget>.e2e.ts` 命名に従う
- ディレクトリ階層を深くしない（`e2e/lp/event-calendar/` ではなくフラット）— Phase 1 のテスト数では不要

### Decision 7: docs 更新は Sync フェーズで対応

**選択**: `docs/07-テスト/01-テスト戦略・方針.md` の catch-up 言及（157 行目「カバレッジが薄い領域は『#135』等で漸進的に補強」）を、本変更 ship 後の Sync で「#135 で完了済み（イベントカレンダー happy + Empty を追加）」と更新

**理由**:
- doc の更新は spec / コードの変更が確定した後に Sync で行う運用
- design.md / proposal.md の段階で前倒しに doc を変えると change の atomic 性が崩れる

## Risks / Trade-offs

- **[リスク] AWS API Gateway URL がドメイン変更されると `**/beta/event` パターンが効かなくなる** → Mitigation: ヘルパ `mockEventApi` の 1 箇所に URL pattern を集約しておくことで、変更時の修正点を最小化。実装側 `eventQueries.js` の URL も同時に変更されるため、PR で必ず 1 セットになる。
- **[リスク] Vuetify v-calendar の DOM 構造変更でセレクタが壊れる** → Mitigation: 1) test では `event.name` テキストでイベントを検出し、内部 DOM 構造には依存しない 2) v-calendar は deprecated 予告があり Labs 版への移行は別 Issue（既存コメントで note 済み）— 移行時に E2E も合わせて修正する前提で進める。
- **[リスク] `page.clock.install()` が一部 timing 依存処理を壊す可能性** → Mitigation: `install` は test scope の冒頭で行い、`setInterval` / `setTimeout` 系の固有挙動は Vue Query の retry 設定（デフォルト 3 回）が `page.clock` 下でも動くか実測。フレーク発生時は `setFixedTime` 単独に切り替える検討（`install` は時刻系 API すべてを fake、`setFixedTime` は `Date.now()` のみ）。
- **[リスク] fixture イベントの「今月」整合性ミス** → Mitigation: design.md で固定日 `2026-05-15` を明示し、tasks 内で fixture イベントの日付がすべて 2026-05-XX となるよう実装ガイドする。`page.clock` の固定日が 2026-05-15 であれば v-calendar の view-mode="month" では 2026-05 月が表示される。
- **[リスク] master full E2E の wall time が増えて閾値（< 5 分）超過** → Mitigation: 追加 2 件は API モックで安定、Vue Query のキャッシュも fixture 1 回取得で済むため + 2〜5 秒見込み。現状 smoke 1 件 ~3 秒 → 約 ~10 秒に増加見込みで閾値に十分余裕。

## Migration Plan

ロールフォワードのみ。ロールバックは追加した 2 ファイル（`event-calendar.e2e.ts` + `_helpers/eventApi.ts`）を削除すれば完全に元に戻る。spec の archive 後に逆方向 change を切れば spec も戻せる。

実装順序（tasks.md で詳細化）:
1. ヘルパ `e2e/lp/_helpers/eventApi.ts` を新規作成（テスト本体に依存されるため先）
2. `e2e/lp/event-calendar.e2e.ts` の Empty 状態 test を作成（よりシンプル、TDD でガード確認）
3. `e2e/lp/event-calendar.e2e.ts` の happy path test を追加（時刻固定 + クリック → dialog）
4. `pnpm test:e2e:smoke` で smoke 1 件のみ実行されることを確認（追加 2 件が含まれない）
5. `pnpm test:e2e` で 3 件すべて実行・PASS することを確認

## Open Questions

なし。データ供給戦略・時刻固定・粒度・smoke 付与判断・LP 静的コンテンツ scope 外の判断はすべて確定済み。
