## 1. ローカル準備（@smoke タグ付与とスクリプト追加）

- [x] 1.1 `e2e/lp/smoke.e2e.ts` の `test.describe` タイトルに `@smoke` を含めるよう修正（例: `'LP smoke @smoke'`）し、内容（assert）は変更しない
- [x] 1.2 ローカルで `pnpm exec playwright test --grep '@smoke'` を実行し、smoke のみが実行されることを確認
- [x] 1.3 ローカルで `pnpm exec playwright test --grep-invert '@smoke'` を実行し、smoke 以外が 0 件で正しくフィルタされることを確認
- [x] 1.4 root `package.json` の `scripts` に `"test:e2e:smoke": "playwright test --grep @smoke"` を追加
- [x] 1.5 ローカルで `pnpm test:e2e:smoke` を実行し、`@smoke` タグの test のみ実行され終了コード 0 で完了することを確認
- [x] 1.6 ローカルで `pnpm test:e2e` を実行し、smoke を含む全 E2E が動作することを確認（後続変更でデグレしていないか）

## 2. CI ワークフロー実装

- [x] 2.1 `.github/workflows/ci.yml` に `e2e` job を追加（`needs: install`、Node 22 + corepack enable + `pnpm install --frozen-lockfile` のセットアップは既存 4 job と同形）
- [x] 2.2 `e2e` job に Playwright ブラウザバイナリのキャッシュステップ（`actions/cache`）を追加。path: `~/.cache/ms-playwright`、key: `playwright-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}`、restore-keys: `playwright-${{ runner.os }}-`
- [x] 2.3 `e2e` job にキャッシュ miss 時の install ステップ `pnpm exec playwright install chromium --with-deps` を追加（cache hit 時はスキップする条件 or 常に実行で冪等任せ — Playwright は導入済みならスキップする挙動）
- [x] 2.4 `e2e` job に Playwright 実行ステップを追加。`if: github.event_name == 'pull_request'` で `pnpm test:e2e:smoke` を実行、`if: github.event_name == 'push'` で `pnpm test:e2e` を実行（条件付き 2 ステップ構成）
- [x] 2.5 `e2e` job に `actions/upload-artifact` ステップを追加。`if: failure() || cancelled()`、name: `playwright-report-${{ github.run_id }}`、path に `playwright-report/` と `test-results/` の双方を含める、`retention-days: 14`

## 3. ローカルでの CI ワークフロー検証

- [x] 3.1 `.github/workflows/ci.yml` を `actionlint`（GitHub の lint）または手元 YAML parser で構文検証
- [x] 3.2 既存 4 job（typecheck / lint / test / build）の構造に `e2e` job を「追加」しただけであり、既存 job のステップに改変が入っていないことを `git diff` で確認

## 4. PR 作成と CI 動作確認

- [x] 4.1 ブランチ `feature/136-playwright-e2e-ci-integration` を作成し、ここまでの変更をコミット
- [x] 4.2 PR を作成し、PR push トリガで `e2e` job が起動し `pnpm test:e2e:smoke` のみが実行されることを GitHub Actions のログで確認（PR #143、run 24986793721 で確認）
- [x] 4.3 e2e job が typecheck / lint / test / build と並列起動していること（同時刻スタート）を Actions UI で確認（install 09:18:17 完了 → 5 並列が 09:18:33-35 起動）
- [x] 4.4 ブラウザバイナリキャッシュが初回 miss → 2 回目 hit になることを確認（PR を 1 回更新 push して観察）— 2回目 run 24986935931 で `Cache hit for: playwright-Linux-<hash>` 確認、3回目 run 24987036217 で e2e wall time 60s → 52s に短縮
- [x] 4.5 試験的に smoke E2E をわざと失敗させ、`playwright-report/` と `test-results/` が artifact としてアップロードされ 14 日 retention であることを Actions UI で確認 → 確認後にロールバック commit（commit d43801e で意図的失敗、run 24986935931 で `name: playwright-report-24986935931`、`retention-days: 14` 確認、commit 603d47c でロールバック）

## 5. ハードリミット閾値の実測

- [x] 5.1 PR 上での `e2e` job の wall time を実測し、< 1 分目安に収まっていることを確認（実測値を PR 説明に記載）— run 24986793721: 60s（初回・cache miss）、run 24987036217: 52s（cache hit）。閾値 < 1 分は cache hit 後で達成、初回はギリ
- [x] 5.2 master push 想定の full 実行時間を、ローカル `pnpm test:e2e` の所要時間で代用測定し、< 5 分目安に収まっていることを記録（現状 smoke 1 件のみのため実質 smoke と同じ）— ローカル `pnpm test:e2e` 実測 3.0s（test 単体）、CI 上で smoke と同じ ~52-60s の見込み、< 5 分閾値に十分余裕

## 6. 最終確認とレビュー準備

- [x] 6.1 `pnpm -r typecheck && pnpm -r lint --if-present && pnpm -r test && pnpm -r build` をローカルで実行し、CI の他 4 job 相当が壊れていないことを確認
- [x] 6.2 `pnpm test:e2e:smoke` と `pnpm test:e2e` をローカルで最終実行し、双方終了コード 0 を確認
- [x] 6.3 `openspec validate playwright-e2e-ci-integration --strict` を実行し、spec / proposal / tasks の整合性を確認
- [x] 6.4 PR を ready for review にして翔太郎くんに承認依頼（PR #143、draft でなく初手から open）
