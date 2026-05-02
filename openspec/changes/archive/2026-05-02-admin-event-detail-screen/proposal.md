## Why

Issue #85（一覧）と #86（CRUD）で admin は「いつ・どこで・いくらで」を登録 / 編集できるようになったが、**当日に参加者を見ながら現場を回す画面**が存在しない。Epic #168「オーナーが当日運営を回す」のコア責務は **イベント単位で予約者を確認 → 来場順にチェックイン → 必要に応じてキャンセル代行** を 1 画面でこなせることであり、これが揃わないと admin はサークル運営に使えない（Excel + 紙運用に逆戻り）。

Issue #87 の本文は CSV エクスポート / 一括メール / キャンセル待ちタブ / モバイル専用チェックイン画面まで含む網羅的なスコープを示しているが、**MVP1 で当日運営に最低限必要なのは StatCard 4 枚 + 参加者一覧 + 個別チェックイン + 個別キャンセル代行の 4 つ**だと整理し、CSV / メール / キャンセル待ち / モバイル UI は MVP2 へ押し下げる。これにより MVP1 の「オーナーが PC で当日運営する」コアフローを最短で確立する。

## What Changes

- 管理画面に **`/events/:id`（イベント詳細）** 画面を追加（既存 `/events`・`/events/new`・`/events/:id/edit` の隣に配置）
- 画面構成は **TopBar + StatCard 4 枚 + RemainBar（capacity ありの時のみ）+ Tabs + Toolbar + 参加者 DataTable** の単一スクロール 1 画面
- **StatCard 4 枚**:
  1. **予約数 / 残席**（動的切替）: `capacity` が NULL なら「予約数」ラベルで `reserved_count 名` を表示、`capacity` ありなら「残席」ラベルで `(capacity - reserved_count) / capacity 名` を表示。MVP1 は #86 で capacity をフォームから外したため実質「予約数」表示が主。capacity 列を将来 form に復活させても自動で「残席」に切り替わる
  2. **チェックイン**: `checked_in_count / reserved_count`
  3. **初回参加**: `first_time_count 名`
  4. **キャンセル待ち**: `waitlist_count 名`（MVP1 は常に 0、機能は MVP2）
- **RemainBar**: `capacity` ありの時のみ表示。`capacity` が NULL（MVP1 デフォルト）の時は描画しない
- **タブ**: 参加者一覧（active）/ キャンセル待ち（disabled = MVP2）/ 当日チェックイン（disabled = MVP2）。disabled タブは「Coming soon」ツールチップ
- **参加者 DataTable**: アバター + 名前 + 初回バッジ / 経験レベル Badge / 同伴人数 / 予約日時 / メール / **チェックイン状態（Switch / Toggle UI、`role="switch"` + `aria-checked`、テキスト「未 / 済」併記）** / キャンセル代行アクション
- **検索 + フィルタ**: 名前・メール部分一致 / 経験レベル（初回・中級・経験者）/ チェックイン状態（未・済）。状態は URL クエリ（`?q=` `?exp=` `?ck=`）と同期し、ブラウザの戻る・リロードで復元できる
- **個別チェックイン**: Switch 押下で `reservations.checked_in_at` を `now() ⇄ NULL` トグル + `status` を `'attended' ⇄ 'reserved'` に同期。Optimistic UI、失敗時はロールバック + Toast
- **個別キャンセル代行**: 行アクションから AlertDialog で確認後、`reservations.status = 'cancelled'` に UPDATE。`cancelled_at` は既存トリガーで自動設定
- **新規 SQL view**:
  - `event_detail_view`: events × venues + StatCard 4 値（`reserved_count` / `checked_in_count` / `first_time_count` / `waitlist_count`）の集計を 1 行に圧縮した DTO（SECURITY INVOKER）
  - `event_participants_view`: reservations × members を結合し、`experience_level` / `is_first_time`（当該 member がこのイベント前に attended ゼロ）を含む DTO（SECURITY INVOKER）
- **「初回」判定**: 当該 member が **このイベントの start_at より前に他イベントで `status = 'attended'` ゼロ** ならば true。view 側で計算する（クライアントで N+1 を避ける）
- **4 状態網羅**: Loading（StatCard + Table の Skeleton）/ Empty（参加者 0 件: 「まだ予約がありません」）/ Error（イベント取得失敗 / event not found を分岐表示・「一覧へ戻る」CTA）/ Success（通常表示）
- **TopBar の編集 CTA** から `/events/:id/edit`（#86 完成済み）へ遷移
- **一覧画面（#85）の行クリック / 「詳細」リンク**を `/events/:id` への実遷移に切替（プレースホルダがあれば解除）
- **MVP2 押し下げ**:
  - CSV エクスポート / 一括メール送信 / キャンセル待ちタブ機能 / モバイル専用大型タップチェックイン画面
  - admin による「予約代行追加」（admin が member を選んで予約を作る逆操作）

## Capabilities

### New Capabilities
- `admin-event-detail`: admin の `/events/:id` 画面の責務（StatCard 集計表示 / 参加者 DataTable / 検索・フィルタ・URL クエリ同期 / 個別チェックイントグル / 個別キャンセル代行 / 4 状態 / FSD 配置 / アクセシビリティ）

### Modified Capabilities
- `data-schema`: 新規 view `event_detail_view` と `event_participants_view` の追加（既存テーブルへの列追加・制約変更は無し）
- `rls-policies`: 新規 view 2 つの権限契約を追記（両方 `revoke all from anon` + `grant select to authenticated`、行レベルは参照テーブル RLS を継承）
- `admin-events-list`: 一覧画面の行から詳細画面 `/events/:id` への遷移を追加（プレースホルダ解除 or 新規動線）

> 本 change では **DB テーブル列追加 / Storage バケット追加 / 新規 RLS ポリシー（テーブル単位）は不要**。view の追加と SELECT 権限のみで完結する。`reservations` の admin UPDATE / DELETE 権限は既に `rls-policies` で `is_admin()` 経由で許可済みのため、チェックイン・キャンセル代行ともに既存権限の範囲内。

## Impact

- **DB Migration**: 1 本（`event_detail_view` + `event_participants_view` の `CREATE VIEW`、SECURITY INVOKER、`grant select to authenticated`）。既存テーブル変更なし
- **コード追加**:
  - `apps/admin/src/pages/EventDetailPage.vue` 追加 + Vue Router の `/events/:id` ルート追加
  - `apps/admin/src/widgets/event-detail/`: `EventDetailWidget.vue` / `EventStatCards.vue` / `EventDetailTopBar.vue` / `EventDetailTabs.vue` / `EventDetailSkeleton.vue` / `EventDetailErrorState.vue` / `EventDetailEmptyState.vue`
  - `apps/admin/src/widgets/event-participants/`: `EventParticipantsWidget.vue` / `EventParticipantsTable.vue` / `EventParticipantsToolbar.vue`
  - `apps/admin/src/features/participants-filter/`: composable `useParticipantsFilter`（URL クエリ同期）
  - `apps/admin/src/features/reservation-checkin/`: composable `useReservationCheckin`（optimistic toggle）+ `CheckinToggle.vue`
  - `apps/admin/src/features/reservation-cancel-by-admin/`: composable `useReservationCancelByAdmin` + `ReservationCancelDialog.vue`（AlertDialog）
  - `apps/admin/src/entities/event-detail/`: `model/eventDetail.types.ts` + `api/eventDetailQueries.ts`
  - `apps/admin/src/entities/reservation/`: `model/reservation.types.ts` + `api/reservationQueries.ts` + `api/reservationMutations.ts`
- **コード変更**:
  - `apps/admin/src/app/router.ts`: `/events/:id` ルート追加
  - `apps/admin/src/widgets/events-list/ui/EventsTable.vue`: 行クリックまたは「詳細」リンクから `/events/:id` への遷移
  - `openspec/specs/admin-events-list/spec.md`: 一覧 → 詳細遷移 Requirement の追記
- **shadcn-vue 追加**: 既に取り込み済みの `AlertDialog` / `Toast` / `Table` / `Skeleton` / `Input` / `Select` で完結。新規プリミティブ取り込みは無し（Tabs は意匠系として `@high-q/ui` に追加するか、簡易 `Tabs.vue` を `apps/admin/src/widgets/event-detail/ui/` に同居させるかは design 段階で決定）
- **テスト**: composable のユニットテスト + widget のコンポーネントテスト + E2E 1〜2 件（「詳細を開く → チェックイン → 戻ると StatCard が更新」のハッピーパス + 「キャンセル代行 → 一覧から消える」）
- **想定影響範囲外**: LP / 予約サイト / Supabase Auth / 既存 events / members / reservations テーブル定義 / 既存 RLS ポリシー（テーブル単位）
