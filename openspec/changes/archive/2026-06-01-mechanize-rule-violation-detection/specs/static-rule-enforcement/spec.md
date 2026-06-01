## ADDED Requirements

### Requirement: FSD レイヤー境界違反を ESLint で error として検知する

リポジトリには `eslint-plugin-boundaries` が dev dependency として install されていなければならない（SHALL）。ESLint 設定は `app → pages → widgets → features → entities → shared` の依存方向制約を表現しなければならない（SHALL）。上位レイヤーは下位レイヤーを import してよく（SHALL）、下位レイヤーから上位レイヤーへの import は ESLint error としなければならない（SHALL NOT 許可）。本ルールは `apps/admin` と `apps/reservation` の `src/` 配下に適用しなければならない（SHALL）。`apps/lp` は本 change の対象外として除外する（SHALL）。

#### Scenario: entities が features を import すると ESLint error
- **WHEN** `apps/admin/src/entities/event/model/foo.ts` から `@/features/bar` を import するコードを ESLint で検査する
- **THEN** `eslint-plugin-boundaries` の依存方向違反として error 報告される

#### Scenario: widgets が features を import するのは許容される
- **WHEN** `apps/reservation/src/widgets/profile-header/index.ts` から `@/features/auth` を import するコードを ESLint で検査する
- **THEN** error が報告されない

#### Scenario: apps/lp は本ルールの対象外
- **WHEN** `apps/lp/src/` 配下のコードを ESLint で検査する
- **THEN** `eslint-plugin-boundaries` のレイヤー方向 rule が適用されない

### Requirement: cross-slice import は Public API (`index.ts`) 経由のみ許可する

同一レイヤー内の異なる slice（例: `features/auth` と `features/booking`）を相互に import する場合、対象 slice の `index.ts` 経由でなければならない（SHALL）。深いパス（`@/features/auth/composables/useFoo` 等）の直接 import は ESLint error としなければならない（SHALL NOT 許可）。同一 slice 内の相対 import (`./` / `../`) は許容する。

#### Scenario: 異 slice の深いパス import が ESLint error
- **WHEN** `apps/reservation/src/features/booking/composables/useBar.ts` から `@/features/auth/composables/useSession` を import する
- **THEN** Public API 経由でないため error 報告される

#### Scenario: 異 slice の index.ts 経由 import は許容
- **WHEN** 同ファイルから `@/features/auth` を import する
- **THEN** error が報告されない

### Requirement: Supabase client の直接 import を `shared/api/` 配下に限定する

`@supabase/supabase-js` および project 内の Supabase client 実装 (`@/shared/api/supabaseClient` 等) は `shared/api/` 配下のファイルからのみ import 可能でなければならない（SHALL）。他レイヤーからの直接 import は ESLint `no-restricted-imports` で error としなければならない（SHALL NOT 許可）。本ルールは `apps/admin` と `apps/reservation` に適用しなければならない（SHALL）。

#### Scenario: features から @supabase/supabase-js 直接 import が error
- **WHEN** `apps/admin/src/features/foo/api/bar.ts` から `@supabase/supabase-js` を import する
- **THEN** `no-restricted-imports` の error が報告される

#### Scenario: shared/api からの import は許容
- **WHEN** `apps/admin/src/shared/api/supabaseClient.ts` から `@supabase/supabase-js` を import する
- **THEN** error が報告されない

### Requirement: `service_role` の文字列がアプリコードに出現することを禁止する

`apps/*/src/` 配下のソースコード（`.ts` / `.tsx` / `.vue` / `.js`）に `service_role` の文字列リテラルが出現してはならない（SHALL NOT）。本ルールは ESLint custom rule または `no-restricted-syntax` で error 検知し、加えて CI step の grep でも二重検知しなければならない（SHALL）。`supabase/functions/` 配下（Edge Function）は本ルールの対象外とする（SHALL）。

#### Scenario: apps/*/src 配下に service_role 文字列があると ESLint error
- **WHEN** `apps/reservation/src/features/foo/api/bar.ts` に `"service_role"` を含むコードがある
- **THEN** ESLint error が報告される

#### Scenario: supabase/functions 配下は許容
- **WHEN** `supabase/functions/foo/index.ts` に `"service_role"` がある
- **THEN** error が報告されない

### Requirement: HQ デザイントークン経ない生 px / 生 hex を stylelint で warning にする

リポジトリには `stylelint` および Vue SFC 対応の syntax / config が dev dependency として install されていなければならない（SHALL）。`apps/admin` と `apps/reservation` の `.vue` ファイル内 `<style>` ブロックは、`px` / `rem` の生数値、および hex / rgb の生カラーリテラルを使用したとき warning を報告しなければならない（SHALL）。`var(--hq-*)` および `0`、`100%` 等の dimensionless 値は許容する。本ルールは warning レベルで実装し、error 昇格は別 change で扱う（SHALL NOT error 昇格を本 change で行う）。

#### Scenario: 生 px を含む style ブロックが warning
- **WHEN** `apps/admin/src/widgets/foo/Foo.vue` の `<style>` ブロックに `padding: 16px` を含む
- **THEN** stylelint の warning が報告される

#### Scenario: var(--hq-*) は許容
- **WHEN** 同じ場所に `padding: var(--hq-4)` を含む
- **THEN** warning が報告されない

### Requirement: `apps/admin` と `apps/reservation` に `lint` script を追加する

両 app の `package.json` には `lint` script が追加されていなければならない（SHALL）。`lint` script は `eslint` を `src/` 配下の `.ts` / `.tsx` / `.vue` に対して実行しなければならない（SHALL）。CI の lint job は `pnpm -r lint` または同等のコマンドで全 app の lint を実行しなければならない（SHALL）。

#### Scenario: admin に lint script がある
- **WHEN** `apps/admin/package.json` を読む
- **THEN** `scripts.lint` が定義されている

#### Scenario: reservation に lint script がある
- **WHEN** `apps/reservation/package.json` を読む
- **THEN** `scripts.lint` が定義されている

### Requirement: 依存方向の追加的検証として `dependency-cruiser` を CI で実行する

`dependency-cruiser` を dev dependency として install し、設定ファイル (`dependency-cruiser.config.js` 等) で FSD レイヤー方向ルールを定義しなければならない（SHALL）。CI には `dependency-cruiser` 実行 step を追加し、依存方向違反が検出された場合 fail しなければならない（SHALL）。ESLint と二重検知することで、ESLint の rule 漏れや disable comment による回避を CI 側で補完する。

#### Scenario: 依存方向違反で CI fail
- **WHEN** `apps/admin/src/entities/X/foo.ts` が `@/features/Y` を import する状態で CI が起動する
- **THEN** dependency-cruiser step が fail し CI job 全体が fail する
