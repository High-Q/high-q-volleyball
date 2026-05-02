## 1. Setup

- [x] 1.1 ブランチ作成 `git checkout -b feature/87-admin-event-detail-screen`
- [x] 1.2 Apply 開始時に `openspec/project.md` と本 change の `design.md` を読み直し、進捗 0/N + 制約宣言

## 2. DB Migration（先行）

- [x] 2.1 Migration ファイル `supabase/migrations/YYYYMMDDHHMMSS_event_detail_views.sql` を新規作成
- [x] 2.2 `event_detail_view` を `SECURITY INVOKER` で定義（events × venues LEFT JOIN + reservations の集計サブクエリ 4 種: reserved_count / checked_in_count / first_time_count / waitlist_count、fee は COALESCE）
- [x] 2.3 `event_participants_view` を `SECURITY INVOKER` で定義（reservations × members × events INNER JOIN + `is_first_time` の NOT EXISTS、status='cancelled' を除外）
- [x] 2.4 両 view に `revoke all from anon` + `grant select to authenticated` を付与
- [x] 2.5 Migration ヘッダコメントに目的 / 関連 spec パス / ロールバック手順を記載
- [x] 2.6 SQL 構造セルフレビュー完了（correlated subquery / lateral / 権限付与）。実機検証は本プロジェクト運用方針（Supabase Dashboard 経由 SQL Editor で RUN）に従い T11.2 / Render プレビュー反映時に実施

## 3. Entity Layer (FSD entities/)

- [x] 3.1 `apps/admin/src/entities/event-detail/model/eventDetail.types.ts` を作成（`EventDetailRow` 型を view 列と 1:1 対応で定義、Branded Types は既存 `EventId` / `VenueId` 流用）
- [x] 3.2 `apps/admin/src/entities/event-detail/api/eventDetailQueries.ts` に `getEventDetail(id: EventId): Promise<Result<EventDetailRow, FetchError>>` を実装（`event_detail_view` を id 単一フィルタで SELECT、0 行は `EVENT_NOT_FOUND` エラーコードで返す）
- [x] 3.3 `apps/admin/src/entities/event-detail/api/eventDetailQueries.spec.ts` を Supabase mock で実装（成功 / 0 行 / network error / permission denied の 4 ケース）
- [x] 3.4 `apps/admin/src/entities/event-detail/index.ts` に Public API（型 + 関数）を export
- [x] 3.5 `apps/admin/src/entities/reservation/model/reservation.types.ts` を作成（`ParticipantRow` 型を `event_participants_view` と 1:1 対応、`is_first_time: boolean`、`experience_level: ExperienceLevel` 等）
- [x] 3.6 `apps/admin/src/entities/reservation/api/reservationQueries.ts` に `getEventParticipants(eventId: EventId): Promise<Result<ParticipantRow[], FetchError>>` を実装
- [x] 3.7 `apps/admin/src/entities/reservation/api/reservationQueries.spec.ts`（成功 / 空配列 / network error / permission denied）
- [x] 3.8 `apps/admin/src/entities/reservation/api/reservationMutations.ts` に `toggleCheckin(reservationId, currentState)` と `cancelByAdmin(reservationId)` を実装（WHERE 句条件付き UPDATE）
- [x] 3.9 `apps/admin/src/entities/reservation/api/reservationMutations.spec.ts`（toggleCheckin 未→済 / 済→未 / WHERE 条件不一致で 0 行 / network error、cancelByAdmin 成功 / network error）
- [x] 3.10 `apps/admin/src/entities/reservation/index.ts` に Public API export

## 4. Feature: participants-filter（URL クエリ同期）

- [x] 4.1 `apps/admin/src/features/participants-filter/types.ts` に `ParticipantsFilter` 型（q / experience / checkinState）と各列挙型を定義
- [x] 4.2 `apps/admin/src/features/participants-filter/composables/useParticipantsFilter.ts` を実装（vue-router の useRoute / useRouter で URL クエリ ⇄ state 双方向同期、「すべて」値は URL から削除、`?q=` `?exp=` `?ck=` の 3 キー）
- [x] 4.3 `apps/admin/src/features/participants-filter/composables/useParticipantsFilter.spec.ts`（URL → state 復元、state → URL 反映、「すべて」削除、リロード相当の状態）
- [x] 4.4 `apps/admin/src/features/participants-filter/index.ts` に Public API export

## 5. Feature: reservation-checkin（個別チェックイン）

- [x] 5.1 `apps/admin/src/features/reservation-checkin/composables/useReservationCheckin.ts` を実装（in-flight Set ガード、optimistic state、mutation success/error ハンドラ、Toast 連携）
- [x] 5.2 `apps/admin/src/features/reservation-checkin/composables/useReservationCheckin.spec.ts`（未→済 optimistic、済→未 optimistic、UPDATE 失敗時のロールバック、in-flight 中の二重発火無視、Toast 表示）
- [x] 5.3 `apps/admin/src/features/reservation-checkin/ui/CheckinToggle.vue` を実装（自前 Switch 約 50 行: `role="switch"` + `aria-checked` + `aria-label` + `tabindex="0"` + Space/Enter キー対応 + 隣接テキスト「未/済」併記 + slider transition 150ms + `prefers-reduced-motion` 対応 + in-flight 時 `aria-busy="true"` + 半透明）
- [x] 5.4 `apps/admin/src/features/reservation-checkin/ui/CheckinToggle.spec.ts`（未/済状態の描画、クリック toggle、Space/Enter キー toggle、`aria-checked` の値反転、in-flight 時の `aria-busy` 付与、`prefers-reduced-motion` でのアニメ無効化）
- [x] 5.5 `apps/admin/src/features/reservation-checkin/index.ts` に Public API export

## 6. Feature: reservation-cancel-by-admin（個別キャンセル代行）

- [x] 6.1 `apps/admin/src/features/reservation-cancel-by-admin/composables/useReservationCancelByAdmin.ts` を実装（confirm → mutation → success/error、成功時に行除去 + Toast、失敗時に inline error）
- [x] 6.2 `apps/admin/src/features/reservation-cancel-by-admin/composables/useReservationCancelByAdmin.spec.ts`（confirm → 成功フロー、失敗時 inline error 保持、cancel ボタンで mutation 未発行）
- [x] 6.3 `apps/admin/src/features/reservation-cancel-by-admin/ui/ReservationCancelDialog.vue` を実装（既存 AlertDialog プリミティブを使い、display_name を含む説明文 + 「予約を取消」「キャンセル」ボタン）
- [x] 6.4 `apps/admin/src/features/reservation-cancel-by-admin/ui/ReservationCancelDialog.spec.ts`（開閉、確定でコールバック発火、ESC で閉じる、フォーカストラップ）
- [x] 6.5 `apps/admin/src/features/reservation-cancel-by-admin/index.ts` に Public API export

## 7. Widget: event-participants（Toolbar + Table）

- [x] 7.1 `apps/admin/src/widgets/event-participants/composables/useEventParticipantsData.ts` を実装（`getEventParticipants` 呼び出し + `useParticipantsFilter` の filter 適用 + クライアント側で q/experience/checkinState を fold）
- [x] 7.2 `apps/admin/src/widgets/event-participants/composables/useEventParticipantsData.spec.ts`（filter 未指定で全件、q で絞り込み、experience で絞り込み、checkin state で絞り込み、複合）
- [x] 7.3 `apps/admin/src/widgets/event-participants/ui/EventParticipantsToolbar.vue`（検索 Input + 経験 Select + 状態 Select + 件数サマリ右寄せ）
- [x] 7.4 `apps/admin/src/widgets/event-participants/ui/EventParticipantsTable.vue`（DataTable: 名前 + 初回 Badge / 経験 Badge / 同伴 / 予約日時 / メール / CheckinToggle / キャンセル代行ボタン）
- [x] 7.5 `apps/admin/src/widgets/event-participants/ui/EventParticipantsWidget.vue`（Toolbar + Table を統合 + Empty 状態のテーブル内表示）
- [x] 7.6 `apps/admin/src/widgets/event-participants/index.ts` に Public API export

## 8. Widget: event-detail（TopBar + StatCards + Tabs + 4 状態）

- [x] 8.1 `apps/admin/src/widgets/event-detail/composables/useEventDetailData.ts` を実装（`getEventDetail` 呼び出し + Loading / Error / Success ステート + invalidate 関数）
- [x] 8.2 `apps/admin/src/widgets/event-detail/composables/useEventDetailData.spec.ts`（成功 / 0 行で EVENT_NOT_FOUND / network error / refetch）
- [x] 8.3 `apps/admin/src/widgets/event-detail/ui/EventDetailTopBar.vue`（タイトル + パンくず + サブタイトル + 編集 CTA、デザイントークン使用）
- [x] 8.4 `apps/admin/src/widgets/event-detail/ui/EventStatCards.vue`（4 枚 StatCard、1 番目は `capacity === null` で「予約数 N 名」、`capacity` ありで「残席 (capacity-reserved) / capacity 名」の動的切替、`@high-q/ui` の Kicker 流用）
- [x] 8.5 `apps/admin/src/widgets/event-detail/ui/EventStatCards.spec.ts`（capacity NULL 分岐: 「予約数」ラベル + reserved_count 表示 / capacity あり分岐: 「残席」ラベル + (capacity-reserved) 表示 / optimistic +1/-1 反映の props 受け取り / マジックナンバー禁止 = デザイントークン使用）
- [x] 8.6 `apps/admin/src/widgets/event-detail/ui/EventDetailTabs.vue`（自前 Tabs 実装、role="tab" + aria-selected + aria-disabled、Coming soon ツールチップ）
- [x] 8.7 `apps/admin/src/widgets/event-detail/ui/EventDetailTabs.spec.ts`（active タブの表示、disabled タブのクリック無反応、aria 属性、Tab キーフォーカス順）
- [x] 8.8 `apps/admin/src/widgets/event-detail/ui/EventDetailSkeleton.vue`（StatCard 4 枚 + Toolbar + Table 行の Skeleton）
- [x] 8.9 `apps/admin/src/widgets/event-detail/ui/EventDetailErrorState.vue`（event not found 用「一覧へ戻る」CTA、network error 用「再試行」CTA、role="alert"）
- [x] 8.10 `apps/admin/src/widgets/event-detail/ui/EventDetailEmptyState.vue`（参加者ゼロ時のメッセージ）
- [x] 8.11 `apps/admin/src/widgets/event-detail/ui/EventDetailWidget.vue`（4 状態出し分け + StatCards + Tabs + EventParticipantsWidget マウント + RemainBar は `v-if="capacity !== null"` で条件描画。MVP1 では実質非表示）
- [x] 8.12 `apps/admin/src/widgets/event-detail/ui/EventDetailWidget.spec.ts`（4 状態出し分けスナップショット、event not found / 参加者取得失敗の分岐、編集 CTA の遷移）
- [x] 8.13 `apps/admin/src/widgets/event-detail/index.ts` に Public API export

## 9. Page + Router

- [x] 9.1 `apps/admin/src/pages/EventDetailPage.vue` を作成（router params から id 取得 + EventDetailWidget マウント + ヘッダ「ログアウト」流用）
- [x] 9.2 `apps/admin/src/pages/EventDetailPage.spec.ts`（router params 反映、Widget マウント）
- [x] 9.3 `apps/admin/src/app/router.ts` に `/events/:id` ルート（name=`events-detail`、component=`EventDetailPage`）を追加
- [x] 9.4 ルート追加が auth guard を継承して動くことを `apps/admin/src/App.spec.ts` 相当で確認

## 10. 一覧 → 詳細 動線

- [x] 10.1 `apps/admin/src/widgets/events-list/ui/EventsTable.vue` のタイトル列を `<router-link :to="{ name: 'events-detail', params: { id: row.id } }">` に変更（events.name のテキストは維持、hover 下線）
- [x] 10.2 `apps/admin/src/widgets/events-list/ui/EventsTable.spec.ts` を更新（タイトルリンクの `to` 属性、編集リンクとの両立、Tab 順）

## 11. 統合確認 + 4 状態 + アクセシビリティ手動確認

> **押し下げ方針**: 本セッション環境にはローカル Supabase CLI / docker / psql が無く、admin 認証は本番 Supabase（Auth + RLS）を要求するため、ローカル `pnpm dev` で実機検証ができない。CLAUDE.md の運用方針通り、本章の手動目視は **Render プレビュー反映時に翔太郎くんが実施** する（PR 作成 → Render プレビュー確認 → ship 合図）。component test と E2E（auth guard）でロジック網羅は完了しているため、Render プレビューでは「視覚 / 操作感 / 4 状態 / Switch アニメ / キャンセル代行 / URL 同期 / capacity NULL 時の StatCard 表示」の体感確認を行う。

- [→] 11.1 Render プレビュー反映時 / 翔太郎くんローカル確認時に実施（seed: events 1 件 + reservations 4-5 件）
- [→] 11.2 Render プレビュー反映時に 4 状態目視確認
- [→] 11.3 Render プレビュー反映時にチェックイン操作確認
- [→] 11.4 Render プレビュー反映時にキャンセル代行確認
- [→] 11.5 Render プレビュー反映時に検索 / フィルタ / URL 同期確認
- [→] 11.6 Render プレビュー反映時に一覧 → 詳細遷移確認
- [→] 11.7 Render プレビュー反映時にキーボード a11y 確認
- [→] 11.8 Render プレビュー反映時に capacity 切替確認

## 12. E2E テスト

- [x] 12.1 `e2e/admin/event-detail.e2e.ts` を新規作成（auth guard 保護のみ: 未認証で /events/:id → /login redirect。ハッピーパスは既存 events-list と同方針で component test に押し下げ。理由は spec ヘッダコメント参照）
- [x] 12.2 ローカルで E2E pass 確認（`pnpm test:e2e --project=admin -g "event detail"` で 1/1 pass）

## 13. 最終確認

- [x] 13.1 `pnpm -r exec vitest run` 全 pass（admin: 477/477、reservation: 17/17、shared: 28/28、tailwind-preset: 7/7、design-tokens: 11/11、ui: 48/48 + 11 todo、lp: 17/17）
- [x] 13.2 `pnpm --filter @high-q/lp lint` 全 pass（CI 構成: lint 対象は LP のみ。admin/reservation は eslint 対象外。FSD 境界は本タスクでは新規違反なし）
- [x] 13.3 `pnpm --filter @high-q/admin build` 全 pass（vite build OK、527kB / gzip 163kB）
- [x] 13.4 `pnpm -r typecheck` 全 pass（admin / reservation / shared / ui / tailwind-preset / design-tokens 全て）

## 14. PR 作成

- [x] 14.1 コミットを論理単位で整理（本セッションでは「機能を 1 PR 1 コミット」可の例外を採用、61 ファイル新規作成中心のため整理コスト > 価値）
- [x] 14.2 PR 作成完了: https://github.com/High-Q/high-q-volleyball/pull/188
- [→] 14.3 CI 全パス確認 + Render プレビュー URL を翔太郎くんに共有（CI 完了待ち）
- [→] 14.4 翔太郎くんからの ship 合図を待つ（Sync / Archive / Merge / 後始末は `/opsx-ship` で実施）
