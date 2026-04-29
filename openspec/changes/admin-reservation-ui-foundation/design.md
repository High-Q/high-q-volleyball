# Design: admin/reservation UI 基盤整備

> Issue: #175 / Epic: #166
> Proposal: ./proposal.md

## Context

### 現状

- `packages/design-tokens` は #146 で整備済み。HQ パレット（paper / ink / accent 等）・font・space・radius・shadow を TS named export と CSS 変数（`--hq-*`）の双方で配布している。
- `packages/ui` も #146 で抽出済み。意匠系プリミティブ（`Button` / `Kicker` / `Badge` / `Photo` / `RemainBar`）が Vue 3 SFC + scoped CSS + `var(--hq-*)` の組み合わせで実装されている。
- `apps/admin` / `apps/reservation` は scaffold 段階で、ルートに `App.vue`（"準備中" 表示）と `main.ts` のみ。`package.json` に `vuetify` 依存が残っているが、ソース側で Vuetify を使っているコードはまだ無い。
- LP（`apps/lp`）は Vuetify 3 を実利用中。本 change の対象外。
- CLAUDE.md / `docs/05-インターフェース/01-UI設計方針.md` で `apps/admin` / `apps/reservation` は **shadcn/ui (Vue 移植) + Tailwind CSS** と明記されている。
- `@high-q/shared/api` の Supabase client は `detectSessionInUrl: true` でマジックリンク復帰対応済み（後続 #84 で利用）。

### 解こうとしている問題

admin の最終形（DataTable / Dialog / DatePicker / Combobox / Toast 等）を見据えると、a11y を完璧にするための機能系プリミティブが必要。これを自前で書くと数ヶ月の作業、shadcn-vue を使えば各 30 分。**まだ admin / reservation がほぼ空のうちに**基盤を入れるのが最安コスト。後から refactor する場合は 5〜10 倍のコスト。

### 制約

- 無料枠運用（追加サービス・有料ライブラリ禁止）
- pnpm workspaces（モノレポ）の整合性維持
- HQ デザイントークンの **単一の真実の源**（`@high-q/design-tokens`）を破壊しない
- 既存の `@high-q/ui` プリミティブの実装と思想（HQ トークン経由でのみ着色）を継続

## Goals / Non-Goals

**Goals:**
- `apps/admin` / `apps/reservation` で `vuetify` 依存を削除し、Tailwind + shadcn-vue + Vue Router の新スタックで動作させる
- HQ デザイントークンを Tailwind の `theme.extend` 経由で utility class として利用できる状態にする（`bg-paper` / `text-ink` / `text-accent` / `font-jp` / `p-hq-4` 等）
- shadcn-vue の Login (#84) 用最小プリミティブ（`Input` / `Label` / `FormField`）を両アプリのリポジトリ内に取り込む
- `@high-q/ui` と shadcn-vue の棲み分けルールを spec として明文化する
- 各アプリで `/`（"準備中" 画面）と `/login`（プレースホルダ）の最低 2 ルートが Vue Router 経由で動作する
- LP の将来移行時に再利用可能な `tailwind-preset` パッケージ構造とする
- ドキュメント（CLAUDE.md / UI設計方針.md）と実装の乖離を解消する

**Non-Goals:**
- Login (#84) の認証ロジック・画面実装
- イベント CRUD / 予約フロー等の機能実装（後続 Issue）
- LP の Vuetify 剥がし作業（基盤共有可能な状態にしておくだけ）
- shadcn-vue の Login 用以外プリミティブ（`Dialog` / `DataTable` / `DatePicker` / `Combobox` / `Toast` 等）の先取り取り込み — 必要時に各 Issue で個別に追加する
- E2E（Playwright）の追加 — 本 change は基盤整備のため、E2E は機能 Issue に紐付ける

## Decisions

### D1: shadcn-vue 公式リポジトリのコンポーネントを CLI 経由で取り込む

**選択**: [shadcn-vue.com](https://shadcn-vue.com/) 公式の `npx shadcn-vue@latest add <component>` 形式を採用する。

**代替案**: (a) `radix-vue` を直接使い、shadcn 風の wrapper を全部自前で書く / (b) Headless UI Vue を採用 / (c) shadcn-vue を使わず `@high-q/ui` だけで全プリミティブを内製。

**理由**:
- shadcn-vue は radix-vue を内部で使い、CVA + Tailwind による着色パターンが確立されている。「copy-paste でリポジトリ内に取り込む」方式なので、後から自由改変可能でライブラリ依存を作らない。
- (a) は radix-vue API を毎回手で wrap するため工数が膨大。(b) は a11y 品質が劣る。(c) は Login 1 画面なら可能だが admin の DataTable 等で頓挫する。
- shadcn-vue は React 版 shadcn ほど成熟していないが、`Input` / `Label` / `Button` 等の基本プリミティブは十分安定。

### D2: Tailwind preset を `packages/tailwind-preset` で配布する

**選択**: `packages/tailwind-preset` を新設し、`@high-q/design-tokens` の `HQ` object をインポートして Tailwind の `Config['theme']['extend']` 形式で配布する。consumer 側は `presets: [hqPreset]` で取り込む。

**代替案**: (a) `packages/design-tokens` 内に Tailwind preset も同居させる / (b) 各アプリの `tailwind.config.ts` で個別に `theme.extend` を書き、共通化しない。

**理由**:
- (a) は `design-tokens` の責務を「真実の源」に限定したいため避ける。Tailwind preset は consumer 寄りの配布形式。
- (b) は 3 アプリ（将来の LP 移行含む）で重複し、HQ token の追加時に 3 箇所修正する事故が起きる。
- 別パッケージにすることで、Tailwind を使わない LP（現状 Vuetify）に preset を強制せず、必要なアプリだけが import できる。

### D3: HQ tokens → Tailwind theme のマッピング規則

**選択**: 以下の規則で `theme.extend` に展開する:

| HQ category | Tailwind key | utility class 例 |
|---|---|---|
| `color.*`（kebab-case） | `colors` | `bg-paper`, `text-ink`, `border-hairline`, `text-accent`, `bg-paper-warm` |
| `font.*` | `fontFamily` | `font-jp`, `font-jp-display`, `font-mono` |
| `space.*` | `spacing` | `p-hq-4`, `gap-hq-8`, `mt-hq-14` |
| `radius.*` | `borderRadius` | `rounded-hq-md`, `rounded-hq-pill` |
| `shadow.*` | `boxShadow` | `shadow-hq-sm`, `shadow-hq-md` |

`hq-` prefix を付ける狙い: Tailwind デフォルト（`p-4` など 4px ベース）と HQ tokens（`p-hq-4` = 16px）を **明示的に区別**し、混在事故を防ぐ。`color` は HQ パレットでデフォルトを完全置換せず `extend` で追加する（Tailwind デフォルトカラーは利用可能だが推奨しない）。

**代替案**: (a) HQ tokens で Tailwind デフォルトを完全上書き / (b) prefix なし。

**理由**: (a) は Tailwind の standard 知識（`bg-white` 等）が通じなくなり学習コストが上がる。(b) は HQ space の `4` (= 16px) と Tailwind の `4` (= 16px) が一致しないケース（HQ `space.6` = 24px / Tailwind `6` = 24px は一致するが、`space.14` = 56px / Tailwind `14` = 56px のように偶然一致する場合と、設計意図のズレを区別できない）で混乱を招く。

### D4: shadcn-vue プリミティブの配置先は `apps/<app>/src/shared/ui/`

**選択**: shadcn-vue CLI で取り込んだコンポーネント（`Input.vue` / `Label.vue` 等）は **各アプリの `src/shared/ui/` 配下** に配置する。両アプリで同じファイルが重複する。

**代替案**: (a) `packages/ui` に shadcn-vue 系も同居させ、共通化する / (b) `packages/shadcn-vue/` を新設して両アプリで参照する。

**理由**:
- shadcn-vue の哲学は「**copy-paste して各アプリで自由改変**」。共通化すると admin で必要な customization が reservation に波及する事故が起きる。
- (a) は意匠系（`@high-q/ui`）と機能系（shadcn-vue）の責務分離が崩れる。`@high-q/ui` は HQ デザイン哲学を体現する SFC、shadcn-vue は radix-vue + Tailwind の機能系。書き方の規則・依存・テスト戦略が異なる。
- ファイル重複は、今のところ `Input` / `Label` / `FormField` の 3 ファイルだけなので軽量。アプリ固有の改変を許容する方が将来コストが小さい。

### D5: `@high-q/ui`（意匠系）と shadcn-vue（機能系）の棲み分け基準

**選択**: 以下の基準で振り分ける:

| 提供元 | 何を置くか | 例 |
|---|---|---|
| `@high-q/ui`（packages/ui） | **HQ 独自のデザイン言語を体現する**プリミティブ。CSS 変数で着色、shadcn-vue や Tailwind に依存しない。3 アプリ（LP 含む）で共通利用 | `Button`, `Kicker`, `Badge`, `Photo`, `RemainBar`, 将来の `EventCard` / `EventDateBlock` / `StickyCTA` |
| shadcn-vue（apps/<app>/src/shared/ui/） | **a11y 完璧な機能系プリミティブ**。radix-vue + Tailwind ベース。各アプリで配置・改変。 | `Input`, `Label`, `FormField`, `Dialog`, `Dropdown`, `Combobox`, `DataTable`, `Toast`, `DatePicker` |

両者とも **着色は HQ デザイントークン経由**（`@high-q/ui` は `var(--hq-*)`、shadcn-vue は Tailwind preset utility）。マジックナンバー禁止。

`Button` は意匠系として `@high-q/ui` が責務を持つ（shadcn-vue の `Button` は取り込まない）。これによりアプリ間で CTA の見た目が完全に統一される。

### D6: Vue Router 配置は `apps/<app>/src/app/router.ts`

**選択**: 各アプリで `src/app/router.ts` にルート定義を集約し、`main.ts` で `createApp(App).use(router).mount(...)`。`/`（HomePlaceholder）/ `/login`（LoginPlaceholder）の 2 ルートを最低限定義する。

**代替案**: ルート定義をページごとにファイル分割 / `src/router/` ディレクトリを切る。

**理由**: ルート数が少ないうちは単一ファイルが見通し良い。FSD の `app` レイヤーに `router.ts` を置くのが規約と整合する（`app` = アプリ起動・配線）。後でルートが増えたら分割する。

### D7: Vuetify 依存は本 change で完全削除する（admin / reservation のみ）

**選択**: `apps/admin` / `apps/reservation` の `package.json` から `vuetify` / `vite-plugin-vuetify` / `sass` を削除し、`vite.config.ts` の `vuetify()` plugin 呼び出しを撤去する。テスト helper の `mountWithVuetify.ts` も `mountWithRouter.ts` に置換する。

**理由**: ソース側で Vuetify を使うコードは現状無く、削除コストはほぼゼロ。残しておくと「使ってもよいライブラリ」と誤読され、新規 Issue で混入するリスクがある。LP は本 change の対象外（Vuetify 利用継続）。

### D8: `tokens.css`（CSS 変数）と Tailwind preset（utility class）は**共存**させる

**選択**: 両者を同時利用する:
- `tokens.css` は `:root` で `--hq-*` 変数を定義。`@high-q/ui`（scoped CSS で `var(--hq-*)`）と LP（既存 Vuetify テーマ override）が利用。
- Tailwind preset は build 時に `bg-paper` 等の utility class を生成。`apps/admin` / `apps/reservation` の Tailwind 利用箇所が利用。
- 両者は同じ HQ 値を参照しているので **ズレない**。Tailwind preset を生成するのは `@high-q/design-tokens` の `HQ` object なので、`HQ.color.paper` の値変更は両者に同時反映される。

**代替案**: (a) Tailwind preset で完結させ、`tokens.css` を撤廃 / (b) CSS 変数のみで Tailwind を使わない。

**理由**:
- (a) は `@high-q/ui` プリミティブ（`packages/ui`）が Tailwind 不要で動いている設計を壊す。LP も `tokens.css` を `main.js` で import しており、撤廃は影響大。
- (b) は本 change の目的（admin/reservation で Tailwind 採用）に反する。

### D9: Login (#84) で必要な最小プリミティブを本 change で取り込む

**選択**: 本 change では shadcn-vue から **`Input` / `Label` / `FormField`** の 3 種のみ取り込む。`Button` は取り込まず `@high-q/ui` の `Button` を使う（D5 と整合）。

**Form 統合（vee-validate 連携）は #84 で判断**する。本 change の `FormField` は単純なラッパー（label + input + error message slot）として最小実装する。

**理由**: スコープを最小化して merge までの時間を短縮する。後続 Issue で必要になった shadcn-vue プリミティブはその Issue で個別に追加する（本 change で先取り取り込みしない）。

### D10: 後続 Issue で shadcn-vue プリミティブを追加する際のフロー

**選択**: 各 Issue の Design フェーズで「追加するプリミティブ」を宣言し、Apply タスクで `npx shadcn-vue@latest add <component>` を該当アプリで実行する。`shadcn-vue-integration` spec はこのフローを記述する。

**理由**: 先取り取り込みは「使わないコードがリポジトリに残る」ため避ける。逆に「Issue ごとに必要分を取り込む」運用なら、リポジトリ内のプリミティブが全て実利用されている状態を保てる。

## Risks / Trade-offs

### R1: shadcn-vue (Vue 移植版) の成熟度
shadcn-vue は React 版より歴史が浅く、稀に component の API 変更がある。

→ **Mitigation**: copy-paste 方式なので取り込み後はリポジトリ内コードとして固定される。upstream 変更は手動 sync。本 change で取り込むのは安定した基本 3 種（`Input` / `Label` / `FormField`）のみで、複雑コンポーネント（DataTable / Combobox 等）は後続 Issue で都度評価する。

### R2: Tailwind preset と既存 `tokens.css` の重複・乖離リスク
preset と CSS 変数の値が将来ズレる可能性。

→ **Mitigation**: 両者とも `@high-q/design-tokens` の `HQ` object を**唯一の入力源**とする。preset 内で `import { HQ } from '@high-q/design-tokens'` し、`tokens.css` も `scripts/generate-css.ts` で同 object から生成済み。値の変更は `HQ` object の編集 1 箇所で両者に反映される。preset の TS テストで HQ 値との整合を検証する。

### R3: 後続 Issue 着手までの時間
本 change の Apply 期間中、後続 Issue（#84 含む）は着手できない。

→ **Mitigation**: スコープを最小化（Login 用 3 プリミティブのみ、DataTable 等は先取りしない）。タスクリストを 1 タスク 1 コミットで小さく刻み、レビュー回転を早める。

### R4: 既存の admin/reservation テスト（`App.spec.ts` / `mountWithVuetify.ts`）の破壊
Vuetify 削除でテストが壊れる。

→ **Mitigation**: 本 change で `mountWithRouter.ts` ヘルパーに置換し、`App.spec.ts` を新スタック前提に書き直す。Vuetify を使ったテストは現状 admin/reservation では実質ゼロなので影響軽微。

### R5: shadcn-vue の Tailwind 設定 + radix-vue 依存追加によるバンドルサイズ増
admin/reservation の本番 build サイズが増える。

→ **Mitigation**: Tailwind は JIT + purge で実利用 utility のみ出力。radix-vue は tree-shake 対応で実利用コンポーネントのみ含まれる。本 change 完了時点では `Input` / `Label` のみで影響軽微。後続でプリミティブ追加時にバンドルサイズを再評価する。

## Migration Plan

1. `packages/tailwind-preset` 新設（package.json / TS preset 実装 / vitest で HQ 値整合テスト）
2. `apps/admin` に Tailwind / shadcn-vue / vue-router を導入し、Vuetify 依存を削除
3. `apps/reservation` で同上
4. 両アプリで `/` と `/login` のプレースホルダーページを実装（HQ デザイントークン経由でスタイル）
5. テストヘルパー置換（`mountWithVuetify.ts` → `mountWithRouter.ts`）
6. `docs/05-インターフェース/01-UI設計方針.md` / `CLAUDE.md` の UI スタック記述を改訂
7. `pnpm -r typecheck` / `pnpm -r test` / `pnpm -r build` 全パス確認
8. PR 作成 → Render プレビュー確認

**ロールバック**: 本 change は新規パッケージ追加と admin/reservation 限定の変更で、LP（本番稼働）への影響は無い。問題発生時は revert で完全復旧可能。

## Open Questions

- shadcn-vue の `Form` プリミティブ（vee-validate 統合版）を採用するかは **#84 (Login) で判断**する。本 change の `FormField` は最小実装に留める。
- LP を将来 shadcn-vue + Tailwind に移行する場合、`tokens.css` と Tailwind preset のどちらを優先するかは **LP 移行 Issue で判断**する。本 change では両者を共存させる構造を確保するに留める。
