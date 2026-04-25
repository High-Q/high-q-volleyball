## 1. セットアップ

- [x] 1.1 `feature/105-lp-fsd-refactor` ブランチを作成する
- [x] 1.2 `@tanstack/vue-query` を `apps/lp` に追加する（`pnpm --filter @high-q/lp add @tanstack/vue-query`）
- [x] 1.3 `apps/lp/src/plugins/index.js` に `VueQueryPlugin` を登録する
- [x] 1.4 `vite.config.js` に `@pages`・`@widgets`・`@entities`・`@shared` エイリアスを追加する
- [x] 1.5 ローカル起動（`pnpm dev:lp`）でセットアップエラーがないことを確認する

## 2. entities/event の作成

- [x] 2.1 `src/entities/event/api/eventQueries.js` を作成し、AWS API Gateway への fetch を `queryOptions` として定義する
- [x] 2.2 `src/entities/event/index.js` を作成し、`eventQueryOptions` を export する
- [x] 2.3 `eventQueries.js` のユニットテスト（`eventQueries.spec.js`）を作成する：MSW で API をモックし、正常データ・エラーの2ケースを検証する

## 3. widgets/event-calendar の作成（TanStack Query + 4状態）

- [x] 3.1 `src/widgets/event-calendar/model/useEventCalendar.js` を作成する：`useQuery(eventQueryOptions.list())` を呼び出し `{ events, isPending, isError }` を返す
- [x] 3.2 `useEventCalendar.js` のユニットテスト（`useEventCalendar.spec.js`）を作成する：Loading・Error・Empty・Success の4状態を検証する
- [x] 3.3 `src/widgets/event-calendar/ui/EventDetailDialog.vue` を作成する：`EventContent.vue` からダイアログ部分を抽出する
- [x] 3.4 `src/widgets/event-calendar/ui/EventCalendar.vue` を作成する：`EventContent.vue` のカレンダー UI を移植し、4状態（`v-skeleton-loader` / `v-alert` / 空メッセージ / カレンダー）を実装する
- [x] 3.5 `src/widgets/event-calendar/index.js` を作成し `EventCalendar` を export する

## 4. shared/ui への静的コンポーネント移動

- [x] 4.1 `src/shared/ui/HeaderLine.vue` を作成する（`components/HeaderLine.vue` から移動）
- [x] 4.2 `src/shared/ui/FooterLine.vue` を作成する（`components/FooterLine.vue` から移動）
- [x] 4.3 `src/shared/ui/ConceptCard.vue` を作成する（`components/ConceptCard.vue` から移動）
- [x] 4.4 `src/shared/ui/SubTitle.vue` を作成する（`components/SubTitle.vue` から移動）
- [x] 4.5 `src/shared/ui/IconButtons.vue` を作成する（`components/IconButtons.vue` から移動）

## 5. widgets への各セクション移動

- [x] 5.1 `src/widgets/hero-section/ui/HeroSection.vue` を作成する（`components/MainImage.vue` からリネーム移動）、`index.js` を作成する
- [x] 5.2 `src/widgets/concept-section/ui/ConceptSection.vue` を作成する（`components/ConseptContent.vue` からリネーム移動、typo も修正）、`index.js` を作成する
- [x] 5.3 `src/widgets/activities-section/ui/ActivitiesSection.vue` を作成する（`components/ActivitiesContent.vue` から移動）、`index.js` を作成する

## 6. pages/home の整理

- [x] 6.1 `src/pages/home/ui/HomePage.vue` を作成する（`pages/HomePage.vue` から移動、import パスを新 FSD パスへ更新）
- [x] 6.2 `src/pages/home/index.js` を作成し `HomePage` を export する

## 7. デザイントークン適用

- [x] 7.1 `src/widgets/event-calendar/ui/EventCalendar.vue` のインライン色値（`#182F43`・`#85BBCC`）を Vuetify トークンに置き換える
- [x] 7.2 その他の移動済みコンポーネントを `grep -r "#182F43\|#85BBCC" src/` で検索し、残存するハードコード値をすべて置き換える

## 8. App.vue の更新と旧ファイル削除

- [x] 8.1 `src/App.vue` の import パスを `@shared/ui/HeaderLine`・`@shared/ui/FooterLine`・`@pages/home` へ更新する
- [x] 8.2 `src/components/HeaderLine_ori.vue` を削除する（未使用の旧ファイル）
- [x] 8.3 `src/components/` 配下の移動済みファイルをすべて削除し、ディレクトリを削除する

## 9. 動作確認・PR

- [ ] 9.1 `pnpm dev:lp` でローカル起動し、全セクション表示・カレンダー4状態（ロード中・表示・エラー）を目視確認する
- [ ] 9.2 `grep -r "#182F43\|#85BBCC\|components/" src/` を実行し、残存するハードコード値・旧パス参照が0件であることを確認する
- [ ] 9.3 `pnpm build:lp` でビルドが成功することを確認する
- [ ] 9.4 PR を作成する（base: master）
