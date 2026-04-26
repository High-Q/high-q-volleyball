## 1. ブランチと前提整備

- [x] 1.1 Issue #78 に紐づく作業ブランチ `feature/78-vitest-test-setup` を切る
- [x] 1.2 ルート `package.json` の `scripts` に `"test": "pnpm -r test"` を追加する
- [x] 1.3 `pnpm install` を実行して workspace 整合性を確認する

## 2. apps/admin への Vitest + @vue/test-utils + MSW 導入

- [x] 2.1 `apps/admin/package.json` の `devDependencies` に `vitest`、`@vue/test-utils`、`jsdom`、`msw`（`^2`）、`@vitest/coverage-v8` を追加する
- [x] 2.2 `apps/admin/package.json` の `scripts` に `"test": "vitest run"` と `"test:watch": "vitest"` を追加する
- [x] 2.3 `apps/admin/vitest.config.ts` を新規作成する（`environment: "jsdom"`、`globals: false`、`include: ["src/**/*.spec.{ts,tsx,js,jsx}"]`、`setupFiles: ["./src/test/setup.ts"]`、design.md D1〜D7 準拠）
- [x] 2.4 `apps/admin/src/test/setup.ts` を新規作成し、MSW server の `listen` / `resetHandlers` / `close` を `beforeAll` / `afterEach` / `afterAll` で起動する
- [x] 2.5 `apps/admin/src/test/mocks/server.ts` を新規作成し、`setupServer(...handlers)` を export する
- [x] 2.6 `apps/admin/src/test/mocks/handlers/index.ts` を新規作成し、サンプルハンドラ（例: `http.get('/api/sample', () => HttpResponse.json({ ok: true }))`）を 1 件 export する
- [x] 2.7 `apps/admin/src/test/mountWithVuetify.ts` を新規作成し、`createVuetify()` を `global.plugins` に注入する mount ラッパーを export する（design.md D5 準拠）
- [x] 2.8 `apps/admin/src/App.spec.ts` を新規作成し、`mountWithVuetify(App)` で `App.vue` を描画してルート要素が存在することを検証する（最低 1 件のサンプルコンポーネントテスト）
- [x] 2.9 `apps/admin/src/test/msw.spec.ts` を新規作成し、`fetch('/api/sample')` を呼んで MSW のモックレスポンス `{ ok: true }` が返ることを検証する（最低 1 件の MSW サンプルテスト）
- [x] 2.10 リポジトリルートで `pnpm install` を再実行して新規依存を解決する
- [x] 2.11 `pnpm --filter @high-q/admin test` がエラーなく成功し、サンプル 2 件が PASS することを確認する
- [x] 2.12 `pnpm --filter @high-q/admin typecheck` が引き続き成功することを確認する（既存 strict 設定を壊していない保証）

## 3. apps/reservation への Vitest + @vue/test-utils + MSW 導入

- [x] 3.1 `apps/reservation/package.json` の `devDependencies` に `vitest`、`@vue/test-utils`、`jsdom`、`msw`（`^2`）、`@vitest/coverage-v8` を追加する
- [x] 3.2 `apps/reservation/package.json` の `scripts` に `"test": "vitest run"` と `"test:watch": "vitest"` を追加する
- [x] 3.3 `apps/reservation/vitest.config.ts` を新規作成する（admin と同等の構成、`setupFiles: ["./src/test/setup.ts"]`）
- [x] 3.4 `apps/reservation/src/test/setup.ts` を新規作成し、MSW server ライフサイクルを起動する
- [x] 3.5 `apps/reservation/src/test/mocks/server.ts` を新規作成し、空ハンドラの `setupServer()` を export する（reservation はサンプル MSW テストを書かないが、サーバーは起動可能にしておく）
- [x] 3.6 `apps/reservation/src/test/mocks/handlers/index.ts` を新規作成し、空配列を export する
- [x] 3.7 `apps/reservation/src/test/mountWithVuetify.ts` を新規作成する（admin と同じ実装）
- [x] 3.8 `apps/reservation/src/App.spec.ts` を新規作成し、`App.vue` のサンプルコンポーネントテストを 1 件追加する
- [x] 3.9 リポジトリルートで `pnpm install` を再実行する
- [x] 3.10 `pnpm --filter @high-q/reservation test` がエラーなく成功し、サンプル 1 件が PASS することを確認する
- [x] 3.11 `pnpm --filter @high-q/reservation typecheck` が引き続き成功することを確認する

## 4. apps/lp への Vitest 設定追加と MSW 導入

- [x] 4.1 `apps/lp/package.json` の `devDependencies` に `msw`（`^2`）を追加する（`vitest`/`@vue/test-utils`/`jsdom` は既存）
- [x] 4.2 `apps/lp/package.json` の `scripts` に `"test": "vitest run"` と `"test:watch": "vitest"` を追加する
- [x] 4.3 `apps/lp/vitest.config.js` を新規作成する（`environment: "jsdom"`、`globals: false`、`include: ["src/**/*.spec.{ts,tsx,js,jsx}"]`、`setupFiles: ["./src/test/setup.js"]`、Vue/Vuetify プラグインを必要に応じて transform 用に組込み）
- [x] 4.4 `apps/lp/src/test/setup.js` を新規作成し、MSW server ライフサイクルを起動する
- [x] 4.5 `apps/lp/src/test/mocks/server.js` を新規作成し、空ハンドラの `setupServer()` を export する
- [x] 4.6 `apps/lp/src/test/mocks/handlers/index.js` を新規作成し、空配列を export する
- [x] 4.7 `apps/lp/src/test/mountWithVuetify.js` を新規作成する（JS 版、createVuetify 注入）
- [x] 4.8 LP のサンプルコンポーネントテストを `apps/lp/src/App.spec.js` または既存子コンポーネントの `.spec.js` として 1 件作成する。`App.vue` mount で問題が出る場合は、より単純な既存子コンポーネントを選ぶか、`apps/lp/src/widgets/sample/Sample.vue` + `Sample.spec.js` を新規追加する（design.md Open Question A 通り、実装時に判断）
- [x] 4.9 リポジトリルートで `pnpm install` を再実行する
- [x] 4.10 `pnpm --filter @high-q/lp test` がエラーなく成功し、サンプル 1 件が PASS することを確認する
- [x] 4.11 `pnpm --filter @high-q/lp build` が **本 change によって壊れていない** ことを確認する（`.spec.*` がバンドルに混入していない保証）

## 5. packages/shared 既存テスト非干渉の確認

- [x] 5.1 `packages/shared/vitest.config.ts` / `packages/shared/package.json` を本 change で **一切変更していない** ことを `git diff` で確認する
- [x] 5.2 `pnpm --filter @high-q/shared test` が既存の 3 件テスト（ids.spec.ts / result.spec.ts / supabase.spec.ts）を含めて引き続き PASS することを確認する

## 6. 全体検証（最終確認タスク：CLAUDE.md ガイド準拠でまとめて実行）

- [x] 6.1 リポジトリルートで `pnpm -r test` が **lp / admin / reservation / shared 全 4 ワークスペース** で成功することを確認する（Issue #78 完了条件 ①）
- [x] 6.2 各アプリのサンプルコンポーネントテストが PASS していることを再確認する（Issue #78 完了条件 ②）
- [x] 6.3 リポジトリルートで `pnpm -r build` が引き続き成功し、各アプリの `dist/` に成果物が生成されることを確認する
- [x] 6.4 リポジトリルートで `pnpm -r typecheck` が引き続き成功することを確認する（admin / reservation / shared）
- [x] 6.5 `git status` で意図しない変更（特に `.env` 系・`packages/shared/vitest.config.ts`・`apps/*/vite.config.*` の機能変更）が含まれていないことを確認する
- [x] 6.6 `openspec validate vitest-test-setup --strict` を実行し、change の整合性を検証する
- [x] 6.7 design.md の Open Questions（LP のサンプル対象、Vuetify CSS warning の扱い）について、実装で取った選択をこの最終タスクのコメントとしてユーザーに報告する
