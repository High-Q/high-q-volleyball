## Context

Vuetify 3.5+ で VCalendar が labs を卒業し、`vuetify/labs/VCalendar` パスが廃止された。Vuetify 3.12.5 では `VCalendar` は `vite-plugin-vuetify` が自動登録する。APIも変わったため既存のVue2スタイル実装（`$refs.calendar.prev()` 等）は動作しない。

## Goals / Non-Goals

**Goals:**
- カレンダーを Vuetify 3 API で表示する
- 月ナビゲーション（前月・次月・今月）が動作すること
- AWS API Gateway からイベントを取得して表示すること
- イベントクリックで詳細ダイアログが開くこと

**Non-Goals:**
- スワイプ操作（vue2-hammer 依存のため今回は削除）
- カレンダーデザインの変更
- APIエンドポイントの変更

## Decisions

### D1: navigation を state で管理
Vuetify 3 VCalendar は `$refs.calendar.prev/next()` を持たない。`v-model` に `Date[]` を渡し、月操作は `setMonth()` で行う。

### D2: VCalendar は自動登録に委ねる
`vite-plugin-vuetify` の auto-import が VCalendar を含むため、明示的な import は不要。

## Risks / Trade-offs

- **[Risk] VCalendar の `@click:event` シグネチャ** → `{ event: { title, start, end } }` を受け取る前提で実装。API変更の場合はコンソールで確認。
- **[Trade-off] スワイプ削除** → UX低下の可能性があるが、vue2-hammer の Vue3 対応は別 Issue で対応。
