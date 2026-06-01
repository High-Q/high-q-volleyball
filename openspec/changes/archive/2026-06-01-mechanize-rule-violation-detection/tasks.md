## 1. ベースライン取得 + 依存追加

- [x] 1.1 ルートで現状の lint / typecheck / coverage を実測し、`apps/admin` `apps/reservation` の現 coverage 値を記録（threshold 初期値の根拠とする）
- [x] 1.2 ルートと `apps/admin` / `apps/reservation` に dev dependency を追加: `eslint-plugin-boundaries` `eslint-plugin-import` `dependency-cruiser` `stylelint` `stylelint-config-standard` `stylelint-config-recommended-vue` `postcss-html` `@vitest/coverage-v8`
- [x] 1.3 `apps/admin/package.json` `apps/reservation/package.json` に `lint` script (`eslint src --ext .ts,.tsx,.vue`) と `test:coverage` script (`vitest run --coverage`) を追加
- [x] 1.4 ルート `package.json` に `lint` / `test:coverage` 集約 script を追加（既存があれば pnpm -r 経由に統一）

## 2. ESLint 設定強化（FSD boundaries / no-restricted-imports）

- [x] 2.1 ルート `.eslintrc.js` を刷新: `eslint-plugin-boundaries` 設定で `app / pages / widgets / features / entities / shared` のレイヤーを定義（element types）
- [x] 2.2 boundaries の `element-types` rule で上位 → 下位の依存方向を強制、`no-private` rule で Public API (`index.ts`) 経由のみ許可
- [x] 2.3 `no-restricted-imports` で `@supabase/supabase-js` の import を `apps/*/src/shared/api/` のみ許可
- [x] 2.4 `no-restricted-syntax` で `apps/*/src/` 配下の `service_role` 文字列リテラルを禁止（`Literal[value=/service_role/]` 等）
- [x] 2.5 `apps/lp/.eslintrc.cjs` を新規作成し、boundaries / no-restricted-imports / service_role rule をすべて override で `off` に設定（LP は #310 完了まで対象外）
- [x] 2.6 `apps/admin/.eslintrc.cjs` / `apps/reservation/.eslintrc.cjs` を作成し、ルート config を継承 + alias 設定（`@/` → `src/`）
- [x] 2.7 ローカルで `pnpm -r lint` を実行し、検出された error 件数と内訳を記録

## 3. stylelint 設定追加

- [x] 3.1 ルートに `.stylelintrc.cjs` を追加: `stylelint-config-standard` + `stylelint-config-recommended-vue` + Vue SFC syntax
- [x] 3.2 custom rule で `.vue` 内 `<style>` ブロックの生 `px` / `rem` 数値（0 と 100% 等の dimensionless を除く）と生 hex/rgb カラーを warning 検知
- [x] 3.3 `apps/admin` / `apps/reservation` の `package.json` に `stylelint` script (`stylelint "src/**/*.vue"`) を追加
- [x] 3.4 stylelint を `apps/lp` 対象外として設定（`ignoreFiles` で `apps/lp/**` を除外）

## 4. dependency-cruiser 設定追加

- [x] 4.1 ルートに `dependency-cruiser.config.js` を追加: FSD レイヤー方向ルールを `forbidden` セクションで定義
- [x] 4.2 `apps/lp` は対象外として `exclude` 設定
- [x] 4.3 ルート `package.json` に `depcruise` script (`depcruise apps/admin/src apps/reservation/src --config dependency-cruiser.config.js`) を追加
- [x] 4.4 ローカルで `pnpm depcruise` を実行し違反件数を記録

## 5. 静的検査 script の実装

- [x] 5.1 `scripts/static-checks/` ディレクトリ作成
- [x] 5.2 `scripts/static-checks/grep-service-role.sh` 作成（`apps/*/src/` を grep し `service_role` 出現で非ゼロ終了、`supabase/functions/` は対象外）
- [x] 5.3 `scripts/static-checks/migrations/check-rls.sh` 作成（新規 migration の `create table` + RLS + policy 存在を検査、`migrations-allowlist.txt` で除外）
- [x] 5.4 `scripts/static-checks/migrations/check-my-number.sh` 作成（`my_number` / `個人番号` 等の名前パターンを持つ text 列を fail 検出、`identity_documents.image_path` 等は対象外）
- [x] 5.5 `scripts/static-checks/migrations/check-rollback-comment.sh` 作成（`-- ROLLBACK:` コメント存在を warning）
- [x] 5.6 `scripts/static-checks/grep-4state-tests.sh` 作成（新規 `.vue` に対応 spec の有無と 4 状態 grep、warning 出力）
- [x] 5.7 `scripts/static-checks/count-e2e-files.sh` 作成（`apps/*/e2e/*.e2e.ts` を機能 prefix で集計、3 件以上で warning）
- [x] 5.8 `scripts/static-checks/migrations-allowlist.txt` を作成し、本 change マージ時点で既存の `supabase/migrations/*.sql` 全ファイル名を列挙

## 6. vitest coverage threshold 設定

- [x] 6.1 `apps/admin/vitest.config.ts` `apps/reservation/vitest.config.ts` に `coverage` セクションを追加（provider: v8, reporter: text + html + json-summary）
- [x] 6.2 Step 1.1 の実測値を元に初期 threshold を設定（実測値 -10% を初期値、最低でも lines 50% / branches 40% / functions 50%）
- [x] 6.3 `packages/shared` の vitest config にも同様の coverage 設定追加
- [x] 6.4 ローカルで `pnpm -r test:coverage` を実行し threshold 達成を確認

## 7. CI ワークフロー拡張

- [x] 7.1 `.github/workflows/ci.yml` の `lint` job を `pnpm -r lint` に変更し、全アプリ対象化
- [x] 7.2 `.github/workflows/ci.yml` に `static-checks` job を追加（needs: install）: `grep-service-role.sh` / `depcruise` / `stylelint` / `grep-4state-tests.sh` / `count-e2e-files.sh` を step として実行
- [x] 7.3 `.github/workflows/ci.yml` に `migration-safety` job を追加（needs: install、paths-filter で `supabase/migrations/**` 変更時のみ起動）: `check-rls.sh` / `check-my-number.sh` / `check-rollback-comment.sh` を step として実行
- [x] 7.4 `.github/workflows/ci.yml` の `test` job を `pnpm -r test:coverage` に変更し、coverage report を `actions/upload-artifact` で 14 日保存 + job summary に出力
- [x] 7.5 warning は `::warning::` annotation で出力するよう各 script を調整（GitHub Actions 上で見やすくする）

## 8. 既存コード lint error 解消

- [x] 8.1 `pnpm -r lint` で検出された ESLint error を順に修正（FSD boundaries / no-restricted-imports / service_role 違反）
- [x] 8.2 `pnpm depcruise` で検出された依存方向違反を修正
- [x] 8.3 stylelint warning は本 change では error 昇格せず、件数記録のみで先送り（別 Issue で扱う）
- [x] 8.4 `pnpm -r test:coverage` で threshold 未達があれば Apply 中に threshold 値を実測 -10% に再調整
- [x] 8.5 全 app で `pnpm -r lint` / `pnpm depcruise` / `pnpm -r test:coverage` がローカルで pass することを確認

## 9. ドキュメント更新

- [x] 9.1 `CLAUDE.md` Pillar 2 / 4 に「機械検知の責務は ESLint / stylelint / dependency-cruiser / CI script で固定化」「意味理解が必要な部分はレム self-check 責務」を明記
- [x] 9.2 `CLAUDE.md` に「migration-safety allowlist 追加時は PR コメントで理由必須」のルール追記
- [x] 9.3 `openspec/project.md` の「ESLint で境界自動検証」記述を実装と整合化（具体的に `eslint-plugin-boundaries` 採用と明記）
- [x] 9.4 `docs/03-アーキテクチャ/04-開発・コーディング規約.md` に boundaries / no-restricted-imports / stylelint / dependency-cruiser 設定の概要と例外運用を追記
- [x] 9.5 `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` に「新規 migration の RLS は CI で機械検知」明記
- [x] 9.6 `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` に「マイナンバー text 列禁止は CI で機械検知」明記
- [x] 9.7 `docs/07-テスト/01-テスト戦略・方針.md` に「coverage threshold / 4 状態テスト存在 / E2E 件数」の CI 連携節を追加

## 10. 最終確認

- [x] 10.1 `pnpm -r lint` / `pnpm depcruise` / `pnpm -r stylelint` / `pnpm -r test:coverage` がすべてローカルで pass
- [x] 10.2 `act` または PR ドラフトで CI 全 job 緑を確認（typecheck / lint / test / build / e2e / static-checks）
- [x] 10.3 `openspec validate mechanize-rule-violation-detection` が pass
- [x] 10.4 PR description に Test plan として「ローカル lint / coverage 結果」「CI 緑のスクリーンショット or run URL」「stylelint warning 件数」「coverage threshold 初期値の根拠」を記載
- [x] 10.5 follow-up Issue を起票（stylelint warning の error 昇格 / coverage threshold 引き上げ計画）
