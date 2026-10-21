## Why

2026-10-19 時点で Dependabot が open アラートを 25 件（Critical 1 / High 7 / Medium 15 / Low 2）報告している。全件が開発ツールチェーン（lint / stylelint / ビルド）経由の依存で本番バンドルには乗らないが、Critical（handlebars の JavaScript インジェクション）と High（SSRF・DoS 等）を放置すると CI の安全性と監査上の信頼性が下がる。親パッケージ更新と override の下限引き上げで解消できる低リスク作業のため、まとめて片付ける。

## What Changes

- 脆弱性を含む 7 パッケージ（handlebars / fast-uri / browserslist / js-yaml / brace-expansion / baseline-browser-mapping / postcss-selector-parser）を patched 版へ引き上げる
- 可能なものは親パッケージ更新で解消し、間接依存で親更新だけでは上がらないものだけ `pnpm.overrides` を使う
- 既存 override のうち下限が古く脆弱版を許容してしまっているもの（fast-uri / js-yaml / brace-expansion）は下限を最新 patched へ引き上げる
- アプリの実行時依存・公開 API・DB・UI には変更なし（spec レベルの振る舞い変更なし）

## Capabilities

### New Capabilities
<!-- なし: 依存更新のみで新規 capability は発生しない -->

### Modified Capabilities
- `monorepo-workspace`: 「孫依存のセキュリティ脆弱性はルートの依存解決オーバーライドで解消する」要件に、override 下限を advisory の firstPatched 以上に据える規範（既存 override の下限引き上げ含む）を追記。#361→#366 の退行教訓を spec に明文化する

## Impact

- **変更ファイル**: ルート `package.json`（`pnpm.overrides` / devDependencies）/ `pnpm-lock.yaml`
- **影響アプリ**: lp / admin / reservation の実行時バンドルには影響なし（全件 dev 依存）
- **検証対象**: `pnpm lint` / `pnpm stylelint` / `pnpm depcruise` / `pnpm -r test` / 3 アプリの `pnpm build`
- **着手後に畳み込んだ追加解消**（同一メジャー・dev 依存・低リスク、翔太郎くん承認）: nanoid`@3` / colord / source-map-js
- **スコープ外（別の行き先）**: vitest 連鎖（@vitest/mocker / tinypool / vitest）→ #318 / postcss-selector-parser 6.x（6 系に修正版なし、eslint-plugin-vue 10 更新で解消）→ #317 / @vue/server-renderer（実行時・vue 本体連動）→ 別 Issue / braces（upstream に修正版なし）→ upstream 待ち
- **関連 Issue**: #378（Epic #166「共通基盤を整える」）
