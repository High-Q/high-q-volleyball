## Why

#79 で Playwright E2E 環境がローカル運用可能になり `pnpm test:e2e` が動作するようになったが、現状 GitHub Actions CI には統合されていない。このため:

- PR / master push のいずれにおいても E2E が自動実行されず、E2E が「壊滅していない」ことを CI レベルで保証できない
- 今後 #135 で catch-up テストを追加した際、PR ごとにフル E2E が走ることになり開発の feedback loop（PR=3 分以下）を毀損するリスクがある
- フレーク発生時の trace / video / HTML レポートを取得する手段がない

Phase 1 のテスト戦略「PR=smoke / master=full」を CI レベルで成立させ、catch-up（#135）が始まる前に基盤を整えるため、本変更で E2E job を CI に組み込む。

## What Changes

- `.github/workflows/ci.yml` に新規 `e2e` job を追加（`needs: install`、既存 4 job と並列実行）
- Playwright の test tag (`@smoke`) ベースでトリガー分離: PR push では `--grep '@smoke'`、master push では全 E2E を実行
- 既存 `e2e/lp/smoke.e2e.ts` の test に `@smoke` tag を付与し、smoke として明示
- Playwright のブラウザバイナリ（`~/.cache/ms-playwright`）を `actions/cache` でキャッシュ
- 失敗時のみ `playwright-report/` と `test-results/` を `actions/upload-artifact` でアップロード（retention 14 日）
- ローカル運用ルールとの整合: `pnpm test:e2e:smoke` スクリプトを root `package.json` に追加（CI と同じ smoke サブセットをローカルでも再現可能に）
- Phase 1 のハードリミット閾値（PR smoke < 1 分、master full < 5 分）を CI レベルで監視可能にする運用ルールを spec に組み込む

スコープ外:
- E2E テスト本体の追加（#135 で対応）
- ビジュアル回帰テスト（Phase 2）
- セルフホストランナー化

## Capabilities

### New Capabilities
（なし。既存 capability の拡張のみ）

### Modified Capabilities
- `github-actions-ci`: `e2e` job を 5 番目の並列 job として追加し、PR=smoke / master=full のトリガー分離・ブラウザキャッシュ・失敗時 artifact upload を要件として追加する
- `playwright-e2e-baseline`: 「CI への E2E 組込みは本仕様の対象外」を取り下げ、CI 統合を前提とする `@smoke` tag 運用ルールと `pnpm test:e2e:smoke` スクリプトの存在を要件として追加する

## Impact

- 影響コード:
  - `.github/workflows/ci.yml`（`e2e` job 追加）
  - `package.json`（root の scripts に `test:e2e:smoke` 追加）
  - `e2e/lp/smoke.e2e.ts`（既存 test に `@smoke` tag 付与、内容変更なし）
- 影響 spec:
  - `openspec/specs/github-actions-ci/spec.md`
  - `openspec/specs/playwright-e2e-baseline/spec.md`
- 影響ドキュメント:
  - `docs/07-テスト/01-テスト戦略・方針.md`（「#136 で実装」と書かれている箇所を「実装済み」に更新、Sync フェーズで対応）
- CI 実行時間: PR は smoke のみ追加されるため + ~30〜60 秒の増加見込み（並列のため wall time への影響は小）。master は full E2E（現状 1 件）で + ~60 秒見込み。
- 後続 Issue: #135（catch-up テスト追加）が本変更に依存。本変更の ship 後に着手可能になる。
