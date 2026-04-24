## 1. ConceptCard レスポンシブ対応

- [x] 1.1 `ConceptCard.vue` の `width="374"` を `width="100%"` に変更する
- [x] 1.2 `ConceptCard.vue` の `height="374"` を削除し、高さ auto にする
- [x] 1.3 `ConceptCard.vue` の `.v-card` グローバル CSS を `<style scoped>` に変更する

## 2. セクション横幅の統一

- [x] 2.1 `ConseptContent.vue` の v-row に `align="stretch"` を追加してカード高さを揃える
- [x] 2.2 `SubTitle.vue` の `<v-container class="mt-16">` を `<div class="mt-16">` に変更する
- [x] 2.3 `ConseptContent.vue` の `<style>` を `<style scoped>` に変更する

## 3. フッター復元

- [x] 3.1 `FooterLine.vue` を読み込んで Vuetify 3 互換かを確認する
- [x] 3.2 `App.vue` の `<!-- <FooterLine></FooterLine> -->` コメントを解除する

## 4. ビルド確認・コミット

- [x] 4.1 `pnpm --filter @high-q/lp build` が通ることを確認する
- [ ] 4.2 変更を `feature/93-lp-calendar-restore` ブランチにコミットする
