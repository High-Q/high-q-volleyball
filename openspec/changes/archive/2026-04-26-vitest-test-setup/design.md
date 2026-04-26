## Context

`docs/07-テスト/01-テスト戦略・方針.md` で「Vitest + @vue/test-utils + MSW、テストファイルは実装と同一ディレクトリに `*.spec.ts` で共存配置、TDD 原則」と定義済み。一方で実装は次の状態で乖離している:

| アプリ／パッケージ | 現状 | 不足 |
|---|---|---|
| `apps/lp` | `vitest` / `@vue/test-utils` / `jsdom` 依存はあるが `vitest.config` も `test` スクリプトも無し | 設定・スクリプト・サンプル・MSW |
| `apps/admin` | TS 化済み・テスト関連依存ゼロ | 全て |
| `apps/reservation` | 同上 | 全て |
| `packages/shared` | `vitest.config.ts`（Node 環境・`*.spec.ts`）+ 実テスト 3 件 既存 | （対象外） |
| ルート | `pnpm -r test` 用スクリプト無し | `test` スクリプト |

Issue #78 完了条件は ①`pnpm -r test` が走る ②サンプルコンポーネントテストが通る、の 2 点。`packages/shared` の既存設定（Node 環境・`globals: false`）を破壊せず、各アプリには Vue 用 jsdom 環境設定を別個で持たせる必要がある。MSW は v2（`http` / `HttpResponse` API）を採用済みの方針（テスト戦略ドキュメントの例コード）に合わせる。

ステークホルダー: 個人開発オーナー（=ユーザー）／Claude Code（実装エージェント）。利用者は CI ではなくまずローカル `pnpm -r test`。CI 組込みは Issue #79 で別 change。

## Goals / Non-Goals

**Goals:**
- ルートで `pnpm -r test` を実行すると、`apps/lp` / `apps/admin` / `apps/reservation` / `packages/shared` の全 4 ワークスペースで Vitest が起動し、全件 PASS する
- 各アプリ（lp / admin / reservation）に「`App.vue` を mount してマウント結果が定義され、ルート要素が描画される」ことを検証するサンプルコンポーネントテストを 1 件ずつ用意する
- `apps/admin` に MSW を使った API モックのサンプルテスト 1 件を追加し、MSW のセットアップ／テスト中の利用パターンを示す（admin が今後 Supabase API を最も多く触るため代表とする）
- 各アプリの Vitest 設定が strict TS と Vuetify 描画に対応している（`@vue/test-utils` の mount で Vuetify コンポーネントを使ってもエラーにならない最低限の `global.plugins` 設定例を含む）
- LP は既存依存を活かし、`vitest.config.js` と `package.json` `test` スクリプトを追加するだけで `pnpm -r test` に組込む
- `packages/shared` の既存設定・既存テスト（3 件）は **一切変更しない**

**Non-Goals:**
- E2E テスト（Playwright）導入 — 別 Issue
- CI に `pnpm -r test` を組み込む — Issue #79
- カバレッジ目標値の設定や `--coverage` の CI 強制 — 後続
- LP の TypeScript 化 — Issue #130（本 change では LP のサンプルテストは JS で書く）
- Storybook やビジュアルリグレッションテスト
- 既存 `apps/lp` の本物の業務ロジック／コンポーネントに対するテスト追加（feature change 内で TDD で書く）
- 本 change での `pnpm install` ロックファイル更新の自動化（最終確認タスクで実施）

## Decisions

### D1. Vitest 設定ファイルの分離方針: アプリごとに独立した `vitest.config.{ts,js}` を持つ

各アプリで `vite.config.{ts,js}` と **別ファイル** で `vitest.config.{ts,js}` を持つ。

**Why:**
- LP は `vite.config.js`（JS）、admin/reservation は `vite.config.ts`（TS）と既に分かれている。Vitest 設定を `vite.config` 側に統合すると、`defineConfig` 型互換のため `vitest/config` 経由の二重 import が必要になり、Vite 本体ビルドへの副作用リスクがある
- `packages/shared` も独立 `vitest.config.ts` を持つ既存パターン。一貫性のため踏襲
- アプリごとに `environment` / `setupFiles` / `include` を変える必要があるため、設定の独立がそのまま「変更影響をワークスペース内に閉じ込める」効果になる

**Alternatives considered:**
- `vite.config.ts` の `test` プロパティに統合 → 既存 LP の `vite.config.js` を壊す可能性、TS 推論の癖、却下
- ルートに 1 個の `vitest.workspace.ts` で集約 → 各アプリの環境（jsdom vs node）と alias が混在し、CLAUDE.md の FSD 「上位→下位」境界とも噛み合わない、却下

### D2. テスト環境: アプリは `jsdom`、`packages/shared` は `node` のまま

- `apps/lp` / `apps/admin` / `apps/reservation`: `environment: "jsdom"`
- `packages/shared`: 既存の `environment: "node"` を維持（変更しない）

**Why:** Vue コンポーネントの mount は DOM が必須、shared は純ロジックで Node の方が起動が速い。既存挙動破壊回避にもなる。

**Alternatives considered:** `happy-dom` → `@vue/test-utils` 公式推奨は jsdom、ドキュメントとの一貫性で却下。

### D3. テストファイル命名と include パターン

- アプリ: `include: ["src/**/*.spec.{ts,tsx,js,jsx}"]`（lp は当面 `.js`、admin/reservation は `.ts`）
- 配置: 実装ファイルと同一ディレクトリに `*.spec.ts` で共存（テスト戦略ドキュメント準拠）

**Why:** ドキュメントとの整合。`.test.ts` ではなく `.spec.ts` に統一（`packages/shared` 既存パターンに合わせる）。

### D4. MSW のバージョンと配置

- バージョン: MSW v2 系（`msw@^2`、`http` / `HttpResponse` API）
- ハンドラー配置: `src/test/mocks/handlers/`、サーバー: `src/test/mocks/server.ts`、setupFile: `src/test/setup.ts`
- `setupTests.ts` で `beforeAll(() => server.listen()) / afterEach(() => server.resetHandlers()) / afterAll(() => server.close())`
- `apps/admin` のみサンプルハンドラ + サンプルテストを置く。lp / reservation は server だけ立てて handler は空（後続 feature 開発で追加する想定）

**Why:** ドキュメントが `http.get(..., () => HttpResponse.json(...))` の v2 構文を例示している。配置は `src/test/` 配下に集約することで、本番バンドルから物理的に分離（Vite の prod build は `src/test/` を import しない限り含めない）。

**Alternatives considered:**
- MSW v1 → 公式が v2 推奨、却下
- `src/mocks/` 直下（テスト戦略ドキュメントの旧記述）→ 本番 import 経路と混ざりやすい、`src/test/mocks/` に隔離

### D5. Vuetify コンポーネントを mount するためのテストヘルパー

- `apps/admin` / `apps/reservation` / `apps/lp` 共通で `src/test/mountWithVuetify.ts`（lp は `.js`）を用意
- 内部で `createVuetify()` を呼び、`@vue/test-utils` の `mount(component, { global: { plugins: [vuetify] } })` を返す薄い wrapper

**Why:** `App.vue` は Vuetify コンポーネント（`<v-app>` 等）を含み、素の `mount` だと `Failed to resolve component: v-app` で落ちる。各テストで boilerplate を書かせない。

**Alternatives considered:**
- グローバル setup ファイルで `config.global.plugins` に Vuetify を入れる → setupFile の評価順とテスト隔離の観点で副作用が読みにくくなる、却下

### D6. ルートの `pnpm -r test` の挙動

- ルート `package.json` の `scripts.test` を `"pnpm -r test"` とする
- 各ワークスペースは `package.json` の `scripts.test` に `"vitest run"` を持つ（`vitest run` で 1 回実行・終了するモード）
- `apps/lp` の場合はスクリプト追加だけ。`packages/shared` には既に `"test": "vitest run"` 既存

**Why:** Issue #78 完了条件「`pnpm -r test` が実行できる」をそのまま満たす。`vitest`（watch モード）ではなく `vitest run` を使うことで CI 互換性も同時に確保。

### D7. TypeScript 設定（admin / reservation）

- 既存 `tsconfig.json` の `compilerOptions.types` に `["vitest/globals"]` は追加しない（`globals: false` を維持し、`import { describe, it, expect } from "vitest"` を必須にする）
- `setupTests.ts` 等のテストファイルは既存 tsconfig の `include` で拾う（`src/**/*` がカバー）
- `@types/node` は既に入っている

**Why:** `globals: false` は `packages/shared` の既存方針。`expect` 等を import する明示性は strict TS と相性が良く、IDE のジャンプも正確に効く。

### D8. lp の扱い（JS のままサンプルを書く）

- `apps/lp` には `.spec.js` でサンプルを書く（`vite.config.js` と一貫）
- LP の TS 化は Issue #130 のスコープ。本 change では JS のサンプルテストで十分
- 既存の `App.vue` は `<script setup>`（JS）であり、`mount` も JS で問題ない

**Why:** スコープ分離。Issue #130 の TS 化と並行・干渉しないため。

## Risks / Trade-offs

- **[Risk] Vuetify をテスト中に mount すると CSS 関連 warning が大量に出る** → `src/test/setup.ts` で `global.CSS = { supports: () => false }` 相当のスタブを噛ませる、もしくは特定 warning を無害として無視（テスト失敗にしない）。テスト戦略ドキュメントは「ログ出力はテスト失敗扱い」とするが、ライブラリ起因の既知 warning は許容する旨を setupファイル冒頭コメントで明示。

- **[Risk] LP の Vuetify 3 + Sass + Vue 3 構成で `App.vue` mount が import 解決エラーになる可能性** → サンプルテストは LP の `App.vue` ではなく、より単純な既存子コンポーネント（`apps/lp/src/widgets/` 配下から最小依存のもの）を選ぶ、もしくは新規に最小ダミーコンポーネント `src/widgets/sample/Sample.vue` を作ってそれをテストする。実装時にどちらかを選択（タスクで両方の手段を許容）。

- **[Risk] MSW v2 が Node 18 系で `undici` 関連エラーを出す事例がある** → プロジェクトは Node 22 LTS 固定なので影響なし。`msw` はテストファイル経路でのみ import し、本番 bundle に混ざらない。

- **[Trade-off] アプリ毎に MSW server.ts を重複させる** → DRY ではないが、各アプリのドメインがほぼ独立（lp は AWS API、admin/reservation は Supabase）なため共有のメリットが薄い。共通化は実テストが増えてから検討。

- **[Trade-off] ルート `pnpm -r test` は `packages/shared` も含めて全部走る** → 個別実行（`pnpm --filter @high-q/admin test`）も pnpm 標準で可能。CI でアプリ単位並列化が必要になったら別対応。

- **[Risk] `.spec.ts` を `src/**/*.spec.ts` で広く拾うため、本番ビルドに混ざる可能性** → Vite の `vite build` は entry からの import グラフに含まれるものしか bundle しないため、`.spec.ts` が import されていない限り含まれない。念のため各アプリの `tsconfig.json` の build 用設定ではなく typecheck 用設定で拾うのは現状通り。

## Migration Plan

本 change は新規追加のみで既存挙動は変更しない（`packages/shared` のテストもそのまま動く）。マイグレーション／ロールバック手順は次のとおり:

1. Apply 中: 各アプリの test 設定追加 → 個別 `pnpm --filter <app> test` で PASS 確認 → 次のアプリへ
2. 最終確認: ルートで `pnpm -r test` が緑、`pnpm -r build` が引き続き緑、`pnpm -r typecheck` が引き続き緑
3. ロールバック: 本 change で追加された `vitest.config.*` / `src/test/` / `*.spec.*` 削除 + ルート `package.json` の `test` スクリプト削除 + 各アプリ `package.json` の追加依存と `test` スクリプト削除 → `pnpm install` で完了。`packages/shared` には触らないため副作用なし

## Open Questions

- LP のサンプルテスト対象を `App.vue` にするか、ダミー軽量コンポーネントを新規追加するか（実装時に LP の mount が成功するか試して決める）
- Vuetify を mount した際の CSS warning 抑制を setupFile でやるか、各アプリで独立判断するか（最初の実装で warning が出るかを観察してから決定）

これらは Apply フェーズ内で実装者（Claude）が判断し、結果を tasks の最終確認タスクで報告する。
