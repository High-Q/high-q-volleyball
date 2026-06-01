## Context

CLAUDE.md は Pillar 1〜5 で「FSD 依存方向」「Public API 経由 import」「`shared/api/` 集約」「Branded Types」「HQ デザイントークン」「RLS 必須」「`service_role` クライアント露出禁止」「マイナンバー SOP」「4 状態 UI テスト」等の構造ルールを掲げているが、現状の機械検知は次のとおり穴がある:

- ルートの `.eslintrc.js` は `plugin:vue/essential` + `eslint:recommended` + `plugin:vuetify/base` のみで、FSD boundaries・`no-restricted-imports`・cross-slice 制約のいずれも未設定
- CI の lint job は `apps/lp` のみが対象（`apps/admin` / `apps/reservation` は lint script を持たない）
- `service_role` の grep / RLS 静的チェック / マイナンバー SOP 静的チェックは CI に組み込まれていない
- vitest は coverage threshold 未設定、4 状態テスト存在チェックも仕組みなし
- `openspec/project.md` は「ESLint で境界自動検証」と謳うが実装と乖離している

これまでルール遵守は「レム本体が CLAUDE.md を読み込んで Apply 時に気をつける」運用に依存していたが、商用稼働中の admin / reservation を踏まえ、ヒューマン（レム）依存から tooling 固定化への移行が必要。

旧 #180 #181 で提案されていた subagent (`proposal-reviewer` / `constitution-linter` / `test-auditor` / `migration-safety` / `_charter`) 路線は次の理由で撤回:

- 検知対象がほぼ決定論的（静的解析・grep・coverage で完結）
- subagent は確率的・token コスト・起動レイテンシ・IDE 統合不可
- CLAUDE.md「subagent 過剰使用を避ける」原則と整合的でない
- 「Reviewer の問題なし」を承認と誤認するリスク（承認ゲート侵食）を Issue 自身が認めている

ステークホルダー:
- 翔太郎くん（PM/PO/SM/開発者兼任）: Apply / Review / Ship 全工程の負荷削減
- レム（Claude）: ルール遵守の確実性向上、self-check 漏れの tooling 補完

## Goals / Non-Goals

**Goals:**
- CLAUDE.md Pillar 2 / 4 の構造ルール違反を IDE 上で即時警告（赤線）にする
- 新規 migration の RLS 漏れ / マイナンバー SOP 違反を CI で必ず捕まえる
- 4 状態 UI テストの抜けと Err パス未カバーを可視化する
- `apps/admin` / `apps/reservation` の lint を CI 必須化し、全アプリで lint 緑を維持する
- 既存コードベースを破壊せず、本 change 完了時点で CI が全 job 緑になる状態を達成する

**Non-Goals:**
- LLM ベースのレビューエージェント実装（旧 subagent 路線は撤回）
- 意味理解が必要なレビューの完全自動化（例: 「このテストが本当に意味あるカバーをしているか」「migration の既存データへの実質的影響」は引き続きレム self-check 責務）
- 既存 migration の遡及修正（既存テーブルは pre-existing exception として扱う。新規 migration のみ強制）
- LP の lint rule 厳格化（LP は #310 の Vuetify 剥がし + TS 化で別途扱う。本 change の boundaries / no-restricted-imports は admin / reservation を主対象とし、LP は最小ルールに留める）
- Sentry / Render 設定の変更
- subagent の全面禁止（必要な場面では使う。本 change は「ルール検知を subagent でやる」案を否定するだけ）

## Decisions

### D1: ESLint flat config への移行は本 change では行わない

**Why**: 既存 `.eslintrc.js` (legacy config) のままで `eslint-plugin-boundaries` / `eslint-plugin-import` / `no-restricted-imports` は十分動作する。flat config 移行は別 Issue の方が責務分離が明確。

**Alternatives**:
- A. flat config (`eslint.config.js`) へ全面移行 → スコープ肥大 + LP 既存設定の再構築が必要。却下
- B. legacy config のまま rule 強化 → 採用。最小破壊。

### D2: lint の単位は「app + shared 共通」設定 + app 個別 override

**Why**: FSD レイヤー定義は admin / reservation で共通（`app → pages → widgets → features → entities → shared`）。共通設定をルートに置き、app 個別の例外（LP の Vuetify 残存等）を app 直下の `.eslintrc.cjs` で override する。

**Alternatives**:
- A. app ごとに独立 ESLint config → 重複 + ドリフトリスク。却下
- B. ルート単一 config で全制御 → LP の特殊事情を吸収しづらい。却下
- C. ルート共通 + app override → 採用

### D3: cross-slice import の検知は `eslint-plugin-boundaries`、Supabase client 集約は `no-restricted-imports`

**Why**: boundaries は階層方向制約と element type ベースの cross-slice 検知が得意。`@supabase/supabase-js` の集約はパス制約なので組み込みの `no-restricted-imports` で十分。役割を分けることで rule 読解性が高い。

**Alternatives**:
- A. boundaries 単独で両方表現 → boundaries の `allowedTypes` で package import まで制御すると設定が肥大。却下
- B. dependency-cruiser のみ → CI 専用で IDE 即時警告にならない。boundaries の補助としてのみ採用。

### D4: マジックナンバー検知は stylelint custom rule + Tailwind preset の二段

**Why**: `<style>` ブロックの生 px / 生 hex は stylelint で直接拾える。`<template>` 内の inline style は Tailwind preset 利用を強制し、それ以外は ESLint で `style` 属性自体を warning。完全駆逐は別 change（既存コードのリファクタが必要）で本 change では「新規追加分のみ強制」の severity 設計を取る。

### D5: RLS / マイナンバー SOP / ロールバック手順は CI bash script で実装

**Why**: SQL ファイルの grep ベースで決定論的に判定可能。CI step 1〜数行で実装でき、専用 tool 導入のコストに見合わない。

**Alternatives**:
- A. PostgreSQL の `pg_policies` を本物 DB に当てて検証 → CI に PG 起動が必要で重い。`prd-db-push-ci` の延長で別途扱う。
- B. 専用 SQL リンター (`sqlfluff` 等) → 学習コスト・カスタムルール拡張難。却下
- C. bash + grep + 簡単な awk → 採用

### D6: 既存 migration / 既存テーブルは allowlist で除外する

**Why**: 商用稼働中の admin / reservation が依存する既存テーブルに対して RLS / マイナンバー検査を遡及適用すると、本 change のスコープが過大化する。allowlist で「既知の例外」を明示し、新規追加のみ強制する。

allowlist は `scripts/static-checks/allowlist.txt` 等の単純ファイルで管理し、PR で追加するときは明示的なレビュー対象とする。

### D7: 4 状態テスト存在チェックは CI warning として実装（hard fail にしない）

**Why**: 全 widget / page で 4 状態すべてが必要とは限らない（例: 静的コンテンツ）。CI fail にすると例外的に不要なコンポーネントの扱いで膠着する。warning で可視化し、レム self-check と組み合わせる。

threshold 設計:
- 新規追加された `.vue` ファイル（widgets / features / pages）に対し、対応 `*.spec.ts` が存在しない → warning
- 対応 spec はあるが `Loading` / `Empty` / `Error` / `Success` のいずれもカバーしていない → warning
- E2E ファイル数が機能あたり 3 件以上 → warning（CLAUDE.md「E2E スケーラビリティ運用ルール」と整合）

### D8: vitest coverage threshold は段階導入する

**Why**: 現状の coverage が不明なため一気に threshold を上げると CI が常時赤になる。本 change では coverage report 生成と CI への可視化のみを必須化し、threshold は別 Issue で段階的に引き上げる。

**Initial threshold**: lines 50% / branches 40% / functions 50%（ベースライン目安）。Apply 中に実測値を確認し、実値の少し下で確定する。

### D9: Apply フェーズ最終タスクで既存コードの lint error をすべて解消する

**Why**: 既存コードベースは新規 rule で必然的に error が出る。最終タスクで一掃し、merge 時点で CI が緑であることを保証する。既存コード修正による意図せぬ regression を避けるため、修正は「最小書き換え + テスト確認」のみとし、リファクタリングは別 change へ。

## Risks / Trade-offs

- **既存コードベースの lint error 大量発生** → 最終タスクで一掃。修正範囲が大きすぎる場合は対象 rule を warning に降格 or allowlist 追加で逃がす
- **ESLint rule の false positive** → Apply 中に rule severity を絞り込み。`eslint-disable-next-line` のコメントが乱発するようなら rule 設計をやり直す
- **CI 実行時間の増加** → 新規 step は静的解析中心で軽い。実測で 30 秒以内に収める目標。超過時は並列化
- **allowlist の腐敗** → allowlist 追加時は PR で必ず理由をコメントに残すルールを CLAUDE.md に明記
- **段階導入の coverage threshold が形骸化** → 別 Issue を作って引き上げをトラッキング。本 change の archive 時に follow-up Issue を立てる
- **LP の lint rule 不整合** → LP は #310 の Vuetify 剥がし + TS 化完了まで boundaries 等の対象外。本 change の app override で LP を例外設定にする

## Migration Plan

1. **依存追加 + ベースライン取り**: 新規 dev deps を install し、現状の lint / coverage 実測を取る
2. **ESLint / stylelint / dependency-cruiser 設定追加**: warning severity で導入し、IDE で実態把握
3. **CI 静的解析 step 追加**: RLS / マイナンバー SOP / 4 状態テスト / E2E 件数 を新規 job または既存 lint job に追加
4. **既存 lint error 解消**: 最終 sweep で残った error を修正
5. **rule severity を error に昇格**: warning → error に切替
6. **ドキュメント更新**: CLAUDE.md / project.md / 04 規約 / 06-03 / 06-08 / 07-01 を反映
7. **Sync / Archive**: openspec/specs を更新し change を archive

ロールバック戦略:
- ESLint rule の問題が露呈した場合: 該当 rule のみ severity を `warn` に戻す（個別 revert）
- CI step の問題: 該当 step のみ revert（job 全体は保つ）
- 大規模に問題が出た場合: change 全体を revert PR で巻き戻す（merge 直後のみ）

## Open Questions

- `eslint-plugin-boundaries` の rule で widgets ↔ features 間の依存方向をどこまで厳密にするか（widgets が features を import する方向のみ許容 / 双方向禁止 など）→ 既存コードの実態を Apply 中に grep し、現状最頻パターンを許容方向として採用
- coverage threshold の初期値は別 Issue で計測後に確定するか、本 change の Apply 中に決めるか → 本 change の Apply 中に実測 → 実値 -10% を初期値として PR に明記
- LP の boundaries 適用範囲（#310 で Vuetify 剥がし + TS 化と同時に boundaries も適用するか）→ #310 のスコープ判断。本 change では LP を boundaries 対象外として明示
