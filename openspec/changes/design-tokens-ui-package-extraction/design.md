## Context

High Q プロジェクトでは LP (Vuetify) / admin (shadcn/ui + Tailwind) / reservation (shadcn/ui + Tailwind) の 3 アプリ構成を採る。これまで色・書体は各アプリのテーマ設定（Vuetify テーマ / Tailwind config）に分散しており、「真実の源泉」が無かった。

設計サンプル `docs/10-デザインサンプル/admin/hq-system.jsx` で確立された **HQ デザイン言語**（paper / ink / accent / hairline + Klee One + Zen Kaku Gothic + JetBrains Mono のミニマル組版）を、3 アプリ共通の真実の源泉として採用する方針が Issue #146 で固まった。

なお、書体トークンの命名は Issue #146 記載の `jpSerif` ではなく `jpDisplay` を採用する。Klee One は手書き風の表情を持つ書体であり Serif（明朝）に該当しないため、「役割」を表す中立名 `jpDisplay`（見出し・装飾用の日本語書体）にすることで、将来の書体差し替えにも耐える命名にする。

現状:
- `packages/shared` は型・Supabase client のみ提供し、UI / トークンは持たない
- `apps/admin` / `apps/reservation` は `package.json` に `vuetify` を持つが、UI 実装はまだ着手していない（=本 change で shadcn/ui 移行前にトークンを先に切り出すのが安全）
- `apps/lp` は Vuetify ベースで稼働中。新トークンへの刷新は別 Issue で実施する想定だが、本 change で CSS variables の入口だけ用意する
- 既存ドキュメント `docs/05-インターフェース/01-UI設計方針.md` の旧パレット（`primary #182F43` 等）は陳腐化しており、HQ トークンに置き換える前提

ステークホルダー: 翔太郎くん（オーナー / 個人開発）。

## Goals / Non-Goals

**Goals:**

- HQ デザイントークンを **TS export + CSS variables** の双方で配布し、Vue / React / Vuetify いずれの consumer からも参照可能にする
- MVP1 範囲のプリミティブ（Button / Kicker / Badge / Photo / RemainBar）を Vue 3 SFC として 1 度だけ実装し、admin / reservation で再利用可能にする
- `packages/ui` 内で開発用 showcase ページを動かし、4 状態（あるいは variant 別）を 1 ページで目視確認可能にする
- ルートでの `pnpm -r build` / `typecheck` / `test` に新パッケージが自動追従する
- すべてのコンポーネントが HQ トークン経由でのみ着色され、マジックナンバーを排除する

**Non-Goals:**

- LP の Vuetify からの完全移行（CSS variables 経由の参照口の追加のみ。既存テーマ刷新は別 change）
- admin / reservation の shadcn/ui 導入（本 change では `@high-q/ui` の Vue SFC のみ。shadcn/ui コンポーネントの各アプリ `components/ui/` への配置は別 change）
- MVP2 プリミティブ（SectionTitle / Divider / EventCard / EventDateBlock / StickyCTA / EmptyState / ErrorState / Skeleton 等）の実装
- admin 専用 primitive（DataTable / StatCard / Toolbar / SidebarNav / FormSection / Toast）
- ダークモード対応（HQ デザインは光のあるペーパートーン前提でモノトーン暗反転は想定外）
- Storybook 導入（後述の Decisions 参照）

## Decisions

### 1. パッケージ名: `@high-q/design-tokens` と `@high-q/ui`

既存の `@high-q/shared` に合わせ、`@high-q/` スコープを踏襲する。Issue #146 の記述（"`@high-q/ui`"）と完全一致。

代替案:
- `@high-q/tokens` / `@high-q/primitives` → 採用せず。Issue 文言と乖離するため。

### 2. design-tokens のソース・オブ・トゥルース: TypeScript

トークンは TypeScript オブジェクトを single source of truth とし、そこから **CSS variables ファイルをビルド時に生成**する。理由:

- TS 側で型補完が効き、追加・削除時の検出が容易
- CSS 側を手書きで二重管理すると drift の温床になる
- `style-dictionary` のような専用ツール導入は MVP1 ではオーバーキル。**素朴な Node スクリプト**（`scripts/generate-css.mjs`）で十分

代替案:
- CSS を SoT にして JS 側を `getComputedStyle` で取得 → 採用せず。SSR / ビルド時参照ができない
- `style-dictionary` 導入 → 採用せず。今のトークン規模（数十件）では正当化できない複雑性

### 3. design-tokens / ui は build 工程を持たない（src 直接 export）

**Apply フェーズ中の発見により、当初案（dist/ ビルド配布）から路線変更**した。

`packages/design-tokens` / `packages/ui` の `package.json` は `main` / `types` / `exports` を **`./src/...` に直接向ける**。consumer（admin / reservation / lp）の Vite + `@vitejs/plugin-vue` + `vue-tsc` が src の SFC / TS を直接コンパイルする。`@high-q/shared` が既にこの規約で運用されているため一貫性も取れる。

```jsonc
// packages/design-tokens/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  }
}

// packages/ui/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

**路線変更の理由（当初案 = dist/ ビルド配布の問題点）:**

- CI の typecheck job は `pnpm -r build` を走らせないため、`packages/ui/dist/` が無く playground の `import { ... } from "@high-q/ui"` が解決失敗
- e2e job は LP の Vite build を起動するが、`packages/design-tokens/dist/tokens.css` が無く Rollup が import を解決できない
- Render の `buildCommand` は `pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/lp build` で固定されており、`--ignore-scripts` で `prepare` 系の逃げ道も塞がっている。dist 必要のままだと **Render preview / 本番デプロイも同じ理由で失敗**する構造

**src 直接 export 案で問題が解消する理由:**

- workspace 内 consumer の Vite が pnpm symlink 経由で `packages/*/src/` を直接読む
- LP の Rollup は `@high-q/design-tokens/tokens.css` を **静的 CSS** として解決可能（build 工程不要）
- CI の各 job / Render / 各 dev server で **build 順序を意識する必要が消える**

**トレードオフ受容:**

- `npm publish` 不可（生 TS / SFC は publish できない）→ 本パッケージは `private: true` のモノレポ内利用専用なので問題なし
- 独立バージョニング不可 → `workspace:*` で同一 tree 同期、git commit hash で履歴管理
- consumer 側に Vite + plugin-vue + vue-tsc の tooling が必須 → admin / reservation / lp すべてが既に保有

**tokens.css の同期:**

`scripts/generate-css.ts`（`tsx` で実行）が `src/index.ts` の HQ オブジェクトから `src/tokens.css` を再生成する。`src/tokens.css` は **commit する**（CI install 時の生成不要）。drift は `src/index.test.ts` の「HQ オブジェクトの全エントリが tokens.css に CSS variable として存在する」テストで自動検出。

代替案として `style-dictionary` 導入や `prepare` script で install 時生成も検討したが、追加依存と CI 環境差の両方を持ち込むため不採用。「**ソースコミットされた静的ファイル + drift 検出テスト**」が最もシンプル。

### 4. ui の SFC コンパイルは consumer の `@vitejs/plugin-vue` に委ねる

src 直接 export 方式により、`packages/ui/src/*.vue` は consumer の Vite ビルドで処理される。`packages/ui/vite.config.ts` は **playground 開発専用**に縮小し、ライブラリビルド設定を持たない。

代替案として Vite lib モードで dist 出力する案も検討したが、上記 Decision 3 と同じ理由（CI / Render の build 順序の複雑性）で却下。

### 5. showcase ページ: `packages/ui` 内に Vite アプリとして同居

`packages/ui` 配下に `playground/`（または `showcase/`）ディレクトリを置き、独立した Vite アプリとして動かす。`pnpm --filter @high-q/ui dev` で起動。本番ビルド成果物には含まれない。

理由:
- Storybook 導入は MVP1 の規模に対して重い（依存数百 MB、設定の癖）
- 5 つのプリミティブの目視確認には 1 枚の HTML で十分
- 後で Storybook へ移行することを妨げない（playground を捨てて差し替える）

代替案:
- Storybook 導入 → 採用せず。Issue #146 でも "Storybook **or** 単純な showcase ページ" と並列されており、軽量側で進める
- admin / reservation の page にプリミティブを並べる → 採用せず。`@high-q/ui` パッケージ単独でリンクなしに開発できることを優先

### 6. CSS variables 命名規約: `--hq-<category>-<name>`（kebab-case）

- カラー: `--hq-color-paper` / `--hq-color-ink-soft`
- 書体: `--hq-font-jp-display` / `--hq-font-jp` / `--hq-font-mono`
- spacing: `--hq-space-1` ... `--hq-space-14`
- radius: `--hq-radius-pill`
- shadow: `--hq-shadow-sm`

`hq-` プレフィクスにより Vuetify / Tailwind が定義する CSS variables との衝突を防ぐ。

代替案:
- プレフィクスなし（`--paper`） → 採用せず。Vuetify が `--v-*` を使うのと同様、衝突回避のため独自プレフィクスは必須

### 7. Vue 3 を peerDependency

`@high-q/ui` は Vue 3 SFC を提供するが、Vue 本体は consumer 側に既に存在する（apps/admin / apps/reservation / apps/lp すべて）。重複バンドルを避けるため `peerDependencies` に置き、`devDependencies` でも宣言する。

```json
"peerDependencies": { "vue": "^3.4.0" },
"devDependencies": { "vue": "^3.4.3" }
```

### 8. テスト戦略

- 各プリミティブに **Vitest + @vue/test-utils** で 1 件以上の component test
- 検証内容: props 反映 / aria 属性 / disabled・loading 時のイベント抑止
- E2E は本 change のスコープ外（CLAUDE.md「機能あたり 1〜2 件まで」のルール下では、共有プリミティブそのものは consumer 側の E2E でカバーされるため不要）

### 9. LP 側の取り込み方法

`apps/lp/src/styles/` 等のグローバル CSS から `@import '@high-q/design-tokens/tokens.css'`（または node_modules 経由）を 1 行追加。Vuetify テーマ変数とは独立した名前空間（`--hq-*`）のため共存可能。LP の Vuetify テーマ自体は本 change では変更しない。

### 10. ドキュメント置換戦略（sync フェーズで実施）

`docs/05-インターフェース/01-UI設計方針.md` の旧カラーパレット表（primary / secondary）を、HQ トークン表に書き換える。Apply フェーズではコードのみを実装し、docs 反映は sync で行う（CLAUDE.md ワークフロー準拠）。

## Risks / Trade-offs

- [Risk] **Vite ライブラリビルドで Vue SFC の `<style scoped>` の data-v-* hash が consumer 側で衝突する**
  → Mitigation: scoped styles 内では tokens を `var(--hq-*)` で参照することで実体は変わらず、hash 衝突しても視覚的副作用なし。最初のプリミティブ（Button）実装時に admin の App.vue から import して動作確認する

- [Risk] **CSS variables 生成スクリプトが TS の型変更に追従しない**
  → Mitigation: `pnpm --filter @high-q/design-tokens build` で TS と CSS の両方を 1 コマンドで生成する script を組み、ビルド時に必ず両者が同期する。CI では `pnpm -r build` に組み込まれるため drift 検知される

- [Risk] **showcase ページが本番ビルドに混入する**
  → Mitigation: `package.json` の `exports` を厳密に `.` と `./tokens.css` のみに絞る。playground は `vite.config.ts` の lib モードのエントリから完全に分離

- [Risk] **`vue-tsc` と `vite build --lib` の dts 出力で型が壊れる**
  → Mitigation: `vue-tsc --emitDeclarationOnly --declaration` を別ステップで実行し、Vite ビルドは JS のみに専念させる。`@vue/tsconfig` の `vueCompilerOptions.target` を 3.4 に固定

- [Risk] **Trade-off: tsc で design-tokens をビルドするため `paths` エイリアス等は使えない**
  → 受容。design-tokens は依存ゼロのフラットなパッケージとして維持する

- [Risk] **Vuetify / 後続の shadcn/ui 導入と CSS variables の優先度が衝突**
  → Mitigation: `--hq-*` プレフィクスでスコープを分離。shadcn/ui の `--background` 等は別途 admin / reservation の Tailwind config で HQ token に bind する別 change で対応

## Migration Plan

1. `packages/design-tokens` を作成し、TS export + CSS variables 生成 + ビルド確認
2. `packages/ui` を作成し、Button → Kicker → Badge → Photo → RemainBar の順に実装。各プリミティブで component test を書く
3. showcase ページを起動し、目視で全プリミティブの状態を確認
4. `apps/admin/package.json` / `apps/reservation/package.json` に workspace 依存を追加し、admin の `App.vue` から `Button` を 1 つ import して描画確認
5. `apps/lp` のグローバル CSS で `@high-q/design-tokens/tokens.css` を import し、ブラウザで `var(--hq-color-paper)` 参照が解決することを確認
6. ルートで `pnpm -r build && pnpm -r typecheck && pnpm -r test` を 1 回通す
7. PR 作成 → Render プレビュー（LP のみ。admin / reservation は CI の typecheck/build/test のみ）→ master マージ
8. sync フェーズで `openspec/specs/` および `docs/05-インターフェース/01-UI設計方針.md` を更新

ロールバック: 新パッケージ追加のみで既存コードへの破壊的変更は最小（admin/reservation の package.json と LP のグローバル CSS の import 1 行）のため、PR 単位の revert で完全に戻せる。

## Open Questions

- LP のグローバル CSS の取り込み箇所をどこにするか（`apps/lp/src/main.js` の import か、`index.html` の `<link>` か）→ Apply フェーズで `apps/lp/src/` の現状を確認して決める。Vuetify との初期化順序にも依存
- spacing トークンに `5` / `7` / `10` 等の中間値を入れるか → 当面 Issue 記載の 1 / 2 / 3 / 4 / 6 / 8 / 14 のみで開始し、必要時に追加。MVP2 で精査
- Photo プリミティブの `width: '100%'` などの string 受けと `number` 受けの境界 → Apply 開始前に props 型を最終確定
