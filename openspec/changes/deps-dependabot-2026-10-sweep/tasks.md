## 1. 現状の実測固定（着手前のベースライン）

- [x] 1.1 `pnpm why -r handlebars fast-uri browserslist js-yaml brace-expansion baseline-browser-mapping postcss-selector-parser` で各パッケージの現行版と親経路を記録（handlebars←eslint-plugin-boundaries / fast-uri←stylelint→table→ajv / browserslist←autoprefixer / js-yaml←eslint・stylelint / brace-expansion←minimatch←eslint / baseline-browser-mapping←browserslist / postcss-selector-parser←eslint-plugin-vue・tailwindcss）
- [x] 1.2 各パッケージの最新 patched を Dependabot / advisory で確認し firstPatched をメモ（handlebars 4.7.10 / fast-uri 3.1.6 / browserslist 4.28.7 / js-yaml 4.3.2 / brace-expansion 1.1.21・2.1.7 / baseline-browser-mapping 2.11.0 / postcss-selector-parser 6.1.3・7.1.3）

## 2. 親更新で解消できるものを優先

- [x] 2.1 browserslist / baseline-browser-mapping / postcss-selector-parser について、親（autoprefixer / browserslist / eslint-plugin-vue / tailwindcss）の更新だけで patched に上がるか `pnpm update -r --latest` の dry-run 相当で確認。上がるものは親の devDependencies を更新する
- [x] 2.2 親更新で上がらなかったパッケージを 3 で override 対象として確定する

## 3. pnpm.overrides の追加・下限引き上げ（ルート package.json）

- [x] 3.1 handlebars: `>=4.7.10 <5` を override に新規追加（親 eslint-plugin-boundaries が 4.7.9 系に固定のため）
- [x] 3.2 既存 override の下限引き上げ: `fast-uri` を `>=3.1.5 <4` → `>=3.1.6 <4` / `js-yaml` を `>=4.3.1 <5` → `>=4.3.2 <5`。range 構造（上限メジャー境界）は変えない
- [x] 3.3 既存 brace-expansion override の下限引き上げ: `brace-expansion@1` を `>=1.1.16 <2` → `>=1.1.21 <2` / `brace-expansion@2` を `>=2.1.2 <3` → `>=2.1.7 <3`（`@5` 系 `>=5.0.9 <6` は現行 advisory 範囲外なら据え置き、範囲に該当するなら最新 patched へ）
- [x] 3.4 2.1 で親更新できなかった browserslist / baseline-browser-mapping / postcss-selector-parser を必要分だけ override に追加（`>=<patched> <<next-major>`。postcss-selector-parser は 6.x / 7.x 併存のため系統別セレクタで両系統を patched に寄せる）
- [x] 3.5 `pnpm install` を実行し `pnpm-lock.yaml` を更新

## 4. 解消の実測確認

- [x] 4.1 `pnpm why -r handlebars fast-uri browserslist js-yaml brace-expansion baseline-browser-mapping postcss-selector-parser` を再実行し、全経路が patched 版に解決され脆弱版が解決木から消えたことを確認
- [x] 4.2 `pnpm audit` を実行し、Issue #378 対象の Critical / High / Medium / Low が消えていることを確認（vitest 連鎖＝tinypool / @vitest/mocker 等は #318 スコープのため残存して可）

## 5. 回帰確認（全タスク完了後に一括）

- [x] 5.1 `pnpm lint` / `pnpm stylelint` / `pnpm depcruise` を実行し緑を確認（lint 0 errors / stylelint clean / depcruise 0 errors。既存の警告=admin no-unused-vars 8件・no-orphans 12件[#313] は本変更と無関係）
- [x] 5.2 全テストを `pnpm -r test` で実行し緑を確認（ルートに vitest 設定が無く、各アプリが自前の jsdom 設定で走るため `pnpm exec vitest run` では不可。CI も `pnpm -r --if-present test:coverage`）。admin 111 / reservation 92 / lp 10 / shared 12 / ui 5 / court-crawler 10 / supabase-functions 10 / design-tokens 1 / tailwind-preset 1 ファイル全 passed
- [x] 5.3 `pnpm build`（lp / admin / reservation）がすべて成功することを確認

## 6. 着手後に判明したスコープ（この PR での確定事項）

- [x] 6.1 brace-expansion `@5` は Issue 想定の 5.0.9 では不足（新 advisory で vuln `<5.0.12`）→ `@5` 下限を `>=5.0.12 <6` へ引き上げ
- [x] 6.2 postcss-selector-parser は 7.x を `>=7.1.6 <8` で解消。6.x（eslint-plugin-vue@9 が `^6.0.15` 固定、修正版は 7.1.6 のみで 6 系に無い）は本 PR で解消不可 → #317「eslint-plugin-vue 10 更新」へ委譲
- [x] 6.3 audit が Issue 未列挙の脆弱性を検出。同一メジャー・dev 依存・低リスクの nanoid`@3`（`>=3.3.18 <4`）/ colord（`>=2.9.4 <3`）/ source-map-js（`>=1.2.2 <2`）を本 PR に畳み込み（翔太郎くん承認済み）
- [x] 6.4 残存は追跡可能な行き先へ: tinypool(Critical) / @vitest/mocker / vitest → #318、postcss-selector-parser 6.x → #317、@vue/server-renderer（実行時・vue 本体連動）→ 別 Issue、braces（upstream に修正版なし）→ upstream 待ち。別 Issue 起票を ship 後に行う
