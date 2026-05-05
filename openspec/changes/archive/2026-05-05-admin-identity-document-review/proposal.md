## Why

Issue #171 で MVP1 必須機能と位置付けられた **admin 側の本人確認書類レビュー画面** が未実装である。`identity_documents` テーブル / RLS / Storage バケット / SOP は #147 / #92 で確立済 (`openspec/specs/data-schema`, `openspec/specs/rls-policies`, `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`)、reservation 側の提出経路 (#92) も実装済 (2026-05-05) だが、admin が pending を承認 / 差し戻しする経路がない。

レビュー画面が無いと: ① reservation 側で書類提出を集めても永久に `status = 'pending'` のまま、参加者の身元確認を完了できない、② マイナンバーカードのマスク漏れ画像が長期保管されるリスク (SOP 6 章「緊急時のエスカレーション」想定の事案を平時の運用で発見できない)、③ 江東区 / 都への団体登録の証憑として書類が「承認済 + 信頼可能」として確定しない、④ 差し戻し時にユーザーが書類を再提出する経路がなく会員ジャーニーが詰まる。

加えて翔太郎くんの 2026-05-05 判断 (会員ジャーニーの「軽さ」を優先) により、**pending status の会員は予約可能** とする方針に転換した。そのトレードオフとして、差し戻し / マスク漏れ削除時には **当該 member の active 予約を連鎖キャンセル + 次回ログイン時に再提出フローへ強制誘導** する後始末ロジックを admin 側で必ず発動する設計とする (#196 の旧方針「pending 予約禁止ガード」は本件で代替実装され不要になる)。

## What Changes

### 一覧画面 `/identity-documents`

- **NEW**: admin アプリにルート `/identity-documents` を追加し、本人確認書類のレビュー対象一覧を DataTable で表示する
  - 既存 `/events` `/events/new` 等と同じ admin 認証下 (AAL2 + role=admin) のルート。auth guard は流用
  - `/admin/identity-documents` ではなく `/identity-documents` (apps/admin はサブパスを持たない FSD アプリのため、Issue 原文の `/admin/identity-documents` を `/identity-documents` に正規化)
- **NEW**: ステータス絞り込みフィルタ (`pending` / `approved` / `rejected` / すべて) — デフォルトは **pending**
  - URL クエリ `?status=pending|approved|rejected|all` で同期 (events list と同じパターン)
- **NEW**: DataTable 列: 提出日時 / ユーザー名 / メール / 書類種別 / ステータス / 操作 (詳細へ)
  - 行クリックではなく「詳細」リンクで `/identity-documents/:id` へ遷移 (events list と同じ動線基準)
  - `pending` を上位にソート (デフォルトの優先度として、フィルタ「すべて」時に運営の見落とし防止)
- **NEW**: ページネーション (25 件 / ページ、URL `?page=`) と検索 (display_name / email 部分一致、URL `?q=`)
- **NEW**: 4 状態 (Loading / Empty / Error / Success) を網羅。Skeleton 6 行 / 0 件メッセージ / Error バナー + 再試行 / DataTable
- **NEW**: 「新規作成」CTA は本画面では **無し** (admin が書類を手動作成する運用はない)

### 詳細・承認画面 `/identity-documents/:id`

- **NEW**: ルート `/identity-documents/:id` を admin 認証下に追加し、個別書類の詳細・承認画面を表示する
- **NEW**: ヘッダ TopBar: パンくず「本人確認書類 / <提出日時>」+ ユーザー display_name / email / 書類種別 / 提出日時
- **NEW**: ユーザー情報カード: display_name / email / birthday / phone / experience_level (members から join 取得)
- **NEW**: 書類種別 + 受付条件カード (`DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` を SSOT として参照、reservation 側 #92 と同じ表示)
- **NEW**: 画像プレビュー: 表面 (常に表示) + 裏面 (`storage_path_back IS NOT NULL` のときのみ表示)
  - 画像は Supabase Storage の `createSignedUrl()` で発行した署名付き URL で取得
  - サムネイルクリックで Dialog モーダル拡大表示。モーダル内でズーム可能 (CSS `transform: scale()` のシンプルな等倍 / 2x / 4x 切替で MVP1 完結)
  - 表面・裏面とも個別にズーム可能
- **NEW**: マイナンバーカードリマインダー: `document_type === 'my_number_card_masked'` の場合のみ画像エリア上部に「個人番号 12 桁が完全にマスクされていることを確認してください。少しでも見えたら『マスク漏れ削除』を選択」バナーを赤系で表示
- **NEW**: アクション 3 種:
  1. **承認**: 確認 AlertDialog → `update identity_documents set status='approved', reviewed_at=now(), reviewed_by=<admin_member_id>` → 一覧へ戻る + Toast 成功メッセージ
  2. **差し戻し**: 確認 AlertDialog (理由テキストエリア必須、最大 500 字) → `update identity_documents set status='rejected', rejection_reason=<入力>, reviewed_at=now(), reviewed_by=<admin>` → **連鎖予約キャンセル** (当該 member の `status='reserved'` の reservations を一括 `cancelled` に UPDATE) → 完了後にユーザー再提出依頼メール送信ボタン (キャンセル予約ありの旨も body に含む) を表示 → 一覧へ戻る + Toast
  3. **マスク漏れ即時削除**: マイナンバーカードのみ表示。AlertDialog (確認文言固定: 「Storage から完全削除し再提出を依頼します」) → 表 + 裏 Storage オブジェクト削除 + `update identity_documents set status='rejected', rejection_reason='個人番号がマスクされていないため削除しました。再提出をお願いします', storage_path_front=NULL, storage_path_back=NULL, reviewed_at=now(), reviewed_by=<admin>` → **連鎖予約キャンセル** (差し戻しと同じ処理) → ユーザー再提出依頼メール送信ボタンを表示 → 一覧へ戻る + Toast
  - 既に `status != 'pending'` の書類はアクションボタン全体を disabled (二重承認防止)
- **NEW (連鎖予約キャンセル)**: 差し戻し / マスク漏れ削除の両アクションで、identity_documents の UPDATE 成功後に当該 member の active 予約 (`reservations.status = 'reserved'`) を一括 `'cancelled'` に UPDATE する。`'attended'` (来場済) は除外 SHALL (運用整合性: 来場した事実は保持)。`'waitlist'` も対象に含める (本人確認未承認のキャンセル待ちは無効化)
  - 既存トリガー `set_reservations_cancelled_at` が `cancelled_at = now()` を自動設定
  - キャンセル件数を mailto: メール body に含めることで、ユーザーが「予約していたイベントが消えた」体験を防ぐ (再提出後は member 自身で再予約してもらう運用)
- **NEW**: ユーザー再提出依頼メール送信は **mailto: 起動方式 (Phase 1 暫定)** を採用
  - 差し戻し / マスク漏れ削除完了後、`<a href="mailto:<user_email>?subject=...&body=...">ユーザーへ再提出依頼メールを送信</a>` リンクを表示
  - body には rejection_reason を含むテンプレート文言を URL エンコードで埋め込む
  - 翔太郎くんの Gmail でメーラーが起動 → 送信
  - 完全自動メール送信は **MVP2 で Resend 移行 (Phase 2) と合わせて別 Issue 化** (Issue #171 の「メール通知」要件は Phase 1 では mailto: で代替する判断)
  - 詳細は design.md で確定

### 通知バッジ (sidebar / dashboard)

- **NEW**: pending 件数バッジを admin の TopNav (or サイドバー / sidebar 相当の上部ナビ) に表示
  - `/identity-documents` リンクの右側に件数 Badge (`pending` 件数 > 0 のときのみ赤系で表示、0 のときは非表示または neutral)
  - HomePlaceholder ページ (`/`) にも「未確認の書類: N 件」のサマリカードを追加 (pending 件数を可視化)
  - 件数取得は `select count(*) from identity_documents where status = 'pending'` を 1 度発行する composable で共通化
  - リアルタイム更新は MVP1 ではしない (画面遷移時 / リロード時に再 fetch する方式)

### 4 状態の網羅 (Issue 完了条件)

- **NEW**: 一覧画面 / 詳細画面とも Loading (Skeleton) / Empty (0 件メッセージ) / Error (`role="alert"` バナー + 再試行) / Success の 4 状態を持つ
- **NEW**: 詳細画面の Error には event_detail と同じく:
  - `not found` (RLS で見えない or 削除済み) → 「書類が見つかりません」+ 一覧へ戻る CTA
  - `network/server` → 全画面エラー + 再試行 CTA
  - 画像 signed URL 取得失敗 → 画像エリアにのみ inline error + 再試行 CTA

### reservation 側 auth guard の判定ロジック変更 (Modified)

- **MODIFIED (reservation 側)**: `useAuthSession.hasIdentityDocument` の判定ロジックを変更
  - 旧: `identity_documents` 行が 1 件以上 (status 不問) → true
  - 新: `identity_documents` のうち `status IN ('pending', 'approved')` の行が 1 件以上 → true。`'rejected'` のみ持つ member は **false 扱い**
  - これにより、差し戻し / マスク漏れ削除を受けた member が次回ログインしたとき、router guard が `/signup/identity` へ強制誘導 (再提出フロー復活)
  - `'pending'` 行を持つ member は引き続き予約可能 (本件の方針転換による)
- **MODIFIED (reservation 側)**: 強制誘導 Requirement の Scenario に「rejected のみの member も誘導対象」を追加。reservation-identity-document-upload spec の delta で MODIFIED Requirements として記述

### RLS / 権限

- **NEW**: 既存 RLS (rls-policies spec の `identity_documents`) で admin が SELECT / UPDATE / DELETE 全件可能なため、**RLS ポリシー変更なし**
- **NEW**: 既存 Storage RLS (`identity-documents` バケット) で admin が他人のディレクトリ配下のオブジェクトを SELECT / DELETE 可能、**Storage RLS 変更なし**
- **NEW**: 既存 reservations RLS (rls-policies spec) で admin が全 member の reservations を UPDATE 可能、**reservations RLS 変更なし** (連鎖予約キャンセルは admin の既存権限内)
- **NEW**: signed URL 発行は admin の Supabase クライアントから `createSignedUrl(path, 3600)` で 1 時間有効な URL を生成 (既存 RLS で許可される)

### FSD レイヤー構成

- **NEW**: `apps/admin/src/pages/IdentityDocumentsListPage.vue` (一覧ルートエントリ)
- **NEW**: `apps/admin/src/pages/IdentityDocumentDetailPage.vue` (詳細ルートエントリ)
- **NEW**: `apps/admin/src/widgets/identity-documents-list/` (DataTable + Toolbar + Skeleton + Empty + Error)
- **NEW**: `apps/admin/src/widgets/identity-document-detail/` (TopBar + ユーザー情報 + 画像プレビュー + アクション)
- **NEW**: `apps/admin/src/features/identity-documents-filter/` (URL クエリ ⇄ state 同期 composable)
- **NEW**: `apps/admin/src/features/identity-document-approve/` (承認 mutation + AlertDialog)
- **NEW**: `apps/admin/src/features/identity-document-reject/` (差し戻し mutation + AlertDialog with reason input)
- **NEW**: `apps/admin/src/features/identity-document-mask-delete/` (マスク漏れ即時削除 mutation + AlertDialog)
- **NEW**: `apps/admin/src/features/identity-document-pending-badge/` (pending 件数 fetch + Badge composable)
- **NEW**: `apps/admin/src/entities/identity-document/` (admin 用 DTO 型 + queries + signed URL 生成)
- **NEW**: `apps/admin/src/shared/ui/Dialog.*` (shadcn-vue から Dialog プリミティブを copy-paste 取り込み — 画像プレビューモーダル用)
- **更新**: `apps/admin/src/app/router.ts` に 2 ルート追加
- **更新**: `apps/admin/src/pages/HomePlaceholder.vue` に pending 件数サマリ追加 (TopNav の Badge と二重表現)

### テスト

- **NEW**: vitest component test:
  - 一覧 (4 状態 / フィルタ / 検索 / ページネーション / URL クエリ同期)
  - 詳細 (4 状態 / 承認 / 差し戻し / マスク漏れ削除 / mailto: リンク / 二重承認防止 / マイナンバーリマインダー表示条件)
  - features の各 mutation (RLS 通過 / 失敗時のロールバック / Toast 表示)
  - pending Badge composable (fetch 成功 / 0 件 / エラー)
- **NEW**: E2E happy path 1 件 (Playwright): admin が pending 書類を承認 → 一覧から消える / approved 件数が増える (CLAUDE.md の「機能あたり 1〜2 件」上限遵守)

## Capabilities

### New Capabilities

- `admin-identity-document-review`: admin アプリの `/identity-documents` 一覧画面と `/identity-documents/:id` 詳細画面の責務 / DataTable 列構成 / フィルタ・検索・ソート契約 / 画像プレビューモーダル / 承認・差し戻し・マスク漏れ削除アクション / メール通知 (mailto: 起動方式) / pending 件数 Badge / 4 状態 (Loading / Empty / Error / Success) / FSD レイヤー配置 / アクセシビリティを規定する。

### Modified Capabilities

- `data-schema`: `identity_documents.storage_path_front` の **NOT NULL 制約を解除** する。マスク漏れ削除アクションで Storage オブジェクトを削除した際に、DB 列を NULL に設定して「削除済みマーカー」として扱うため。本番 DB は影響を受ける既存値を持たないため、ALTER TABLE で安全に変更可能。`storage_path_back` は元から NULL 可のため変更なし。
- `reservation-identity-document-upload`: `useAuthSession.hasIdentityDocument` の判定ロジックを「pending / approved 行が 1 件以上」へ変更し、rejected のみ持つ member を未提出扱いとする。これにより auth guard の `/signup/identity` 強制誘導が差し戻し後にも発動する。Requirement「AuthSession に hasIdentityDocument 派生プロパティが存在する」と「プロフィール完成済 + 書類未提出会員の `/signup/identity` 強制誘導」の 2 件を MODIFIED で更新する。
- (変更なし) `rls-policies`: 既存 RLS ポリシー (admin が他人の identity_documents / storage オブジェクトを SELECT / UPDATE / DELETE 可能、admin が全 member の reservations を UPDATE 可能) で本 change の操作はすべてカバー済。新規ポリシー追加なし。

## Impact

### コード (admin 側)

- **追加**: `apps/admin/src/pages/IdentityDocumentsListPage.vue`, `IdentityDocumentDetailPage.vue`
- **追加**: `apps/admin/src/widgets/identity-documents-list/`, `widgets/identity-document-detail/`
- **追加**: `apps/admin/src/features/identity-documents-filter/`, `identity-document-approve/`, `identity-document-reject/`, `identity-document-mask-delete/`, `identity-document-pending-badge/`
- **追加**: `apps/admin/src/entities/identity-document/` (admin 用、reservation 側 `entities/identity-document/` とは別スライスとして独立。共通の Branded Types / DocumentType enum / labels は `@high-q/shared` から再 export)
- **追加**: `apps/admin/src/shared/ui/Dialog.*` (shadcn-vue Dialog プリミティブ copy-paste)
- **更新**: `apps/admin/src/app/router.ts` に 2 ルート + auth guard 流用
- **更新**: `apps/admin/src/pages/HomePlaceholder.vue` に pending 件数サマリカード追加
- **更新**: TopNav (or layout 相当) に pending 件数 Badge 追加 (既存ナビ位置は実装時に確認)
- **追加 (連鎖予約キャンセル)**: `apps/admin/src/features/identity-document-reject/` 内に予約キャンセル mutation を含めるか、`apps/admin/src/entities/reservation/` の既存 mutations を拡張するか。Apply 時に再判断 (design D23 参照)

### コード (reservation 側 — 本 change で変更)

- **更新**: `apps/reservation/src/features/auth/composables/useAuthSession.ts` の `hasIdentityDocument` 判定ロジックを「pending / approved 行が 1 件以上」に変更
- **更新**: `apps/reservation/src/entities/member/api/identity-document-existence.ts` (reservation 側 #92 で実装済) の存在チェック SQL を `select id from identity_documents where member_id = ? and status in ('pending', 'approved') limit 1` に変更
- **更新**: 関連 spec (`useAuthSession.spec.ts` / `identity-document-existence.spec.ts`) に rejected のみ持つ member は false 扱いとなることを確認する Scenario を追加

### DB / Storage

- **変更なし**: `identity_documents` テーブル / RLS / Storage バケット / 署名付き URL 発行ロジックは既存仕様で動作
- **変更なし**: マイグレーション SQL なし (本 change で新規 DDL は発行しない)
- **追加検討**: pending 件数取得が頻発する場合のためのインデックス。既存 `identity_documents_status_pending_partial_idx` (rls-policies インデックス Requirement に既に存在) で十分

### 環境変数 / インフラ

- **変更なし**: 既存 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を流用
- **変更なし**: メール送信は mailto: 起動 (Phase 1) のためアプリインフラ追加なし

### 依存関係

- **追加検討**: 画像ズーム用ライブラリは追加しない (CSS `transform: scale()` で 1x / 2x / 4x 切替を自前実装、依存追加コスト > MVP1 利益と判断)
- **追加 (確定)**: shadcn-vue の `Dialog` プリミティブを `apps/admin/src/shared/ui/Dialog.*` として copy-paste 取り込み (既存 `AlertDialog` は確認系専用、画像プレビューには不適合)

### ドキュメント

- **更新**: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` の admin レビュー実装状況を「未実装 (#171 で実装)」→「実装済 (#171 ✅ <日付>)」へ更新
- **更新**: 同 SOP §2「admin レビュー時の確認フロー」「マスク漏れ即時削除 SOP」の文言を本 change の実装内容と整合させる (mailto: 起動方式の運用フロー追記)
- **更新**: 同 SOP 改訂履歴に本 change の行を追加

### 関連 Issue

- **#92 (✅ Done)** reservation 側本人確認書類アップロード — 本 change の前提
- **#147 (✅ Done)** identity_documents テーブル / RLS / Storage バケット — 既存資産
- **#196 (Todo)** pending 会員予約禁止ガード — **本件マージ時にクローズ予定** (翔太郎くん 2026-05-05 方針転換: pending 会員の予約は許容、差し戻し時の連鎖予約キャンセル + 再提出強制誘導で代替)。本件 PR 本文に「Closes #171, Supersedes #196」を明記
- **#172 (MVP2)** 役所提出用一括ダウンロード — 本 change スコープ外
- **MVP2 別 Issue (未番)** 自動メール通知の Resend 化 — Phase 2 SMTP 移行後 (#88-92 系) に切り出し

### テスト

- **追加**: vitest component test (一覧 / 詳細 / 各 features / Badge composable)
- **追加**: vitest API layer test (mutations + signed URL 生成、Supabase mock)
- **追加**: E2E happy path 1 件 (Playwright): admin で `/identity-documents` を開く → pending 行を選択 → 詳細画面で承認 → 一覧から消える

### Open Questions (翔太郎くん 2026-05-05 確定)

| 質問 | 確定 |
|---|---|
| pending Badge を表示する場所 | **TopNav の `/identity-documents` リンク右 + HomePlaceholder サマリの 2 箇所** |
| 一覧のデフォルトステータスフィルタ | **pending** (運用優先度) |
| マスク漏れ削除時の DB 列の扱い | **`storage_path_front = NULL` (削除済みマーカー)** + NOT NULL 制約解除の migration |
| メール通知の自動化 | **mailto: 起動方式で MVP1 完結**、自動化は MVP2 で別 Issue |
| 一覧ソートのデフォルト | **pending 上位 + uploaded_at desc** |
| Dialog プリミティブの取り込み形態 | **手動コピー** (既存 AlertDialog と同じ方針) |
| **pending 会員の予約可否** | **可能 (許容)**。差し戻し時に当該 member の active 予約を連鎖キャンセル + 次回ログインで `/signup/identity` 強制誘導で対処 |
| **差し戻し時の予約処理** | **`status='reserved'` の reservations を一括 `'cancelled'` に UPDATE**。`'attended'` (来場済) は除外、`'waitlist'` は対象に含む |
