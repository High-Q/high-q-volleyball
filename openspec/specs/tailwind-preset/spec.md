# tailwind-preset Specification

## Purpose
TBD - created by archiving change admin-reservation-ui-foundation. Update Purpose after archive.
## Requirements
### Requirement: tailwind-preset パッケージが `@high-q/tailwind-preset` として公開される

新パッケージ `packages/tailwind-preset` は、`package.json` の `name` を `@high-q/tailwind-preset` とし、Tailwind CSS の `Config['theme']['extend']` 形式を default export で提供しなければならない（SHALL）。`@high-q/design-tokens` を依存（`workspace:*`）として宣言し、`tailwindcss` を `peerDependencies` に置く。

#### Scenario: アプリの tailwind.config から default import できる

- **WHEN** consumer が `apps/admin/tailwind.config.ts` で `import hqPreset from '@high-q/tailwind-preset'` し、`presets: [hqPreset]` を指定する
- **THEN** Tailwind ビルドが成功し、HQ 拡張 utility class（`bg-paper` / `text-ink` / `text-accent` 等）が生成される

#### Scenario: workspace から解決できる

- **WHEN** `apps/admin/package.json` および `apps/reservation/package.json` に `"@high-q/tailwind-preset": "workspace:*"` を追加し `pnpm install` を実行する
- **THEN** 両アプリ配下から `@high-q/tailwind-preset` の import が成功する

### Requirement: HQ デザイントークンが Tailwind theme に extend 形式で展開される

preset は、`@high-q/design-tokens` の `HQ` object をインポートし、以下の Tailwind theme カテゴリへ extend しなければならない（SHALL）。Tailwind デフォルトカラーは温存し、HQ パレットは追加（置換ではなく追加）として配布する。

| HQ category | Tailwind key | utility 例 |
|---|---|---|
| `color.*`（kebab-case 命名） | `colors` | `bg-paper`, `text-ink`, `border-hairline`, `text-accent`, `bg-paper-warm` |
| `font.*` | `fontFamily` | `font-jp`, `font-jp-display`, `font-mono` |
| `space.*` | `spacing`（key に `hq-` prefix） | `p-hq-4`, `gap-hq-8`, `mt-hq-14` |
| `radius.*` | `borderRadius`（key に `hq-` prefix） | `rounded-hq-md`, `rounded-hq-pill` |
| `shadow.*` | `boxShadow`（key に `hq-` prefix） | `shadow-hq-sm`, `shadow-hq-md` |

#### Scenario: HQ カラーが utility class として使える

- **WHEN** `<div class="bg-paper text-ink">` を含むコンポーネントを Tailwind ビルドする
- **THEN** 生成された CSS で `.bg-paper { background-color: #f7f3ea; }` および `.text-ink { color: #1f1d1a; }` が定義されている

#### Scenario: HQ スペーシングが `hq-` prefix で区別される

- **WHEN** `<div class="p-hq-4">` をビルドする
- **THEN** `padding: 16px`（`HQ.space[4]`）が適用される。Tailwind デフォルトの `p-4`（16px）と key 名で**明示的に区別**される

#### Scenario: HQ フォントファミリーが utility class として使える

- **WHEN** `<p class="font-jp">本文</p>` をビルドする
- **THEN** `font-family` が `var(--hq-font-jp)` 相当（`"Zen Kaku Gothic New", ...`）として適用される

### Requirement: preset の出力が `@high-q/design-tokens` の HQ object と整合する

preset の TS 実装は、`HQ.color` / `HQ.font` / `HQ.space` / `HQ.radius` / `HQ.shadow` を**唯一の入力源**としなければならない（SHALL）。リテラル値（`#f7f3ea` 等）を preset 内に直書きすることは禁止する。HQ object の値変更時、preset の出力も自動的に追随する。

#### Scenario: HQ 値変更が preset に反映される

- **WHEN** `packages/design-tokens/src/index.ts` で `HQ.color.paper` を別の値に変更する
- **THEN** `packages/tailwind-preset` の出力もその値に追随し、`bg-paper` の生成 CSS が変わる（preset 側の修正は不要）

#### Scenario: preset 実装にリテラル色が含まれない

- **WHEN** `packages/tailwind-preset/src/**/*.ts` を `#`・`rgb(`・`rgba(` で grep する
- **THEN** マッチが 0 件である

### Requirement: preset の整合性を検証するテストが存在する

`packages/tailwind-preset` は、Vitest で**最低 1 件以上の整合性テスト**を持たなければならない（SHALL）。テストは preset の出力（theme.extend）に `HQ` object の各値が正しく反映されていることを検証する。

#### Scenario: preset テストが pass する

- **WHEN** `pnpm --filter @high-q/tailwind-preset test` を実行する
- **THEN** `colors.paper === HQ.color.paper`、`fontFamily.jp === HQ.font.jp`、`spacing['hq-4'] === HQ.space[4]` 等の整合テストが pass する

### Requirement: パッケージが pnpm `-r typecheck` / `-r test` に追従する

新パッケージ `@high-q/tailwind-preset` は、ルートで `pnpm -r typecheck` および `pnpm -r test` を実行した際に、自動的に対象に含まれていなければならない（SHALL）。

#### Scenario: ルートからの一括コマンドで対象に入る

- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `@high-q/tailwind-preset` の `typecheck` script が呼び出され、エラーなく通過する

