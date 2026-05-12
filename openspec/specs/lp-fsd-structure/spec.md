## Purpose

LP アプリ (`apps/lp`) の内部構造を Feature Sliced Design に基づいて整理し、`pages → widgets → entities → shared` の一方向依存を維持するためのレイヤー構造・命名規約・共有モジュール配置を規定する。
## Requirements
### Requirement: apps/lp が FSD レイヤー構造に従って配置される

`apps/lp/src/` 配下のコンポーネントは Feature Sliced Design のレイヤールール（`pages → widgets → entities → shared`）に従って配置されなければならない（SHALL）。

#### Scenario: widgets レイヤーにセクションコンポーネントが存在する

- **WHEN** 開発者が `apps/lp/src/widgets/` を参照した場合
- **THEN** `hero-section/`・`concept-section/`・`activities-section/`・`event-calendar/` の各スライスが存在し、それぞれが `index.js` を持つ

#### Scenario: shared/ui にレイアウトコンポーネントが存在する

- **WHEN** 開発者が `apps/lp/src/shared/ui/` を参照した場合
- **THEN** `HeaderLine.vue`・`FooterLine.vue`・`ConceptCard.vue` 等の汎用 UI コンポーネントが存在する

#### Scenario: 旧 components/ ディレクトリが存在しない

- **WHEN** 開発者が `apps/lp/src/components/` を参照した場合
- **THEN** ディレクトリが存在しない

### Requirement: Vuetify テーマトークンがコンポーネントで使用される

コンポーネント内でハードコードされた色値（`#182F43`・`#85BBCC` 等）を使用してはならない（SHALL）。Vuetify テーマトークン（`color="primary"` 等）またはユーティリティクラスを使用しなければならない（SHALL）。

#### Scenario: インライン CSS に色値が存在しない

- **WHEN** `apps/lp/src/` 配下の全 `.vue` ファイルを検索した場合
- **THEN** `#182F43`・`#85BBCC` のハードコード値が存在しない

### Requirement: FSD レイヤーエイリアスが vite.config.js に定義される

`@pages`・`@widgets`・`@entities`・`@shared` のパスエイリアスが `vite.config.js` に定義されなければならない（SHALL）。

#### Scenario: エイリアスで import できる

- **WHEN** Vue コンポーネント内で `import { EventCalendar } from '@widgets/event-calendar'` と記述した場合
- **THEN** ビルドエラーなく解決される

### Requirement: shared/api レイヤーが Supabase クライアントを提供する

`apps/lp/src/shared/api/` 配下に Supabase クライアントの単一エントリポイントを置かなければならない（MUST）。LP 内のすべての Supabase 接続は本エントリポイント経由でなければならず（SHALL）、`@supabase/supabase-js` の `createClient` を別の場所から直接呼んではならない（MUST NOT）。クライアントは `@high-q/shared` の `createSupabaseClient()` を内部で呼び出すラッパーとして実装し、env バリデーションを再実装してはならない（MUST NOT）。

#### Scenario: shared/api に Supabase クライアントが存在する

- **WHEN** 開発者が `apps/lp/src/shared/api/` を参照した場合
- **THEN** Supabase クライアントを提供するエントリポイントが存在し、`getSupabase()`（または同等の関数）が外部に公開されている

#### Scenario: createClient の直接呼び出しが存在しない

- **WHEN** `apps/lp/src/` 配下で `import { createClient } from '@supabase/supabase-js'` を grep
- **THEN** マッチが 0 件である（`@high-q/shared` 経由のみが許される）

#### Scenario: クライアントがアプリ起動を超えて単一インスタンスである

- **WHEN** LP の異なる entities / widgets から複数回 Supabase クライアントが要求される
- **THEN** 同一プロセス内では同一のクライアントインスタンスが返る（admin / reservation の `supabase.ts` と同パターン）

### Requirement: LP 固有の SVG アイコンが shared/ui/icons に配置される

LP でのみ利用する SVG アイコンコンポーネントは、`apps/lp/src/shared/ui/icons/` ディレクトリ配下に Vue SFC として配置されなければならない（SHALL）。3 アプリ（lp / admin / reservation）で共有が必要な汎用アイコンに昇格させる場合は別 Issue で `@high-q/ui` への移動を検討する。

#### Scenario: ReassuranceStrip 用のアイコン SFC が shared/ui/icons に存在する

- **WHEN** 開発者が `apps/lp/src/shared/ui/icons/` を参照した場合
- **THEN** 持ち物 / 服装 / 参加費を示す 3 種類の SVG アイコン SFC が存在し、それぞれが `currentColor` ベースで着色できる構造になっている

#### Scenario: アイコン SFC が size prop で寸法を指定できる

- **WHEN** アイコン SFC を呼び出し側がマウントする場合
- **THEN** `size` prop（数値 / デフォルト値あり）を渡すことで `width` / `height` を制御でき、SVG の `viewBox` を維持したままスケールする

