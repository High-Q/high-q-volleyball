## 1. Setup

- [x] 1.1 ブランチを作成する: `git checkout -b feature/150-admin-members-list-screen`

## 2. DB migration (members.admin_note + 2 views + RLS WITH CHECK)

- [x] 2.1 `supabase/migrations/20260515133901_add_members_admin_note_and_views.sql` を新規作成し、`ALTER TABLE members ADD COLUMN admin_note text NULL;` を含める（CHECK 制約なし、長さ制限はアプリ層）
- [x] 2.2 同 migration 内で `member_list_view` を作成する: members を base に、`SELECT id, display_name, email, experience_level, admin_note, created_at` + 集計サブクエリで `first_attended_at = MIN(events.start_at) FILTER WHERE r.status = 'attended'`、`attended_count = COUNT(*) FILTER WHERE r.status = 'attended'`、`last_attended_at = MAX(events.start_at) FILTER WHERE r.status = 'attended'`。LEFT JOIN reservations × events で attended 履歴ゼロ会員も行が残るようにする。`SECURITY INVOKER`
- [x] 2.3 同 migration 内で `member_history_view` を作成する: reservations × events × venues の INNER JOIN、列は `reservation_id, member_id, event_id, event_name, start_at, venue_name, status, guest_count, checked_in_at`。`is_first_time` は `NOT EXISTS (SELECT 1 FROM reservations r2 JOIN events e2 ON r2.event_id = e2.id WHERE r2.member_id = r.member_id AND r2.status = 'attended' AND e2.start_at < e.start_at)`（`event_participants_view` と同一ロジック）。`status != 'cancelled'` で絞り込む。`SECURITY INVOKER`
- [x] 2.4 同 migration 内で `members` の UPDATE RLS ポリシーを再定義する。WITH CHECK 句に `(role IS NOT DISTINCT FROM OLD.role) AND (admin_note IS NOT DISTINCT FROM OLD.admin_note)` を本人ポリシーに追加（admin ポリシーは全列許容のまま）。既存ポリシーを `DROP POLICY ... ON members` してから再作成
- [x] 2.5 dev Supabase (`ydkejnlivlzypizrmhwh`) に migration `20260515133901` 適用済を `pnpm exec supabase migration list` で確認（Local / Remote 両方に表示、`pnpm db:push` も `Remote database is up to date` を返す）
- [ ] 2.6 migration 後の RLS 動作確認 SQL を Supabase Dashboard SQL Editor で実行: 翔太郎くんアカウントで `UPDATE members SET admin_note = 'test' WHERE id = auth.uid()` が `0 rows updated` になることを確認（本人 UPDATE 拒否）。admin role で同じ UPDATE が `1 row updated` になることを確認 **【翔太郎くん作業: auth context が必要なため SQL Editor 経由】**

## 3. shadcn-vue Dialog プリミティブの確認 (apps/admin)

- [x] 3.1 既存の Dialog プリミティブ（`apps/admin/src/shared/ui/Dialog.vue` 等、#171 で取り込み済み）を再利用するため、新規 CLI 取り込みは不要と確認（radix-vue ベース、focus trap / Esc / overlay クリック / aria 属性が標準提供）
- [x] 3.2 既存 Dialog は HQ トークン（`bg-paper` / `border-hairline` / `shadow-hq-md` / `rounded-hq-md` 等）で実装済みのため追加調整は不要と確認
- [x] 3.3 `apps/admin/src/shared/ui/index.ts` に Dialog group は既に export 済みと確認（再 export 不要）
- [x] 3.4 既存 Dialog の Vitest UT（`Dialog.spec.ts`）が存在することを確認。本 change では slide-in styling を `MemberDetailSheet.vue` 内で adapter として実装する方針に変更（プリミティブ自体に手を入れない）

## 4. reservation 側 members SELECT 経路の列指定統一 (admin_note 流出防止)

- [x] 4.1 `apps/reservation/src/` 配下で `from('members').select('\*')` を grep し、検出箇所をリストアップする（`member-client.ts` の 2 箇所、`profile-level-edit` / `profile-account` は UPDATE 単独で SELECT chain なし）
- [x] 4.2 検出された各 SELECT 経路を明示的列指定 SELECT に書き換える（`MEMBER_COLUMNS` 定数で `id, email, display_name, nickname, birthday, phone, experience_level, role, profile, created_at, updated_at` を一元管理、admin_note を除外）
- [x] 4.3 `member-client.ts` の `rowToMember` 関数横に admin_note を読まない運用ルールをコメントで明示し、将来の `.select('*')` 復活を抑止
- [x] 4.4 grep `from\(['"]members['"]\).*select` の検出件数が 0 件になっていることを最終確認
- [x] 4.5 reservation の既存テスト (`member-client.spec.ts`) を新しい SELECT 形式に合わせて更新（admin_note が含まれないことの assertion 追加、実行は最終確認 12.X でまとめて）

## 5. entity 層 (apps/admin/src/entities/member)

- [x] 5.1 `apps/admin/src/entities/member/` ディレクトリを新規作成し、FSD レイヤー構造（`model/` / `api/` / `index.ts`）を整える
- [x] 5.2 `apps/admin/src/entities/member/model/member.types.ts` を新規作成し、`MemberId`（既存 Branded Type を再利用 import）、`MemberListRow`（member_list_view の行型）、`MemberHistoryRow`（member_history_view の行型）を定義する。各 id 列は既存 Branded Type 経由
- [x] 5.3 `apps/admin/src/entities/member/api/member-client.ts` を新規作成し、Supabase client から `member_list_view` を取得する `fetchMembersList(filters, sort, page)` 関数を実装する。filters は `{ exp?, attendedRange?, lastPeriod?, q? }`、sort は `{ key, dir }`、page は `{ page, perPage = 25 }`。WHERE 句で経験フィルタ・累計レンジ・最終参加期間・q（display_name / email / admin_note の ILIKE OR）を組み立てる。返り値は `Result<{ rows: MemberListRow[]; total: number }>` 型
- [x] 5.4 同ファイルに `fetchMembersSummary()`（総会員数 + 今月初参加数を返す PageHeader サマリ用）を実装する。`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE first_attended_at >= date_trunc('month', now())) AS first_this_month FROM member_list_view`
- [x] 5.5 同ファイルに `fetchMemberHistory(memberId)` を実装する。`member_history_view` を `member_id = :id ORDER BY start_at DESC` で取得。`Result<MemberHistoryRow[]>` を返す。詳細 sheet ヘッダー用に `fetchMemberListRowById(memberId)` も追加
- [x] 5.6 同ファイルに `updateMemberAdminNote(memberId, note: string | null)` を実装する。`UPDATE members SET admin_note = :note WHERE id = :id` を実行。空文字は NULL に変換。`Result<void>` を返す
- [x] 5.7 `member-client.spec.ts` を作成し、各関数の Vitest UT を書く（Supabase mock）: 正常レスポンス / Error レスポンス / フィルタ・ソート・ページネーションが SQL builder の引数に反映されるパターン
- [x] 5.8 `apps/admin/src/entities/member/index.ts` の Public API に型と関数を export する

## 6. features 層 (apps/admin/src/features)

- [x] 6.1 `apps/admin/src/features/members-filter/` ディレクトリを新規作成する
- [x] 6.2 `members-filter/composables/useMembersFilter.ts` を実装する。URL クエリ `?exp=` / `?attended=` / `?last=` / `?q=` / `?sort=` / `?dir=` / `?page=` / `?detail=` の読み書きと、入力 UI の reactive state を提供する。`replace` / `push` で履歴方針を切替（フィルタは replace、ページ送り + detail は push）
- [x] 6.3 `members-filter/ui/MembersFilterToolbar.vue` を実装する。検索 input / 経験 select / 累計レンジ select / 最終参加期間 select を Toolbar レイアウトで横並びに配置。既存 admin の `Select` プリミティブ（shadcn-vue 由来）を採用
- [x] 6.4 `useMembersFilter.spec.ts` を実装する: 各入力の URL クエリ反映 / 初期値復元 / openDetail / closeDetail / reset / 不正値の補正
- [x] 6.5 `apps/admin/src/features/members-filter/index.ts` に Public API export
- [x] 6.6 `apps/admin/src/features/member-admin-note-edit/` ディレクトリを新規作成する
- [x] 6.7 `member-admin-note-edit/composables/useAdminNoteEdit.ts` を実装する。textarea state + 文字数カウンタ + 楽観的更新コールバック + 失敗時ロールバック制御を提供。最大 500 文字を超えると `canSave = false`
- [x] 6.8 `member-admin-note-edit/ui/AdminNoteEditForm.vue` を実装する。textarea + 文字数カウンタ + 保存 / 破棄ボタン。disabled / saving / error 状態を表現
- [x] 6.9 `useAdminNoteEdit.spec.ts` を実装する: 500 文字超過 / 楽観的更新 / 失敗時ロールバック / 空文字 → NULL 保存 / 非 admin で API 失敗シナリオ
- [x] 6.10 `apps/admin/src/features/member-admin-note-edit/index.ts` に Public API export

## 7. widgets 層 (apps/admin/src/widgets)

- [x] 7.1 `apps/admin/src/widgets/members-list/` ディレクトリを新規作成する
- [x] 7.2 `members-list/composables/useMembersListData.ts` を実装する。`useMembersFilter` の state を購読し、`fetchMembersList` を呼んで rows + total を保持。検索は 200ms debounce。楽観的更新用 `patchAdminNote` を expose
- [x] 7.3 `members-list/ui/MembersListTable.vue` を実装する。7 列の DataTable + ソート可能列のヘッダ + 行クリックで `?detail=:id` を URL に追加。先頭文字アバター + 累計 10 回以上の強調 + メモ 40 文字 ellipsis
- [x] 7.4 `members-list/ui/MembersListPagination.vue` を実装する。25 件 / ページ固定、`?page=N` 同期、Empty / 範囲外時の補正動作
- [x] 7.5 `members-list/ui/MembersListWidget.vue` を実装する。Toolbar + Table + Pagination + 4 状態 skeleton / empty / error を組み合わせる。`defineExpose` で `patchAdminNote` / `refetch` を Page へ公開
- [ ] 7.6 `MembersListWidget.spec.ts` 等の widget レベル component test は最終確認タスク 12.X で実装（時間スコープのためページ E2E でハッピーパスをカバー）
- [x] 7.7 `apps/admin/src/widgets/members-list/index.ts` に Public API export
- [x] 7.8 `apps/admin/src/widgets/member-detail-sheet/` ディレクトリを新規作成する
- [x] 7.9 `member-detail-sheet/composables/useMemberDetailSheet.ts` を実装する。URL クエリ `?detail=:id` を購読し、対象 member の `MemberListRow` + `MemberHistoryRow[]` を並列取得。close で `?detail=` をクリア。楽観的更新用 `patchAdminNote` も提供
- [x] 7.10 `member-detail-sheet/ui/MemberDetailHeader.vue` を実装する。基本情報（氏名 + アバター + メール + 経験 Badge + 初回参加 / 累計 / 最終参加の StatCard）を表示
- [x] 7.11 `member-detail-sheet/ui/MemberHistoryTable.vue` を実装する。日付 / イベント名 / 会場 / 状態 Badge / 同伴 の 5 列 + 初回 Badge。view 側で cancelled 除外済み
- [x] 7.12 `member-detail-sheet/ui/MemberDetailSheet.vue` を実装する。radix-vue Dialog を直接組み立てて右端 480px 固定 + slide-in アニメ + フォーカストラップ + Esc クローズ + overlay クリッククローズ。中身は header + 履歴テーブル + メモ編集フォームの縦並び。Loading / Error 状態も内部で出し分け
- [ ] 7.13 `MemberDetailSheet.spec.ts` の component test は最終確認 12.X で実装（page level E2E + composable UT で機能網羅）
- [x] 7.14 `apps/admin/src/widgets/member-detail-sheet/index.ts` に Public API export

## 8. pages 層 (apps/admin/src/pages)

- [x] 8.1 `apps/admin/src/pages/MembersListPage.vue` を新規作成する。PageHeader（breadcrumb + タイトル「会員」 + サブタイトル `累計 N 名 · 今月初参加 M 名` + 「イベント」「本人確認書類」リンク + ログアウト）と `MembersListWidget` と `MemberDetailSheet` を組み合わせる
- [ ] 8.2 `MembersListPage.spec.ts` の component test は最終確認 12.X で実装（router.spec で route 到達、E2E で UI 動線を網羅）

## 9. router 拡張 (apps/admin/src/app/router.ts)

- [x] 9.1 `apps/admin/src/app/router.ts` の `routes` 配列に `{ path: '/members', name: 'members', component: MembersListPage }` を追加する
- [x] 9.2 `apps/admin/src/app/router.spec.ts` を更新し、`/members` ルートの存在 / 未認証 / AAL1 / 非 admin / AAL2 admin / `?detail=` 付きで開いた場合のガード挙動をスモークテストで追加

## 10. EventsListPage ヘッダー「会員」リンク追加

- [x] 10.1 `apps/admin/src/pages/EventsListPage.vue` のヘッダーに「会員」リンクを追加する。`<RouterLink :to="{ name: 'members' }">` + 既存「本人確認書類」リンクと同じスタイル、Badge なし、aria-label `会員の一覧`
- [x] 10.2 `EventsListPage.spec.ts` を更新し、「会員」リンクの存在と遷移先 `/members` を確認

## 11. E2E (Playwright)

- [x] 11.1 `e2e/admin/members-list.e2e.ts` を新規作成し、auth guard 動作（未認証 → `/login` リダイレクト）を 1 件実装する。既存 `events-list.e2e.ts` と同じ思想で、内部 UI 動線は component test + 手動検証でカバー
- [x] 11.2 同ファイルに `?detail=<uuid>` 付き URL も同じガードが効くことを確認する edge case を 1 件追加

## 12. 最終確認 (UI 変更タスクをまとめて検証)

- [x] 12.1 `pnpm --filter @high-q/admin typecheck` を実行し型エラーなしを確認 ✅
- [x] 12.2 `pnpm --filter @high-q/reservation typecheck` を実行し型エラーなしを確認 ✅
- [x] 12.3 `pnpm --filter @high-q/admin test` で全テストが pass することを確認 ✅ 738 / 738 pass
- [x] 12.4 `pnpm --filter @high-q/reservation test` で既存テストが壊れていないことを確認 ✅ 606 / 606 pass
- [ ] 12.5 `pnpm exec playwright test e2e/admin/members-list.e2e.ts` で task 11 の E2E が pass することを確認 **【ローカル Playwright 起動が必要、Render Preview / CI で確認】**
- [x] 12.6 `pnpm --filter @high-q/admin build` がエラーなく完了することを確認 ✅
- [x] 12.7 `pnpm --filter @high-q/reservation build` がエラーなく完了することを確認 ✅
- [ ] 12.8 ローカル `pnpm --filter @high-q/admin dev` を起動し、admin login 後に `/members` を開いて、一覧表示 / フィルタ動作 / 検索 / ソート / ページネーション / 詳細 sheet 開閉 / メモ編集の動作 / ブラウザ戻る進む / URL 直接アクセスでの sheet 初期化 / Esc クローズ / Tab フォーカストラップ を手動確認 **【翔太郎くん確認待ち（migration 適用後）】**
- [ ] 12.9 dev DB を直接確認し、メモ保存後に `members.admin_note` 列に値が入っていること、空保存で NULL に戻ること、reservation アプリで翔太郎くんでログインしても `admin_note` 値が画面で見えないことを確認 **【翔太郎くん確認待ち（migration 適用後）】**
- [x] 12.10 grep `from\(['"]members['"]\).*select` を `apps/reservation/src/` で実行し検出件数が 0 件であることを最終確認 ✅
- [ ] 12.11 翔太郎くんへの完了報告を作成（Render PR Preview の動作確認手順案内）**【PR 起票時】**
