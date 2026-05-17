## 1. 事前確認・確定

- [x] 1.1 本番 URL を確定（`https://high-q-volleyball.onrender.com` を採用）
- [x] 1.2 `og:title` / `twitter:title` 確定: `High Q｜江東区バレーボールサークル`
- [x] 1.3 `og:description` / `twitter:description` 確定: `ガチでもなく、ノリすぎず。ちょうどいい温度のバレーボールサークルです。土日祝の日中・夜に月1〜2回、江東区で活動。初心者・ひとり参加歓迎。`
- [x] 1.4 `og:site_name` 確定: `High Q`

## 2. SNS シェア用画像の作成

- [x] 2.1 `apps/lp/public/images/og.jpg`（1200×630px、Hero 中央クロップから sips 生成）を作成・配置
- [x] 2.2 画像メタデータ確認: 1200×630 / JPEG / 142KB（5MB 以下）
- [ ] 2.3 ローカルで `pnpm dev:lp` 起動して画像が `/images/og.jpg` で配信されることを確認（タスク 4.x の最終確認に統合）

## 3. index.html の head 再構成

- [x] 3.1 `apps/lp/index.html` の `<html lang="en">` を `<html lang="ja">` に修正
- [x] 3.2 既存の旧 OGP メタタグ群（旧 Unsplash 画像参照・"Hige Q" タイポを含むもの）を削除
- [x] 3.3 OGP メタタグを再構成（`og:type` / `og:title` / `og:description` / `og:url` / `og:image` / `og:image:width` / `og:image:height` / `og:image:alt` / `og:site_name` / `og:locale`）。本番絶対 URL を指す
- [x] 3.4 Twitter Card メタタグを追加（`twitter:card="summary_large_image"` / `twitter:title` / `twitter:description` / `twitter:image`）
- [x] 3.5 `<title>` の表記を確定文言に整える（"Hige Q" タイポを除去）

## 4. ローカル検証

- [x] 4.1 `pnpm build:lp` を実行し、`apps/lp/dist/index.html` の head 内容を確認（ビルド成功）
- [x] 4.2 `grep -E "og:|twitter:" apps/lp/dist/index.html` で全プロパティが揃っていることを確認（og: 9件 / twitter: 4件）
- [x] 4.3 `grep -i "hige\|unsplash\|chandan" apps/lp/dist/index.html` で旧不整合の残骸が 0 件であることを確認
- [x] 4.4 `grep '<html lang="ja"' apps/lp/dist/index.html` でヒットすることを確認
- [x] 4.5 OG 画像（`apps/lp/public/images/og.jpg`）の構図を翔太郎くん目視確認（A 承認）+ preview view-source 確認

## 5. PR / Preview 確認

- [x] 5.1 PR #263 を作成（https://github.com/High-Q/high-q-volleyball/pull/263）
- [x] 5.2 PR 本文に「Validator はマージ後の本番 URL に対して実施」と明記

## 6. リリース後の検証（マージ後）

- [ ] 6.1 本番 URL（`https://high-q-volleyball.onrender.com`）を X 公式 Card Validator に投入し、summary_large_image カードと Hero 画像が描画されることを確認
- [ ] 6.2 同 URL を Facebook Sharing Debugger に投入し、OGP の各値とサムネイル画像が期待どおりであることを確認（必要に応じて「もう一度スクレイピング」でキャッシュ更新）
- [ ] 6.3 LINE のトーク / Slack / Discord に本番 URL を貼り付け、リンクカードが期待どおり描画されることを目視確認
- [ ] 6.4 検証結果のスクリーンショット 2〜3 枚を Issue / PR にコメント添付

## 7. Sync / Archive

- [x] 7.1 Sync: `openspec/specs/lp-social-share/spec.md` を新規追加（opsx-ship 内で実施）
- [x] 7.2 Archive: 本 change を `openspec/changes/archive/2026-05-17-lp-ogp-twitter-card/` へ移動
- [ ] 7.3 マージ後、ブランチ削除 + Issue（無し）→ Validator 検証（タスク 6.x）に進む
