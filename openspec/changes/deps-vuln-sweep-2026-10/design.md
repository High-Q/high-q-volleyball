## Context

`pnpm audit` が報告する 23 件は、解決手段で 4 クラスタに分かれる。いずれも dev 依存チェーン（テストランナー・バンドラ dev server・lint）で本番バンドル非搭載。既存の `monorepo-workspace` spec が「孫依存は override で firstPatched 以上へ」「ツールチェーン本体はサポート対象メジャーへ追随」という解消方針を既に規定しており、本 change はその方針を今回の対象へ適用する。

| クラスタ | 対象 | severity 内訳 | 根本原因 | 解消手段 |
|---|---|---|---|---|
| A | `tinypool` / `@vitest/mocker` / `vitest` | critical 2 + moderate 3 | tinypool 1.x のプロトタイプ汚染→RCE（1.x 系に修正版なし）、vitest/mocker のパストラバーサル（patched `>=4.1.11`） | テストランナー本体のメジャー更新（vitest 4 系）。tinypool は vitest 4 が patched 版を同梱 |
| B | `vite`（+ exact peer 固定の孫依存） | high 1 + moderate 3 + low 1 | `vite <=6.4.3` | バンドラ直接依存を 6 系最新パッチへ更新（メジャー更新ではない） |
| C | `fast-uri` | moderate 2 + low 2 | 既存 override 下限 `3.1.6` が firstPatched `3.1.9` を下回る | override 下限のみ `>=3.1.9` へ引き上げ |
| D | `postcss-selector-parser` | moderate 1 | 6.x 系インスタンスが patched `>=6.1.5` 未満、既存 override は `@7` のみでカバー外 | `@6` 系セレクタの override を追加 |

## Goals / Non-Goals

**Goals:**
- `pnpm audit` 該当 23 件を 0 件にする（`pnpm why -r` 解決木から脆弱版が消滅）
- 既存 `monorepo-workspace` 方針（firstPatched 下限 / メジャー追随 / メジャー系統を跨がない override / バンドラ本体は直接依存更新へ委譲）に厳密準拠
- vitest メジャー更新時はテスト対象範囲・実行環境（jsdom）・カバレッジ計測方針を等価維持し、設定 API 追随に限定
- #318 を消化、#383 を解決確認のうえ close 候補とする

**Non-Goals:**
- coverage threshold の引き上げ（#312 の別 Issue。本 change では現行 threshold を維持）
- アプリケーションコードのリファクタ・挙動変更（設定 API 追随を除き変更しない）
- `braces`（#383）の override 追加（現 audit に出ておらず既存 override で実質解決済み。確認のみ）
- vite のメジャー更新（6→7/8。脆弱版はパッチで外せるため対象外）
- `packages/shared/vitest.config.ts` の変更（vitest-baseline spec で変更禁止、設定の等価維持のみ）

## Decisions

- **クラスタ A（vitest メジャー）**: ワークスペース全対象（lp / admin / reservation / court-crawler / shared）の `vitest` と coverage provider を同一メジャー系統（4 系、現時点 `4.1.12` ＝ `@vitest/mocker` firstPatched `4.1.11` 以上）へ揃える。旧メジャーとの併存を残さない。vitest 4 の peer は `vite ^6.4.0` を許容するためクラスタ B と両立する。tinypool は vitest 4 が patched 同梱版を解決するため個別 override しない（1.x 系へのメジャー跨ぎ override は spec 禁止 かつ worker 破壊リスク）。
- **クラスタ B（vite パッチ）**: 各アプリの `vite` 直接依存を 6 系最新パッチ（`6.4.5` 系）へ更新。vite に exact peer 固定された孫依存（launch-editor 等）は単独 override せず本体更新へ委譲（spec 準拠）。transitive の `vitest>vite` は peer 解決でワークスペース vite に揃う。
- **クラスタ C / D（override 下限引き上げ・追加）**: `fast-uri` は range 構造を変えず下限のみ `>=3.1.9` へ。`postcss-selector-parser` は既存 `@7` を残したまま `@6: >=6.1.5 <7` を追加（メジャー系統を跨がない限定セレクタ）。具体バージョンは Apply 時に npm latest を照合して確定。
- **検証の正は `pnpm -r test`**: ルート直の単一 vitest 実行は jsdom が効かず全滅するため、各ワークスペースの test スクリプト経由（`pnpm -r test` / CI は `pnpm -r --if-present test:coverage`）で確認する。
- **Apply 順序**: 低リスクのクラスタ B→C→D（override / パッチ）を先に積んで `pnpm audit` と `pnpm -r test` で緑を確認 → 最後にクラスタ A（vitest メジャー）。クラスタごとにコミットを分け、万一 A がテストで詰まっても B/C/D 分を切り離して退避できる状態を保つ。

## Risks / Trade-offs

- **vitest 3→4 の破壊的変更**: 設定キー・snapshot 形式・mock API に差分が出る可能性。対応は設定 API 追随に限定し、挙動（対象範囲・jsdom 環境・カバレッジ方針）を等価維持。`pnpm -r test` と `pnpm -r typecheck`、CI 全ジョブ緑を受け入れ条件とする。差分が設定追随を超える場合は Apply 中に翔太郎くんへ報告し判断を仰ぐ。
- **coverage-v8 4 系のレポート差**: threshold ポリシー（lines/branches/functions の下限）は維持し、provider メジャー差で計測が変わる場合も threshold 値自体は本 change で動かさない（引き上げは #312）。
- **1 PR 同梱による連動停止リスク**: クラスタ A がテストで詰まると、安全な B/C/D 分も同じ PR で止まる。緩和としてクラスタ単位でコミットを分離し、必要時に A のみ revert 可能にする（翔太郎くんが「両方を 1 change で」を選択済み、承知のうえのトレードオフ）。
- **vite transitive 解決の取りこぼし**: 直接依存更新後も `pnpm why -r vite` で全インスタンスが 6.4.5 系に揃っているか明示確認する。揃わない孤立インスタンスが残る場合のみ最小 override を検討。
