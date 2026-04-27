## Why

現在 Render にデプロイされているのは LP (`apps/lp`) のみ。Phase 1 のインフラ整備として「将来 3 アプリ (lp / admin / reservation) を Render Blueprint で運用する土台」を作る必要がある。

ただし、Issue #81 の元来の意図（「main マージで 3 アプリが自動デプロイされる」）について再検討した結果、**未完成の admin / reservation を商用環境に公開するセキュリティ・ガバナンス上のリスクを許容できない**と判断した。Render Static Site はデフォルトで完全公開されるため、認証ゲートのない admin の URL が世に出れば情報漏洩・将来の攻撃面拡大に直結する。

そのため本 change のスコープを「LP の Render 設定をモノレポ対応化 + 将来 3 サービスへ拡張するための雛形整備」に限定する。admin / reservation の実デプロイは認証ゲートと最低限の機能実装が揃った後の後続 Issue で扱う。

## What Changes

- `render.yaml` の LP の `buildCommand` をモノレポ対応 (`pnpm --filter @high-q/lp build`) に更新（既存の `pnpm build` から差し替え）
- `render.yaml` ファイル冒頭コメントを「将来 3 サービス対応の単一真実の源」として再構成
- admin / reservation の services 定義を**追加しない**。代わりに `render.yaml` 末尾にコメントブロックで「追加時の雛形 + チェックリスト」を保持
- ドキュメント (`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`) に：
  - 現状: LP のみデプロイ
  - 将来: admin / reservation 追加時の運用ルール（Blueprint mode / `name` 不変厳守 / sync:false 機密情報運用）
  - 「未完成アプリを商用公開しない」ガバナンス方針
- Issue #81 の完了条件を「3 アプリすべての即時デプロイ」から「3 アプリへ拡張可能なインフラ土台の整備」に解釈し直す。実デプロイは別 Issue へ分離

## Capabilities

### New Capabilities
- `render-deployment`: Render Blueprint による Static Site デプロイ運用ルール。サービス命名規則 (`name` 不変厳守)、モノレポ対応ビルドコマンド (`pnpm --filter <pkg> build`)、`autoDeployTrigger: checksPass`、Preview 環境自動生成、機密情報の `sync: false` 運用、未完成アプリの公開禁止ガバナンスを規定する。

### Modified Capabilities
（なし）

## Impact

- **コード**: `render.yaml` の `buildCommand` 1 行変更 + コメント拡充。アプリケーションコードへの影響なし
- **インフラ**: Render Dashboard 側の手動操作は不要（LP サービスは既存のまま継続）。admin / reservation の Blueprint Instance 連携は本 change では行わない
- **CI/CD**: 既存 GitHub Actions CI (`#80`) との連携に変更なし
- **環境変数**: 変更なし（LP の既存 env var は保持）
- **後続 Issue**: 「admin デプロイ（Supabase Auth ゲート込み）」「reservation デプロイ（公開タイミング判断込み）」の 2 件を別 Issue として分離する想定
