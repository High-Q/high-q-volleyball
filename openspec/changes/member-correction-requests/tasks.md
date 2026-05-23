## 1. DB migration（`member_list_view` に correction_request_count 列追加）

- [x] 1.1 `supabase/migrations/<timestamp>_add_correction_request_count_to_member_list_view.sql` を作成
- [x] 1.2 view を drop & recreate して `correction_request_count` 列を追加: `jsonb_array_length(coalesce(profile->'correction_requests', '[]'::jsonb))` で算出
- [x] 1.3 既存列・SECURITY INVOKER・grants は維持（admin / authenticated への SELECT）
- [x] 1.4 dev に migration push (`pnpm exec supabase db push --linked`)
- [x] 1.5 dev で `SELECT correction_request_count FROM member_list_view` を打って 0 が 6 件全てで返ることを確認

## 2. 共有型・Smart constructor

- [x] 2.1 reservation の `Member` 型に `correctionRequests` 配列を追加。admin 側は `MemberListRow` に `correction_request_count` を追加
- [x] 2.2 `CorrectionRequest` / `CorrectionField` / `MemberProfile` 型を `@high-q/shared` に定義
- [x] 2.3 `CorrectionField` enum を `'last_name' | 'first_name' | 'birthday' | 'phone' | 'experience_level' | 'nickname'` で定義
- [x] 2.4 `createBirthday` 既存実装で過去日付 + 100 年範囲を担保していることを確認（変更なし）
- [x] 2.5 `MemberListRow` に `correction_request_count: number` を追加
- [x] 2.6 admin の member-client SELECT 列に `correction_request_count` を追加

## 3. admin 側: 修正依頼の作成・取り下げ機能

- [x] 3.1 `apps/admin/src/features/correction-request/api/createCorrectionRequest.ts` 作成: SELECT profile → 重複チェック → JS で append → UPDATE
- [x] 3.2 `apps/admin/src/features/correction-request/api/withdrawCorrectionRequest.ts` 作成: SELECT profile → filter out → UPDATE (idempotent)
- [x] 3.3 `apps/admin/src/features/correction-request/ui/CorrectionRequestCreateDialog.vue` 作成: field select + message textarea + 投稿 CTA + キャンセル + 文字数カウンタ + 重複時 inline エラー
- [x] 3.4 `apps/admin/src/features/correction-request/ui/CorrectionRequestSection.vue` 作成: 未対応エントリ一覧 + 取り下げボタン + 空状態 + 新規作成ボタン
- [x] 3.5 useCorrectionRequests composable で楽観的更新を含む状態管理
- [x] 3.6 unit test: createCorrectionRequest 7 ケース + withdrawCorrectionRequest 4 ケース

## 4. admin 側: 詳細 sheet と一覧バッジへの統合

- [x] 4.1 `apps/admin/src/widgets/member-detail-sheet/` で `CorrectionRequestSection` を運営メモ編集フォームの下に挿入。`useAuthSession` から adminMemberId 解決
- [x] 4.2 `MembersListTable.vue` の名前セル内に `correction_request_count >= 1` 時の「修正依頼 N」warn tone Badge を追加
- [x] 4.3 `MembersListTable.spec.ts` を新規作成し、バッジ表示 / 非表示 / 複数行混在の 3 ケース追加
- [x] 4.4 detail sheet は新セクション挿入のみで既存テストに影響なし

## 5. reservation 側: 自動消化ロジックを各 mutation に組み込む

- [x] 5.1 `updateMyName` に SELECT profile → removeCorrectionRequests(['last_name', 'first_name']) → UPDATE field + profile を統合
- [x] 5.2 `updateMyNickname` に同等の自動消化 (`['nickname']`)
- [x] 5.3 `updateMyPhone` に同等 (`['phone']`)
- [x] 5.4 `updateMyBirthday` 関数を新規作成（`createBirthday` 経由 + UPDATE + 自動消化）
- [x] 5.5 `updateMyExperienceLevel` を拡張: 同 mutation 内で `experience_level` 自動消化
- [x] 5.6 各 mutation の spec を更新（updateMyAccount.spec / updateMyExperienceLevel.spec で消化テスト + birthday の新規テスト）
- [x] 5.7 共通 helper `removeCorrectionRequests` を `@high-q/shared` に抽出（spec 17 ケース付き）

## 6. reservation 側: 生年月日編集モーダル新設

- [x] 6.1 `apps/reservation/src/features/profile-account/ui/BirthdayEditDialog.vue` を新規作成（PhoneEditDialog 構造を踏襲、Input type=date）
- [x] 6.2 `apps/reservation/src/features/profile-account/index.ts` の export に追加
- [x] 6.3 UI test は AlertDialog の portal 仕様で brittle なため removeMethod。動作確認は API spec + 手動 PR Preview で担保

## 7. reservation 側: ProfilePage の `?edit=` クエリ起動

- [x] 7.1 `ProfilePage.vue` の `EditField` 型に `'birthday'` を追加
- [x] 7.2 `<BirthdayEditDialog>` を template に追加
- [x] 7.3 `onMounted` で `route.query.edit` を読み取り、許容値なら `editField.value` を初期化
- [x] 7.4 dialog close 時に `router.replace` で `?edit=` クエリを削除
- [x] 7.5 `?edit=experienceLevel` で LEVEL セクションへスクロール + 一時 ring ハイライト

## 8. reservation 側: home (`/events`) のバナー

- [x] 8.1 `apps/reservation/src/widgets/correction-request-banner/` を新設
- [x] 8.2 `CorrectionRequestBanner.vue` を作成: 未対応エントリを縦に積み上げ表示、各行に field 日本語ラベル + message + 「修正する」ボタン
- [x] 8.3 field → 編集動線のマッピング（last_name/first_name → displayName、birthday/phone/nickname → 同名 query、experience_level → experienceLevel）
- [x] 8.4 LEVEL セクションへのスクロール + 一時 highlight 動線 (ProfilePage 側で受ける)
- [x] 8.5 `EventsListPage.vue` のヘッダ直後にバナーを配置 (`member.correctionRequests` 由来で表示)
- [x] 8.6 banner component の spec 10 ケース追加（0 件 / 1 件 / 複数件 / 各 field の遷移 / dismiss UI なし）

## 9. spec / 型 / docs 整備

- [x] 9.1 admin `MemberListRow` 型に `correction_request_count` を追加し、SELECT が view 全列を返すよう変更
- [x] 9.2 reservation `Member` 型に `correctionRequests` を追加（profile の派生として）

## 10. 統合動作確認（dev）

- [ ] 10.1 dev で admin から会員 1 名に `field=birthday` の修正依頼を作成 → 当該会員でログイン → home バナー表示 → 「修正する」→ /profile?edit=birthday でモーダル → 保存 → バナー消滅 → admin の修正依頼セクションでも消えていることを確認 — 翔太郎くんが PR Preview で確認
- [ ] 10.2 同じ会員に `field=last_name` + `field=first_name` の 2 件を作成 → home バナーで 2 件表示 → 氏名編集 1 回で両方消える挙動を確認 — 同上
- [ ] 10.3 admin の取り下げ操作が会員サイトバナーに即時反映される（次回ログイン時）ことを確認 — 同上
- [ ] 10.4 admin 一覧で「修正依頼 N」バッジが N 件分表示されること、N=0 でバッジ非表示を確認 — 同上
- [ ] 10.5 `?edit=experienceLevel` で LEVEL セクションへスクロール + ハイライトを確認 — 同上
- [ ] 10.6 `?edit=invalid` のような未サポートクエリで何も起きないことを確認 — 同上

## 11. リリース前最終チェック

- [x] 11.1 全パッケージ vitest 緑: shared 118 / reservation 653 / admin 809 / edge-functions 128 = **計 1,708 tests**
- [x] 11.2 admin / reservation の build 緑
- [x] 11.3 admin / reservation / shared の typecheck 緑
- [ ] 11.4 PR 作成。Test Plan に「PR Preview で修正依頼の作成・自動消化・取り下げ・LEVEL スクロールの 4 ケース動作確認」を明記
- [ ] 11.5 ship 時に prd Supabase に migration 手動 push（CI / `/opsx-ship` 経由）+ master merge
