## ADDED Requirements

### Requirement: LP の hero / about / final-cta は実画像で描画される

LP の hero (hero-first widget) / about (about-section widget) / final-cta (final-cta widget) の `<Photo>` 要素は、placeholder ではなく `apps/lp/public/images/` 配下に配置された実画像を `src` prop 経由で表示しなければならない（SHALL）。各画像には日本語の `alt` テキストを必須で付与する。

#### Scenario: hero 画像が実画像で描画される

- **WHEN** LP のトップページを開く
- **THEN** hero-first widget の `<Photo>` が `src="/images/hero.jpg"` の実画像を `object-fit: cover` で描画し、placeholder の縞模様や `[ hero · 体育館 ]` ラベルは表示されない

#### Scenario: about 画像が実画像で描画される

- **WHEN** LP の about セクションを開く
- **THEN** about-section widget の `<Photo>` が `src="/images/about.jpg"` の実画像を描画し、日本語 alt テキストが付与されている

#### Scenario: final-cta 画像が実画像で描画される

- **WHEN** LP の最下部の final-cta セクションを表示する
- **THEN** final-cta widget の `<Photo>` が `src="/images/final-cta.jpg"` の実画像を全画面背景的に描画する

### Requirement: Why High Q セクションは画像を含まない

LP の features-section widget（heading: `— Why High Q`）は、`<Photo>` プレースホルダーを一切含まず、番号（01/02/03）+ Kicker + 日本語タイトル + 本文のみで構成された 3 カードでなければならない（SHALL）。

#### Scenario: features-section に Photo 要素が存在しない

- **WHEN** `apps/lp/src/widgets/features-section/ui/FeaturesSection.vue` を参照する
- **THEN** template に `<Photo>` が含まれず、`@high-q/ui` からの `Photo` import も削除されている

#### Scenario: 3 カードが視覚的に区切られて描画される

- **WHEN** LP の Why High Q セクションを開く
- **THEN** 3 件のカードが上下のマージン or hairline で視覚的に区切られ、画像なしでも独立したブロックとして認識できる

### Requirement: Gallery & Social セクションは画像 grid を持たない

LP の gallery-sns widget（heading 領域）は、Instagram 連携実装前のため `<Photo>` を含む `.gallery__grid` 領域をテンプレートから削除しなければならない（SHALL）。heading 文言は写真ナシでも違和感のない SNS 文脈に変更し、SNS リンク (X 等) は残置する。

#### Scenario: gallery-sns に Photo 要素が存在しない

- **WHEN** `apps/lp/src/widgets/gallery-sns/ui/GallerySnsSection.vue` を参照する
- **THEN** template に `<Photo>` が含まれず、`@high-q/ui` からの `Photo` import も削除されている

#### Scenario: heading 文言が SNS 文脈に変更される

- **WHEN** LP の Gallery & Social セクションを開く
- **THEN** 元の heading 「ある日の、High Q。」は写真前提のため SNS 文脈の別文言「フォローして、繋がる。」に置き換わっており、写真がない状態でも自然に読める

#### Scenario: SNS リンクは残置される

- **WHEN** LP の Gallery & Social セクションを開く
- **THEN** X など既存の SNS リンクボタンは引き続き描画され、`target="_blank" rel="noopener noreferrer"` 属性を維持する
