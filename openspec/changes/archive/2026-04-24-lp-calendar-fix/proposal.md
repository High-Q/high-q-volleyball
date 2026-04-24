## Why

LP の VCalendar（Vuetify 3）で「月ナビが効かない」「イベントが表示されない」の2バグが本番に存在する（Issue #102）。LP のコアコンテンツであるイベント告知が機能しない状態のため、早急に修正する。

## What Changes

- **月ナビゲーション修正**: `v-model` へのデータ渡し方・`prev`/`next` メソッドを VCalendar v3 の正しい API に合わせる
- **イベント表示修正**: `calendarEvents` の `start`/`end` フォーマットを VCalendar が受け付ける形式（ISO 文字列など）に変換する
- **動作確認**: 月ナビ切替・イベントクリックによるダイアログ表示まで確認する

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `lp-calendar`: LP カレンダーの月ナビゲーションとイベント表示が正しく動作すること

## Impact

**修正対象ファイル:**
- `apps/lp/src/components/EventContent.vue` — v-model・イベントフォーマット・月ナビロジック

**影響範囲:** LP のみ。バックエンド・API への影響なし。
