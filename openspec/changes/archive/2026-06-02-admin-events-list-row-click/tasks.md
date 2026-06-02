## 1. EventsTable.vue 実装

- [x] 1.1 `<TableRow>` 内の構造を更新: 日付セルに `relative` を付け、`<router-link class="absolute inset-0" :to="{ name: 'events-detail', params: { id: row.id } }" :aria-label="\`\${row.name} の詳細を見る\`">` を埋め込む（オーバーレイ方式）
- [x] 1.2 タイトルセル内の既存 `<router-link>` を撤去し、テキスト直書きに戻す。`title` 属性（フルテキスト hover 確認）は `<TableCell>` または `<span>` に移管
- [x] 1.3 「編集」列の既存 `<router-link>` に `relative z-10` を追加し、オーバーレイより上層でクリックを奪う
- [ ] 1.4 行 hover 時の `hover:bg-paper-warm`（既存 `<TableRow>` 適用）が引き続き機能することを目視確認

## 2. テスト追加

- [x] 2.1 `EventsTable.spec.ts` に「行内オーバーレイ link が日付セルに存在し `/events/:id` を指す」test 追加（行内 click 伝搬は JSDOM 制約のため DOM 契約として検証）
- [x] 2.2 `EventsTable.spec.ts` に「行内 link は 2 つに抑制（オーバーレイ + 編集）」test 追加（a11y）
- [x] 2.3 `EventsTable.spec.ts` に「編集列リンクは `relative z-10` でオーバーレイより上層」test 追加
- [x] 2.4 `EventsTable.spec.ts` の既存ソートヘッダー test 群は無変更で 18 件全 pass（ソート機能の回帰なし）
- [x] 2.5 `EventsTable.spec.ts` に「タイトル truncate 時に `title` 属性でフルテキスト確認可能」test 追加

## 3. 最終確認

- [x] 3.1 `pnpm exec vitest run src/widgets/events-list/ui/EventsTable.spec.ts` で 18 件 pass
- [x] 3.2 `pnpm --filter @high-q/admin typecheck` pass
- [x] 3.3 `pnpm --filter @high-q/admin lint` pass（0 errors、既存 warning 9 件は本変更と無関係）
- [x] 3.4 ローカル dev (`http://localhost:5176/events`) で各セル（編集列以外）クリックで詳細遷移、編集列クリックで編集遷移、Tab + Enter でキーボード遷移、行 hover で背景色変化を目視確認（翔太郎くん OK 確認済み）
- [x] 3.5 PR draft 作成（タイトル: `enhance(admin): イベント一覧の行クリックで詳細画面へ遷移できるようタップ範囲を拡大（編集列除く） (#224)`）
