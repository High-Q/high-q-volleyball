## Why

モノレポ移行（#76）に伴い `vuetify/labs/VCalendar` のimportを削除したことでLPカレンダーが非表示になった。また `main.js` のVuetify二重初期化によりカスタムカラーが無効になっていた。LPをVue3として完成させるためこれらを修正する（Issue #93）。

## What Changes

- `EventContent.vue` のカレンダー部分（全コメントアウト状態）をVuetify 3 API で書き直す
- `v-calendar` の navigation を `$refs.calendar.prev/next()` から state管理に変更
- `v-hammer:swipe`（Vue2専用）を削除
- `main.js` の Vuetify 二重初期化・vue2-hammer を削除（色崩れ修正）

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `lp-calendar`: `EventContent.vue` のカレンダー実装を Vuetify 3 互換に更新

## Impact

- **コード**: `apps/lp/src/components/EventContent.vue`、`apps/lp/src/main.js`
- **依存**: `vue2-hammer` 不要（package.jsonから削除可）
- **後方互換**: なし（LPのみ）
