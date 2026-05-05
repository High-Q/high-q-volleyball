# Tasks: admin 本人確認書類レビュー (#171)

> **承認ゲート**: Proposal + Design + spec (admin-identity-document-review + data-schema delta + reservation-identity-document-upload delta) + 本 Tasks の 4 ファイル群 (実 5 ファイル) が揃って承認されてから Apply に入る。
>
> **関連 Issue**:
> - #92 (✅ Done) reservation 本人確認書類アップロード
> - #147 (✅ Done) identity_documents スキーマ + RLS + Storage バケット
> - **#171 (本件)** admin レビュー画面 + pending 会員予約許容方針 + 連鎖予約キャンセル + reservation 側 hasIdentityDocument 判定変更
> - #196 (Todo → 本件マージ時にクローズ予定) pending 会員予約禁止ガード — 翔太郎くん 2026-05-05 方針転換で本件で代替実装、Supersedes

## 進捗

- 完了: 0 / N タスク

---

## 1. 事前作業

- [ ] 1.1 Issue #171 を本サイクルの作業 Issue として確認 (Epic は `gh issue list --label epic` で再確認、admin 系 Epic 配下に配置)
- [ ] 1.2 ブランチ作成: `git checkout -b feature/171-admin-identity-document-review`
- [ ] 1.3 propose 4 ファイル群 (proposal / design / specs/admin-identity-document-review / specs/data-schema / tasks) を Apply 初期コミット

## 2. 既存資産の確認 (verify only、実装ゼロ)

- [ ] 2.1 `packages/shared/src/types/labels.ts` の `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` が 10 種完備していることを確認 (reservation 側 #92 で SSOT 化済を再利用)
- [ ] 2.2 `packages/shared/src/types/entities.ts` の `IdentityDocument` / `IdentityDocumentRow` / `IdentityDocumentStatus` 型が `storage_path_front` / `storage_path_back` 構造になっていることを確認
- [ ] 2.3 `apps/admin/src/features/auth/` の `useAuthSession` が AAL2 + admin を担保していることを確認 (events list / event-detail spec と同じ前提)
- [ ] 2.4 `apps/admin/src/shared/ui/index.ts` で `AlertDialog` / `Toast` / `Skeleton` / `Table` / `Select` / `Input` / `Label` / `FormField` が export 済を確認
- [ ] 2.5 既存 RLS (rls-policies spec) で admin が identity_documents の SELECT/UPDATE/DELETE 全件可能、Storage `identity-documents` バケットのオブジェクト全件 SELECT/DELETE 可能を確認 (新規ポリシー不要)

## 3. DB Migration: storage_path_front の NOT NULL 解除

- [ ] 3.1 `supabase/migrations/<timestamp>_relax_identity_documents_storage_path_front.sql` を新規作成: `ALTER TABLE public.identity_documents ALTER COLUMN storage_path_front DROP NOT NULL`
- [ ] 3.2 `packages/shared/src/types/entities.ts` の `IdentityDocumentRow` / `IdentityDocument` 型を `storage_path_front: string | null` に変更
- [ ] 3.3 `packages/shared/src/types/entities.spec.ts` に `storage_path_front` の NULL 許容を確認する spec を追加 (TDD)
- [ ] 3.4 `pnpm --filter @high-q/shared test` 通過確認
- [ ] 3.5 **【ユーザー手動】** Supabase Dashboard (Studio) または `supabase db push` でマイグレーションを本番適用、列構造を確認 (Claude 環境に supabase CLI 不在のため)

## 4. shared/ui Dialog プリミティブ取り込み (TDD)

- [ ] 4.1 `apps/admin/src/shared/ui/Dialog.vue` を新規作成 (radix-vue `DialogRoot` + `DialogPortal` ベース、HQ token で着色、a11y AA)
- [ ] 4.2 `DialogContent.vue` / `DialogTrigger.vue` / `DialogHeader.vue` / `DialogFooter.vue` / `DialogTitle.vue` / `DialogDescription.vue` / `DialogClose.vue` を新規作成 (AlertDialog の構造を参考にしつつ Dialog 用に調整)
- [ ] 4.3 `Dialog.spec.ts` を新規作成: 開閉 / フォーカストラップ / ESC で閉じる / 背景クリックで閉じる / aria-labelledby / Tab ループの 7 spec
- [ ] 4.4 `apps/admin/src/shared/ui/index.ts` に Dialog 群を追加 export
- [ ] 4.5 `pnpm --filter @high-q/admin test shared/ui/Dialog` 通過確認

## 5. entities/identity-document スライス (TDD)

- [ ] 5.1 `apps/admin/src/entities/identity-document/model/identityDocument.types.ts` を作成: `@high-q/shared` から `IdentityDocumentId` / `DocumentType` / `IdentityDocument` / `IdentityDocumentStatus` を再 export、admin 用の `IdentityDocumentListRow` / `IdentityDocumentDetail` 型 (member join 含む) を定義
- [ ] 5.2 `api/identityDocumentQueries.spec.ts` を作成: list (WHERE / ORDER / RANGE) / detail (member join) / pendingCount (count head) の 6-8 spec
- [ ] 5.3 `api/identityDocumentQueries.ts` を実装: `list({ status, q, page })` / `detail(id)` / `pendingCount()` を export
- [ ] 5.4 `api/getSignedUrl.spec.ts` を作成: `createSignedUrl(path, 3600)` 呼び出し / Result 型分岐 (storage_failed / network) の 4 spec
- [ ] 5.5 `api/getSignedUrl.ts` を実装
- [ ] 5.6 `apps/admin/src/entities/identity-document/index.ts` (Public API) で types / queries / getSignedUrl を re-export
- [ ] 5.7 `pnpm --filter @high-q/admin test entities/identity-document` 通過確認

## 6. features/identity-documents-filter (TDD)

- [ ] 6.1 `composables/useIdentityDocumentsFilter.spec.ts` を作成: URL クエリ ⇄ state 双方向変換 / デフォルト pending 復元 / フィルタ切替 / 検索 / ページネーション URL 同期の 8-10 spec
- [ ] 6.2 `composables/useIdentityDocumentsFilter.ts` を実装 (events-filter 既存実装を参考)
- [ ] 6.3 `types.ts` に `IdentityDocumentsFilterState` 型を export
- [ ] 6.4 `apps/admin/src/features/identity-documents-filter/index.ts` (Public API)
- [ ] 6.5 `pnpm --filter @high-q/admin test features/identity-documents-filter` 通過確認

## 7. features/identity-document-pending-badge (TDD)

- [ ] 7.1 `composables/usePendingCount.spec.ts` を作成: fetch 成功 / 0 件 / エラー / visibilitychange で再 fetch / mount 時の自動 fetch の 6-7 spec
- [ ] 7.2 `composables/usePendingCount.ts` を実装 (`onMounted` + `document.visibilitychange` 購読、後で mutation success 後に呼ぶための `refresh()` も export)
- [ ] 7.3 `ui/PendingCountBadge.vue` を新規作成: `count` prop + `aria-label="未対応の書類 N 件"` + 0 件で非表示 + 赤系 Badge スタイル (HQ token)
- [ ] 7.4 `PendingCountBadge.spec.ts` を作成: 0 件で非表示 / N 件で aria-label / クラス名 (赤系) の 4 spec
- [ ] 7.5 `apps/admin/src/features/identity-document-pending-badge/index.ts` (Public API)
- [ ] 7.6 `pnpm --filter @high-q/admin test features/identity-document-pending-badge` 通過確認

## 8. features/identity-document-approve (TDD)

- [ ] 8.1 `composables/useIdentityDocumentApprove.spec.ts` を作成: Result 型分岐 (成功 / db_failed / already_reviewed) / WHERE 句に `status='pending'` を含む / mutation 成功後に pendingCount.refresh を呼ぶ の 6-7 spec
- [ ] 8.2 `composables/useIdentityDocumentApprove.ts` を実装 (`approve(id, adminMemberId)` を export、Result<void, ApproveError> を返す)
- [ ] 8.3 `ui/IdentityDocumentApproveDialog.vue` を新規作成: AlertDialog ラッパー (キャンセル / 承認する) + in-flight 中の aria-busy + inline error 表示
- [ ] 8.4 `IdentityDocumentApproveDialog.spec.ts` を作成: AlertDialog 開閉 / 承認確定 / inline error / 二重承認時のエラー表示の 5 spec
- [ ] 8.5 `apps/admin/src/features/identity-document-approve/index.ts` (Public API)
- [ ] 8.6 `pnpm --filter @high-q/admin test features/identity-document-approve` 通過確認

## 9. features/identity-document-reject (TDD)

- [ ] 9.1 `templates/rejectMailBody.spec.ts` を作成: 文言テンプレート構築 / URL エンコード / 改行コード保持 / `cancelledCount > 0` のとき body にキャンセル件数明記 / `cancelledCount === 0` のとき省略の 6 spec
- [ ] 9.2 `templates/rejectMailBody.ts` を実装: `buildRejectMailBody(memberName: string, reason: string, cancelledCount: number): string` を純粋関数として export (cancelledCount で条件分岐)
- [ ] 9.3 `composables/useIdentityDocumentReject.spec.ts` を作成: Result 型分岐 (成功 / invalid_reason / db_failed / already_reviewed / cancel_failed_after_reject) / 理由空・501字でエラー / WHERE 句条件 / 連鎖予約キャンセル発動 (reservations status='reserved'/'waitlist' を一括 cancelled に UPDATE、attended は除外) / cancelledCount を Result.value に含む / pendingCount.refresh の 12-14 spec
- [ ] 9.4 `composables/useIdentityDocumentReject.ts` を実装: identity_documents UPDATE → 連鎖予約キャンセル UPDATE → Result 返却の順
- [ ] 9.5 `ui/IdentityDocumentRejectDialog.vue` を新規作成: AlertDialog ラッパー + 理由テキストエリア (必須・最大 500 字) + 文字数カウンター + 「差し戻す」disabled 制御 + 成功後に mailto: リンクを表示する 2 ステップ Dialog (mailto: href に cancelledCount を含めたテンプレート展開を反映)
- [ ] 9.6 `IdentityDocumentRejectDialog.spec.ts` を作成: 理由未入力で disabled / 501 字で disabled + 赤色カウンター / 差し戻し成功後に mailto: リンク表示 / mailto: href の構築検証 (cancelledCount 反映) / 連鎖キャンセル失敗時の inline error 表示 / 二重操作防止の 8-10 spec
- [ ] 9.7 `apps/admin/src/features/identity-document-reject/index.ts` (Public API)
- [ ] 9.8 `pnpm --filter @high-q/admin test features/identity-document-reject` 通過確認

## 10. features/identity-document-mask-delete (TDD)

- [ ] 10.1 `templates/maskDeleteMailBody.spec.ts` を作成: 文言テンプレート構築 / URL エンコード / 改行コード保持 / `cancelledCount > 0` のとき body にキャンセル件数明記 / `cancelledCount === 0` のとき省略の 6 spec
- [ ] 10.2 `templates/maskDeleteMailBody.ts` を実装: `buildMaskDeleteMailBody(memberName: string, cancelledCount: number): string` を純粋関数として export (cancelledCount で条件分岐)
- [ ] 10.3 `composables/useIdentityDocumentMaskDelete.spec.ts` を作成: Result 型分岐 (成功 / storage_failed / db_failed_after_storage_delete / cancel_failed_after_mask_delete / already_reviewed) / 表 + 裏削除の Storage remove 呼び出し / DB UPDATE で `storage_path_front` / `storage_path_back` を NULL に設定 / 固定 rejection_reason / 連鎖予約キャンセル発動 / cancelledCount を Result.value に含む / pendingCount.refresh の 12-14 spec
- [ ] 10.4 `composables/useIdentityDocumentMaskDelete.ts` を実装 (Storage 削除 → DB UPDATE → 連鎖予約キャンセル UPDATE の順、各段階の失敗時の error code 区別)
- [ ] 10.5 `ui/IdentityDocumentMaskDeleteDialog.vue` を新規作成: AlertDialog ラッパー (確認文言固定) + 削除実行 + 成功後に mailto: リンク表示 (cancelledCount 反映) + Storage / DB / cancel の各失敗パターンの inline error
- [ ] 10.6 `IdentityDocumentMaskDeleteDialog.spec.ts` を作成: 開閉 / 削除確定 / mailto: リンク表示 (cancelledCount 反映) / Storage 失敗時の inline error / DB 失敗時の手動復旧誘導 / 連鎖キャンセル失敗時の手動復旧誘導 / 二重操作防止の 8 spec
- [ ] 10.7 `apps/admin/src/features/identity-document-mask-delete/index.ts` (Public API)
- [ ] 10.8 `pnpm --filter @high-q/admin test features/identity-document-mask-delete` 通過確認

## 11. widgets/identity-documents-list (UI、最終一括テスト)

UI 連続変更タスクのため、各タスク後の vitest 実行は省略 (タスク 16 の最終一括で実行)。

- [ ] 11.1 `widgets/identity-documents-list/composables/useIdentityDocumentsListData.ts` を実装: filter state + queries.list を組み合わせ、4 状態 (Loading / Empty / Error / Success) を `pageState` で導出
- [ ] 11.2 `ui/IdentityDocumentsToolbar.vue` を実装: フィルタ Select + 検索 Input + Page indicator (events list 既存パターン参考)
- [ ] 11.3 `ui/IdentityDocumentsTable.vue` を実装: 6 列 DataTable (提出日時 / ユーザー名 / メール / 書類種別 Badge / ステータス Badge / 詳細リンク) + マイナンバー時の警告色
- [ ] 11.4 `ui/IdentityDocumentsListSkeleton.vue` (6 行 skeleton) / `IdentityDocumentsListEmpty.vue` / `IdentityDocumentsListError.vue` を実装
- [ ] 11.5 `ui/IdentityDocumentsListWidget.vue` を実装: 上記コンポーネントを `pageState` で出し分け + ページネーションコントロール
- [ ] 11.6 `apps/admin/src/widgets/identity-documents-list/index.ts` (Public API)

## 12. widgets/identity-document-detail (UI、最終一括テスト)

- [ ] 12.1 `widgets/identity-document-detail/composables/useIdentityDocumentDetailData.ts` を実装: route.params.id から queries.detail を fetch + signed URL 発行 (front / back) + 4 状態 + signed URL 単独失敗の handle
- [ ] 12.2 `ui/IdentityDocumentDetailTopBar.vue` を実装: パンくず + display_name + email + 書類種別 Badge + ステータス Badge
- [ ] 12.3 `ui/IdentityDocumentMemberCard.vue` を実装: display_name / email / birthday / phone (NULL は「未登録」) / experience_level Badge
- [ ] 12.4 `ui/IdentityDocumentMynumberReminder.vue` を実装: マイナンバー時のみ赤系バナー (`role="alert"`)
- [ ] 12.5 `ui/IdentityDocumentImagePreview.vue` を実装: 表面 + 裏面任意の 2 タイル (aspect-ratio 85:54) + signed URL 表示 + 「画像は削除済みです」表示 + signed URL 失敗時の inline error + Dialog 拡大トリガー
- [ ] 12.6 `ui/IdentityDocumentImageDialog.vue` を実装: shared/ui Dialog ベース + 1x/2x/4x ズーム切替ボタン + ESC 閉じる
- [ ] 12.7 `ui/IdentityDocumentActionsFooter.vue` を実装: 承認 / 差し戻し ボタン (常時表示) + マスク漏れ削除 ボタン (マイナンバー時のみ) + status != 'pending' で全 disabled + in-flight 中の aria-busy + features の各 Dialog をマウント
- [ ] 12.8 `ui/IdentityDocumentDetailWidget.vue` を実装: 上記コンポーネントを `pageState` で出し分け
- [ ] 12.9 `apps/admin/src/widgets/identity-document-detail/index.ts` (Public API)

## 13. pages + router 統合

- [ ] 13.1 `pages/IdentityDocumentsListPage.vue` を実装 (widget マウントのみ)
- [ ] 13.2 `pages/IdentityDocumentDetailPage.vue` を実装 (widget マウントのみ)
- [ ] 13.3 `app/router.ts` に 2 ルートを追加 (`/identity-documents`, `/identity-documents/:id`)、既存 auth guard を流用
- [ ] 13.4 `router.spec.ts` に新規ルートの guard 動作 (未認証 / AAL1 / 非 admin) を確認する 3-4 spec を追加

## 14. TopNav Badge と Dashboard サマリ統合

- [ ] 14.1 admin の既存 layout (`apps/admin/src/app/AppLayout.vue` 相当 — Apply 開始時に再確認) に `/identity-documents` リンク + `<PendingCountBadge>` を追加
- [ ] 14.2 `pages/HomePlaceholder.vue` に「未確認の書類」サマリカードを追加 (`/events` カードの隣)、`usePendingCount` を使い 0 件で「すべて処理済」/ N 件で「N 件」赤系で表示
- [ ] 14.3 `HomePlaceholder.spec.ts` に pending サマリカード表示の 2-3 spec を追加 (0 件 / N 件)

## 15. 二重承認防止 + mutation 完了後の整合

- [ ] 15.1 各 mutation 成功後に `usePendingCount.refresh()` を呼んで TopNav Badge と Dashboard の数値を即時更新する経路を実装 (各 features composable で emit / store 共有 or window event 経由のいずれか、design.md D12 を参考)
- [ ] 15.2 詳細画面マウント時に取得した status が 'pending' 以外なら全アクションボタンを disabled する制御を `IdentityDocumentActionsFooter` の computed で実装
- [ ] 15.3 in-flight 中の全アクションボタン disabled (`aria-busy="true"`) を `IdentityDocumentActionsFooter` で制御

## 16. reservation 側 hasIdentityDocument 判定ロジック変更 (TDD)

- [ ] 16.1 `apps/reservation/src/entities/member/api/identity-document-existence.spec.ts` に新規 Scenario を追加: 「rejected のみ持つ member は false」「pending のみ持つ member は true」「approved のみ持つ member は true」「pending + rejected 混在は true」の 4 spec を新規 / 既存 spec の調整
- [ ] 16.2 `apps/reservation/src/entities/member/api/identity-document-existence.ts` の SQL クエリを `select id from identity_documents where member_id = ? and status in ('pending', 'approved') limit 1` に変更
- [ ] 16.3 `apps/reservation/src/features/auth/composables/useAuthSession.spec.ts` に「rejected のみ持つ session で hasIdentityDocument が false」「差し戻し後の refresh で false に更新」の 2 spec を追加
- [ ] 16.4 `apps/reservation/src/features/auth/composables/useAuthSession.ts` は **既存実装で動作するはず** (内部で identity-document-existence を呼んでいるため、SQL 変更が伝播)。spec が pass することを確認
- [ ] 16.5 `apps/reservation/src/app/router.spec.ts` に「rejected のみ持つ session で `/` → `/signup/identity` 強制誘導」「rejected のみ持つ session で `/signup/identity` 直リン → 描画される (無限ループしない)」の 2 spec を追加
- [ ] 16.6 `pnpm --filter @high-q/reservation test entities/member features/auth app/router` 通過確認

## 17. 統合テスト + ビルド確認

- [ ] 17.1 `pnpm --filter @high-q/admin test` 全 spec 通過確認
- [ ] 17.2 `pnpm --filter @high-q/reservation test` 全 spec 通過確認 (16. の変更を含む)
- [ ] 17.3 `pnpm --filter @high-q/admin typecheck` 通過 / `pnpm --filter @high-q/reservation typecheck` 通過
- [ ] 17.4 `pnpm --filter @high-q/admin lint` 通過 (lint script 配置済の場合)
- [ ] 17.5 `pnpm --filter @high-q/admin build` 通過 + Dialog プリミティブ / heic2any 影響範囲外を確認 (admin は heic2any 非依存)
- [ ] 17.6 `pnpm --filter @high-q/reservation build` 通過 (16. の変更が build を壊していないことを確認)
- [ ] 17.7 `apps/admin/src/{pages,widgets,features,entities,shared/ui}/identity-document*/**/*.vue` および `shared/ui/Dialog*.vue` を `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep してマジックナンバー 0 件を確認

## 18. E2E happy path (Playwright・1 件のみ)

- [ ] 18.1 `e2e/admin/identity-document-review.e2e.ts` を新規作成: 認証済 admin で `/identity-documents` を開く → pending 行を選択 → 詳細画面で承認 AlertDialog → 承認する → 一覧から該当行が消える / TopNav Badge が -1 される (1 シナリオ)
- [ ] 18.2 既存 `_helpers/supabaseGuard.ts` (admin AAL2 setup) を再利用、Storage signed URL は `page.route('**/storage/**')` で intercept してテスト用画像を返す
- [ ] 18.3 `pnpm test:e2e e2e/admin/identity-document-review.e2e.ts` 通過確認

## 19. SOP 微更新

- [ ] 19.1 `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` §2「admin レビュー時の確認フロー」「マスク漏れ即時削除 SOP」の表記を「(admin 側 #171 で実装)」→「(admin 側 #171 ✅ 実装済 / <日付>)」に更新
- [ ] 19.2 §2「マスク漏れ即時削除 SOP」に「mailto: リンクからメーラー起動 → admin が手動送信」のフロー (Phase 1 暫定) と「連鎖予約キャンセル: 当該 member の reserved/waitlist 予約を一括 cancelled に UPDATE」のステップを追記
- [ ] 19.3 §4「DB」の `storage_path_front` 列の説明を「常に存在」→「INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL」に更新
- [ ] 19.4 §6「緊急時のエスカレーション」に「DB UPDATE が Storage 削除後に失敗した場合 / 連鎖予約キャンセルが失敗した場合の手動復旧手順 (Supabase Dashboard で UPDATE)」を追記
- [ ] 19.5 新規セクション §7「pending 会員の予約可否方針」を追加: pending は予約可能、差し戻し時に連鎖予約キャンセル + `/signup/identity` 強制誘導、#196 を本件で代替実装した経緯を記載
- [ ] 19.6 改訂履歴に本 change の行を追加 (NOT NULL 解除 + 連鎖予約キャンセル + hasIdentityDocument 判定変更 + #196 supersede)

## 20. 最終確認 + PR

- [ ] 20.1 **【ユーザー手動】** ローカル / Render Preview で `/identity-documents` を実機確認:
  - フィルタ (pending / approved / rejected / all) の URL 同期と復元
  - 検索 (display_name / email)
  - ページネーション
  - 詳細画面の 4 状態
  - 画像プレビュー (表面 + 裏面 + Dialog 拡大 + 1x/2x/4x ズーム + ESC 閉じる)
  - マイナンバーリマインダー (該当書類のみ表示)
  - 承認 / 差し戻し / マスク漏れ削除の各アクション + AlertDialog
  - **連鎖予約キャンセル**: 差し戻し / マスク漏れ削除後に当該 member の active 予約 (reserved / waitlist) が cancelled に変わることを実機で確認 (テストデータで予約しておく)
  - mailto: リンク (subject / body / 改行 / 宛先 / cancelledCount 反映) で実際にメーラーが起動するか
  - 二重承認防止 (status != 'pending' で disabled)
  - TopNav の pending Badge 件数 / 0 件で非表示
  - HomePlaceholder のサマリカード
  - **reservation 側挙動**: 差し戻された member で再ログイン → `/signup/identity` 強制誘導 / pending member で `/` 通過
- [ ] 20.2 `git diff master --stat` で確認: 変更は admin / **reservation (auth + entities/member)** / shared (型のみ) / supabase (migration のみ) / e2e / docs に限定。`apps/lp` に副作用なし
- [ ] 20.3 PR 作成: `gh pr create --title "feat: #171 admin 本人確認書類レビュー画面" --body ...` (base: master、`Closes #171, Supersedes #196`、Epic: <Apply 時に再確認>、本文に主要決定 (mailto: 起動方式 / NOT NULL 解除 / Dialog プリミティブ取り込み / **pending 会員予約許容方針** / **連鎖予約キャンセル** / **hasIdentityDocument 判定変更**) を明記)
- [ ] 20.4 CI 全パス確認: build / lint / test / typecheck / e2e / Analyze (actions) / Analyze (js-ts) / CodeQL すべて green
- [ ] 20.5 **【ユーザー手動】** Render Preview で動作確認 + ship 合図
- [ ] 20.6 ship 後に **【ユーザー手動】** Issue #196 を「Superseded by #171」コメント付きでクローズ

---

## 備考・ブロッカー

- DB Migration が必要 (`identity_documents.storage_path_front` の NOT NULL 解除)。本番 DB は影響を受ける既存値を持たないため安全。
- shadcn-vue Dialog プリミティブを admin 側に新規取り込み (画像プレビューモーダル用)。AlertDialog は確認系専用のため代替不可。
- メール通知は **mailto: 起動方式 (Phase 1 暫定)** を採用。完全自動化は MVP2 で Resend 移行 (Phase 2、別 Issue) と合わせて切り出し。
- E2E は 1 件のみ (CLAUDE.md 「機能あたり 1〜2 件」上限遵守)。各アクション (承認 / 差し戻し / マスク漏れ削除) のバリエーションは component test に押し下げ。
- 同時 admin 操作の整合性は DB WHERE 句条件 + クライアント status guard + visibilitychange 再 fetch の三層で担保。リアルタイム購読は MVP1 範囲外。
- `usePendingCount` の更新タイミング (mount / visibilitychange / mutation 後) は実装で要確認。store 共有 or window event の使い分けは Apply で確定。
