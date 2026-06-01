# design-tokens Specification

## Purpose
HQ ブランドのデザイントークン（カラー / 書体 / spacing / radius / shadow）を 3 アプリ（LP / admin / reservation）共通の真実の源として配布するパッケージ仕様。TypeScript named export と `:root` セレクタの CSS variables の双方を提供し、Vue / shadcn-Tailwind / Vuetify いずれの consumer からも参照可能にする。

## Requirements

### Requirement: HQ デザイントークンパッケージが TypeScript export を提供する
`packages/design-tokens` パッケージは、HQ ブランドのデザイントークン（カラー / 書体 / spacing / radius / shadow）を **TypeScript の named export** として提供しなければならない（SHALL）。`package.json` の `main` / `types` / `exports` は `./src/index.ts` を直接指し、consumer の Vite / vue-tsc が直接コンパイルする（build 工程なし）。

#### Scenario: TypeScript からトークンを参照できる
- **WHEN** consumer（例: `apps/admin`）が `import { HQ } from '@high-q/design-tokens'` を実行する
- **THEN** `HQ.color.paper` / `HQ.color.ink` / `HQ.color.accent` / `HQ.font.jpDisplay` 等のトークンに型付きでアクセスできる

#### Scenario: トークン値が設計サンプルと一致する
- **WHEN** `HQ.color.paper` / `HQ.color.ink` / `HQ.color.accent` を参照する
- **THEN** それぞれ `#f7f3ea` / `#1f1d1a` / `#b85c3c` を返す（`docs/10-デザインサンプル/admin/hq-system.jsx` の HQ オブジェクトと一致する）

### Requirement: HQ デザイントークンパッケージが CSS variables を提供する
`packages/design-tokens` は、すべての公開トークンを **CSS カスタムプロパティ**（CSS variables）として提供する `src/tokens.css` を **コミット済みの静的ファイル**として配置しなければならない（SHALL）。`package.json` の `exports["./tokens.css"]` は `./src/tokens.css` を指し、consumer の Vite / Rollup が静的 CSS として import 解決する。CSS variables は `:root` セレクタでグローバルに宣言される。

#### Scenario: アプリの JS / CSS から tokens.css を import できる
- **WHEN** `apps/lp/src/main.js` が `import '@high-q/design-tokens/tokens.css'` を実行する
- **THEN** Vite / Rollup が `packages/design-tokens/src/tokens.css` を解決し、ページの任意要素から `var(--hq-color-paper)` / `var(--hq-color-ink)` / `var(--hq-color-accent)` でトークン値を参照できる

#### Scenario: CSS variables の命名規約が一貫している
- **WHEN** 任意の公開トークン X について CSS variable 名を確認する
- **THEN** `--hq-<category>-<name>`（kebab-case）の命名で宣言されている（例: カラー `paper` → `--hq-color-paper`、書体 `jpDisplay` → `--hq-font-jp-display`）

### Requirement: tokens.css の drift 検出
`src/tokens.css` は `scripts/generate-css.ts`（`tsx` で実行）により `HQ` オブジェクトから生成され、ソースコミットされる。**TS export と CSS variables の値の drift** はテストで自動検出されなければならない（SHALL）。

#### Scenario: HQ オブジェクトの値変更が tokens.css に反映されていない場合にテストが落ちる
- **WHEN** 開発者が `src/index.ts` の HQ オブジェクトの値を変更し、`pnpm --filter @high-q/design-tokens build:tokens` を忘れて test を実行する
- **THEN** `src/index.test.ts` の drift 検出テストが失敗し、「`pnpm --filter @high-q/design-tokens build:tokens` で再生成してください」というメッセージが表示される

### Requirement: トークンカテゴリが必要十分にカバーされる
パッケージは MVP1 で必要な以下のトークンカテゴリをすべて提供しなければならない（SHALL）。

- カラー: `paper` / `paperWarm` / `ink` / `inkSoft` / `muted` / `accent` / `accentSoft` / `hairline` / `success` / `successSoft` / `warn` / `warnSoft` / `danger` / `dangerSoft` / `successOnDark` / `warnOnDark` / `dangerOnDark`
- 書体: `jpDisplay`（Klee One 系・見出し用）/ `jp`（Zen Kaku Gothic New 系・本文用）/ `mono`（JetBrains Mono 系・キャプション/コード用）
- spacing: 8pt グリッドで `1` / `2` / `3` / `4` / `6` / `8` / `14`（ピクセル換算 4 / 8 / 12 / 16 / 24 / 32 / 56）
- radius: `none` / `sm` / `md` / `pill`
- shadow: `none` / `sm` / `md`

`successOnDark` / `warnOnDark` / `dangerOnDark` は黒地（NEXT カードのヒーローカード等）に乗せた際の WCAG 2.1 AA 相当のコントラスト確保を目的とする SHALL。light 背景前提の既存 `success` / `warn` / `danger` を黒地に直接乗せると AA に満たないため、明度・彩度を引き上げた専用カラーを提供する MUST。

#### Scenario: 必要なトークンが TypeScript export に含まれる
- **WHEN** `import { HQ } from '@high-q/design-tokens'` で取得したオブジェクトを検査する
- **THEN** `HQ.color` / `HQ.font` / `HQ.space` / `HQ.radius` / `HQ.shadow` の各カテゴリが上記のキーをすべて持つ

#### Scenario: 同じトークンが TS export と CSS variables の両方で利用できる
- **WHEN** トークン X に対して `HQ.color.paper` と `var(--hq-color-paper)` をそれぞれ参照する
- **THEN** 両者が同一の文字列値（`#f7f3ea`）に解決される

#### Scenario: dark トーンカラーが黒地での WCAG AA を満たす
- **WHEN** `HQ.color.successOnDark` / `warnOnDark` / `dangerOnDark` を黒地 (`HQ.color.ink` または近似値) に乗せた場合の輝度コントラスト比を計測する
- **THEN** いずれも 3:1 以上（WCAG 2.1 AA の non-text component 基準）を満たす

### Requirement: パッケージが workspace から `@high-q/design-tokens` として import 可能である
パッケージは `package.json` の `name` を `@high-q/design-tokens` とし、`exports` フィールドで TS と CSS の両エントリを公開しなければならない（SHALL）。

#### Scenario: pnpm workspace からトークンパッケージを解決できる
- **WHEN** `apps/admin/package.json` の dependencies に `"@high-q/design-tokens": "workspace:*"` を追加し `pnpm install` を実行する
- **THEN** `apps/admin/node_modules/@high-q/design-tokens` がワークスペース内パッケージへの symlink として作成され、import が解決される
