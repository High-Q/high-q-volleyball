## 1. 依存更新

- [x] 1.1 `pnpm update -r vue` を実行し、`vue` を 3.5.x 系最新（≥ 3.5.42）へ引き上げて lockfile を更新する
- [x] 1.2 `pnpm why -r @vue/server-renderer` で `@vue/server-renderer` が vue と同一の 3.5.x（≥ 3.5.42）へ連動したことを確認する。連動していない場合のみ、ルート `package.json` の `pnpm.overrides` に `"@vue/server-renderer": ">=3.5.42 <3.6"` を追記して再 install する
- [x] 1.3 `pnpm why -r vue` で vue が単一版（3.5.x）に収束し、旧 3.5.33 が残っていないことを確認する

## 2. 検証

- [x] 2.1 `pnpm -r test` が全件 passed であることを確認する
- [x] 2.2 `pnpm build:lp` / admin / reservation の 3 アプリビルドが成功することを確認する
- [x] 2.3 `pnpm why -r @vue/server-renderer` の解決木に脆弱版（3.5.33）が存在しないことを最終確認する
