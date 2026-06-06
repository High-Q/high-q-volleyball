## 1. `useRouteDetailQuery` feature の追加

- [x] 1.1 `apps/admin/src/features/route-detail-query/` ディレクトリと `composables/useRouteDetailQuery.ts` を新設し、`detail: ComputedRef<string | undefined>` / `openDetail(id)` / `closeDetail()` を `vue-router` の `useRoute` / `useRouter` で実装する（`router.push` で `?detail=<id>` を追加・削除、他クエリは触らない）
- [x] 1.2 `features/route-detail-query/index.ts` で公開 API を `export { useRouteDetailQuery }` のみに絞る
- [x] 1.3 `useRouteDetailQuery.spec.ts` を作成し、初期状態 / `openDetail` 後の URL / `closeDetail` 後の URL / `?detail` 既存値ありで mount したときの `detail` ref の値の 4 シナリオをテスト

## 2. `useMemberDetailSheet` の source 注入 refactor

- [x] 2.1 `widgets/member-detail-sheet/composables/useMemberDetailSheet.ts` で `MemberDetailSource` 型（`{ detail: ComputedRef<string | undefined>; closeDetail: () => Promise<void> }`）を定義し、`useMemberDetailSheet(source?: MemberDetailSource)` を実装する（省略時は `useMembersFilter()` を呼んで従来構造に redirect）
- [x] 2.2 `widgets/member-detail-sheet/index.ts` で `MemberDetailSource` 型を re-export
- [x] 2.3 `widgets/member-detail-sheet/ui/MemberDetailSheet.vue` で `defineProps<{ source?: MemberDetailSource }>()` を追加し、`useMemberDetailSheet(props.source)` を呼ぶ（Vue Reactivity 損失を避けるため props は `ComputedRef` をそのまま渡す形にし、unwrap しない）
- [x] 2.4 既存 `useMemberDetailSheet.spec.ts` を再実行し、引数なし呼び出しの後方互換が保たれることを確認（テスト変更不要）

## 3. `EventParticipantsTable` の氏名セルをボタン化

- [x] 3.1 `widgets/event-participants/ui/EventParticipantsTable.vue` の名前セル `<span>` を `<button type="button">` に置き換え、`aria-label="<display_name> の詳細を開く"`（ニックネーム除外）/ `@click="emit('member-clicked', row.member_id)"` を付与する
- [x] 3.2 button スタイル: テキスト見た目維持 + `hover:underline` + `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent` + 適切な padding。`var(--hq-*)` トークン経由で色指定（マジックナンバー禁止）
- [x] 3.3 退会済み会員行（`member_id IS NULL` / `display_name === '退会済み会員'`）は button 化せず `<span>` のままにする条件分岐を追加
- [x] 3.4 `defineEmits` に `'member-clicked': [memberId: MemberId]` を追加

## 4. widget チェーンの emit 伝搬

- [x] 4.1 `widgets/event-participants/ui/EventParticipantsWidget.vue` で `EventParticipantsTable` の `@member-clicked` を受けて自身も `'member-clicked'` を emit する
- [x] 4.2 `widgets/event-detail/ui/EventDetailWidget.vue` で同様に bubble up（`EventParticipantsWidget` の `@member-clicked` → 自身の emit）

## 5. `EventDetailPage` に `MemberDetailSheet` をマウント

- [x] 5.1 `apps/admin/src/pages/EventDetailPage.vue` で `useRouteDetailQuery()` を呼び、`detailSource` として `{ detail, closeDetail }` を組み立てる
- [x] 5.2 `<EventDetailWidget>` の `@member-clicked="(id) => openDetail(id)"` を配線する
- [x] 5.3 `<MemberDetailSheet :source="detailSource" />` を main 末尾にマウント。`@saved` / `@withdrawn` / `@correctionChanged` は EventDetailPage 側では未配線でも問題ないが、emit 自体は受けて何もしない（または `console.debug` 程度の no-op handler を付ける）

## 6. テスト追加

- [x] 6.1 `EventParticipantsTable.spec.ts` に追加: 「氏名ボタンクリックで `member-clicked` が emit され、ペイロードが `row.member_id`」/「Enter キーで同じ挙動」/「`aria-label` が `<display_name> の詳細を開く`」/「退会済み会員行はボタン化されない」の 4 ケース
- [x] 6.2 `EventDetailPage.spec.ts` に追加: 「`@member-clicked` を受けると URL に `?detail=<id>` が push される」/「`?detail=<id>` 付きで mount すると `MemberDetailSheet` が `isOpen` 状態でレンダリングされる」/「シート close で `?detail=` が消える」
- [x] 6.3 全変更ファイルの component test + 既存の `useMemberDetailSheet.spec.ts` / `MembersListPage` 関連が緑であることを `pnpm exec vitest run --filter @high-q/admin` で確認

## 7. 最終確認

- [x] 7.1 `pnpm exec vitest run` を admin プロジェクトで実行し、全テスト緑
- [x] 7.2 `pnpm typecheck` で型エラーゼロ
- [x] 7.3 `pnpm lint` で eslint-plugin-boundaries / dependency-cruiser エラーゼロ（features → shared、widgets → features の依存方向遵守）
- [x] 7.4 dev で `pnpm --filter @high-q/admin dev` を起動し、`/events/<existing-id>` を開いて: ①氏名クリックでシート開、②シート内容が `/members?detail=<id>` で開いたものと同一、③Esc で閉じる、④`?detail=<id>` 直リンクで再現、⑤キーボード Tab → Enter での操作、⑥退会済み会員行が button 化されていないこと、を目視確認
