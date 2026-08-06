## Why

Dependabot に残るアラートの本丸は、バンドラ（vite）とテストランナー（vitest）本体のメジャー系統の古さに起因する。#360（孫依存の transitive オーバーライド）で潰せる分は解消済みで、残った critical（vitest UI サーバー経由の任意ファイル読取・実行 ×9）と high/medium（vite の dev サーバー系）は、いずれも本体をサポート対象のメジャー版へ引き上げないと安全に解消できない。#360 が「バンドラ peer に固定された孫依存はメジャー更新へ委譲する」と明示的に切り出した残りを、本変更で引き取る。本番会員サイトへの露出はないが、件数が多く本当に危険なアラートが埋もれるため、可視性回復のために計画的に解消する。

## What Changes

- 全ワークスペース（`apps/lp` / `apps/admin` / `apps/reservation` / `packages/ui` / `packages/shared` / `packages/design-tokens` / `packages/tailwind-preset` / ルート）のビルド・テストツールチェーンを、サポート対象のメジャー版へ引き上げる。**BREAKING**（メジャー更新：vite 5→6 / vitest 2→3）。
- バンドラのメジャー更新に追随して、Vue プラグイン等の peer 依存も対応版へ揃える。
- vite 6 が同梱するトランスパイラ新メジャーにより、#360 でスコープアウトした esbuild 系アラート（バンドラ peer 固定）が連動して解消する。
- vite / vitest 設定ファイルを新メジャーの破壊的変更に追随修正する（設定 API の変更点のみ。挙動は現状維持）。
- アプリケーションのランタイムコードは原則変更しない。テスト・ビルド・型・Lint・CI・Render Preview がすべて緑であることを受け入れ条件とする。

## Capabilities

### New Capabilities
（なし）

### Modified Capabilities
- `monorepo-workspace`: ビルド・テストツールチェーン本体を、破壊的変更を含むメジャー更新であってもサポート対象のメジャー版に追随させる保守方針を要件として追加する。全アプリのビルド・テスト・CI が緑であることを受け入れ条件とする点を含む。

## Impact

- 変更ファイル: 各アプリ／パッケージの `package.json`（vite / vitest / 関連 peer の版指定）、ルート `package.json`（テストカバレッジ計測ツールの版指定）、各 `vite.config.ts` / `vitest.config.ts`（破壊的変更への追随）、`pnpm-lock.yaml`。
- 影響レイヤー: 開発ツールチェーンのみ。本番配信バンドル・Edge Function ランタイムへの実行時影響なし（ただしバンドラ更新に伴い出力バンドルは再生成されるため、Render Preview での表示確認を受け入れ条件に含める）。
- 検証: 全アプリのビルド、`pnpm -r test`（パッケージ個別実行）による全テスト、`pnpm -r typecheck`、Lint、CI 全ジョブ、Render Preview（lp / reservation）がすべて緑であること。
- 関連: 先行 #360 が委譲した残存アラート（esbuild / vite / vitest 各件）を本変更で解消。#360 で追加した孫依存オーバーライドのうち、本体メジャー更新により冗長化したものは併せて掃除する。
