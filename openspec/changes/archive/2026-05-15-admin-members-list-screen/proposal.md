## Why

Issue #150 は Epic #169「オーナーがサークルを見える化・効率化する」のうち、サークルオーナーが**過去から現在までの会員を一望し、それぞれの参加度合いと特性を素早く把握できる**画面を提供する変更である。MVP1 のリリース後、参加回数・最終参加時期・経験レベル・運営側メモといった「個別会員を理解するための情報」が日々増えていくが、現状は admin が会員レコードを横断的に見る手段がなく、参加者一覧（イベント単位）からしか会員を辿れない。

本 change のねらいは、会員を**一覧 + フィルタ + 検索 + 詳細（参加履歴 + 運営メモ編集）**の単純な軸で見える化し、運営判断（声かけ・初心者対応・連絡漏れ追跡）に必要な最低限の情報基盤を整えることにある。

### Issue #150 原案からの変更提案（PO 合意済 2026-05-15）

Issue #150 / Epic #169 の設計サンプル（`ScreenMembers`）には「CSV ダウンロード」「一斉メール」ボタンが含まれていたが、両者は本 Issue のコア機能（一覧 + フィルタ + 詳細 + メモ）から独立した周辺機能であり、特に一斉メールはテンプレ管理 + 送信ログ + Edge Function 構築を伴う 1 Issue 級のスコープを持つ。両機能は別 Issue として切り出し、本 change のスコープは**コア閲覧 + メモ編集**に純化する。

会員詳細の見せ方は、admin の既存パターン（EventDetailPage / IdentityDocumentDetailPage の別ページ方式）に対し、本 change では**一覧の右側に slide-in する sheet / dialog 方式**を採用する。会員一覧でのフィルタ条件を保ったまま個別会員を確認・編集できるため、運営の比較・連続確認操作と相性が良い。

### MVP1 スコープオフ済み機能の事前確認結果

関連 spec を全件確認し MVP1 スコープオフ項目を抽出した。これらに依存する UI / DB 機能は本 change に**一切含めない**:

| スコープオフ項目 | 出典 | 本 change での扱い |
|---|---|---|
| CSV エクスポート | Issue #150 設計サンプル | 別 Issue へ切り出し（本 change には含めない） |
| 一斉メール送信 | Issue #150 設計サンプル | 別 Issue へ切り出し（テンプレ + 送信ログ + Edge Function を伴うため） |
| ダッシュボード（StatCard・通知・最近の予約） | Epic #169 | 別 Issue（#150 の兄弟 Issue として後続） |
| 会場マスタ CRUD | Epic #169 | 別 Issue |
| 設定画面（サークル情報・通知等） | Epic #169 | 別 Issue |
| 会員の削除 / role 変更 UI | （関連 spec に存在しない） | admin の運用上 Supabase Dashboard 直接操作で対応、UI は持たない |
| キャンセル待ち (`waitlist`) 件数集計 | `data-schema` Requirement: event_detail_view | MVP1 では 0 件運用のため、本 change の参加履歴表示でも特別扱いせず通常の状態 Badge として表示 |

## What Changes

| 観点 | 変更前 | 変更後 |
|------|--------|--------|
| admin の会員横断可視性 | 参加者一覧（イベント単位）からのみ会員を辿れる | `/members` 画面で全会員を一覧 + フィルタ + 検索可能 |
| 会員データの集計列 | reservations を都度集計するアプリ層クエリのみ | `member_list_view` で「初回参加日 / 累計参加回数 / 最終参加日」を単一クエリで取得 |
| 個別会員の参加履歴 | 取得手段なし | `member_history_view` で member 別に events × reservations を時系列で取得 |
| 運営側メモ | 保管場所なし | `members.admin_note` text 列を新設、admin のみ編集可・閲覧範囲を admin に限定 |
| `/members` ルート | 未定義 | admin app に新規追加。AAL2 + admin 通過ルート |
| 会員詳細の閲覧・編集 | 取得手段なし | 一覧の右側に slide-in する sheet で参加履歴 + メモ編集を提供 |
| admin ヘッダーから本人確認書類リンクの並び | `/events` にのみ pending 数バッジ付きリンク | `/events` ヘッダーに「会員」リンクを追加（既存スタイル踏襲、Badge なし） |

## Capabilities

### New Capabilities
- `admin-members-list`: `/members` 画面の責務を規定する。DataTable 列構成 / フィルタ・検索・ソート契約 / 4 状態（Loading / Empty / Error / Success）/ ページネーション / URL クエリ同期 / 詳細 sheet の表示・閉じ動作 / 参加履歴の表示 / 運営メモ編集の保存契約 / FSD レイヤー配置 / アクセシビリティを定める

### Modified Capabilities
- `data-schema`: `members` テーブルに `admin_note` text NULL 列を追加する。集計 view `member_list_view`（一覧用）と `member_history_view`（詳細の参加履歴用）を新規追加する
- `app-routing`: admin app に `/members` ルートを追加する。AAL2 + admin 通過、AAL1 / 非 admin は既存 guard で排除される。「会員」ヘッダーリンクは `/events` から `/members` への片方向遷移を提供する（双方向対称性は対象外、既存の本人確認書類リンクと同じパターン）
- `rls-policies`: `members` の UPDATE WITH CHECK 句に「本人は `admin_note` 列を変更できない」制約を明示追加し、本人 SELECT 経路では `admin_note` を返さない実装規約を本 capability に固定する（reservation 側の members 取得を列指定 SELECT に変える運用ルール）

## Impact

### 影響するコンポーネント・ファイル

- 管理画面 (`apps/admin`)
  - 新規ページ `MembersListPage`（一覧 + 詳細 sheet）
  - 新規 widget `members-list`（DataTable / Toolbar / Pagination）
  - 新規 widget `member-detail-sheet`（slide-in sheet / 参加履歴テーブル / メモ編集フォーム）
  - 新規 entity `member`（型 + view 取得 + 集計列 Branded Types）
  - 新規 feature `members-filter`（経験 / 累計レンジ / 最終参加期間 / 検索）
  - 新規 feature `member-admin-note-edit`（メモ保存 + 楽観的更新）
  - 既存 `EventsListPage` ヘッダーに「会員」リンク追加
  - `apps/admin/src/app/router.ts` への `/members` ルート登録
- 会員サイト (`apps/reservation`)
  - 既存 members 取得経路の列指定 SELECT への変更（`admin_note` を含めない明示的列指定）
- DB スキーマ
  - `members.admin_note` text NULL 列追加（CHECK 制約なし、上限は アプリ層で 500 文字）
  - `member_list_view` 新規作成（events × reservations × members 集計）
  - `member_history_view` 新規作成（reservations × events join、time-series）
  - RLS WITH CHECK 句更新（本人 UPDATE の列限定強化）
- spec
  - `admin-members-list`（新規）
  - `data-schema`（members 列 + 新規 2 view）
  - `app-routing`（admin の `/members` ルート）
  - `rls-policies`（members の UPDATE 列限定強化 + 列指定 SELECT 運用ルール）

### 影響しない範囲（Non-Goals）

- CSV エクスポート / 一斉メール送信（別 Issue）
- ダッシュボード / 会場マスタ / 設定画面（別 Issue、Epic #169 内の兄弟 Issue）
- 会員の削除 / role 変更 UI
- 会員サイト (`apps/reservation`) の UI（会員自身は admin_note を画面で見ない）
- admin の本人確認書類画面 / イベント画面の既存機能
- メールアドレス変更 / 退会 UI
