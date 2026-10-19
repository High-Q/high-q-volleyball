## Context

Dependabot が報告する脆弱性はいずれも開発ツールチェーン（eslint 系 / stylelint / autoprefixer / browserslist）の間接依存に由来する。これらは本番バンドルに乗らないが、CI 実行環境と監査上の衛生を保つために解消する。本リポジトリは pnpm monorepo で、間接依存の固定は `pnpm.overrides`（ルート `package.json`）で一元管理している。過去に override 下限を最新 advisory と照合せず更新した結果 fast-uri を退行させた事例（#361→#366）があるため、本変更では「下限＝最新 patched」を厳守する。

## Goals / Non-Goals

**Goals:**
- Issue #378 記載の 7 パッケージの脆弱版を lockfile から排除する
- 既存の lint / stylelint / dependency-cruiser / test / build が全て緑を保つ
- override は最小限に留め、親更新で解消できるものは親更新を優先する

**Non-Goals:**
- vitest 連鎖（@vitest/mocker / tinypool 等）の解消 — メジャー更新が必要で #318 の責務
- 本番実行時依存のアップグレード — 本変更は dev 依存のみ
- override の全面的な棚卸し・整理（必要な下限引き上げのみ行う）

## Decisions

- **親更新を優先、無理なものだけ override**: 間接依存は親パッケージの更新で patched 版に上がるならそれを優先し、親がまだ古い範囲を要求する場合のみ override で底上げする。override はツールチェーンの意図しない固定を増やし保守コストになるため最小化する。
- **override の範囲は「下限＝最新 patched / 上限＝メジャー境界」**: 例 `>=<patched> <<next-major>`。下限を patched 未満に置くと脆弱版の解決を許すため、Issue 記載の patched 版を下限に据える。上限はメジャー境界に固定し、将来の破壊的更新が静かに混入するのを防ぐ。
- **既存 override は下限のみ引き上げ**: fast-uri / js-yaml / brace-expansion は既に override 済みだが下限が古い。range 構造は変えず下限を最新 patched へ更新する（header 差分を最小化）。
- **具体バージョンは tasks.md に記載**: 下限値・対象パッケージの patched 版は実装時に lockfile 実測で確定し tasks に落とす。

## Risks / Trade-offs

- [override 下限の設定ミスで脆弱版が残る / 退行する] → 適用後に `pnpm why -r <pkg>` と `pnpm audit` で脆弱版が解決木から消えたことを実測確認する。#361→#366 の退行を踏まえ、下限は最新 advisory の firstPatched と必ず照合する。
- [ツールチェーン更新で lint / stylelint / build のルールが変わり CI が割れる] → 完了確認タスクで lint / stylelint / dependency-cruiser / vitest / 3 アプリ build を一括実行し、割れたら個別に切り分ける。
- [baseline-browser-mapping / postcss-selector-parser が複数バージョン併存] → browserslist / tailwindcss / eslint-plugin-vue の各経路を `pnpm why -r` で確認し、全経路が patched に寄ることを確認する。

## Migration Plan

- デプロイ影響なし（lockfile と devDependencies のみ）。ロールバックは当該コミットの revert で完結する。

## Open Questions

- なし（Issue #378 がスコープを確定済み）。
