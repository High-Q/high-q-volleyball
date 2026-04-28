## Why

LP / admin / reservation の 3 アプリで共通利用する **HQ デザイントークン**（paper / ink / accent / typography 等）と、新デザインで確立された **MVP1 範囲の UI プリミティブ**（Button / Kicker / Badge / Photo / RemainBar）を、モノレポ `packages/` に切り出す。これがないと、admin / reservation を新デザインで構築しはじめた時点でトークン定義が各アプリに重複し、後から LP を新デザインへ刷新する際に不可避な整合性ズレが発生する。Issue #146 / Epic #166。

なお、現行の `docs/05-インターフェース/01-UI設計方針.md` に記載されている旧トークン（`primary #182F43` / `secondary #85BBCC` 等）は、設計サンプル `docs/10-デザインサンプル/admin/hq-system.jsx` で確立された **HQ トークン体系**へ置き換える。本変更はその置換の起点となる。

## What Changes

- 新パッケージ `packages/design-tokens` を追加し、HQ トークンを **TypeScript export + CSS variables** の両方で提供する
  - カラー: `paper #f7f3ea` / `paperWarm #f1ece0` / `ink #1f1d1a` / `inkSoft #3a3833` / `muted #8a857a` / `accent #b85c3c` / `accentSoft rgba(184,92,60,0.08)` / `hairline rgba(31,29,26,0.12)`
  - 書体: `jpDisplay` (Klee One) / `jp` (Zen Kaku Gothic New) / `mono` (JetBrains Mono)
  - spacing（8pt グリッド）/ radius / shadow
- 新パッケージ `packages/ui` を追加し、MVP1 範囲のプリミティブを Vue 3 SFC で実装する
  - `Button`（ピル型・primary / secondary / ghost / danger・size sm/md）
  - `Kicker`（mono・uppercase・accent カラー）
  - `Badge`（neutral / accent / success / warn / danger / draft）
  - `Photo`（プレースホルダー・斜めストライプ）
  - `RemainBar`（残席バー）
- admin / reservation アプリから `@high-q/ui` および `@high-q/design-tokens` を import 可能にする（pnpm workspace 経由）
- LP（Vuetify）から CSS variables 経由で HQ トークンを参照可能にする（後の刷新に備え、Vuetify テーマと共存できる形）
- showcase ページ（`packages/ui` 内に最小構成の Vite ページ）で全プリミティブの 4 状態（Loading / Empty / Error / Success が定義可能なものはそれ、それ以外は default / hover / disabled / focus 等の主要状態）を確認できる
- **BREAKING (docs)**: 旧トークン定義（`docs/05-インターフェース/01-UI設計方針.md` のカラーパレット表）は HQ トークンに置き換える方針を proposal で明記する。docs の実書き換えは sync フェーズで実施
- MVP2 で追加予定（本 change のスコープ外）: `SectionTitle` / `Divider` / `EventCard` / `EventDateBlock` / `StickyCTA` / `EmptyState` / `ErrorState` / `Skeleton`、admin 専用 primitive (`DataTable` / `StatCard` / `Toolbar` / `SidebarNav` / `FormSection` / `Toast`)

## Capabilities

### New Capabilities

- `design-tokens`: HQ デザイントークン（カラー / 書体 / spacing / radius / shadow）を TypeScript と CSS variables で配布する共有パッケージの仕様
- `shared-ui`: MVP1 範囲の UI プリミティブ（Button / Kicker / Badge / Photo / RemainBar）と showcase ページを提供する Vue 3 共有 UI パッケージの仕様

### Modified Capabilities

- `monorepo-workspace`: ワークスペース構成に新パッケージ `@high-q/design-tokens` と `@high-q/ui` を追加する（admin / reservation / shared に加え 2 パッケージが認識される）

## Impact

- **新規追加コード**: `packages/design-tokens/`、`packages/ui/` 配下のソース・テスト・showcase ページ・ビルド設定
- **既存変更コード**:
  - `apps/admin/package.json` / `apps/reservation/package.json`: `@high-q/ui` / `@high-q/design-tokens` を `dependencies` に追加（workspace:*）
  - `apps/lp/`: グローバル CSS で `@high-q/design-tokens/dist/tokens.css`（または同等パス）を読み込む import 文を 1 箇所追加
  - `pnpm-workspace.yaml`: 既に `packages/*` をカバーしているため変更不要（追加検証）
- **依存関係**: `packages/ui` に Vue 3 を peerDependency として追加。ビルドツールとして `tsup` または `vite build --lib` を導入（design.md で確定）
- **Docs**: `docs/05-インターフェース/01-UI設計方針.md` の旧トークン記述は sync フェーズで HQ トークンへ書き換え
- **テスト**: `packages/ui` 内の各プリミティブに Vitest + @vue/test-utils の component test を最低 1 件ずつ。E2E は本 change ではスコープ外（showcase ページの目視確認に留める）
- **CI**: `pnpm -r build` / `pnpm -r typecheck` / `pnpm -r test` の対象に新パッケージが自動的に含まれる（workspace 経由のため追加設定不要、ただし要動作確認）
