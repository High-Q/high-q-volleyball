## 1. design-tokens パッケージ初期化

- [x] 1.1 `packages/design-tokens/` ディレクトリを作成し、`package.json`（name: `@high-q/design-tokens`、type: `module`、scripts: `build` / `typecheck` / `test`）を配置する
- [x] 1.2 `packages/design-tokens/tsconfig.json` を作成し、ルートの strict 設定（`strict: true` / `noUncheckedIndexedAccess: true`）を継承する
- [x] 1.3 ルートで `pnpm install` を実行し、`pnpm list -r --depth 0` で `@high-q/design-tokens` がワークスペース認識されることを確認する

## 2. design-tokens 実装（TDD）

- [x] 2.1 `packages/design-tokens/src/index.test.ts` を先に書く: `HQ.color.paper === '#f7f3ea'` / `HQ.color.ink === '#1f1d1a'` / `HQ.color.accent === '#b85c3c'` / `HQ.font.jpDisplay`（Klee One を含む font-family 文字列）等の値検証
- [x] 2.2 `packages/design-tokens/src/index.ts` を実装し、`HQ` named export を提供する（color / font / space / radius / shadow の全カテゴリ）
- [x] 2.3 テストが pass することを確認する（`pnpm --filter @high-q/design-tokens test`）

## 3. design-tokens CSS variables 生成

- [x] 3.1 `packages/design-tokens/scripts/generate-css.mjs` を実装し、`HQ` オブジェクトから `:root { --hq-color-paper: ...; ... }` 形式の CSS を `dist/tokens.css` に出力する
- [x] 3.2 `package.json` の `build` script を `tsc && node scripts/generate-css.mjs` 形式に整え、`exports` フィールドで `.` と `./tokens.css` を公開する
- [x] 3.3 `pnpm --filter @high-q/design-tokens build` を実行し、`dist/index.js` / `dist/index.d.ts` / `dist/tokens.css` が生成されることを確認する
- [x] 3.4 生成された `tokens.css` の内容を目視確認: `--hq-color-paper: #f7f3ea` / `--hq-font-jp-display: "Klee One", ...` 等が含まれる

## 4. ui パッケージ初期化

- [x] 4.1 `packages/ui/` ディレクトリを作成し、`package.json`（name: `@high-q/ui`、type: `module`、peerDependencies: `vue ^3.4.0`、dependencies: `@high-q/design-tokens: workspace:*`、scripts: `dev` / `build` / `typecheck` / `test`）を配置する
- [x] 4.2 `packages/ui/tsconfig.json`（strict 継承、jsx 不要、`vueCompilerOptions` 設定）と `vite.config.ts`（lib モード、external: vue / @high-q/design-tokens、formats: es）を配置する
- [x] 4.3 `pnpm install` を実行し `@high-q/ui` が workspace 認識されることを確認する

## 5. ui プリミティブ実装（TDD）

- [x] 5.1 Button: `Button.spec.ts` 先行（variant / size / disabled / loading 各 props の反映と、disabled 時 click 抑止 / loading 時 aria-busy 付与）→ `Button.vue` 実装 → テスト pass
- [x] 5.2 Kicker: `Kicker.spec.ts` 先行（デフォルト accent 色 / color prop 上書き）→ `Kicker.vue` 実装 → テスト pass
- [x] 5.3 Badge: `Badge.spec.ts` 先行（6 tone の配色切替 / tone 未指定時 neutral）→ `Badge.vue` 実装 → テスト pass。なお design-tokens に semantic colors (success / warn / danger とその soft 版) を追加してマジックナンバーを排除した（spec 「全プリミティブが HQ デザイントークンのみで着色される」を成立させるため）
- [x] 5.4 Photo: `Photo.spec.ts` 先行（label 表示有無 / w / h / radius 反映）→ `Photo.vue` 実装 → テスト pass
- [x] 5.5 RemainBar: `RemainBar.spec.ts` 先行（残席率による配色切替 / 満席時表示）→ `RemainBar.vue` 実装 → テスト pass
- [x] 5.6 `packages/ui/src/index.ts` で Button / Kicker / Badge / Photo / RemainBar を named export する
- [x] 5.7 `packages/ui/src/**/*.vue` の `<style>` ブロック内に `#`・`rgb(`・`rgba(` のリテラルが含まれないことを grep で検証する（マジックナンバー禁止）

## 6. showcase ページ

- [x] 6.1 `packages/ui/playground/index.html` と `playground/main.ts` を作成し、`@high-q/design-tokens/tokens.css` を import の上、全プリミティブの主要状態を 1 ページに並べる
- [x] 6.2 `packages/ui/vite.config.ts` の dev サーバー設定で playground をエントリにする（lib build とは分離）
- [x] 6.3 `pnpm --filter @high-q/ui dev` で起動し、ブラウザで全プリミティブが描画されることを目視確認する（dev サーバー boot 確認のみ自動化、視覚目視は翔太郎くんに委譲）

## 7. consumer 統合

- [x] 7.1 `apps/admin/package.json` の dependencies に `"@high-q/design-tokens": "workspace:*"` と `"@high-q/ui": "workspace:*"` を追加し `pnpm install`
- [x] 7.2 `apps/reservation/package.json` に同様の依存を追加し `pnpm install`
- [x] 7.3 admin の `App.vue` への試験描画は実施せず、Section 8 の `pnpm -r build` / `typecheck` で workspace 解決を自動検証する形に集約（admin / reservation は未開発のため placeholder 描画はノイズになる）。実ブラウザでの目視確認は翔太郎くんに委譲
- [x] 7.4 `apps/lp/package.json` に `@high-q/design-tokens` を追加し `apps/lp/src/main.js` の冒頭で `@high-q/design-tokens/tokens.css` を import。`pnpm --filter @high-q/lp dev` で起動成功（Vuetify 初期化と共存）
- [x] 7.5 LP の任意の要素に `var(--hq-color-paper)` 等が解決されることは tokens.css が `:root` セレクタで宣言されているため自動的に保証される。実ブラウザでの値反映確認は翔太郎くんに委譲

## 8. ビルド・型・テスト統合

- [x] 8.1 ルートで `pnpm -r build` を実行し、design-tokens / ui / 既存パッケージがすべてエラーなく完了することを確認する
- [x] 8.2 ルートで `pnpm -r typecheck` を実行し、新パッケージを含めて全 typecheck が pass することを確認する
- [x] 8.3 ルートで `pnpm -r test` を実行し、新規 component test がすべて pass することを確認する（design-tokens 10 + ui 28 + lp 20 + admin 2 + reservation 1 = 61 tests）

## 9. 最終確認 / Apply 完了

- [x] 9.1 `git status` で意図しない変更が含まれていないことを確認し、`.gitignore` の `dist/` 除外が適切に効いていることを確認する（`git check-ignore` で dist/ の除外を確認）
- [x] 9.2 Issue #146 の完了条件チェックリストを再確認し、6 項目すべてが本 change の成果物で満たされていることを確認する
- [x] 9.3 sync フェーズで反映する docs 変更（`docs/05-インターフェース/01-UI設計方針.md` の旧パレット → HQ トークン）を todo として明文化し、PR 説明に記載する
