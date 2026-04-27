## 1. ブランチ準備と現状確認

- [x] 1.1 `feature/81-render-multi-app-deploy` ブランチを切る
- [x] 1.2 現在の `render.yaml` の内容を確認し、保持すべきコメント・設定（`name: high-q-volleyball`、`autoDeployTrigger: checksPass`、`previews.generation: automatic`、`NODE_VERSION: "22"`）をリストアップ
- [x] 1.3 `apps/lp` の `package.json` を確認し、`name: @high-q/lp` と `build` script の存在を verify

## 2. render.yaml 更新（LP のみ + 雛形コメント）

- [x] 2.1 LP の `buildCommand` を `pnpm build` から `pnpm --filter @high-q/lp build` 形式に変更
- [x] 2.2 ファイル冒頭コメントに「現状デプロイ対象は LP のみ。admin / reservation は機能実装と認証ゲート完了後に追加」のガバナンス方針を明記
- [x] 2.3 ファイル末尾に admin / reservation の雛形コメントを追加（追加時のチェックリスト 5 点 + テンプレート YAML）
- [x] 2.4 既存の経緯コメント（`#125`、`#128`、`--ignore-scripts` 由来）を保持

## 3. ローカル検証

- [x] 3.1 `pnpm install --frozen-lockfile` でルートから依存解決が通ることを確認
- [x] 3.2 `pnpm --filter @high-q/lp build` を実行し、`apps/lp/dist` が生成されることを確認
- [x] 3.3 `render.yaml` の YAML 構文を `js-yaml` 経由で検証

## 4. ドキュメント更新

- [ ] 4.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に以下を反映:
  - 現状デプロイ対象は LP のみ
  - 「未完成アプリを商用公開しない」ガバナンス方針の明文化
  - 将来 admin / reservation 追加時の運用ルール（`name` 不変・sync:false 機密管理・SPA リライト）
  - 「ホスティング構成」表の admin / reservation を「（将来追加予定）」マーキングに変更

## 5. PR 作成と CI 確認

- [ ] 5.1 変更をコミット（1 PR = 1 commit）
- [ ] 5.2 push して PR 作成（`gh pr create`）。Issue #81 のスコープ縮小（LP モノレポ対応化 + 土台整備に限定）と、admin / reservation の実デプロイは後続 Issue へ分離する旨を PR 本文に明記
- [ ] 5.3 GitHub Actions CI が全パスすることを確認
- [ ] 5.4 PR の Render Preview URL（LP）が新ビルドコマンドで正常に立ち上がることを確認

## 6. 仕様反映と完了処理

- [ ] 6.1 `/opsx-ship` で sync / archive / push / merge / 後始末を実行
- [ ] 6.2 Issue #81 を close（スコープ縮小と後続 Issue 分離の経緯をコメントに記載）
- [ ] 6.3 後続 Issue を 2 件作成: 「admin デプロイ（Supabase Auth ゲート込み）」「reservation デプロイ（公開タイミング判断込み）」
