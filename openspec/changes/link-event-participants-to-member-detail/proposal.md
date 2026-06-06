## Why

イベント詳細画面の予約者リストでは会員名がプレーンテキストでしか表示されておらず、本人確認ステータスや運営メモを確認したい場合に `/members` 画面へ別途遷移する必要がある。MVP1 リリース後に運営者（翔太郎くん）の主な確認動線として「予約者 → 本人確認 / 修正依頼 / メモ確認」が頻発するため、その場で会員詳細を開ける動線が必要。

## What Changes

- 予約者リストの会員名（氏名 + 任意ニックネーム）を **クリック / タップ可能なボタン化** し、押下で `MemberDetailSheet` を `EventDetailPage` 上にオーバーレイ表示する
- `EventDetailPage` 自体に `MemberDetailSheet` をマウントし、URL クエリ `?detail=<memberId>` で開閉状態を同期する（リロード / ブラウザ戻る進む対応）
- `useMemberDetailSheet` を `/members` 専用フィルタ (`useMembersFilter`) から疎結合化し、任意のページから「`?detail=<id>` 駆動の詳細シート」を再利用できるようにする
- 予約者リストのフォーカス・ホバー・キーボード操作（Tab → Enter）でシートが開けること
- 既存 `/members` 画面の挙動は変更しない（互換性保持）

スコープ外:
- `MemberDetailSheet` 自体の機能追加（参加履歴・メモ・修正依頼セクションは現状維持）
- 予約者リストの並び替え / フィルタ機能
- イベント詳細以外のページからの会員詳細リンク化（必要なら別 Issue）

## Capabilities

### New Capabilities
（なし — 既存 capability の振る舞いを拡張するのみ）

### Modified Capabilities
- `admin-event-detail`: 予約者リストの会員名がクリック可能になり、`MemberDetailSheet` がページ上に表示される要件を追加
- `admin-members-list`: `useMemberDetailSheet` の依存構造を疎結合化することで、`/members` 画面の挙動は変えずに他ページからも同一シートを再利用できるようにする旨を明示

## Impact

- `apps/admin/src/pages/EventDetailPage.vue` — `MemberDetailSheet` のマウント + 詳細クエリ source の注入
- `apps/admin/src/widgets/event-participants/ui/EventParticipantsTable.vue` — 氏名セルをボタン化、`member-clicked` イベント emit
- `apps/admin/src/widgets/event-participants/ui/EventParticipantsWidget.vue` — イベント伝搬
- `apps/admin/src/widgets/member-detail-sheet/composables/useMemberDetailSheet.ts` — 詳細 source を引数注入可能に refactor
- `apps/admin/src/features/route-detail-query/` （新規）— `?detail=<id>` を扱う汎用 composable
- `apps/admin/src/widgets/event-participants/ui/EventParticipantsTable.spec.ts` — クリック挙動テスト追加
- `apps/admin/src/pages/EventDetailPage.spec.ts` — シート開閉のページ統合テスト追加

依存・API 変更なし。Supabase migration / RLS 変更なし。デザイントークン追加なし。
