## Why

`pnpm audit` が `@vue/server-renderer@3.5.33`（High, XSS）を報告している。#378 の脆弱性一掃で検出したが、修正版は vue 本体とロックステップで更新される実行時パッケージのため単独オーバーライドでは本体と不整合を起こすリスクがあり、別 Issue (#382) に切り出した。SSR 非使用かつテスト依存で実害は低いが、監査上の衛生として解消する。

## What Changes

- `vue`（直接依存）を 3.5.x 系の最新パッチ版へ引き上げ、`@vue/server-renderer` を同一版へ連動させる（メジャー跨ぎなし）
- `@vue/server-renderer` は vue 本体に exact peer で固定された孫依存のため、オーバーライドではなく vue 本体の更新で解消する（連動しない場合に限りオーバーライドを fallback とする）
- 既存の依存解決ルール spec に、ランタイム本体に exact peer 固定された孫依存を本体更新で解消する扱いを追記する

## Capabilities

### New Capabilities
<!-- なし -->

### Modified Capabilities
- `monorepo-workspace`: 孫依存の脆弱性解消ルールに、「ランタイム本体に exact peer で固定された孫依存は、単独オーバーライドではなく本体のバージョン更新で連動解消する」扱いを明文化する（従来はバンドラのメジャー更新委譲のみを対象としていた）

## Impact

- ルート `pnpm-lock.yaml`（`vue` / `@vue/server-renderer` の解決版が 3.5.33 → 3.5.x 最新へ）
- アプリ・パッケージの実行時コード変更なし（マイナー更新・API 互換）
- 検証範囲: `pnpm -r test` 全件 / `pnpm build`（lp / admin / reservation）/ `pnpm why -r @vue/server-renderer` で脆弱版消失 / Dependabot 該当アラート close
