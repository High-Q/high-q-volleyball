## Why

Vue 3 + Vuetify 3 移行後、LP の画面デザインが複数箇所で崩れている（カードレイアウト・セクション幅・パディング）。ローカル目視確認で判明したため、master マージ・本番デプロイ前に修正する。

## What Changes

- **コンセプトカードを3列横並びに修正**: `v-card` の `width="374"` 固定値を削除し、カラム幅に追従させる
- **コンセプトカード高さのレスポンシブ対応**: `height="374"` 固定値を削除し、コンテンツに合わせて伸縮させる
- **全セクションの水平パディングを統一**: 各セクション (`ConseptContent`, `ActivitiesContent`, `EventContent`) のコンテナ構造とパディングを揃える
- **SubTitleコンポーネントの幅を修正**: 内部の非fluid `v-container` を削除し、親コンテナの幅に合わせる
- **フッターの復元**: `App.vue` でコメントアウトされている `FooterLine` を復元する
- **コンセプトカードの境界線スタイル調整**: `secondary-card` の太い縦線がレイアウトを壊さないよう、CSS スコープを修正する

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `lp-layout`: LP の各セクションのレイアウト・パディング・コンポーネント幅が正しく表示されること

## Impact

**修正対象ファイル:**
- `apps/lp/src/components/ConceptCard.vue` — 固定 width/height 削除、レスポンシブ対応
- `apps/lp/src/components/ConseptContent.vue` — コンテナ・パディング整備
- `apps/lp/src/components/SubTitle.vue` — 内部 v-container の fluid 化または削除
- `apps/lp/src/components/ActivitiesContent.vue` — パディング統一
- `apps/lp/src/components/EventContent.vue` — コンテナ構造整備
- `apps/lp/src/App.vue` — FooterLine のコメントアウト解除
- `apps/lp/src/components/FooterLine.vue` — 内容確認・必要に応じて Vuetify 3 対応修正

**影響範囲:** LP のみ。バックエンド・API・他アプリへの影響なし。
