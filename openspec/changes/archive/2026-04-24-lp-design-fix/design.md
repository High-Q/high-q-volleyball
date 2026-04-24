## Context

Vue 3 + Vuetify 3 移行後、LP の画面が以下の理由で崩れている：
- Vuetify 2 の `variant="outlined"` は背景色を適用したが、Vuetify 3 では背景透明 + border色として扱われる
- `width="374" height="374"` の固定値がレスポンシブカラムに追従しない
- セクションごとに `v-container` の fluid / 非fluid が混在し、横幅が揃わない
- `SubTitle.vue` 内部の非fluid `v-container` がセクション幅を制限する

## Goals / Non-Goals

**Goals:**
- コンセプトカードを md 以上で3列横並びに表示する
- 全セクションの左右端を揃える（ヘッダーと同幅）
- フッターを表示する
- 既存デザインの意図（色・ボーダースタイル）を維持する

**Non-Goals:**
- デザインリニューアル（色・フォント・コンテンツの変更）
- Composition API・TypeScript への書き換え
- アニメーション・インタラクション追加

## Decisions

### D1: ConceptCard の固定 width/height を削除
`width="374" height="374"` を削除し、`width="100%"` に変更。  
カードは親 `v-col` の幅に追従し、md=4 列が機能する。  
高さはコンテンツに合わせて auto になる。

代替案: `max-width="374"` を残す → 小さい画面で中途半端な幅になるため不採用。

### D2: セクション水平幅の統一方針
全トップレベルセクションを `v-container fluid` に統一し、内部で `px-4 px-md-16` のパディングを適用する。  
これにより全セクションがヘッダー（全幅）と視覚的に揃う。

代替案: 全セクションに非fluid container → ヘッダーより狭く見えるため不採用。

### D3: SubTitle の内部コンテナ削除
`SubTitle.vue` の `<v-container class="mt-16">` を `<div class="mt-16 px-0">` に置き換える。  
セクション幅制限を親コンポーネントに委ねる。

### D4: secondary-card の CSS スコープ修正
`ConseptContent.vue` の `.secondary-card` CSS を `<style scoped>` に変更し、グローバル汚染を防ぐ。  
`ConceptCard.vue` の `.v-card` グローバル CSS も scoped に変更し、ダイアログ等への意図しない適用を防ぐ。

## Risks / Trade-offs

- [height="374" 削除] カードの高さが揃わない可能性 → `align-stretch` を v-row に付与して揃える
- [SubTitle 変更] 既存 CSS の `v-container` 依存があれば崩れる → `mt-16` class を div に移動するだけなので低リスク

## Migration Plan

1. ConceptCard.vue 修正
2. ConseptContent.vue 修正
3. SubTitle.vue 修正
4. ActivitiesContent.vue / EventContent.vue パディング統一
5. FooterLine.vue 確認 + App.vue コメント解除
6. `pnpm --filter @high-q/lp build` で確認
7. ローカルで目視確認
