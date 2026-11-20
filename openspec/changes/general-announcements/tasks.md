# Tasks: 汎用お知らせ機能（general-announcements）

> **承認ゲート**: Design が承認済みであること。ロジック新規・spec 新規・DB は TDD。UI 連続タスクはテスト／ビルドを最終確認でまとめて実行（CLAUDE.md「Apply 中のテスト・ビルド実行ルール」）。
> コミット粒度: 原則 1 セクション = 1 コミット。

## 進捗

- 完了: 28 / 28 タスク

---

### 0. Setup

- [x] **0.1** ブランチ作成 `feature/395-general-announcements`

---

### 1. DB: `announcements` テーブルと RLS

- [x] **1.1** `supabase/templates/new_table.sql` を出発点に migration 新規追加（`supabase/migrations/20261118000000_announcements.sql`）。列: `id uuid pk default gen_random_uuid()` / `title text not null`（長さ CHECK 1〜N）/ `body text not null`（長さ CHECK 1〜N）/ `audience text not null check (audience in ('public','members','all'))` / `publish_start timestamptz not null default now()` / `publish_end timestamptz null` / `created_by uuid references public.members(id) on delete set null` / `created_at timestamptz not null default now()` / `updated_at timestamptz not null default now()`。`publish_end is null or publish_end > publish_start` の CHECK。`comment on table` 付与。
- [x] **1.2** RLS 有効化 + ポリシー 5 本:
  - `announcements_select_public`（SELECT / `to anon` / `audience in ('public','all') and publish_start <= now() and (publish_end is null or now() < publish_end)`）
  - `announcements_select_authenticated`（SELECT / `to authenticated` / `public.is_admin() or (audience in ('members','all') and publish_start <= now() and (publish_end is null or now() < publish_end))`）
  - `announcements_insert_admin` / `announcements_update_admin`（USING+WITH CHECK）/ `announcements_delete_admin`（いずれも `to authenticated` / `public.is_admin()`）
- [x] **1.3** 3 ロール明示 GRANT: `grant select on public.announcements to anon;` / `grant select, insert, update, delete ... to authenticated;` / `grant select, insert, update, delete ... to service_role;`（`grant usage on schema public to anon` は既存だが未付与なら補う）
- [x] **1.4** `set_updated_at()` トリガー（既存関数再利用）: `set_announcements_updated_at`（BEFORE UPDATE）
- [x] **1.5** `-- ROLLBACK:` コメント（revoke → drop policy ×5 → drop trigger → drop table の順、実テーブル名で）
- [x] **1.6** `supabase/tests/verify_announcements_rls.sql` を `verify_operational_settings_rls.sql` 形式で新設。検査: 掲載前/掲載中/掲載終了 × audience(public/members/all) × ロール(anon/一般会員/admin) の可視行、admin 以外の INSERT/UPDATE/DELETE 拒否。
- [x] **1.7** dev へ適用（レムが `pnpm db:push` 実行）し `verify_grants.sql` / `verify_announcements_rls.sql` で確認。

---

### 2. admin: entity（TDD）

- [x] **2.1** `apps/admin/src/entities/announcement/model/types.ts`: `Announcement`（camelCase・`publishStart`/`publishEnd` は ISO string|null・`audience` union）+ 一覧用の掲載状態導出関数の型。
- [x] **2.2** `apps/admin/src/entities/announcement/api/announcementQueries.ts`（TDD・`announcementQueries.spec.ts` 先行）: `fetchAnnouncements()` / `createAnnouncement(input, createdBy)` / `updateAnnouncement(id, input)` / `deleteAnnouncement(id)`。すべて `Promise<Result<_, FetchError>>`。行→camelCase 変換、`classifyError`（42501→PERMISSION_DENIED 等）、COLUMNS 明示 SELECT。`operationalSettingsQueries.ts` を手本に。
- [x] **2.3** `apps/admin/src/entities/announcement/lib`（TDD）: 掲載状態導出（予定/掲載中/終了）と、入力日付→JST 境界の timestamptz 変換（開始=当日 JST 00:00 / 終了=翌日 JST 00:00 排他）。端末 TZ=UTC でも JST 基準になることを UT で固定。
- [x] **2.4** `apps/admin/src/entities/announcement/index.ts`（Public API: 型・関数・lib を re-export、`FetchError` 別名 export）

---

### 3. admin: UI（一覧＋フォーム＋削除）

- [x] **3.1** `features/announcement-delete`（`ui/AnnouncementDeleteDialog.vue` + `composables/useAnnouncementDelete.ts`）: AlertDialog 確認→`deleteAnnouncement`→Toast→reload。`features/event-delete` を手本に。
- [x] **3.2** `widgets/announcements-master-detail`（`ui/AnnouncementsMasterDetail.vue` + `composables/useAnnouncementsMaster.ts` + `model/announcementDraft.ts`）: 左=一覧（掲載状態バッジ・モバイルは `DataCardList`）/ 右=作成・編集フォーム。`widgets/venues-master-detail` を手本に。
- [x] **3.3** フォーム: `FormField` でラップした タイトル(`Input`) / 本文(`Textarea` + 文字数カウンタ) / 出す相手(`Select`) / 掲載開始(`Input type=date`) / 掲載終了(`Input type=date` 任意)。バリデーション（空・終了<開始）。`announcement-template-edit` / `event-form` を手本に。
- [x] **3.4** `pages/AnnouncementsPage.vue`: PageBreadcrumb + header(h1 + 説明) + master-detail widget。`SettingsPage.vue` を雛形に。`session.user.id` を `createdBy` に渡す。
- [x] **3.5** `app/router.ts` に `/announcements`（name: announcements・lazy import・meta.title）追加 + `router.spec.ts` 件数テスト更新（15→16・paths 配列更新）。
- [x] **3.6** `widgets/admin-shell/model/navItems.ts` に「お知らせ」導線追加（必要なら `ShellIcon.vue` と icon union に新アイコン追加）+ `SidebarNavContent.spec.ts` 件数テスト更新（7→8・ラベル配列・テスト router routes 更新）。

---

### 4. LP: 公開トップ表示

- [x] **4.1** `apps/lp/src/entities/announcement/`: `model`（型）+ `api/announcementQueries.ts`（`queryOptions`・`audience in ('public','all')` を anon select・掲載期間は RLS 側で担保、クライアントは並び順＝掲載開始降順）+ `index.ts`。`entities/event` を手本に。
- [x] **4.2** `apps/lp/src/widgets/announcement-banner/`（`ui/AnnouncementBanner.vue` + `model/useAnnouncements.ts` + `index.ts`）: `useQuery` で 4 状態。対象 0 件・エラーは**非描画**（本体優先）。`white-space: pre-wrap`。`event-list` を手本に。
- [x] **4.3** `pages/home/ui/HomePage.vue` 最上部（Hero 近辺）に `AnnouncementBanner` を 1 行追加。

---

### 5. 予約: 会員ホーム表示

- [x] **5.1** `apps/reservation/src/entities/announcement/`: `model`（型）+ `api/announcement-client.ts`（自前 fetch 関数・`audience in ('members','all')`・掲載期間は RLS 担保・掲載開始降順）+ `index.ts`。`entities/event` を手本に（TanStack 不使用）。
- [x] **5.2** `apps/reservation/src/widgets/home-announcements/`（`ui/HomeAnnouncements.vue` + composable: ref + reload + `index.ts`）: 対象 0 件・エラーは非描画。`white-space: pre-wrap`。`widgets/correction-request-panel` を手本に。
- [x] **5.3** `pages/EventsListPage.vue` の `HomeHeader` 直下に `HomeAnnouncements` を `CorrectionRequestPanel` と同列の `<section>` で差す。

---

### 6. 最終確認

- [x] **6.1** `pnpm -r test` 全パス（admin / lp / reservation / shared の件数更新込み）
- [x] **6.2** typecheck clean / lint・stylelint・dependency-cruiser エラー 0 / admin・lp・reservation 本番ビルド成功
- [x] **6.3** 既存メンバー動線（ログイン・予約・退会）回帰無しをテストで確認。お知らせ widget 非表示時にページが壊れないこと。
- [x] **6.4** dev 実機往復（翔太郎くんのローカル確認）: admin で作成（public / members / all・掲載期間前後）→ LP と予約で出し分け・期間内外の出し入れを確認。`verify-locally` で案内生成（dev パスワードレスログイン手順併記）。

---

## 備考・ブロッカー

- 【T-3.1 調整】削除は独立 feature(features/announcement-delete)にせず、master-detail widget 内に AlertDialog 確認として統合した(venues 型 master-detail に素直に収めるため)。設計 D5 の「AlertDialog で確認」の意図は満たす。

- Open Questions（design.md 末尾の 4 点: audience 既定値 / 期間粒度 / 種別装飾 / 表示件数）は Apply 前に確定する。
- prd 反映は migration 承認ゲート（environment prd-db-push）を ship 時に見届ける。
