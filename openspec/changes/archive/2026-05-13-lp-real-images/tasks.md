## 1. Photo プリミティブ拡張

- [x] 1.1 `packages/ui/src/Photo.vue` に `src?: string` / `alt?: string` prop を追加。template を分岐し、`src` 指定時は `<img :src :alt class="hq-photo__img">` を描画、未指定時は従来の placeholder（label 含む）を描画
- [x] 1.2 `Photo` の CSS に `.hq-photo--has-image` (background 解除) と `.hq-photo__img` (`width: 100%; height: 100%; object-fit: cover; display: block;`) を追加
- [x] 1.3 `packages/ui/src/Photo.spec.ts` に 3 件のテスト追加: ①src 指定時に `<img>` が描画され placeholder 背景が消える ②src 指定時に alt 未指定なら `alt=""` になる ③src と label 両方指定時に label が描画されない
- [x] 1.4 `pnpm --filter @high-q/ui test` を実行して全テスト pass を確認

## 2. 画像アセット取り込み

- [x] 2.1 `apps/lp/public/images/` ディレクトリを作成
- [x] 2.2 hero 画像を `apps/lp/public/images/hero.jpg` として配置（既存 `apps/lp/public/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg` をリネーム移動。元の public 直下のファイルは削除）
- [x] 2.3 about 画像を Downloads の `ChatGPT Image 2026年5月13日 02_04_12.png` から取り込み、`apps/lp/public/images/about.jpg` に PNG → JPG 変換配置（macOS の `sips -s format jpeg` 等）。ファイルサイズが 500KB を超える場合は品質 85 程度で圧縮し 200KB 程度を目標
- [x] 2.4 final-cta 画像を Downloads の `ChatGPT Image 2026年5月13日 22_29_00.png` から取り込み、`apps/lp/public/images/final-cta.jpg` に同様に変換配置
- [x] 2.5 配置した 3 ファイルが Vite dev で `/images/hero.jpg` 等の URL で取得できることを確認（`curl http://localhost:5173/images/hero.jpg -I` 等）

## 3. hero / about / final-cta の実画像化

- [x] 3.1 `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue` の `<Photo>` を `src="/images/hero.jpg"` + 適切な日本語 `alt` で更新（既存 `label` 属性は削除）
- [x] 3.2 `apps/lp/src/widgets/about-section/ui/AboutSection.vue` の `<Photo>` を `src="/images/about.jpg"` + 日本語 alt で更新（既存 `label` 属性は削除）
- [x] 3.3 `apps/lp/src/widgets/final-cta/ui/FinalCtaSection.vue` の `<Photo>` を `src="/images/final-cta.jpg"` + 日本語 alt で更新（既存 `label` 属性は削除）

## 4. features-section から Photo 削除

- [x] 4.1 `apps/lp/src/widgets/features-section/ui/FeaturesSection.vue` の template から `<Photo :label="item.photo" :h="280" />` の行を削除
- [x] 4.2 `<script setup>` から `Photo` import を削除（`Kicker` のみ残す）
- [x] 4.3 `items` 配列の各 item から不要になった `photo` フィールドを削除
- [x] 4.4 `.features__item` に `border-top: 1px solid var(--hq-color-hairline)` を追加し、`&:first-child { border-top: none; }` で最初の item の上線を消す。`.features__body` の `padding-top` を写真直下前提から見直し（Photo 廃止に伴う上下バランス調整）
- [x] 4.5 `pnpm --filter @high-q/lp build` で features セクションが破綻していないか確認

## 5. gallery-sns から画像 grid 削除 + 文言調整

- [x] 5.1 `apps/lp/src/widgets/gallery-sns/ui/GallerySnsSection.vue` の template から `<div class="gallery__grid">` ブロックを削除
- [x] 5.2 `<script setup>` から `Photo` import を削除
- [x] 5.3 heading 「ある日の、High Q。」を「フォローして、繋がる。」に変更（lead 「Follow along.」は変更せず維持）
- [x] 5.4 `.gallery__grid` の CSS は将来 Instagram 連携で復活する前提で残置（コメントで「Instagram 連携時に復活予定」と注釈）
- [x] 5.5 .gallery__sns の上 padding を見直し（grid が無くなる分のスペース感を調整）

## 6. 検証

- [x] 6.1 LP 全体を `pnpm --filter @high-q/lp dev` で開き、420px / 768px / 1280px の 3 幅で表示崩れがないことを目視確認
- [x] 6.2 hero / about / final-cta の 3 画像が `object-fit: cover` で主要被写体が切れずに描画されることを確認。必要なら `object-position` を追加
- [x] 6.3 features-section / gallery-sns の構造変更後のレイアウトバランスを確認
- [x] 6.4 `pnpm --filter @high-q/lp build` 成功・ビルド成果物に images/ が含まれることを確認
- [x] 6.5 既存の LP E2E (`e2e/lp/`) と Photo unit test、admin / reservation の showcase が壊れていないことを確認
- [x] 6.6 `apps/lp/public/` 直下に残っていた `chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg` が削除されている（重複防止）
