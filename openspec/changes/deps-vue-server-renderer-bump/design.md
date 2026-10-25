## Context

`@vue/server-renderer@3.5.33` に High (XSS) advisory が報告されている。解決木では `@vue/test-utils@2.4.8`（全アプリ / `@high-q/ui` の dev 依存）と `vue@3.5.33` 本体の両経路から参照されている。`@vue/server-renderer` はどのワークスペース package.json にも直接宣言されておらず、`vue` 本体は全アプリで `^3.4.3`（`@high-q/ui` は `^3.4.0`）として宣言されている。SSR は未使用で、実害は「信頼できない入力を SSR する場合」に限られるため実リスクは低いが、監査衛生として解消する。

## Goals / Non-Goals

**Goals:**
- `@vue/server-renderer` の脆弱版（< 3.5.42）を解決木から除去する
- `vue` / `@vue/server-renderer` を同一パッチ版へロックステップで揃える（メジャー跨ぎなし）
- 実行時コードを変更せず、ビルド・テストを等価に保つ

**Non-Goals:**
- vue のメジャー / マイナー方針変更（3.5.x 系の最新パッチに留める）
- `@vue/test-utils` 自体の更新（server-renderer を直接固定していないため不要）
- SSR 利用の導入

## Decisions

### 決定 1: `vue` 本体（直接依存）の更新で連動解消する — オーバーライドは使わない

`@vue/server-renderer@X` は `vue@X` を **exact peer** として要求する（lockfile で `@vue/server-renderer@3.5.33(vue@3.5.33)` と解決）。`@vue/test-utils@2.4.8` は `@vue/server-renderer` を `3.x` の optional peer として宣言するのみで版を固定しない。したがって `vue`（直接依存・range `^3.4.3` が 3.5.x 最新を許容）を 3.5.x 最新へ引き上げれば、exact peer 制約により `@vue/server-renderer` も同じ版へ連動する。

- **採用**: `pnpm update -r vue` で vue を 3.5.x 最新へ → server-renderer が peer 連動
- **不採用（alternative）**: `pnpm.overrides` に `@vue/server-renderer` を直接固定 — vue 本体と版がずれると exact peer 違反で install が壊れる / spec の「親更新を優先、override は親更新で解消できないものに限定」に反する
- **fallback**: 万一 vue 更新だけで server-renderer が連動しない場合に限り、`"@vue/server-renderer": ">=3.5.42 <3.6"`（下限＝firstPatched / 上限＝メジャー境界）を override に追加

### 決定 2: `monorepo-workspace` spec に「ランタイム本体 exact peer 固定の孫依存」扱いを明文化

既存の Scenario「バンドラ peer に固定された孫依存は本手段の対象外」はバンドラ本体の**メジャー更新**委譲のみを対象としていた。本件はランタイム（vue）に exact peer 固定された孫依存をマイナー更新で連動解消するケースで、同原則の自然な一般化にあたるため、当該 Scenario を「バンドラまたはランタイム本体 / バージョン更新（メジャーに限らず）」へ一般化する。

## Risks / Trade-offs

- [vue マイナー更新による回帰] → 3.5.33 → 3.5.x は API 互換のマイナー / パッチ。`pnpm -r test` 全件 + `pnpm build`（3 アプリ）で担保
- [`@sentry/vue` / `radix-vue` / `vue-router` など vue peer 依存群の整合] → いずれも `vue@3` を peer に取るため 3.5.x 内のパッチ更新で破綻しない想定。install 後の `pnpm why -r vue` で単一版収束を確認
- [連動しない edge case] → 決定 1 の fallback（override）で対応

## Migration Plan

1. `pnpm update -r vue` を実行し lockfile 更新
2. `pnpm why -r @vue/server-renderer` / `pnpm why -r vue` で脆弱版消失・単一版収束を確認
3. `pnpm -r test` / `pnpm build`（lp / admin / reservation）緑を確認
4. ロールバック: `pnpm-lock.yaml` と `package.json` の差分を revert（lockfile のみの変更のため影響局所）

## Open Questions

なし
