## Why

`pnpm audit` が開発ツールチェーン経由の脆弱性を 23 件（critical 2 / high 2 / moderate 15 / low 4）報告している。いずれも dev 依存チェーン（テストランナー・バンドラ dev server・lint）で本番バンドルには載らないため実被害リスクは低いが、critical / high にはプロトタイプ汚染からの RCE やパストラバーサルが含まれ、Dependabot アラートとして放置すると実リスクのある指摘を見落とす温床になる。

根本原因は 4 クラスタに束ねられ、既存の `monorepo-workspace` 方針（孫依存は override で firstPatched 以上へ寄せる／ツールチェーン本体はサポート対象メジャーへ追随する）をそのまま適用すれば一掃できる。うち critical・一部 moderate はテストランナー本体のメジャー系統に起因し、メジャー更新でしか根治できない（Issue #318 と同一の根治）。残りは override の下限引き上げとバンドラのパッチ更新で解消できる。方針が既に spec 化されているいま、まとめて片付けるのが構造的に正しい。

## What Changes

- **バンドラ（vite）のパッチ更新**: `vite` を脆弱版を外せる最小パッチ（6 系最新）へ寄せ、apps の直接依存と override を同系統で揃える。vite に exact peer 固定された孫依存の high/moderate/low を連動解消する。
- **既存 override の下限引き上げ**: `fast-uri`・`postcss-selector-parser` の下限が advisory の firstPatched を下回っているため、range 構造（セレクタ・上限メジャー境界）を変えず下限のみ最新 patched へ引き上げる。
- **テストランナー本体（vitest）のメジャー更新**: critical（プロトタイプ汚染 → RCE）および一部 moderate（パストラバーサル）は現行メジャー系統に修正版が存在せず、サポート対象メジャーへの更新でのみ根治する。ワークスペース全対象を同一メジャー系統へ揃え、テスト・ビルド・カバレッジ計測の挙動は等価に維持する（設定 API 追随に限定）。
- **検証**: `pnpm audit` の該当件数が 0 件、`pnpm why -r` の解決木から脆弱版が消滅、`pnpm -r test` / build / lint / CI 全ジョブ緑をもって受け入れる。
- **関連 Issue の後始末**: #318（vitest メジャー更新）を本 change で消化し、#383（braces、現時点の audit に出ておらず既存 override で実質解決済み）を解決確認のうえ close 候補とする。

Apply は低リスクのパッチ・override 群を先に積んで緑を確認してから、メジャー更新（vitest）に進む順序とする。

## Capabilities

### New Capabilities
<!-- なし。新規 capability は導入しない -->

### Modified Capabilities
- `monorepo-workspace`: 孫依存の override 解消方針と、ビルド・テストツールチェーン本体のサポート対象メジャー追随方針を、本スイープの対象（バンドラのパッチ更新・既存 override 下限の引き上げ・テストランナーのメジャー更新）に適用し再確認する。

## Impact

- **依存/ロックファイル**: ルート `package.json`（`pnpm.overrides`）、apps のバンドラ直接依存、`pnpm-lock.yaml`
- **テスト/ビルド設定**: 各アプリの vitest 設定・coverage provider（メジャー更新に伴う設定 API 追随のみ、挙動は等価維持）、CI の test / coverage ジョブ
- **アプリケーションコード**: 原則変更なし（テスト・ビルド設定 API の追随に限定）
- **Issue**: #318 を消化、#383 を close 候補として解決確認
- **本番バンドル**: 影響なし（全件 dev 依存チェーン）
