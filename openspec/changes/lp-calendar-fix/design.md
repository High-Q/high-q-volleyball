## Context

Vuetify 3 の `VCalendar` は `v-model` に**単一値**（`Date | string | number`）を受け取る。
現在の `EventContent.vue` は `viewDate: [new Date()]` と配列で初期化しており、
これが月ナビ・タイトル計算・イベント表示すべての不具合の根本原因。

型定義（`VCalendar.d.ts`）より：
```typescript
modelValue?: string | number | Date | undefined;
```

## Goals / Non-Goals

**Goals:**
- `viewDate` を配列から単一 `Date` に修正し、月ナビが正しく動作するようにする
- イベントが VCalendar 上に表示されるようにする

**Non-Goals:**
- カレンダーのUI変更
- API レスポンス形式の変更

## Decisions

### D1: viewDate を `Date` 単一値に変更
`data()` の `viewDate: [new Date()]` → `viewDate: new Date()` に変更。
これに伴い `[0]` インデックスアクセスをしている箇所をすべて直す。

**影響箇所（4か所）:**
| 箇所 | 修正前 | 修正後 |
|---|---|---|
| `data.viewDate` | `[new Date()]` | `new Date()` |
| `calendarTitle` computed | `this.viewDate[0]` | `this.viewDate` |
| `prev()` | `new Date(this.viewDate[0])` / `this.viewDate = [d]` | `new Date(this.viewDate)` / `this.viewDate = d` |
| `next()` | 同上 | 同上 |
| `setToday()` | `this.viewDate = [new Date()]` | `this.viewDate = new Date()` |

### D2: events フォーマットはそのまま
`start: new Date(e.start_time)` は VCalendar が受け付ける正しい形式。変更不要。

## Risks / Trade-offs

- リスクなし。変更箇所が EventContent.vue 1ファイルのみで影響範囲が限定的。

## Migration Plan

1. `EventContent.vue` を修正
2. ローカルで月ナビ・イベント表示を目視確認
3. `pnpm --filter @high-q/lp build` でビルド確認
4. fix ブランチで PR → master → production
