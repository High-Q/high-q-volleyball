## Why

LP の `<Photo>` プレースホルダーは現状すべて灰色の縞模様＋ラベル文字（例: `[ hero · 体育館 ]`）で描画されており、商用リリースに耐えるブランド体験になっていない。デザイン更新により、LP で必要な実画像は **hero / about / final-cta の 3 枚のみ** に絞られた。Why High Q セクションは画像なしのカード型に、Gallery & Social セクションは Instagram 開設前のため画像エリアを撤去し SNS 文脈に文言調整する。これらをまとめて release/lp-redesign-v2 ブランチに統合することで、master 最終 PR の前提が揃う。

## What Changes

- **`@high-q/ui` の `Photo` プリミティブを拡張**: `src` / `alt` prop を追加し、`src` 指定時は実画像 (`<img>`) を描画する。未指定時は現状の placeholder（背景パターン + ラベル）を維持
- **hero / about / final-cta の 3 widget で `<Photo>` に実画像を割り当てる**: 翔太郎くんから提供された 3 枚の写真を `apps/lp/public/images/` に配置して参照
- **Why High Q (features-section) から `<Photo>` × 3 を削除**: 番号 + Kicker + 日本語タイトル + 本文のみのカードに変更
- **Gallery & Social (gallery-sns) の画像 grid (`<Photo>` × 4) を削除**: 写真前提の heading 文言「ある日の、High Q。」を SNS 文脈にあわせて変更（β案）。Instagram リンクは将来追加用にコメントで残置可

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `shared-ui`: `Photo` プリミティブが実画像表示モード（`src` / `alt` prop）をサポートすること、および a11y 要件を追加
- `lp-layout`: hero / about / final-cta は実画像で描画されること、Why High Q セクションは画像を含まないこと、Gallery & Social セクションは画像 grid を持たないことを規定

## Impact

- 修正: `packages/ui/src/Photo.vue` / `packages/ui/src/Photo.spec.ts`
- 修正: `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue` / `about-section/ui/AboutSection.vue` / `final-cta/ui/FinalCtaSection.vue`
- 修正: `apps/lp/src/widgets/features-section/ui/FeaturesSection.vue`（構造変更）
- 修正: `apps/lp/src/widgets/gallery-sns/ui/GallerySnsSection.vue`（画像 grid 削除 + 文言調整）
- 新規アセット: `apps/lp/public/images/hero.jpg` / `about.jpg` / `final-cta.jpg`（最終形式は design で確定）
- admin / reservation の `Photo` 利用箇所は破壊変更なし（既存 props はそのまま動く）
- E2E: 既存テストは `aria-hidden` / placeholder label 依存箇所がないか要確認
