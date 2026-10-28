## 1. クラスタ B: vite パッチ更新（high 1 + moderate 3 + low 1）

- [x] 1.1 vite 直接依存を持つワークスペースを `grep -rl '"vite"' apps/*/package.json packages/*/package.json` で特定し、各 `vite` devDependency を 6 系最新パッチ（`^6.4.5` 系、`npm view vite@6 version` で確定）へ更新 — admin / lp / reservation / packages/ui の 4 つを `^6.4.3`→`^6.4.5`
- [x] 1.2 `pnpm install` を実行し `pnpm-lock.yaml` を更新。`pnpm why -r vite` で全インスタンス（apps 直接 + `vitest>vite` transitive + `court-crawler`）が 6.4.5 系に揃い `<=6.4.3` が消えていることを確認。孤立インスタンスが残る場合のみ最小 override を検討（design の「vite transitive 解決の取りこぼし」参照） — 全インスタンス `vite@6.4.5` に収束、孤立なし（override 不要）
- [x] 1.3 `pnpm audit` で vite 起因の high/moderate/low（launch-editor 連鎖含む）が消えたことを確認。このクラスタ単位で 1 コミット — 23→13 件（high 2 + moderate 6 + low 2 消滅）

## 2. クラスタ C: fast-uri override 下限引き上げ（moderate 2 + low 2）

- [x] 2.1 ルート `package.json` の `pnpm.overrides["fast-uri"]` を `>=3.1.6 <4` から下限のみ `>=3.1.9 <4` へ引き上げ（firstPatched `3.1.9`、range 構造・上限境界は不変）
- [x] 2.2 `pnpm install` → `pnpm why -r fast-uri` で `<3.1.9` が解決木から消えたことを確認 — `fast-uri@3.1.9` に収束

## 3. クラスタ D: postcss-selector-parser@6 override 追加（moderate 1）

- [x] 3.1 脆弱な 6.x インスタンスの親を `pnpm why -r postcss-selector-parser` で特定。ルート `pnpm.overrides` に `"postcss-selector-parser@6": ">=6.1.5 <7"` を追加（既存 `@7` セレクタは不変。`npm view postcss-selector-parser@6 version` で 6.1.5 以上の実在を確認） — 脆弱版 6.1.4 を確認、6.1.5 を追加
- [x] 3.2 `pnpm install` → `pnpm why -r postcss-selector-parser` で `<6.1.5` が消えたことを確認 — 6.1.4→6.1.5、@7 系は 7.1.6 のまま不変

## 4. 中間検証（クラスタ B/C/D）

- [x] 4.1 `pnpm -r test` 全ワークスペース緑（ルート直 vitest は不可。各 workspace スクリプト経由）／`pnpm -r --if-present typecheck` 緑／`pnpm -r lint` 緑 — すべて exit 0（admin 1025 / reservation 842 / lp 62 他 passed）
- [x] 4.2 `pnpm audit` で残件がクラスタ A（tinypool / @vitest/mocker / vitest）のみになったことを確認。ここまでをコミットし、A が詰まっても切り離せる状態を確保 — 残件 8（critical 2 + moderate 6）すべて vitest 系

## 5. クラスタ A: vitest メジャー更新（critical 2 + moderate 3）

- [ ] 5.1 vitest 系を使う全ワークスペース（lp / admin / reservation / court-crawler / shared）の `vitest` / `@vitest/coverage-v8` /（使用していれば）`@vitest/ui` を同一メジャー 4 系（現時点 `4.1.12`、`@vitest/mocker` firstPatched `4.1.11` 以上）へ揃える。旧メジャー併存を残さない
- [ ] 5.2 `pnpm install` 後、vitest 3→4 の破壊的変更へ各 `vitest.config.{ts,js}` を設定 API 追随のみで対応（`environment: "jsdom"` / `globals: false` / `include: src/**/*.spec.{ts,tsx,js,jsx}` / coverage provider 設定を等価維持）。`packages/shared/vitest.config.ts` は vitest-baseline spec に従い挙動等価を維持（環境は `node`）
- [ ] 5.3 `pnpm why -r tinypool` で `<2.1.2` が消滅（vitest 4 同梱の patched 版に解決）、`pnpm why -r vitest @vitest/mocker` で `<4.1.11` が消滅していることを確認
- [ ] 5.4 coverage threshold ポリシー（lines/branches/functions 下限）は現行値を維持（引き上げは #312）。coverage-v8 4 系で計測が緑であることを確認。このクラスタ単位で 1 コミット

## 6. 最終確認

- [ ] 6.1 `pnpm audit` で該当 23 件が **0 件**であることを確認（critical/high/moderate/low すべて）
- [ ] 6.2 `pnpm -r test`（全ワークスペース緑）／`pnpm -r --if-present test:coverage`（threshold 達成）／`pnpm -r --if-present typecheck`／`pnpm -r lint`／全アプリ `pnpm build` 系が緑
- [ ] 6.3 #383（braces）が現 audit に出ていないことを再確認し、PR 本文で close 候補として言及。#318（vitest メジャー）を本 change で消化した旨を PR で明示
- [ ] 6.4 CI 全ジョブ緑を `gh pr checks --watch` で確認（レム責務）。ローカル動作確認は dev 依存のみの変更のため不要だが、admin/reservation/lp の `pnpm build` が通ることをもって代替確認とする
