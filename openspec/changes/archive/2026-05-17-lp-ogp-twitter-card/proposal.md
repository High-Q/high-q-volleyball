## Why

LP の URL を X / Facebook / LINE / Slack 等に貼ったとき、現在は旧 LP 時代の Unsplash 画像とタイポを含む題名（"Hige Q"）でカードが描画されている。再構築後のブランド表現が SNS 上に反映されておらず、最初の接点である「リンクカード」で High Q の世界観が伝わらないため、流入動機の毀損とブランド毀損が起きている。SNS が主要な集客導線である本サークルにとって、ここを正すことは新規参加への入口品質を直接押し上げる。

## What Changes

- 再構築後の Hero 画像をベースにした LP の SNS シェア用サムネイル画像を整備する
- LP の HTML head に、Open Graph / Twitter Card のメタ情報を再構築後ブランドに揃えて再構成する
- X 上で大きいサムネイル付きカード（large image card）として描画されるよう Twitter Card 種別を設定する
- 既存メタ情報に含まれる旧 LP 由来の不整合（旧 Unsplash 画像参照・サイト名や題名のタイポ・言語属性）を是正する
- 主要 SNS（X / Facebook / LINE / Slack）で「想定どおりのカードになるか」を共有前に検証できる確認手順を整備する

## Capabilities

### New Capabilities
- `lp-social-share`: LP の SNS シェア時にどのメタ情報・画像・カード種別が提供されるかを規定する capability。OGP / Twitter Card / サムネイル画像要件・本番 URL 参照・タイトル/説明文の整合性を扱う。

### Modified Capabilities
（なし — 既存 `lp-layout` は head の meta 要件を扱っておらず、新規 capability として独立させる）

## Impact

- 影響コード: `apps/lp/index.html` の `<head>`
- 影響アセット: `apps/lp/public/images/` 配下に SNS シェア用画像を追加
- 影響仕様: 新規 `openspec/specs/lp-social-share/spec.md` を追加
- 影響なし: ランタイム JS / ルーティング / Supabase / Render 設定 / 環境変数（静的メタのみ）
- 検証手段: X 公式の Card Validator / Facebook 公式 Sharing Debugger を用いた目視確認（マージ後の本番 URL に対して）
