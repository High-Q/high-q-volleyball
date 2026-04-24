## 1. EventContent.vue 修正

- [x] 1.1 `data()` の `viewDate: [new Date()]` を `viewDate: new Date()` に変更する
- [x] 1.2 `calendarTitle` computed の `this.viewDate[0]` を `this.viewDate` に変更する
- [x] 1.3 `prev()` の `new Date(this.viewDate[0])` と `this.viewDate = [d]` を修正する
- [x] 1.4 `next()` の `new Date(this.viewDate[0])` と `this.viewDate = [d]` を修正する
- [x] 1.5 `setToday()` の `this.viewDate = [new Date()]` を `this.viewDate = new Date()` に修正する

## 2. 動作確認・リリース

- [ ] 2.1 ローカルで月ナビ（前月・翌月・今日）が正しく切り替わることを目視確認する
- [ ] 2.2 イベントがカレンダー上に表示されることを確認する
- [x] 2.3 `pnpm --filter @high-q/lp build` が通ることを確認する
- [ ] 2.4 `fix/102-lp-calendar-fix` ブランチでコミットし PR を作成する
- [ ] 2.5 master にマージし production へ反映する
