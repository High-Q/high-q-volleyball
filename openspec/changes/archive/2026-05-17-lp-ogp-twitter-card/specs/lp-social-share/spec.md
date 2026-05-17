## ADDED Requirements

### Requirement: LP は Open Graph メタ情報を head に提供する

LP (`apps/lp`) は、SNS / メッセンジャー / チャットツール（X / Facebook / LINE / Slack / Discord 等）が URL を貼り付けたときにリッチカードを生成できるよう、HTML の `<head>` に Open Graph (OGP) のメタ情報を提供しなければならない（SHALL）。少なくとも `og:type` / `og:title` / `og:description` / `og:url` / `og:image` / `og:site_name` / `og:locale` を含む。

#### Scenario: OGP の必須プロパティが揃っている

- **WHEN** 開発者が LP のビルド済 `index.html` を参照する
- **THEN** `<head>` 内に `og:type` / `og:title` / `og:description` / `og:url` / `og:image` / `og:site_name` / `og:locale` の 7 プロパティすべての `<meta property="og:*">` 要素が存在する

#### Scenario: OGP locale が日本語である

- **WHEN** 開発者が `og:locale` の値を参照する
- **THEN** その値は `ja_JP` である

#### Scenario: OGP type が website である

- **WHEN** 開発者が `og:type` の値を参照する
- **THEN** その値は `website` である

### Requirement: LP は Twitter Card メタ情報を head に提供する

LP は、X (旧 Twitter) 上で URL がツイートに含まれたときに「大きい画像付きカード」として描画されるよう、HTML の `<head>` に Twitter Card のメタ情報を提供しなければならない（SHALL）。少なくとも `twitter:card` / `twitter:title` / `twitter:description` / `twitter:image` を含み、`twitter:card` の値は `summary_large_image` でなければならない（MUST）。

#### Scenario: Twitter Card 種別が summary_large_image である

- **WHEN** 開発者が LP のビルド済 `index.html` を参照する
- **THEN** `<meta name="twitter:card" content="summary_large_image">` が存在する

#### Scenario: Twitter Card の主要プロパティが揃っている

- **WHEN** 開発者が LP のビルド済 `index.html` を参照する
- **THEN** `<head>` 内に `twitter:title` / `twitter:description` / `twitter:image` の 3 プロパティの `<meta name="twitter:*">` 要素が存在する

### Requirement: LP の SNS シェア用画像は専用画像で 1200×630 を満たす

LP の OGP / Twitter Card 用画像は、`apps/lp/public/images/` 配下に配置された SNS シェア専用画像であり、横 1200px × 縦 630px 以上の解像度を持ち、アスペクト比 1.91:1 に概ね合致しなければならない（SHALL）。Hero 画像の構図を踏襲しつつ、SNS のカード上で High Q のブランドが伝わる視認性を持つ。画像は 5MB 以下とする（MUST）。

#### Scenario: SNS シェア用画像が存在する

- **WHEN** 開発者が `apps/lp/public/images/` を参照する
- **THEN** SNS シェア専用の画像ファイル（例: `og.jpg` / `og.png` / `og.webp` のいずれか）が配置されている

#### Scenario: SNS シェア画像の解像度が 1200×630 以上

- **WHEN** 開発者が SNS シェア用画像のメタデータを確認する
- **THEN** 横 1200px 以上 / 縦 630px 以上であり、アスペクト比が 1.91:1 ± 5% の範囲に収まる

#### Scenario: SNS シェア画像のファイルサイズが 5MB 以下

- **WHEN** 開発者が SNS シェア用画像のファイルサイズを確認する
- **THEN** 5 MB（5,242,880 バイト）以下である

### Requirement: og:image / twitter:image は本番の絶対 URL を指す

OGP / Twitter Card の画像参照は、相対パスではなく `https://` から始まる本番の絶対 URL でなければならない（SHALL）。本番 URL は `apps/lp` の Render Static Site のサービス URL に整合する（現行は `https://high-q-volleyball.onrender.com`）。`og:url` も同様に本番の絶対 URL を指す。

#### Scenario: og:image が本番絶対 URL を指す

- **WHEN** 開発者が `og:image` の値を参照する
- **THEN** 値は `https://` で始まり、`apps/lp` の本番デプロイ URL を origin として持つ

#### Scenario: twitter:image が本番絶対 URL を指す

- **WHEN** 開発者が `twitter:image` の値を参照する
- **THEN** 値は `https://` で始まり、`apps/lp` の本番デプロイ URL を origin として持つ

#### Scenario: og:url が本番絶対 URL を指す

- **WHEN** 開発者が `og:url` の値を参照する
- **THEN** 値は `https://` で始まり、`apps/lp` の本番デプロイ URL のトップ階層を指す

#### Scenario: og:image が旧 LP の Unsplash 画像を指していない

- **WHEN** 開発者が `og:image` の値を参照する
- **THEN** 値に `chandan-chaurasia` や `unsplash` の文字列が含まれない

### Requirement: SNS シェアメタ情報のテキストが再構築後ブランドと整合する

`og:title` / `og:site_name` / `twitter:title` / `og:description` / `twitter:description` および `<title>` のテキストは、サークル名の正しい綴り「High Q」を用い、再構築後の LP の本文・キーメッセージと整合しなければならない（SHALL）。タイポ（"Hige Q" 等）や旧フェーズの古い説明文を含んではならない（SHALL NOT）。

#### Scenario: サークル名のタイポが存在しない

- **WHEN** 開発者が LP のビルド済 `index.html` の `<head>` 内テキストを参照する
- **THEN** "Hige Q" 等のタイポを含む文字列が `og:title` / `og:site_name` / `twitter:title` / `<title>` のいずれにも存在しない

#### Scenario: og:title / twitter:title が High Q ブランドを示す

- **WHEN** 開発者が `og:title` および `twitter:title` の値を参照する
- **THEN** 値に "High Q" の文字列が含まれる

#### Scenario: description が再構築後 LP の語り口と整合する

- **WHEN** 開発者が `og:description` および `twitter:description` の値を参照する
- **THEN** 値は再構築後の LP の Hero / Concept セクションのキーメッセージと矛盾せず、150 文字以内に収まる

### Requirement: LP の html lang 属性が日本語を示す

LP の `<html>` 要素の `lang` 属性は、コンテンツ言語が日本語であることを示す `ja` でなければならない（SHALL）。`en` 等の他言語表記であってはならない（SHALL NOT）。これは SNS クローラー・スクリーンリーダー・検索エンジンが LP の言語を正しく解釈できるようにするための要件である。

#### Scenario: html lang 属性が ja である

- **WHEN** 開発者が LP のビルド済 `index.html` の `<html>` 開始タグを参照する
- **THEN** `lang="ja"` 属性が付与されている
