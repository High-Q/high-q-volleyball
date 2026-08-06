## 1. 事前確認（baseline の固定）

- [x] 1.1 `git status` がクリーンで、`#360` がマージ済み（`pnpm.overrides` に transitive 群が入っている）ことを確認する。overrides 7 項目（form-data / fast-uri / js-yaml / tar / immutable / js-cookie / brace-expansion@5）確認
- [x] 1.2 現行版を lockfile で固定記録: `vite` **5.4.21** / `vitest` **2.1.9** / `@vitest/coverage-v8` **2.1.9** / `@vitest/mocker` **2.1.9** / `@vitejs/plugin-vue` **5.2.4**（既に vite 6 peer 下限 5.2.0 を満たす）/ `esbuild` **0.21.5**（vite peer）+ **0.28.1**（tsx）/ `sass` 1.69.7（transitive）
- [x] 1.3 baseline 取得: `pnpm -r test` 緑（ui 33 / lp 62 / reservation 845 / admin 1025 + shared・design-tokens・tailwind-preset pass、FAIL 0）。build/typecheck は master CI 緑を継承
- [x] 1.4 本変更で解消を狙うアラート: vitest critical ×9（#151-159）/ vite high・medium 各件 / esbuild #136（#360 PR「#361 へ委譲」一覧を正とする）

## 2. 版指定の更新（package.json 群 — 全対象を同一メジャーへ）

対象は vite を持つ 4 パッケージ（`apps/lp` / `apps/admin` / `apps/reservation` / `packages/ui`）と、vitest を持つ 7 パッケージ（上記 4 + `packages/shared` / `packages/design-tokens` / `packages/tailwind-preset`）+ ルート。**版混在を残さない**（design D1）。

- [x] 2.1 `vite` を `^6.4.3` へ: `apps/lp`（dependencies）/ `apps/admin`・`apps/reservation`（dependencies）/ `packages/ui`（devDependencies）
- [x] 2.2 `@vitejs/plugin-vue` を `^5.2.0` へ: 同上 4 パッケージ（現行 5.2.4 が既に vite 6 peer を満たすが宣言レンジを明示化）。install 後の peer 警告は 3.2 で確認
- [x] 2.3 `vitest` を `^3.2.7`（3.x 最新）へ: vitest を持つ 7 パッケージすべて
- [x] 2.4 `@vitest/coverage-v8` を `^3.2.7` へ: `apps/admin` / `apps/reservation` / `packages/shared` / ルート `package.json`
- [x] 2.5 `@vitest/mocker` は vitest の内部依存のため直接指定はしない。lockfile で **3.2.7** に解決されることを確認
- [x] 2.6 `@vue/test-utils` / `jsdom` / `msw` は peer 警告なし → 触らない
- [x] 2.7 **（追加）**`supabase/functions`（`@high-q/edge-functions`・9 個目のワークスペース）も `vitest` を `^3.2.7` へ。当初の 7 パッケージ列挙から漏れていたが、vitest 2 が vite 5 を引き版混在（design D1 違反）を起こすため対象に含めた

## 3. install と peer 解決

- [x] 3.1 `pnpm install` 実行。esbuild **0.25.12** バイナリ postinstall 正常完走
- [x] 3.2 peer 警告なし（`@vitejs/plugin-vue` 5.2.4 × vite 6 / `@vitest/coverage-v8` 3.2.7 × vitest 3 とも整合）
- [x] 3.3 lockfile 目視確認: `vite` **6.4.3** のみ / `vitest` **3.2.7** のみ / `vite-node` 3.2.4 / `@vitest/coverage-v8` 3.2.7 / `@vitest/mocker` 3.2.7 / `esbuild` **0.25.12**（vite）+ 0.28.1（tsx）。**esbuild 0.21.5 消失（#136 解消）**・vite5/vitest2 の残存なし（版混在ゼロ）

## 4. 設定追随（破壊的変更 — 1 パッケージずつ緑にしてから次へ）

各 config は標準構成（`globals: false` / `environment` / `include` / `setupFiles` / `coverage`=v8 / alias）に収まっており、追随は限定的な見込み（design 前提）。**挙動は等価維持**（design D2）。

- [x] 4.1 `apps/lp`: build 緑（vite 6.4.3・`manualChunks`/`strictPort`/`envDir` 維持、vendor-vue/supabase 正常分割）/ test 緑（10 files 62 tests）。**config 変更不要**
- [x] 4.2 `packages/ui`（33）/ `shared`（118+11 todo）/ `design-tokens`（13）/ `tailwind-preset`（8）/ `edge-functions`（162）すべて test 緑。**config 変更不要**
- [x] 4.3 `apps/admin`: build 緑（chunk サイズ advisory は既存・manualChunks 未設定由来で回帰でない）/ test 緑（111 files 1025 tests、coverage 閾値 pass・`testTimeout` 10s 維持）。**config 変更不要**
- [x] 4.4 `apps/reservation`: build 緑 / test 緑（92 files 845 tests、coverage 閾値 pass）。**config 変更不要**
- [x] 4.5 新メジャーの API 変更によるテスト破損は**発生せず**。全 config が標準構成（`globals`/`environment`/`include`/`setupFiles`/`coverage`=v8/alias）に収まり vite 6 / vitest 3 がそのまま受理。テストコード・config とも一切書き換えなし（挙動等価を完全維持）

## 5. #360 オーバーライドの掃除（冗長化した分のみ）

- [x] 5.1 全 override 一時撤去 → `pnpm install` の空振り検証で各 target の自然解決版を実測。form-data 4.0.6 / fast-uri 3.1.4 / js-yaml 4.3.0 / immutable 4.3.9 / js-cookie 3.0.8 / brace-expansion@5 5.0.8 は override 無しでも patched floor 以上（冗長）。**tar のみ 7.5.13 へ退行（脆弱 ≤7.5.15）**
- [x] 5.2 冗長 6 件（form-data / fast-uri / js-yaml / immutable / js-cookie / brace-expansion@5）を削除。最終 `pnpm.overrides` は **`tar: ">=7.5.16 <8"` の 1 件のみ**。install 後 lockfile で全 7 target が patched-safe（tar 7.5.22 / 他 6 件も floor 以上）を再確認、アラート復活なし
- [x] 5.3 `tar` は override 無しで脆弱版へ退行するため**残した**。掃除は本変更のアラート解消一覧と矛盾せず（tar #— は引き続き override で解消、他 6 経路は自然解決で安全）

## 6. 検証（受け入れ条件）

- [x] 6.1 `pnpm build:lp` 緑（1.14s）
- [x] 6.2 admin build 緑（1.94s）/ reservation build 緑（1.69s）
- [x] 6.3 `pnpm -r test` 全緑: edge-functions 162 / shared 118(+11 todo) / tailwind-preset 8 / ui 33 / lp 62 / reservation 845 / admin 1025 / design-tokens 13。**baseline 完全一致**（正規実行 `-r`）
- [x] 6.4 `pnpm -r typecheck` 全 8 プロジェクト Done
- [x] 6.5 eslint **0 errors**（既存の unused-var warning のみ・本変更のソース未変更で無関係）/ stylelint Done
- [x] 6.6 CI 全ジョブ緑（PR #364）: install / build / test(2m24s) / typecheck / lint / static-checks / e2e / migration-safety / CodeQL / Analyze すべて pass

## 7. Render Preview と記録

- [ ] 7.1 ローカル動作確認（翔太郎くん）→ PR 作成後 Render Preview（lp / reservation）で初期表示・主要画面確認。admin は Render dev デプロイ無しのためローカル `dev` で代替
- [x] 7.2 vite 6 の manualChunks で vendor-vue / vendor-supabase / vendor-sentry の 3 チャンクが意図どおり生成されることを確認（lp dist/assets）
- [ ] 7.3 PR 本文に解消アラート（vitest critical ×9 #151-159 / vite high・medium / esbuild #136）と overrides 掃除（7→1、tar のみ残置）を明記（PR 作成時）
- [ ] 7.4 マージ後、対象由来の Dependabot アラート自動 close を確認（ship 時）
