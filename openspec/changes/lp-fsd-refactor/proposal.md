## Why

`apps/lp` は整備したアーキテクチャ方針（FSD・デザイントークン・TanStack Query・4状態）に未対応のまま稼働している。Issue #105 でこれを解消し、今後の機能追加の基盤を整える。

## What Changes

- **FSD構造移行**: `src/components/` を廃止し、`widgets/`・`entities/`・`shared/ui/` に再配置する
- **デザイントークン適用**: ハードコードされた色値（`#182F43`・`#85BBCC`）と数値を Vuetify テーマトークンに置き換える
- **TanStack Query導入**: `EventContent.vue` の手書き `fetchEvents` + `isLoading/error` を `useQuery` に置き換える
- **4状態実装**: イベントカレンダーに Loading（スケルトン）・Empty・Error・Success の4状態を追加する

スコープ外: TypeScript化・新機能追加・ルーティング変更

## Capabilities

### New Capabilities

- `lp-fsd-structure`: apps/lp の FSD ディレクトリ構造。widgets/entities/shared/pages/app への再配置と、Vuetify テーマによるデザイントークン一元管理を含む。

### Modified Capabilities

- `lp-calendar`: イベントカレンダーに Loading・Empty・Error の3状態が追加される。既存の「イベント取得・表示・クリック詳細」要件は維持しつつ、データ取得層を TanStack Query に置き換える。

## Impact

- `apps/lp/src/` 配下の全 `.vue` ファイルおよび `main.js`・`plugins/` の移動・更新
- `apps/lp/package.json` に `@tanstack/vue-query` 追加
- `apps/lp/src/plugins/vuetify.js` にデザイントークン（カラーパレット）を定義
- ユーザー向け機能・UIの変更なし（リファクタリングのみ）
