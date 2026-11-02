# Tasks: LINE 告知文のワンタップ作成と予約への直行

> **承認ゲート**: Proposal / Design / Task の合意後に Apply 開始。ロジック追加・バグ予防のタスクは TDD（RED→GREEN→REFACTOR）、UI 差し込みは最終確認タスクでまとめてテスト実行。
> テスト実行は `pnpm -r test`（ルート直の `pnpm exec vitest run` は jsdom が効かないため使わない）。
> コミット粒度: 原則 1 グループ = 1 コミット。

## 1. Setup

- [x] 1.1 `/create-issue` で Issue を起票し、master から `feature/<番号>-line-announcement-copy` ブランチを作成する（現在の `chore/371-retire-legacy-aws-event-api` から切らない。未追跡の `announcements/` や他 change はコミットに含めない）

## 2. DB: announcement_templates

- [x] 2.1 `supabase/migrations/20261029000000_announcement_templates.sql` を `supabase/templates/new_table.sql` から作成
  - 列: `channel text primary key check (channel in ('line'))` / `body text not null check (char_length(body) between 1 and 5000)` / `updated_by uuid references public.members(id) on delete set null` / `created_at` / `updated_at`（`id` 列は持たない）
  - `create trigger set_announcement_templates_updated_at before update ... execute function public.set_updated_at()`
  - RLS 有効化 + ポリシー `announcement_templates_select_admin` / `_insert_admin` / `_update_admin`（すべて `public.is_admin()`）。delete ポリシー無し
  - GRANT: `revoke all ... from anon` / authenticated に select, insert, update / service_role に select, insert, update, delete
  - 初期テンプレートを `insert ... values ('line', $tpl$...$tpl$) on conflict (channel) do nothing`（本文は下記）
  - `-- ROLLBACK:` コメント（revoke 3 ロール / drop policy 3 本 / drop trigger / drop table）
  - 初期テンプレート本文:
    ```
    🏐 {イベント名}のお知らせ 🏐

    {日付} に{イベント名}を開催します！
    初心者さんも経験者さんも、ゆるっと楽しくボールに触りましょう〜！
    途中参加・途中抜けもOKです🙆

    　◾️日時：{日付} {開始時刻}-{終了時刻}
    　◾️場所：{会場}

    　-------------------------------

    　参加費：{参加費}
    　持ち物：室内用シューズ・運動着・飲み物

    　-------------------------------

    ▼ 予約はこちらから
    {予約リンク}

    ご予約お待ちしています！🙌
    ```
- [x] 2.2 `bash scripts/static-checks/migrations/check-rls.sh` 等 3 本の migration 静的チェックをローカル実行して通す
- [x] 2.3 dev DB へ適用（`supabase/.temp/project-ref` が dev `ydkejnlivlzypizrmhwh` であることを確認してから `pnpm db:push`）。`supabase db query --linked --file supabase/tests/verify_grants.sql` で 3 ロール × 4 権限を確認
- [x] 2.4 dev DB で RLS 検証 SQL を実行（`supabase db query --linked`）: authenticated（非 admin の会員 JWT claims）/ anon で SELECT 0 行・INSERT 拒否、`channel='jimoty'` / 空本文の INSERT が CHECK 違反、初期テンプレートが 1 行入っていることを確認。検証 SQL は `supabase/tests/verify_announcement_templates_rls.sql` として残す

## 3. admin entities: announcement-template（TDD）

- [x] 3.1 `apps/admin/src/shared/config/reservation.ts` を新設（LP `apps/lp/src/shared/config/reservation.ts` を踏襲。`VITE_RESERVATION_URL` 未設定時は `https://high-q-reservation.onrender.com`、末尾スラッシュ除去）。admin の ImportMetaEnv 型に `VITE_RESERVATION_URL?: string` を追加
- [x] 3.2 型 `apps/admin/src/entities/announcement-template/model/types.ts`: `AnnouncementChannel = "line"` / `AnnouncementTemplate { channel; body; updatedAt: string; updatedBy: MemberId | null }` / `ANNOUNCEMENT_BODY_MAX = 5000`
- [x] 3.3 RED→GREEN: `lib/buildBookingLink.ts`（+ spec）— `buildBookingLink(eventId: EventId, baseUrl?)` → `<base>/events/<encodeURIComponent(id)>?book=1&openExternalBrowser=1`。末尾スラッシュ有無で同一 / 記号のエンコード
- [x] 3.4 RED→GREEN: `lib/renderAnnouncement.ts`（+ spec）
  - `ANNOUNCEMENT_PLACEHOLDERS`（表示名と説明の配列。編集画面の一覧にも使う）
  - `renderAnnouncement(body, input)`: input = `{ name, vol, startAt, endAt, venueName, fee, capacity, bookingLink }`。spec「差し込み項目の展開規則」の全シナリオ（全項目 / 値無し / 0 円 / 知らない項目は残す / 複数回置換 / TZ=UTC でも JST）をテスト化。日時整形は `Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" })`
  - `findUnknownPlaceholders(body)`: 知らない `{...}` を重複なしで返す
  - `SAMPLE_ANNOUNCEMENT_INPUT`（編集画面プレビュー用のサンプル値）
- [x] 3.5 RED→GREEN: `api/announcementTemplateQueries.ts`（+ spec、`entities/venue/api/venueQueries.spec.ts` のモック方式を踏襲）
  - `fetchAnnouncementTemplate("line")` → `Result<AnnouncementTemplate | null, FetchError>`（`maybeSingle`、未登録は `ok(null)`）
  - `saveAnnouncementTemplate("line", body, updatedBy)` → `upsert(..., { onConflict: "channel" })` で `Result<AnnouncementTemplate, FetchError>`
  - RLS 拒否 / 通信失敗の分類は既存 entities と同じ
- [x] 3.6 `apps/admin/src/entities/announcement-template/index.ts`（Public API）

## 4. admin: 告知文ダイアログ

- [x] 4.1 `apps/admin/src/features/line-announcement/composables/useAnnouncementDialog.ts`（+ spec）: テンプレート取得の 4 状態管理（loading / empty / error / success）・再試行・展開済み告知文・告知リンク・`copy(text)`（`navigator.clipboard.writeText`、成功 / 失敗を返す）
- [x] 4.2 `apps/admin/src/features/line-announcement/ui/AnnouncementDialog.vue`
  - props: `open` / `event: EventDetailRow`。既存 `shared/ui/Dialog*` + `@high-q/ui` `Button`
  - Success: プレビュー（`whitespace-pre-wrap`、`aria-label="告知文プレビュー"`）+「告知文をコピー」(primary) /「リンクだけコピー」(outline) /「テンプレートを編集」（`announcement-template` へ遷移）/ 閉じる
  - Empty:「告知テンプレートが未設定です」+「テンプレートを作成」導線 /「リンクだけコピー」
  - Error:「テンプレートを読み込めませんでした」+ 再試行 /「リンクだけコピー」
  - コピー成功トースト「告知文をコピーしました」/「リンクをコピーしました」。失敗時はエラートースト「コピーできませんでした。表示中の文面を長押しでコピーしてください」+ 読み取り専用 `Textarea` にコピー対象を表示しフォーカス + 全選択
  - スマホ幅でボタン縦積み
- [x] 4.3 `AnnouncementDialog.spec.ts`: 4 状態 / 告知文コピー / リンクだけコピー / 失敗時の退避 / テンプレート編集への遷移
- [x] 4.4 `apps/admin/src/features/line-announcement/index.ts`（Public API: `AnnouncementDialog`）
- [x] 4.5 `apps/admin/src/widgets/event-detail/ui/EventDetailTopBar.vue`: 「編集」の左に「告知文をコピー」(`variant="outline"` `size="sm"`) を追加しダイアログを開閉。アクション部に `flex-wrap`。先頭コメント更新
- [x] 4.6 `apps/admin/src/widgets/event-detail/ui/EventDetailWidget.spec.ts` に「告知文をコピー」表示 + 押下でダイアログが開くテストを追加

## 5. admin: 告知テンプレート画面

- [x] 5.1 `apps/admin/src/features/announcement-template-edit/composables/useAnnouncementTemplateForm.ts`（+ spec）: 取得（未登録時は初期テンプレートを入れる）/ 入力チェック（必須・5,000 文字・残り文字数）/ 知らない差し込み項目 / 保存（`updatedBy` は現在の admin 会員 ID）/ 保存中・成功・失敗の状態 / 最終更新日時
  - 初期テンプレート文字列は migration と同一内容を `entities/announcement-template/model/defaultTemplate.ts` に置き、spec で migration ファイルの本文と一致することをテストする（ずれ防止）
- [x] 5.2 `apps/admin/src/features/announcement-template-edit/ui/AnnouncementTemplateForm.vue`
  - 既存 `EventEditPage.vue` / `VenuesPage.vue` を Read してから着手
  - `FormField` + `Textarea`（初期表示で赤枠を出さない）/ 差し込み項目ボタン群（押下でカーソル位置に挿入しフォーカスを戻す）/ 残り文字数 / 知らない差し込み項目の注意 / サンプル展開プレビュー / 保存ボタン（保存中は無効）/ 最終更新日時
  - md 以上は本文 | プレビューの 2 カラム、md 未満は縦積み
- [x] 5.3 `AnnouncementTemplateForm.spec.ts`: 保存成功 / 失敗時に入力保持 / 空は保存不可 / 5,000 文字超は保存不可 / 差し込み挿入 / 知らない項目の注意 / 4 状態
- [x] 5.4 `apps/admin/src/features/announcement-template-edit/index.ts`（Public API）
- [x] 5.5 `apps/admin/src/pages/AnnouncementTemplatePage.vue`: header（パンくず「Workspace / 告知テンプレート」+ タイトル「告知テンプレート」）+ フォーム。主 CTA（保存）はフォーム内に置く
- [x] 5.6 `apps/admin/src/app/router.ts` に `{ path: "/announcement-template", name: "announcement-template", meta: { title: "告知テンプレート" } }` を追加
- [x] 5.7 `apps/admin/src/widgets/admin-shell/model/navItems.ts` に「告知テンプレート」（`icon: "message"`, `activePrefix: "announcement-template"`）を本人確認書類の後に追加。`ShellIcon.vue` に `message` アイコン（既存アイコンと同じ線画スタイル）を追加。`SidebarNavContent.spec.ts` の項目数・項目名を更新

## 6. 予約サイト: 自動オープン判定の強化（TDD）

- [x] 6.1 RED: `apps/reservation/src/pages/EventDetailPage.spec.ts` の「予約 Sheet ディープリンク (?book=1)」に追加
  - 本人予約 `reserved` / `waitlist` → `?book=1` でも開かない・`book` は除去
  - 本人予約 `cancelled` → 開く
  - 本人予約状態の取得失敗（読み込み完了・`resolved=false`）→ 開かない・`book` は除去
  - `?book=1&openExternalBrowser=1` → 開く・両方除去
  - `?openExternalBrowser=1&foo=bar`（`book` 無し）→ `openExternalBrowser` だけ除去、`foo` は残る
- [x] 6.2 GREEN: `apps/reservation/src/pages/EventDetailPage.vue` の自動オープン watch を修正
  - 監視対象を `event` + `useMyEventReservation` の `resolved` / `loading` に広げ、「イベント取得済み かつ 本人予約の読み込み完了」で 1 回だけ判定
  - 開く条件: `book === "1"` かつ未開催 かつ非満席 かつ `resolved === true` かつ `myReservation?.status` が `reserved` / `waitlist` でない
  - 判定後に `book` と `openExternalBrowser` を `router.replace` で除去（`book` 無しでも `openExternalBrowser` は除去）
  - コメントに LINE 告知リンクの着地点でもあることを追記
- [x] 6.3 RED→GREEN: `apps/reservation/src/app/router.spec.ts` の「auth guard — next クエリ保持 (#229)」に、未認証で `/events/<id>?book=1&openExternalBrowser=1` → `next` にクエリごと保持されるケースを追加（既存実装で通る想定）

## 7. E2E

> 既存 E2E の方針（認証済みセッションは再現せず、ガード統合までを確認。認証後の挙動は component test に押し下げ）に合わせて Apply 中に調整した。

- [x] 7.1 `e2e/admin/announcement-template.e2e.ts`: 未認証で `/announcement-template` → `/login` にリダイレクト（新ルートのガード統合）。編集・保存・告知文ダイアログは component test で担保
- [x] 7.2 `e2e/reservation/line-announcement-link.e2e.ts`: 未認証で `/events/<id>?book=1&openExternalBrowser=1` → `/login?next=` にクエリごと保持 → メール送信時の `redirect_to` が `/auth/callback?next=<告知リンクのパス>` になる。認証後の自動オープン判定・クエリ除去は `EventDetailPage.spec.ts` で担保

## 9. X チャネル対応（Apply 中の追加要望、design D10〜D12）

- [x] 9.1 migration `supabase/migrations/20261103000000_announcement_templates_add_x.sql`: CHECK 制約を `channel in ('line', 'x')` に張り替え + X 初期テンプレート投入（`on conflict do nothing`）+ `-- ROLLBACK:`。静的チェック 3 本 → dev へ `db push` → `verify_announcement_templates_rls.sql` に x 行の確認を追加して実行
- [x] 9.2 entities（TDD）: `AnnouncementChannel = "line" | "x"` / `ANNOUNCEMENT_CHANNELS`（表示名）/ `DEFAULT_TEMPLATES`（チャネル別、migration と一致検査）/ `buildBookingLink` に `openExternalBrowser` 指定 / `{紹介ページリンク}`（`shared/lib/externalLinks.ts` に LP トップ URL を追加）/ `countXWeightedLength` + `X_MAX_WEIGHTED = 280`
- [x] 9.3 告知文ダイアログ: LINE / X 切り替え（tablist）・チャネル別の取得・「予約リンクをコピー」「紹介ページリンクをコピー」・X の文字数表示と 280 超の注意・「テンプレートを編集」で選択中チャネルへ。テスト更新
- [x] 9.4 告知テンプレート画面: LINE / X 切り替え（`?channel=` 同期）・チャネル別の初期テンプレート・X の文字数表示と 280 超の注意。テスト更新
- [x] 9.5 全体テスト / typecheck / lint / build を再実行

## 10. コピー操作を 1 つに絞る（ローカル確認でのフィードバック）

- [x] 10.1 告知文ダイアログから「予約リンクをコピー」「紹介ページリンクをコピー」を削除し、コピーは「告知文をコピー」のみにする（composable の `copyBookingLink` / `copyIntroLink` も削除）。テスト更新

## 8. 最終確認

- [x] 8.1 `pnpm -r test` / lint / typecheck / stylelint / dependency-cruiser / admin・reservation の build を実行し全て緑
- [x] 8.2 `verify-locally` Skill でローカル確認手順を案内し、翔太郎くんの OK を待つ
  - admin（5173）: 告知テンプレート画面で編集・保存 → イベント詳細で告知文 / リンクのコピー。スマホ幅も確認
  - ローカル予約サイトに向ける場合は root `.env.local` に `VITE_RESERVATION_URL=http://localhost:5174` を設定する手順を案内（値の設定は翔太郎くんが行う）
  - reservation（5174）: ログイン済み / 未ログイン / 予約済み / 満席 の 4 パターン
- [ ] 8.3 実機確認（iPhone / Android）: LINE のトーク（可能ならオープンチャット）に `openExternalBrowser=1` 付きリンクを送り、タップで標準ブラウザが開くことを確認。結果を PR 本文に記録
- [ ] 8.4 PR 作成。Test Plan は「ローカル確認 / Render Preview（予約サイト側）/ マージ後: prd migration 承認 → `verify_grants.sql` → 本番イベントで告知文コピー → LINE 実機」の 3 段
