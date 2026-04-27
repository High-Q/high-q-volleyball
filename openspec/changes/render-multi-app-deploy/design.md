## Context

Issue #81 の元来の文言は「main マージで 3 アプリ (lp / admin / reservation) が自動デプロイされる」。Apply フェーズでこの完了条件を素直に解釈すると、admin / reservation を含む 3 サービスを `render.yaml` の `services` 配列に定義することになる。

しかし Apply 中の翔太郎くんの指摘で重大な問題が浮上した：

> 「これってさ、商用環境に『未完成の予約サイトと管理サイトが公開される』ってことになる？？」

Render Static Site はデフォルトで完全公開され、URL (`high-q-admin.onrender.com` 等) を知っていれば誰でもアクセスできる。現状の admin / reservation はビルドログ上 10 modules / 60KB のスキャフォールド状態で、認証ゲートも未実装。

このまま 3 サービスをデプロイすると以下のリスクが発生する:
- **admin**: 認証なしの管理画面 URL が世に出る → 情報漏洩・将来の攻撃面拡大
- **reservation**: 未完成サイトが公開され信頼を損なう
- **両方**: Google にインデックスされ、後で消しても痕跡が残る

ステークホルダー: 翔太郎くん（個人開発者・公開判断責任者）／レム（IaC 実装）。

過去の経緯:
- **#125**: Blueprint mode で `name` を変更したことで既存サービスが二重作成された経験
- **#128 → #129**: `autoDeployTrigger: commit` への暫定切替後、`#80` で CI 構築完了し `checksPass` に復旧

## Goals / Non-Goals

**Goals:**
- LP の `render.yaml` 設定をモノレポ対応 (`pnpm --filter @high-q/lp build`) に更新する
- 将来 admin / reservation を追加する際の雛形と運用ルール（`name` 不変・sync:false 機密管理・SPA リライト等）を `render.yaml` コメントとドキュメントに残す
- 「未完成アプリを商用公開しない」というガバナンス方針を明文化する

**Non-Goals:**
- admin / reservation の実デプロイ（後続 Issue へ分離）
- Supabase Auth ゲートの実装
- カスタムドメイン設定
- Render の CDN / キャッシュチューニング

## Decisions

### D1. 案 A 採用: LP のみデプロイ、admin / reservation は雛形コメントで保持

**選択**: `services` 配列には LP のみ定義し、admin / reservation は `render.yaml` 末尾にコメントブロックで雛形を残す。

**却下した代替案**:
- **案 B (Coming Soon ページ)**: 各アプリの `index.html` を「準備中」に差し替え → 雛形 HTML の維持コストが発生し、本実装への戻し作業が必要
- **案 C (noindex + 推測困難 URL)**: メタタグでクローラー除外 → URL を知っていればアクセス可能で根本解決にならない
- **案 D (Auth 先行実装)**: Supabase Auth を実装してから 3 アプリ公開 → Issue #81 のスコープを大きく逸脱

**理由**:
- Issue #81 の Phase 1 インフラ整備の本質は「将来拡張可能な土台を作る」こと。実デプロイは機能側の準備が整ったときで遅くない
- Static Site の URL は `<service-name>.onrender.com` で推測しやすい
- 個人開発・無料運用ではセキュリティ事故が致命傷
- 雛形コメントを残せば、後続 Issue で機能実装完了後の追加が容易

### D2. ビルドコマンドをモノレポ対応 (`pnpm --filter @high-q/lp build`) に更新

**選択**:
```
corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/lp build
```
（既存の `pnpm build` から差し替え）

**理由**:
- 将来 admin / reservation を追加する際、3 サービスで一貫した形式を採れる
- pnpm workspace の依存解決を尊重しつつ対象アプリのみビルド
- ワークスペース共有パッケージ (`@high-q/shared`) を含めた依存も適切に解決される

**互換性**: `pnpm build` (root の `pnpm -r build` 相当) → `pnpm --filter @high-q/lp build` への変更は LP のみがビルドされる挙動。LP 単独ビルドの観点では出力に差はない。

### D3. `name: high-q-volleyball` は不変

**選択**: 既存 LP サービスの `name` を変更しない。

**理由**: #125 の二重作成回避。Dashboard 側で既に設定済みの env var、ドメイン、Preview 履歴を引き継ぐため。

### D4. 雛形コメントには「追加時のチェックリスト」を含める

**選択**: `render.yaml` 末尾の admin / reservation 雛形コメントに、追加前に確認すべき項目を 5 点リストで記載：
1. 認証ゲート完了
2. スキャフォールドではない最低限の機能実装
3. env var は `sync: false` で枠だけ
4. SPA リライト追加
5. PR レビューで「公開判断」を明示

**理由**: 将来の自分（とレム）が雛形コメントを安易にコピペして `services` に追加することを防ぐ。ガバナンス文書をコードと同じ場所に置くことで forget されにくい。

### D5. Issue #81 の完了条件を再解釈

**選択**: 完了条件「main マージで 3 アプリが自動デプロイされる」を「3 アプリへ拡張可能なインフラ土台が整備される」に再解釈し、実デプロイは後続 Issue (admin / reservation 各 1 件) に分離する。

**理由**: Issue 文言を素直に解釈すると未完成サイトの商用公開という問題が残る。Phase 1 のインフラ整備という Issue の本質に立ち返ると、土台整備で十分。

## Risks / Trade-offs

### R1. Issue #81 の文言と実装スコープの乖離
- **Risk**: Issue 文言「3 アプリが自動デプロイされる」と実装が一致しない → 後で「未完了」と誤解される
- **Mitigation**: PR と Issue クローズコメントで「セキュリティ判断によりスコープを土台整備に限定、admin / reservation の実デプロイは後続 Issue で扱う」旨を明記

### R2. 雛形コメントが古くなる
- **Risk**: 雛形コメントの内容が実装時に陳腐化（pnpm 仕様変更 / Render の新機能等）
- **Mitigation**: 後続 Issue で admin / reservation を追加する際、雛形をそのまま使わず最新の Render Blueprint 仕様を再確認するルールをコメント自体に記載

### R3. ワークスペース共有パッケージ変更時の自動デプロイ漏れ
- **Trade-off**: `@high-q/shared` を変更しても `rootDir: apps/lp` 外なので Render が変更検知しない可能性
- **Mitigation**: 現状 `@high-q/shared` の変更頻度は低い想定。漏れ発生時は Dashboard 手動 deploy。本 change のスコープ外として記録

## Migration Plan

1. **Code change**（レム実装）: `render.yaml` の `buildCommand` 更新 + コメント拡充の PR 作成
2. **Preview 検証**: PR 作成時 LP の Preview URL がモノレポ対応コマンドでも正常に立ち上がることを確認
3. **Merge**: master マージ
4. **本番反映確認**: master マージ後、LP 本番 URL が引き続き 200 を返すことを確認
5. **Dashboard 操作**: 不要（LP の既存サービスは `name` 不変のため設定保持）

**ロールバック**: revert commit を作成し再 merge。LP の既存 env var に影響なし。

## Open Questions

- 後続 Issue「admin デプロイ」のタイミング判断基準は？（Supabase Auth 実装完了 + 最低限の管理機能実装が条件）
- 後続 Issue「reservation デプロイ」のタイミング判断基準は？（最低限の予約フロー完成 + 公開判断 OK）
- ワークスペース共有パッケージ変更時の自動デプロイ拡張は別 Issue で検討
