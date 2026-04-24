## 1. main.js 修正（色崩れ修正）

- [x] 1.1 Vuetify の二重初期化（`createVuetify({})`）を削除する
- [x] 1.2 `vue2-hammer` の import と `app.use(VueHammer)` を削除する
- [x] 1.3 `pnpm --filter @high-q/lp build` が通ることを確認する（PR #100 でマージ済み）

## 2. カレンダー復元（EventContent.vue）

- [x] 2.1 コメントアウトされたカレンダー部分を Vuetify 3 API で書き直す
- [x] 2.2 月ナビゲーションを `$refs` から state 管理に変更する
- [x] 2.3 `v-hammer:swipe` を削除する
- [x] 2.4 `pnpm --filter @high-q/lp build` が通ることを確認する

## 3. PR・マージ・デプロイ

- [ ] 3.1 変更をコミットし、`feature/93-lp-calendar-restore` → `master` の PR を作成する
- [ ] 3.2 ローカルで `pnpm --filter @high-q/lp dev` を起動してカレンダー表示を目視確認する
- [ ] 3.3 PR をマージする
- [ ] 3.4 Render ダッシュボードの設定を monorepo 用に戻す（Root Directory: `apps/lp`、Build Command: `pnpm install && pnpm build`）
- [ ] 3.5 `master` → `production` にマージし Render の自動デプロイが成功することを確認する
- [ ] 3.6 LP 本番サイトでカレンダーと色が正しく表示されることを確認する
