## Why

個人開発で PM/PO/SM を兼ねる翔太郎くんのレビュー負荷を削減するために、CLAUDE.md Pillar 1〜5 で謳う構造ルール（FSD 依存方向 / Public API 経由 import / `shared/api/` 集約 / Branded Types / デザイントークン / RLS / `service_role` 露出禁止 / マイナンバー SOP / 4 状態テスト 等）の違反を、Apply 中の IDE と PR 時の CI で機械的に検知する。

現状は `.eslintrc.js` が最小構成、CI も typecheck / 既存 test / build しか走らず、`project.md` が「ESLint で境界自動検証」と謳うのに実装と乖離している。本 change はこの乖離を解消し、レム（Claude）の self-check に頼っていたルール遵守を tooling 側に固定する。

旧 #180 #181 で当初提案されていた subagent (`proposal-reviewer` / `constitution-linter` / `test-auditor` / `migration-safety` / `_charter`) 路線は、検知対象がほぼ決定論的で静的解析・CI script・coverage tooling で完結すること、IDE 上で即時警告できる方が Apply フィードバックループが短いこと、CLAUDE.md の「subagent 過剰使用を避ける」原則と整合的であることから撤回する。

## What Changes

- **FSD レイヤー境界違反** を ESLint で IDE 即時検知化（上位 → 下位の一方向制約 + cross-slice import は Public API 経由のみ）
- **Supabase client の不正利用** を ESLint で禁止（`shared/api/` 以外からの直接 import を error）
- **`service_role` のクライアント側露出** を ESLint と CI grep で二重検知
- **HQ デザイントークンを経ないマジックナンバー** を stylelint で警告（既存 Tailwind preset の枠外をふさぐ）
- **`apps/admin` / `apps/reservation` の lint script 追加**（現状 lint は `apps/lp` のみ）と CI lint job の全アプリ化
- **RLS ポリシー網羅** を CI 静的解析で機械検知（新規テーブルが RLS なしの場合 CI fail）
- **マイナンバー 12 桁 text 列禁止 SOP** を CI 静的解析で機械検知（型 + 列名パターンで fail）
- **migration ロールバック手順** の存在を CI で warning
- **4 状態 UI テスト存在チェック**（Loading / Empty / Error / Success のいずれかを spec ファイル名 / test ケース名で grep）を CI warning として実装
- **vitest coverage threshold** を導入し、Err パス未カバーを可視化
- **E2E 肥大化警告**（機能あたり E2E 件数 ≥3 で CI warning）
- **CLAUDE.md と関連ドキュメント** に「機械検知の責務は CI / lint」「意味理解が必要な部分はレム self-check」を明記
- **BREAKING**: 既存コードベースに対し新規 lint rule で error が出る可能性あり。本 change の Apply フェーズ最終タスクで全 error を解消した上で merge する（CI を緑にしてから ship）

## Capabilities

### New Capabilities

- `static-rule-enforcement`: FSD レイヤー境界 / cross-slice import / `shared/api/` 集約 / `service_role` 露出 / マジックナンバー 等の構造ルール違反を ESLint・stylelint・dependency-cruiser の静的解析で検知する仕組み
- `migration-safety-checks`: SQL migration に対する RLS ポリシー網羅 / マイナンバー 12 桁 text 列禁止 / ロールバック手順存在の CI 静的解析
- `test-coverage-thresholds`: 4 状態 UI テスト存在 / vitest coverage threshold / E2E 肥大化警告の CI 機械検知

### Modified Capabilities

- `github-actions-ci`: 上記 3 capability に対応する CI job / step を追加し、lint job を全アプリ対象に拡張する

## Impact

- 影響コード:
  - `.eslintrc.js` を全面刷新（FSD boundaries / `no-restricted-imports` 設定）
  - `apps/admin` / `apps/reservation` に `lint` script 追加
  - `.stylelintrc` / `dependency-cruiser` 設定を新規追加
  - `.github/workflows/ci.yml` に SQL 検査 / 4 状態テスト存在 / E2E 件数集計 step 追加
  - 各 `vitest.config.ts` に coverage threshold 追加
- 影響なし:
  - 既存 test の内容そのもの（threshold 未達時は warning 設計）
  - 既存 migration の SQL（既存テーブルは pre-existing exception として allowlist で許容、新規のみ強制）
- 依存追加: `eslint-plugin-boundaries`, `stylelint` + Vue/Tailwind preset, `dependency-cruiser`, vitest coverage provider
- ドキュメント更新:
  - `CLAUDE.md` Pillar 2 / 3 / 4 に機械検知ルール明記
  - `openspec/project.md` の ESLint 自動検証記述を実装と整合化
  - `docs/03-アーキテクチャ/04-開発・コーディング規約.md`
  - `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md`
  - `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`
  - `docs/07-テスト/01-テスト戦略・方針.md`
- 関連 Issue: #180（構造ルール違反検知）/ #181（テスト網羅性 + Migration 安全性）
