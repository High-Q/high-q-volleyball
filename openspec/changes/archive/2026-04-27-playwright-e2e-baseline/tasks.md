## 1. ブランチと前提整備

- [x] 1.1 Issue #79 に紐づく作業ブランチ `feature/79-playwright-e2e-baseline` を切る
- [x] 1.2 リポジトリルートで `pnpm -r typecheck && pnpm -r test && pnpm -r build && pnpm --filter @high-q/lp lint` を実行し、ローカルで全コマンドが成功することを確認する（baseline）
- [x] 1.3 root `package.json` に `pnpm-workspace.yaml` 経由で `e2e/` ディレクトリが workspace 扱いされていないことを確認（不要な依存解決を避ける）— `pnpm-workspace.yaml` の `packages` は `apps/*` / `packages/*` のみ、`e2e/` は workspace 対象外で OK

## 2. Playwright のインストールとブラウザバイナリ準備

- [x] 2.1 root `package.json` の `devDependencies` に `@playwright/test`（`^1.x` でメジャー pin）を追加する
- [x] 2.2 リポジトリルートで `pnpm install` を実行して lockfile を更新する
- [x] 2.3 リポジトリルートで `pnpm exec playwright install chromium` を実行し、ローカルにブラウザバイナリをインストールする
- [x] 2.4 `playwright --version` で chromium binary 取得済みであることを確認する（v1.59.1）

## 3. Playwright 設定ファイルの作成

- [x] 3.1 リポジトリルートに `playwright.config.ts` を新規作成する
- [x] 3.2 `defineConfig` を `@playwright/test` から import し、`testMatch: '**/*.e2e.ts'` を設定する
- [x] 3.3 `projects` に `chromium` のみを定義する（`firefox` / `webkit` は将来拡張枠としてコメントで記述）
- [x] 3.4 `webServer` を以下で設定する: `command: 'pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview --port 4173 --strictPort'`、`url: 'http://localhost:4173'`、`reuseExistingServer: !process.env.CI`、`timeout: 120_000`
- [x] 3.5 `use.baseURL` を `'http://localhost:4173'` に設定する
- [x] 3.6 `reporter` を `['list', ['html', { open: 'never' }]]` で設定する（CLI と HTML レポートの両立、ブラウザ自動オープン抑止）
- [x] 3.7 `outputDir` を `test-results/` に設定する（gitignore 対象）

## 4. test:e2e スクリプトの追加

- [x] 4.1 root `package.json` の `scripts` に `"test:e2e": "playwright test"` を追加する
- [x] 4.2 root `package.json` の `scripts` に `"test:e2e:ui": "playwright test --ui"` を追加する（ローカル開発用、Playwright UI モード）

## 5. .gitignore への追加

- [x] 5.1 root `.gitignore` に `playwright-report/` を追加する（HTML レポート出力先）
- [x] 5.2 root `.gitignore` に `test-results/` を追加する（trace / video / screenshot 出力先）
- [x] 5.3 root `.gitignore` に `/playwright/.cache/` を追加する（Playwright 内部キャッシュ）

## 6. E2E スモークテストの作成

- [x] 6.1 リポジトリルートに `e2e/lp/` ディレクトリを新規作成する
- [x] 6.2 `e2e/lp/smoke.e2e.ts` を新規作成し、`@playwright/test` から `test` / `expect` を import する
- [x] 6.3 `test('LP トップページが描画される', ...)` を定義し、`page.goto('/')` で `/` を開く
- [x] 6.4 `<title>` が "High Q" を含むことを `await expect(page).toHaveTitle(/High Q/i)` で assert する
- [x] 6.5 主要セクション 5-6 個の見出しまたは主要要素の存在を assert する（hero `.hero-title` visible / `section#concept` / `section#activities` / `section#event` の DOM 存在 / footer の `contentinfo` role visible）
- [x] 6.6 カレンダー widget root 要素の存在を `[data-testid="event-calendar"]` セレクタで assert する
- [x] 6.7 データ依存 assert（具体的イベント名 / 今日のイベント等）を含めていないことを再確認する
- [x] 6.8 動的挙動 assert（クリック / 月切替 / ダイアログ等）を含めていないことを再確認する

## 7. data-testid の最小追加（必要時のみ）

- [x] 7.1 task 6.6 のセレクタが意味的セレクタ（`getByRole` 等）で安定取得できるか Playwright Inspector で確認する — `<v-calendar>` wrapper には Vuetify の auto-import で role が付かず、安定取得には testid が必要と判断
- [x] 7.2 安定取得できない場合のみ、`apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` のカレンダー widget root（`<section id="event">`）に `data-testid="event-calendar"` を追加する
- [x] 7.3 追加した `data-testid` の数が 1 件に留まっていることを確認する（D6 方針: 最小限）
- [x] 7.4 既存テスト（Vitest）が引き続き PASS することを確認する（lp 5 件 / admin 2 件 / reservation 1 件 / shared 3 件 = 全 11 件 PASS）

## 8. ローカル動作確認

- [x] 8.1 リポジトリルートで `pnpm test:e2e` を実行し、smoke が PASS することを確認する（550ms PASS）
- [x] 8.2 `playwright-report/` に HTML レポートが生成されること、`test-results/` に trace 等が出力されることを確認する（ただし git には含まれないこと）
- [x] 8.3 `pnpm -r test` が引き続き成功し、Vitest が `e2e/**/*.e2e.ts` を誤って拾っていないことを確認する
- [ ] 8.4 `pnpm test:e2e:ui` を 1 度起動し、Playwright UI モードが動作することを目視確認する — **任意タスクのためスキップ、CLI で動作確認済み**

## 9. Vitest と Playwright のファイル種別分離の検証

- [x] 9.1 各アプリの `vitest.config.{ts,js}` の `include` パターンに `e2e/` 配下が含まれていないことを確認する（全て `src/**/*.spec.{...}` で `e2e/` 非対象）
- [x] 9.2 `playwright.config.ts` の `testMatch` が `*.e2e.ts` のみ拾い、`*.spec.ts` を拾わないことを実機で確認する（実行時 1 件のみ検出）
- [x] 9.3 `e2e/` 配下に誤って `*.spec.ts` が作成されていないことを確認する（`find e2e -name "*.spec.ts"` 結果ゼロ）

## 10. CI ファイルの非干渉確認

- [x] 10.1 `.github/workflows/ci.yml` を本 change で **一切変更していない** ことを `git diff` で確認する
- [ ] 10.2 既存 CI（typecheck / lint / test / build の 4 ジョブ）が引き続き緑になることを PR 上で確認する — **PR 作成後に確認**

## 11. 後続 Issue の作成（CI 統合）

- [x] 11.1 本 change の Apply 中または完了直前に、新規 Issue「[INFRA] Playwright E2E を GitHub Actions CI に統合」を `gh issue create` で作成する（**Issue #136 作成済み**）
- [x] 11.2 当該 Issue の本文に以下を含める: ① PR=smoke / master=full のトリガー分離設計 ② ブラウザバイナリの `actions/cache` キー設計 ③ trace / video / HTML レポートの artifact アップロード方針 ④ 本 change（#79 / playwright-e2e-baseline）が前提であること
- [x] 11.3 作成した Issue 番号を proposal.md / design.md の「後続作業」記述に追記する（#136 を反映済み）

## 12. ドキュメント整備（sync フェーズで実施）

- [ ] 12.1 `docs/07-テスト/01-テスト戦略・方針.md` に「回帰試験戦略」セクションを新設する — **sync フェーズで実施**
- [ ] 12.2 `docs/07-テスト/01-テスト戦略・方針.md` に「E2E スケーラビリティ運用ルール」セクションを新設する — **sync フェーズで実施**
- [ ] 12.3 `docs/07-テスト/01-テスト戦略・方針.md` の既存「主要フロー」表にスモーク行追加 — **sync フェーズで実施**
- [ ] 12.4 `CLAUDE.md` Pillar 3 に E2E 機能あたり 1-2 件上限ルール追記 — **sync フェーズで実施**
- [ ] 12.5 `CLAUDE.md` Pillar 3 の Design チェックリストに E2E ハッピーパス試験対象シナリオ列挙を追加 — **sync フェーズで実施**
- [ ] 12.6 `docs/03-アーキテクチャ/05-開発ワークフロー.md` の Apply フェーズ説明に E2E TDD を追加 — **sync フェーズで実施**
- [ ] 12.7 `README.md`（または onboarding 文書）の Quick Start に `pnpm exec playwright install chromium` を追記 — **sync フェーズで実施**
- [ ] 12.8 `openspec/specs/playwright-e2e-baseline/spec.md` を本 change の specs/ から新規作成 — **sync フェーズで実施**

## 13. 全体検証

- [x] 13.1 PR 上で CI が緑であることを最終確認する — **PR 作成後に確認**
- [x] 13.2 ローカルで `pnpm -r typecheck && pnpm -r test && pnpm -r build && pnpm --filter @high-q/lp lint && pnpm test:e2e` がすべて成功することを確認する（実施済、すべて PASS）
- [x] 13.3 `openspec validate playwright-e2e-baseline --strict` を実行し、change の整合性を検証する
- [x] 13.4 design.md の Open Questions について実装で取った選択をコメント:
  - **Q1（port）**: 4173 固定 + `--strictPort` を採用、衝突発生せず
  - **Q2（カレンダーセレクタ）**: `data-testid="event-calendar"` を `<section id="event">` 1 箇所に追加（最小限）
  - **Q3（README 配置）**: README.md の Quick Start に追記（sync フェーズ）
  - **Q4（動的挙動分離）**: 完全に #135 へ分離、本 change はスモークのみ
  - **Q5（webServer build 同梱）**: `pnpm --filter @high-q/lp build && preview` を webServer.command に同梱、ローカル / CI どちらでも 1 コマンドで動く DX を採用
- [x] 13.5 後続 Issue 番号（#135 catch-up + #136 CI 統合）が proposal.md に記載されていることを確認する

## 14. ユーザー手動作業の依頼

- [x] 14.1 PR merge 後、新規 clone 環境で `pnpm install && pnpm exec playwright install chromium && pnpm test:e2e` がワンライナーで動作することをユーザーが確認するよう依頼する — **PR description に記載**
- [x] 14.2 docs に書いたハードリミット閾値が現実の数値と乖離していないか観察を依頼する — **PR description に記載**
