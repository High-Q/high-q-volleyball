## ADDED Requirements

### Requirement: `/identity-documents` 画面のルートと配置

`apps/admin` は MUST `/identity-documents` ルートを公開し、`IdentityDocumentsListPage` をマウント SHALL する。本ルートは admin 認証 (AAL2 + role=admin) 配下で、未認証 / AAL1 / 非 admin はそれぞれ既存 auth guard により `/login` / `/mfa` / `/login?reason=not-admin` にリダイレクトされる。

#### Scenario: 認証済み admin が直接 URL を踏む
- **WHEN** AAL2 + admin の状態で `/identity-documents` を開く
- **THEN** `IdentityDocumentsListPage` が描画される

#### Scenario: 未認証で URL を踏む
- **WHEN** 未認証で `/identity-documents` を開く
- **THEN** `/login` にリダイレクトされる

#### Scenario: 一般会員が URL を踏む
- **WHEN** AAL2 + role=member で `/identity-documents` を開く
- **THEN** `/login?reason=not-admin` にリダイレクトされ、admin 画面に侵入できない

### Requirement: 一覧 DataTable の列構成

`/identity-documents` 画面は MUST 以下 6 列を持つ DataTable で identity_documents を一覧表示する:

1. **提出日時**: `uploaded_at` を `MM/DD HH:mm` で表示。mono フォント
2. **ユーザー名**: アバター (先頭文字の丸チップ) + `members.display_name` (join 取得)
3. **メール**: `members.email`。mono + muted 色
4. **書類種別**: `DOCUMENT_TYPE_LABELS[document_type]` を Badge で表示。`document_type === 'my_number_card_masked'` のみ赤系 (`bg-danger-soft text-danger`) で警告色
5. **ステータス**: `status` を翻訳した Badge — `pending` (neutral / 黄系)「未対応」/ `approved` (success / 緑)「承認済」/ `rejected` (danger / 赤)「差し戻し」
6. **操作**: 「詳細」`<router-link>` (押下で `/identity-documents/:id` へ遷移)

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は横スクロールにフォールバック SHALL。

#### Scenario: 列順序が仕様どおり
- **WHEN** Success 状態で 1 件以上ある状態で描画
- **THEN** 上記 1〜6 の列が左から順に表示される

#### Scenario: 書類種別 Badge の警告色
- **WHEN** マイナンバーカードの行を描画
- **THEN** 書類種別セルの Badge が赤系 (`bg-danger-soft text-danger`) で表示される

#### Scenario: ステータス Badge の翻訳
- **WHEN** `status === 'pending'` の行を描画
- **THEN** ステータス列に「未対応」と表示された neutral / 黄系の Badge が表示される

#### Scenario: 詳細リンクからの遷移
- **WHEN** ユーザーが行の「詳細」リンクを押下
- **THEN** router が `/identity-documents/:id` に push され、`IdentityDocumentDetailPage` が表示される

#### Scenario: 行全体は非リンク
- **WHEN** ユーザーが「詳細」列以外のセルをクリック
- **THEN** 何も起きない (行全体は `<router-link>` で wrap しない)

### Requirement: ステータスフィルタと URL クエリ同期

`/identity-documents` 画面は MUST ステータスフィルタを提供する:

- 選択肢: 「未対応 (pending)」「承認済 (approved)」「差し戻し (rejected)」「すべて (all)」
- デフォルト: **pending** (運用優先度が最も高い)
- URL クエリ `?status=pending|approved|rejected|all` で同期。デフォルト値 `pending` のときは URL から status= を **省略しない** SHALL (明示性のため `?status=pending` を保持)
- ブラウザのリロード・戻る/進むで状態が復元される SHALL

#### Scenario: デフォルトフィルタ
- **WHEN** ユーザーが `/identity-documents` を初めて開く
- **THEN** URL が `/identity-documents?status=pending` に自動補完され、pending の書類のみ表示される

#### Scenario: フィルタ切替の URL 同期
- **WHEN** ユーザーが「すべて」を選択
- **THEN** URL が `?status=all` に変わり、全件 (pending + approved + rejected) が表示される

#### Scenario: URL からの復元
- **WHEN** `/identity-documents?status=approved` を直接開く
- **THEN** フィルタ UI が「承認済」で初期化され、approved の書類のみ表示される

### Requirement: 検索 (display_name / email 部分一致)

`/identity-documents` 画面は MUST 検索ボックスを提供する。検索対象は `members.display_name` または `members.email` の部分一致 (`ILIKE %q%`)。URL クエリ `?q=...` で同期、デフォルトは空文字 (無効)。

#### Scenario: 検索文字列の URL 同期
- **WHEN** ユーザーが検索ボックスに「田中」と入力
- **THEN** URL が `?q=%E7%94%B0%E4%B8%AD` (URL エンコード) になり、display_name または email に「田中」を含む行のみ表示される

#### Scenario: フィルタとの組み合わせ
- **WHEN** `?status=pending&q=tanaka` で開く
- **THEN** pending かつ display_name / email に「tanaka」を含む行のみ表示される

### Requirement: ページネーション

`/identity-documents` 画面は MUST サーバサイドの offset / limit ページネーションを提供する。1 ページあたり **25 件**固定、URL クエリ `?page=N` で現在ページを管理。

#### Scenario: ページ送り
- **WHEN** ページ 2 のリンクをクリック
- **THEN** URL が `?page=2` になり、26 〜 50 番目の identity_documents が表示される

#### Scenario: ページ範囲外
- **WHEN** `?page=999` を直接開く (実データ少)
- **THEN** Empty 状態が表示される (エラーではない)

### Requirement: 一覧の固定ソート規則

`/identity-documents` 画面の DataTable は MUST 以下の **固定ソート規則** で行を並べる (列ヘッダクリックでのソート切替は提供しない):

1. `status = 'pending'` の行が最上位 (運営の見落とし防止)
2. 同一 status 内では `uploaded_at desc` (新しい提出が上)

URL クエリ `?sort=` は提供しない SHALL。

#### Scenario: pending が最上位
- **WHEN** `?status=all` で pending 3 件 + approved 2 件 + rejected 1 件が混在する
- **THEN** pending 3 件が上 3 行を占め、approved / rejected はその下に並ぶ

#### Scenario: 新しい提出が上
- **WHEN** 同一 status (例: pending) の中で uploaded_at が異なる 2 行
- **THEN** 新しい uploaded_at の行が上に表示される

### Requirement: 4 状態 (Loading / Empty / Error / Success) の網羅

`/identity-documents` 画面は MUST 以下 4 状態を表示し分ける:

- **Loading**: 初回マウント中またはフィルタ変更中。`Skeleton` プリミティブで 6 行分の skeleton bar を描画
- **Empty**: クエリ結果が 0 件。「該当する書類がありません」のメッセージ + フィルタを変更する誘導 (例: 「フィルタを『すべて』に変更すると確認できます」)
- **Error**: クエリ失敗。エラーコード (例: `ERR · supabase / identity_documents.list · 503`) と「再試行」CTA を表示。`role="alert"` 必須
- **Success**: 1 件以上。DataTable + Pagination 表示

#### Scenario: Loading skeleton の表示
- **WHEN** ページ初回マウントでクエリが pending
- **THEN** Skeleton が 6 行表示され、DataTable のヘッダは表示済み

#### Scenario: Empty 状態の誘導
- **WHEN** クエリ結果が 0 件
- **THEN** 「該当する書類がありません」が表示され、フィルタ変更の誘導が表示される

#### Scenario: Error 状態の role 属性
- **WHEN** クエリが失敗
- **THEN** Error メッセージのコンテナに `role="alert"` が付与され、「再試行」ボタンが表示される

#### Scenario: Error 状態からの再試行
- **WHEN** Error 状態で「再試行」を押下
- **THEN** クエリが refetch され、Loading → Success/Error に遷移する

### Requirement: `/identity-documents/:id` 画面のルートと配置

`apps/admin` は MUST `/identity-documents/:id` ルートを公開し、`IdentityDocumentDetailPage` をマウント SHALL する。本ルートは admin 認証配下で、auth guard は `/identity-documents` と同じ。

`:id` パラメータは UUID として扱い、形式不正 / 存在しない / RLS で見えない場合は `not found` Error 状態を表示 SHALL する。

#### Scenario: 認証済み admin が直接 URL を踏む
- **WHEN** AAL2 + admin で `/identity-documents/<existing-uuid>` を開く
- **THEN** `IdentityDocumentDetailPage` が描画される

#### Scenario: 存在しない id
- **WHEN** `/identity-documents/<non-existent-uuid>` を開く
- **THEN** 「書類が見つかりません」と「一覧へ戻る」CTA が表示される

#### Scenario: 未認証で URL を踏む
- **WHEN** 未認証で `/identity-documents/<any-uuid>` を開く
- **THEN** `/login` にリダイレクトされる

### Requirement: 詳細画面の TopBar 構成

`IdentityDocumentDetailPage` は MUST 最上段に以下を表示する `IdentityDocumentDetailTopBar` を持つ:

- **パンくず**: 「本人確認書類 > <提出日時 MM/DD>」
- **ユーザー display_name**: members から join 取得
- **メール**: `members.email`。mono + muted 色
- **書類種別 Badge**: `DOCUMENT_TYPE_LABELS[document_type]`、マイナンバー時は赤系
- **ステータス Badge**: 「未対応」「承認済」「差し戻し」のいずれか

#### Scenario: TopBar の表示内容
- **WHEN** identity_document が成功取得できた
- **THEN** TopBar にパンくず / ユーザー名 / メール / 書類種別 Badge / ステータス Badge が表示される

### Requirement: ユーザー情報カードの表示

詳細画面は MUST `IdentityDocumentMemberCard` を TopBar 直下に表示し、以下の項目を `members` から join 取得して表示する:

- display_name (大見出し)
- email (mono + muted)
- birthday (`YYYY/MM/DD` 形式)
- phone (NULL なら「未登録」)
- experience_level Badge (`'beginner'` → 「初回」 / `'intermediate'` → 「中級」 / `'experienced'` → 「経験者」)

#### Scenario: 全項目の表示
- **WHEN** member の全項目に値が入っている
- **THEN** display_name / email / birthday / phone / experience_level が表示される

#### Scenario: phone が NULL の表示
- **WHEN** member の phone が NULL
- **THEN** phone セクションに「未登録」と表示される

### Requirement: 書類種別と受付条件カードの表示

詳細画面は MUST 書類種別ラベル + 受付条件を表示する:

- 書類種別: `DOCUMENT_TYPE_LABELS[document_type]` を Kicker + 大見出しで表示
- 受付条件: `DOCUMENT_TYPE_REQUIREMENTS[document_type]` を本文で表示。`document_type === 'my_number_card_masked'` のときのみ「個人番号 12 桁が完全マスク済みであること」固定文言を上書き表示

ラベル文言は MUST `packages/shared/src/types/labels.ts` を SSOT として参照する SHALL (ハードコード文字列禁止)。

#### Scenario: 運転免許証の受付条件
- **WHEN** `document_type === 'drivers_license'` の書類を表示
- **THEN** 受付条件セクションに「有効期間内であること」が表示される

#### Scenario: マイナンバーカードの固定文言
- **WHEN** `document_type === 'my_number_card_masked'` の書類を表示
- **THEN** 受付条件セクションに「個人番号 12 桁が完全マスク済みであること」が表示される

### Requirement: 画像プレビュー (表面 + 裏面任意 + signed URL)

詳細画面は MUST `IdentityDocumentImagePreview` で書類画像を表示する:

- **表面**: `storage_path_front` から signed URL を生成し、`aspect-ratio: 85/54` のタイルで表示。`storage_path_front IS NULL` (マスク漏れ削除済) の場合はタイル内に「画像は削除済みです」と表示
- **裏面**: `storage_path_back IS NOT NULL` のときのみ表示。`storage_path_back IS NULL` のときは裏面タイル自体を非表示

signed URL 取得失敗時はタイル内に inline error「画像を取得できませんでした」+ 「再試行」ボタンを表示する SHALL。

各タイルは MUST `<img alt="<書類種別> の表面 / 裏面" loading="lazy">` を持つ。

#### Scenario: 表面のみの書類
- **WHEN** `storage_path_front IS NOT NULL` かつ `storage_path_back IS NULL`
- **THEN** 表面タイルのみ表示され、裏面タイルは描画されない

#### Scenario: 表裏両方の書類
- **WHEN** `storage_path_front IS NOT NULL` かつ `storage_path_back IS NOT NULL`
- **THEN** 表面 + 裏面の 2 タイルが縦に並んで表示される

#### Scenario: マスク漏れ削除済の表示
- **WHEN** `storage_path_front IS NULL` (マスク漏れ削除済)
- **THEN** 表面タイル内に「画像は削除済みです」と表示される

#### Scenario: signed URL 取得失敗
- **WHEN** Storage createSignedUrl が失敗
- **THEN** 該当タイルに「画像を取得できませんでした」+ 「再試行」ボタンが表示される

### Requirement: 画像プレビュー Dialog 拡大モーダル

詳細画面は MUST 画像タイルクリックで `Dialog` モーダル拡大表示を提供する:

- Dialog 内: signed URL の `<img>` + ズーム切替ボタン (1x / 2x / 4x)
- ズーム実装: CSS `transform: scale()` のみ。スクロール / パン操作は MVP1 範囲外
- 4x で画面に収まらない場合は親要素 `overflow-auto` で縦横スクロール
- 閉じる: ESC キー / × ボタン / 背景クリック (Dialog プリミティブ標準動作)
- 表面 / 裏面で別々の Dialog を開く SHALL (片方クリックで両方開かない)

`Dialog` プリミティブは MUST `apps/admin/src/shared/ui/Dialog.*` に shadcn-vue から copy-paste 取り込んで実装する SHALL。

#### Scenario: タイルクリックで Dialog 表示
- **WHEN** 表面タイルをクリック
- **THEN** Dialog が開き、表面の signed URL 画像 + ズーム切替ボタンが表示される

#### Scenario: ズーム切替
- **WHEN** Dialog 内で「2x」ボタンを押下
- **THEN** 画像が `transform: scale(2)` で拡大表示される

#### Scenario: ESC で Dialog を閉じる
- **WHEN** Dialog 開状態で ESC キーを押下
- **THEN** Dialog が閉じ、フォーカスが元のタイルに戻る

#### Scenario: 背景クリックで Dialog を閉じる
- **WHEN** Dialog 開状態で背景部分をクリック
- **THEN** Dialog が閉じる

### Requirement: マイナンバーカード時のリマインダー表示

詳細画面は MUST `document_type === 'my_number_card_masked'` のときのみ画像プレビュー上部に赤系リマインダーバナーを表示する:

- バナー: 朱色 (`var(--hq-danger)`) サイドボーダー + 同色背景 (alpha 0.08) + `role="alert"`
- タイトル: 「個人番号 (裏面 12 桁) のマスクを必ず確認してください」
- 説明: 「少しでも見えたら『マスク漏れ削除』を選択してください。判断に迷う場合は安全側に倒して削除してください。」

`document_type !== 'my_number_card_masked'` の書類では本バナーは MUST 表示しない。

#### Scenario: マイナンバー時の表示
- **WHEN** `document_type === 'my_number_card_masked'` の書類を表示
- **THEN** 画像プレビュー上部にリマインダーバナーが表示される

#### Scenario: 運転免許証時は非表示
- **WHEN** `document_type === 'drivers_license'` の書類を表示
- **THEN** リマインダーバナーは表示されない

### Requirement: 承認アクション

詳細画面の `IdentityDocumentActionsFooter` は MUST 「承認」ボタンを提供する。`status === 'pending'` のときのみ active、それ以外は disabled。

押下時の挙動:
1. `AlertDialog` 表示: タイトル「この書類を承認しますか?」 + 説明「{display_name} さんの {document_type の日本語ラベル} を本人確認完了として承認します。承認後も引き続きサークル機能をご利用いただけます。」 + ボタン「キャンセル」「承認する」 — `document_type` は `DOCUMENT_TYPE_LABELS` (日本語) に変換して表示する MUST (生 enum 値の表示禁止)
2. 「承認する」確定で `update identity_documents set status='approved', reviewed_at=now(), reviewed_by=<admin_member_id> where id=:id and status='pending'` を発行
3. 成功 (1 行更新) 時: Toast「承認しました」を表示し、`/identity-documents` 一覧へ戻る
4. WHERE 句で 0 行更新 (既に他 admin が処理済) の場合: AlertDialog 内に inline error「既に他の管理者が処理しました」+ 一覧へ戻る CTA
5. 失敗 (network/db) 時: AlertDialog 内に inline error「承認に失敗しました」+ 状態は変化せず再試行可能

#### Scenario: 承認の正常系
- **WHEN** pending 書類で「承認」→ AlertDialog で「承認する」確定し、UPDATE が成功
- **THEN** Toast「承認しました」が表示され、`/identity-documents` 一覧へ戻る

#### Scenario: 既に承認済の書類でボタン disabled
- **WHEN** `status === 'approved'` の書類を開く
- **THEN** 「承認」ボタンは disabled で表示され、押下不可

#### Scenario: 二重承認防止
- **WHEN** A admin が「承認する」を押下する直前に、B admin が同じ書類を承認済 (status='approved')
- **THEN** A の UPDATE は WHERE 句不一致で 0 行更新となり、AlertDialog に「既に他の管理者が処理しました」と表示される

#### Scenario: AlertDialog のキャンセル
- **WHEN** AlertDialog の「キャンセル」or ESC を押下
- **THEN** UPDATE は発行されず、Dialog のみ閉じる

### Requirement: 差し戻しアクション (理由必須)

詳細画面の `IdentityDocumentActionsFooter` は MUST 「差し戻し」ボタンを提供する。`status === 'pending'` のときのみ active、それ以外は disabled。

押下時の挙動:
1. `AlertDialog` 表示: タイトル「この書類を差し戻しますか?」 + 理由テキストエリア (必須、最大 500 字、placeholder「例: 画像が不鮮明で氏名・住所が読み取れません」) + ボタン「キャンセル」「差し戻す」
2. 理由が空または 500 字超では「差し戻す」ボタン disabled
3. 「差し戻す」確定で `update identity_documents set status='rejected', rejection_reason=<入力>, reviewed_at=now(), reviewed_by=<admin> where id=:id and status='pending'` を発行
4. identity_documents UPDATE 成功 (1 行更新) 時、続けて **連鎖予約キャンセル** を実行 (本 spec の「Requirement: 差し戻し / マスク漏れ削除に伴う連鎖予約キャンセル」を参照)
5. 連鎖予約キャンセルも成功した場合: Dialog 内容を mailto: リンク表示モードに切替 + 「ユーザーへ再提出依頼メールを送信」ボタンを表示。mailto: の body にキャンセル件数を含める
6. mailto: リンク押下後 admin が「閉じる」で Dialog を閉じ、`/identity-documents` 一覧へ戻る + Toast「差し戻しました (予約 N 件もキャンセル)」
7. identity_documents の WHERE 句で 0 行更新 (既に他 admin 処理済) の場合: AlertDialog 内に inline error「既に他の管理者が処理しました」+ 一覧へ戻る CTA。連鎖予約キャンセルは発動しない
8. identity_documents の UPDATE 失敗 (network/db) 時: AlertDialog 内に inline error「差し戻しに失敗しました」+ 状態は変化せず再試行可能。連鎖予約キャンセルは発動しない
9. 連鎖予約キャンセルが失敗した場合: AlertDialog 内に inline error「書類は差し戻されましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください」+ 手動復旧誘導 (SOP §6 参照)

#### Scenario: 差し戻しの正常系 (予約キャンセルなし)
- **WHEN** pending 書類で「差し戻し」→ AlertDialog で理由入力 →「差し戻す」確定し、UPDATE が成功 + 当該 member に active 予約なし
- **THEN** Dialog 内に mailto: リンクが表示され、body にキャンセル件数 0 件 (相当文言) が含まれる

#### Scenario: 差し戻しの正常系 (予約キャンセルあり)
- **WHEN** pending 書類で差し戻し成功 + 当該 member に `status='reserved'` の reservations が 2 件
- **THEN** identity_documents UPDATE 後に連鎖予約キャンセルが発動し、2 件が `cancelled` に UPDATE される。Dialog の mailto: body にキャンセル 2 件が含まれる

#### Scenario: 連鎖予約キャンセル失敗時の inline error
- **WHEN** identity_documents UPDATE 成功後、reservations の連鎖キャンセル UPDATE が network エラー
- **THEN** AlertDialog 内に「書類は差し戻されましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください」が表示される

#### Scenario: 理由未入力でボタン disabled
- **WHEN** AlertDialog の理由テキストエリアが空
- **THEN** 「差し戻す」ボタンは disabled で表示される

#### Scenario: 理由 501 字でボタン disabled
- **WHEN** 理由テキストエリアに 501 字入力
- **THEN** 「差し戻す」ボタンは disabled、文字数カウンターが「501 / 500」に赤色表示

#### Scenario: 既に rejected 書類でボタン disabled
- **WHEN** `status === 'rejected'` の書類を開く
- **THEN** 「差し戻し」ボタンは disabled で表示される

### Requirement: マスク漏れ即時削除アクション

詳細画面の `IdentityDocumentActionsFooter` は MUST `document_type === 'my_number_card_masked'` のときのみ「マスク漏れ削除」ボタンを表示する SHALL。`document_type !== 'my_number_card_masked'` のときは本ボタンを **表示しない** MUST。

`status === 'pending'` のときのみ active、それ以外は disabled。

押下時の挙動:
1. `AlertDialog` 表示: タイトル「この画像を Storage から完全削除しますか?」 + 説明「個人番号のマスクが不十分な可能性があるため、Storage から完全削除し、ユーザーに再提出を依頼します。この操作は元に戻せません。」 + ボタン「キャンセル」「削除する」
2. 「削除する」確定で以下を順に実行:
   - 2a. Storage `identity-documents` から `storage_path_front` + `storage_path_back` (NOT NULL のとき) のオブジェクトを `remove([paths])` で削除
   - 2b. `update identity_documents set status='rejected', rejection_reason='個人番号がマスクされていないため削除しました。再提出をお願いします', storage_path_front=NULL, storage_path_back=NULL, reviewed_at=now(), reviewed_by=<admin> where id=:id and status='pending'` を発行
   - 2c. **連鎖予約キャンセル** (本 spec の「Requirement: 差し戻し / マスク漏れ削除に伴う連鎖予約キャンセル」を参照)
3. 全成功時: Dialog 内容を mailto: リンク表示モードに切替 + 「ユーザーへ再提出依頼メールを送信」ボタンを表示。mailto: の body にキャンセル件数を含める
4. mailto: リンク押下後 admin が「閉じる」で `/identity-documents` 一覧へ戻る + Toast「削除しました (予約 N 件もキャンセル)」
5. Storage 削除失敗時: AlertDialog 内に inline error「Storage 削除に失敗しました。再試行してください」+ DB は未更新のため再試行可能。連鎖予約キャンセルは発動しない
6. DB UPDATE 失敗時 (Storage 削除済): AlertDialog 内に inline error「DB 更新に失敗しました。Storage は削除済みです。Supabase Dashboard から手動で DB を更新してください」+ admin への注意喚起。連鎖予約キャンセルは発動しない
7. 連鎖予約キャンセル失敗時 (Storage + DB 削除済): AlertDialog 内に inline error「Storage 削除と DB 更新は完了しましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください」

#### Scenario: マイナンバー時のみ表示
- **WHEN** マイナンバーカードの書類を開く
- **THEN** 「マスク漏れ削除」ボタンが表示される

#### Scenario: 運転免許証時は非表示
- **WHEN** 運転免許証の書類を開く
- **THEN** 「マスク漏れ削除」ボタンは表示されない (アクションフッターに承認 / 差し戻しのみ)

#### Scenario: マスク漏れ削除の正常系 (予約キャンセルなし)
- **WHEN** マイナンバー pending 書類で「マスク漏れ削除」→ AlertDialog で「削除する」確定し、Storage 削除 + DB UPDATE が成功 + 当該 member に active 予約なし
- **THEN** Dialog 内に mailto: リンクが表示され、body にキャンセル件数 0 件 (相当文言) が含まれる + 一覧から該当行が「画像は削除済みです」表示の rejected 行として残る

#### Scenario: マスク漏れ削除の正常系 (予約キャンセルあり)
- **WHEN** マスク漏れ削除成功 + 当該 member に `status='reserved'` の reservations が 1 件
- **THEN** Storage / DB UPDATE 後に連鎖予約キャンセルが発動し、1 件が `cancelled` に UPDATE される。Dialog の mailto: body にキャンセル 1 件が含まれる

#### Scenario: 連鎖予約キャンセル失敗時の inline error (Storage + DB 削除済)
- **WHEN** Storage 削除 + DB UPDATE 成功後、reservations の連鎖キャンセルが失敗
- **THEN** AlertDialog 内に「Storage 削除と DB 更新は完了しましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください」が表示される

#### Scenario: Storage 削除失敗
- **WHEN** Storage remove() がネットワークエラー
- **THEN** AlertDialog 内に「Storage 削除に失敗しました」 + DB は未更新で再試行可能

#### Scenario: DB UPDATE 失敗 (Storage 削除済)
- **WHEN** Storage 削除成功後の DB UPDATE が失敗
- **THEN** AlertDialog 内に「DB 更新に失敗しました。Storage は削除済みです。Supabase Dashboard から手動で DB を更新してください」が表示される

### Requirement: 差し戻し / マスク漏れ削除に伴う連鎖予約キャンセル

差し戻し (`useIdentityDocumentReject`) およびマスク漏れ即時削除 (`useIdentityDocumentMaskDelete`) の各 mutation は MUST 以下の連鎖予約キャンセルを実行する SHALL:

`identity_documents` の UPDATE が成功した直後に、当該 member の reservations のうち `status IN ('reserved', 'waitlist')` のものを **一括 `'cancelled'` に UPDATE** する。

```sql
UPDATE reservations
SET status = 'cancelled'
WHERE member_id = :member_id
  AND status IN ('reserved', 'waitlist');
```

#### 対象範囲

| reservations.status | 動作 | 理由 |
|---|---|---|
| `'reserved'` | **`'cancelled'` へ UPDATE** | 未来予約。本人確認未承認のためキャンセル相当 |
| `'waitlist'` | **`'cancelled'` へ UPDATE** | キャンセル待ちも本人確認未承認のため無効化 |
| `'attended'` | **対象外 (変更しない)** | 来場済の事実は保持。運営ログ・統計の整合性を優先 |
| `'no_show'` | **対象外** | 過去イベントの記録なので変更しない |
| `'cancelled'` | **対象外** | 既にキャンセル済 |

既存トリガー `set_reservations_cancelled_at` (data-schema spec) が `cancelled_at = now()` を自動設定する SHALL。

連鎖キャンセルの結果件数 (`cancelledCount`) は mutation の Result.value に含めて呼び出し側に返す MUST。Dialog の mailto: body 構築で本値を埋め込み、ユーザーに「<N> 件の予約がキャンセルされた」を明示する SHALL。

#### 失敗時の取り扱い

連鎖予約キャンセルが失敗した場合、mutation は MUST `'cancel_failed_after_reject'` (差し戻し時) または `'cancel_failed_after_mask_delete'` (マスク漏れ削除時) のエラーコードを返す SHALL。`identity_documents` の UPDATE は既に成功しているため、admin に手動復旧 (Supabase Dashboard で reservations を一括 cancel) を Toast / inline error で誘導する。

#### Scenario: 差し戻し時の active 予約全件キャンセル
- **WHEN** ある member が `status='reserved'` の reservations を 3 件持つ状態で、admin が当該 member の identity_documents を差し戻す
- **THEN** identity_documents UPDATE 成功後に reservations 3 件が `'cancelled'` に UPDATE され、`cancelled_at` が自動設定される

#### Scenario: マスク漏れ削除時の active 予約全件キャンセル
- **WHEN** マイナンバー書類のマスク漏れ削除を実行し、当該 member が `status='reserved'` 2 件 + `status='waitlist'` 1 件持つ
- **THEN** Storage 削除 + DB UPDATE 成功後に reservations 3 件 (reserved 2 + waitlist 1) が `'cancelled'` に UPDATE される

#### Scenario: attended 予約は除外
- **WHEN** ある member が `status='reserved'` 1 件 + `status='attended'` 2 件持つ状態で差し戻し
- **THEN** `status='reserved'` の 1 件のみ `'cancelled'` に UPDATE され、attended 2 件は変更されない

#### Scenario: cancelled / no_show は除外
- **WHEN** ある member が `status='cancelled'` 1 件 + `status='no_show'` 1 件 + `status='reserved'` 1 件持つ
- **THEN** `status='reserved'` 1 件のみ UPDATE され、既存の cancelled / no_show は変更されない

#### Scenario: 対象 0 件の差し戻し
- **WHEN** ある member が active 予約を 1 件も持たない状態で差し戻し
- **THEN** identity_documents UPDATE は成功し、reservations の UPDATE は 0 行更新で完了する。`cancelledCount === 0` で Result が返る

#### Scenario: 連鎖キャンセル失敗
- **WHEN** identity_documents UPDATE 成功後、reservations UPDATE が network エラー
- **THEN** mutation は `'cancel_failed_after_reject'` (または mask_delete 版) を返し、AlertDialog に手動復旧誘導の inline error が表示される

#### Scenario: 既存トリガーによる cancelled_at 自動設定
- **WHEN** 連鎖キャンセル UPDATE が成功
- **THEN** `set_reservations_cancelled_at` トリガーにより各行の `cancelled_at` が自動的に `now()` に設定される

#### Scenario: cancelledCount を mailto: body に含む
- **WHEN** 差し戻し成功 + reservations 2 件キャンセル
- **THEN** Dialog の mailto: リンクの body に「お持ちの予約 2 件をキャンセルさせていただきました」が含まれる

#### Scenario: cancelledCount === 0 のときの mailto: body
- **WHEN** 差し戻し成功 + キャンセル対象予約 0 件
- **THEN** Dialog の mailto: リンクの body にキャンセル件数の言及が含まれない (条件分岐で省略)

### Requirement: 再提出依頼メール (mailto: 起動方式)

差し戻し / マスク漏れ削除の成功後、`AlertDialog` は MUST mailto: リンクを表示する。リンクは `<a href="mailto:{memberEmail}?subject={subject}&body={body}" target="_blank">` 形式で、subject / body は `encodeURIComponent()` で URL エンコードされる SHALL。

#### subject 文言

両アクション共通: `[High Q] 本人確認書類の再提出のお願い`

#### body テンプレート (差し戻し用、`cancelledCount > 0` のとき)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいた本人確認書類について、以下の理由で再提出をお願いいたします。

差し戻し理由:
{reason}

なお、本人確認の再提出が必要となったため、お持ちの予約 {cancelledCount} 件をキャンセルさせていただきました。
お手数ですが書類を再提出いただいたのち、改めて予約をお願いします。

再提出: https://reservation.high-q-volleyball.com/signup/identity

ご不明点があればこのメールに返信ください。

High Q バレーボールサークル
```

#### body テンプレート (差し戻し用、`cancelledCount === 0` のとき)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいた本人確認書類について、以下の理由で再提出をお願いいたします。

差し戻し理由:
{reason}

恐れ入りますが、再度 https://reservation.high-q-volleyball.com/signup/identity からご提出ください。

ご不明点があればこのメールに返信ください。

High Q バレーボールサークル
```

#### body テンプレート (マスク漏れ削除用、`cancelledCount > 0` のとき)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいたマイナンバーカード画像について、個人番号 (裏面 12 桁) のマスクが不十分だったため、安全のため Storage から完全削除いたしました。

なお、本人確認の再提出が必要となったため、お持ちの予約 {cancelledCount} 件をキャンセルさせていただきました。
お手数ですが、個人番号を完全に隠した状態で再撮影し、再度 https://reservation.high-q-volleyball.com/signup/identity からご提出のうえ、改めて予約をお願いします。

マスキング方法は再提出画面の「サンプル比較」をご参照ください。

High Q バレーボールサークル
```

#### body テンプレート (マスク漏れ削除用、`cancelledCount === 0` のとき)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいたマイナンバーカード画像について、個人番号 (裏面 12 桁) のマスクが不十分だったため、安全のため Storage から完全削除いたしました。

お手数ですが、個人番号を完全に隠した状態で再撮影し、再度 https://reservation.high-q-volleyball.com/signup/identity からご提出ください。

マスキング方法は再提出画面の「サンプル比較」をご参照ください。

High Q バレーボールサークル
```

両テンプレート文言は MUST `apps/admin/src/features/identity-document-{reject,mask-delete}/templates/` に純粋関数として配置する SHALL (副作用なし、後の Resend 移行で再利用可能)。

#### Scenario: 差し戻し後の mailto: リンク
- **WHEN** 差し戻し成功後の Dialog を表示
- **THEN** `mailto:user@example.com?subject=...&body=...` 形式の `<a>` リンクが描画される

#### Scenario: body の URL エンコード
- **WHEN** rejection_reason に「画像が不鮮明」と入力
- **THEN** mailto: リンクの body 部分に「画像が不鮮明」が URL エンコードされて含まれる

#### Scenario: 改行コード保持
- **WHEN** body テンプレートに `\n` 改行を含む
- **THEN** URL エンコード後 (`%0A`) で含まれ、メーラー起動時に改行が正しく反映される

### Requirement: 詳細画面の 4 状態 (Loading / Empty / Error / Success) の網羅

詳細画面は MUST 以下 4 状態を表示し分ける:

- **Loading**: 初回取得中。`Skeleton` で TopBar + ユーザー情報 + 画像 + アクションフッターを skeleton 描画
- **Empty**: 詳細画面では Empty 状態は通常発生しない (id 指定で 0 行のときは Error の `not found` として扱う) SHALL
- **Error**:
  - `not found` (0 行 or RLS で見えない): 「書類が見つかりません」+ 「一覧へ戻る」CTA
  - `network/server`: 全画面エラー + 「再試行」CTA
  - signed URL 取得失敗: 画像エリアにのみ inline error (詳細本体は表示)
- **Success**: 通常表示

エラーメッセージは MUST `role="alert"` を持つ。

#### Scenario: Loading 状態
- **WHEN** 画面マウント直後で取得中
- **THEN** Skeleton が表示される

#### Scenario: not found
- **WHEN** `/identity-documents/<non-existent-uuid>` を開く
- **THEN** 「書類が見つかりません」と「一覧へ戻る」CTA が表示される

#### Scenario: signed URL 取得失敗 (詳細本体は表示)
- **WHEN** 詳細取得は成功、表面 signed URL 発行が失敗
- **THEN** TopBar / ユーザー情報 / アクションフッターは表示され、画像エリアにのみ inline error が表示される

### Requirement: pending 件数 Badge / TopNav / Dashboard サマリ

admin アプリは MUST 以下 2 箇所に pending 件数を表示する:

1. **TopNav の `/identity-documents` リンク**: 件数 Badge を右側に表示。`count > 0` のときのみ赤系 Badge、`count === 0` のときは Badge 非表示
2. **HomePlaceholder (`/`) のサマリカード**: 「未確認の書類」+ 件数。`count > 0` で「{N} 件」赤系、`count === 0` で「すべて処理済」neutral

件数取得は `select count(*) from identity_documents where status = 'pending'` を `usePendingCount()` composable で実行する SHALL。

更新タイミング:
- ページマウント時 (各 admin ページの mount で再 fetch)
- `document.visibilitychange` で foreground 復帰時
- 各 mutation (approve / reject / maskDelete) 成功直後 (manual invalidate)

リアルタイム購読 (Supabase Realtime) は MUST 提供しない (MVP1 範囲外、ポーリング不要)。

Badge は MUST `aria-label="未対応の書類 N 件"` を持つ SHALL (スクリーンリーダー対応)。

#### Scenario: TopNav の Badge 表示
- **WHEN** pending 件数が 3 件
- **THEN** TopNav の `/identity-documents` リンク右側に「3」の赤系 Badge が表示される

#### Scenario: 0 件のときは Badge 非表示
- **WHEN** pending 件数が 0 件
- **THEN** TopNav の Badge は描画されない (リンクのみ)

#### Scenario: 承認後の Badge 更新
- **WHEN** admin が pending 書類を 1 件承認
- **THEN** mutation 成功直後に usePendingCount が再 fetch され、Badge の数値が -1 される

#### Scenario: フォアグラウンド復帰での再 fetch
- **WHEN** 別タブから戻る (`visibilitychange` で visible)
- **THEN** usePendingCount が自動で再 fetch され、他 admin が変更した件数を反映する

#### Scenario: HomePlaceholder のサマリ
- **WHEN** pending 件数が 5 件
- **THEN** HomePlaceholder に「未確認の書類: 5 件」の赤系サマリカードが表示される

#### Scenario: HomePlaceholder の「すべて処理済」
- **WHEN** pending 件数が 0 件
- **THEN** HomePlaceholder のサマリカードは「未確認の書類: すべて処理済」neutral 色で表示される

### Requirement: 二重承認 / 二重操作の多層防御

本画面は MUST 以下の **二層** で同一書類への二重操作を防ぐ:

1. **DB レベル**: 全 mutation の WHERE 句に `status = 'pending'` を含める。先着 1 件のみヒット、後着は 0 行更新
2. **クライアントレベル**: 詳細画面マウント時の `status` が `'pending'` 以外なら全アクションボタンを disabled。アクション in-flight 中は全ボタンに `aria-busy="true"` + disabled (連打防止)

mutation 同士は **相互排他** (承認 / 差し戻し / マスク漏れ削除のいずれか 1 つのみ実行)。承認と差し戻しを Promise.all で並行発行する実装は禁止 SHALL。

#### Scenario: 既に処理済の書類でボタン全 disabled
- **WHEN** `status === 'approved'` の書類を開く
- **THEN** 「承認」「差し戻し」「マスク漏れ削除」全ボタンが disabled で表示される

#### Scenario: 連打防止
- **WHEN** in-flight 中の「承認する」ボタンを再度クリック
- **THEN** 2 回目以降のクリックは無視される (`aria-busy="true"` で disabled)

#### Scenario: DB レベルの先着勝ち
- **WHEN** A admin と B admin が同じ pending 書類を同時刻に承認
- **THEN** 先着 1 件のみ UPDATE 成功、後着は WHERE 不一致で 0 行更新となり、後着 admin の Dialog に「既に他の管理者が処理しました」が表示される

### Requirement: 取得方法の単一性 (RLS 通過 + N+1 回避)

本画面は MUST 以下の取得方法を採用する:

- 一覧: `select id, member_id, document_type, status, uploaded_at, member:members(display_name, email) from identity_documents` を 1 クエリ発行 (Supabase の Foreign Table 暗黙 join)
- 詳細: `select *, member:members(display_name, email, birthday, phone, experience_level) from identity_documents where id = :id` を 1 クエリ発行
- pending 件数: `select count(*) from identity_documents where status = 'pending'` (head=true)
- signed URL: 表面 / 裏面とも別々に `supabase.storage.from('identity-documents').createSignedUrl(path, 3600)` で個別発行

クライアント側で identity_documents と members を別クエリして join する実装は禁止 SHALL (N+1 と RLS 漏れを回避)。

admin 専用 SQL view (例: `identity_documents_review_view`) は MUST 作成しない。理由: 必要列はすべてベーステーブルの直接列で、Supabase の Foreign Table 暗黙 join で 1 クエリ取得可能。view 化のメリットなし。

#### Scenario: 一覧の単一クエリ
- **WHEN** `/identity-documents` の一覧クエリを発行
- **THEN** Supabase クライアントは identity_documents を 1 回 SELECT し、各行に `member:{display_name, email}` が含まれる

#### Scenario: 詳細の単一クエリ
- **WHEN** `/identity-documents/:id` で詳細を取得
- **THEN** identity_documents を 1 回 SELECT し、members 詳細 (birthday / phone / experience_level 含む) が同一レスポンスに含まれる

#### Scenario: signed URL の発行回数
- **WHEN** 詳細画面が描画され、表 + 裏画像がある書類を表示
- **THEN** signed URL は表面 1 回 + 裏面 1 回の計 2 回発行され、Dialog 拡大時はキャッシュ済 URL を流用 (再発行しない)

### Requirement: FSD レイヤー配置

本画面の実装は MUST 以下の FSD 配置に従う:

- `apps/admin/src/pages/IdentityDocumentsListPage.vue` — 一覧 Page
- `apps/admin/src/pages/IdentityDocumentDetailPage.vue` — 詳細 Page
- `apps/admin/src/widgets/identity-documents-list/` — 一覧の DataTable + Toolbar + Skeleton + Empty + Error
- `apps/admin/src/widgets/identity-document-detail/` — 詳細の TopBar + ユーザー情報 + 画像プレビュー + アクションフッター + Dialog 拡大
- `apps/admin/src/features/identity-documents-filter/` — 一覧の URL クエリ ⇄ state 同期 composable
- `apps/admin/src/features/identity-document-approve/` — 承認 mutation + AlertDialog
- `apps/admin/src/features/identity-document-reject/` — 差し戻し mutation + AlertDialog with reason input + mailto: テンプレート
- `apps/admin/src/features/identity-document-mask-delete/` — マスク漏れ削除 mutation + AlertDialog + mailto: テンプレート
- `apps/admin/src/features/identity-document-pending-badge/` — pending 件数 fetch composable + Badge UI
- `apps/admin/src/entities/identity-document/` — DTO 型 + queries + signed URL 生成
- `apps/admin/src/shared/ui/Dialog.*` — shadcn-vue Dialog プリミティブ (新規取り込み)

依存方向は MUST `pages → widgets → features → entities → shared` の一方向のみ。`features` 同士の相互依存禁止 SHALL。各スライスは MUST `index.ts` 経由で Public API を露出する。

#### Scenario: 依存方向の検証
- **WHEN** ESLint (`eslint-plugin-boundaries`) を実行
- **THEN** 上位レイヤーから下位レイヤーへの import のみが許可されており、違反 import は 0 件

### Requirement: デザイントークン準拠

本画面の全コンポーネントは MUST HQ デザイントークン (`@high-q/tailwind-preset` の utility または `var(--hq-*)` CSS 変数) 経由でのみ着色 SHALL する。リテラル色 (`#xxxxxx` / `rgb()`)、リテラル spacing (`px-[12px]` 等の任意値クラス)、リテラル font-family の埋め込みを禁止する。

#### Scenario: マジックナンバー検査
- **WHEN** `apps/admin/src/{pages,widgets,features,entities,shared/ui}/identity-document*/**/*.vue` および `apps/admin/src/shared/ui/Dialog*.vue` を `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep
- **THEN** マッチが 0 件である

### Requirement: アクセシビリティ

本画面は MUST WCAG 2.1 AA レベルの a11y を満たす:

- 一覧 DataTable: `<table>` + ヘッダ `<th>` + データ `<td>` セマンティクス
- フィルタ Select / 検索 Input: `<label>` で関連付け
- 詳細画面の各アクションボタン: `aria-label` を持つ。disabled 時は `aria-disabled="true"`
- AlertDialog: `role="alertdialog"` + フォーカストラップ + `aria-labelledby` + `aria-describedby`
- Dialog (画像プレビュー): radix-vue 標準で `role="dialog"` + フォーカストラップ + ESC 対応
- マイナンバーリマインダー: `role="alert"` + 朱色サイドボーダー
- pending Badge: `aria-label="未対応の書類 N 件"`
- フォーカス順序: TopBar アクション → ユーザー情報 → 画像プレビュー → アクションフッター
- Tab キーで全コントロール到達可能、ESC で Dialog 閉じる
- テキスト・背景のコントラスト比 AA (4.5:1) 以上

#### Scenario: AlertDialog のフォーカストラップ
- **WHEN** 承認 AlertDialog 開状態で Tab を押し続ける
- **THEN** フォーカスが Dialog 内 (キャンセル / 確定ボタン) でループし、外に出ない

#### Scenario: Dialog のキーボード操作
- **WHEN** 画像プレビュー Dialog 開状態で Tab を押す
- **THEN** ズーム切替ボタン → × ボタン の順にフォーカスが移動する

#### Scenario: pending Badge の aria-label
- **WHEN** pending 件数が 3 件で TopNav の Badge を描画
- **THEN** Badge 要素に `aria-label="未対応の書類 3 件"` が付与される

### Requirement: テスト

本画面は MUST 以下のテストを持つ:

- **Composable unit test** (Vitest):
  - `useIdentityDocumentsFilter` の URL クエリ ⇄ state 双方向変換、デフォルト pending 復元
  - `useIdentityDocumentApprove` の Result 型分岐 (成功 / db_failed / already_reviewed)
  - `useIdentityDocumentReject` の Result 型分岐 (成功 / invalid_reason / db_failed / already_reviewed)
  - `useIdentityDocumentMaskDelete` の Result 型分岐 (成功 / storage_failed / db_failed_after_storage_delete)
  - `usePendingCount` の fetch 成功 / 0 件 / エラー / visibilitychange 再 fetch
  - mailto: body テンプレート関数の URL エンコード結果
- **API layer test** (Vitest + Supabase mock):
  - `identityDocumentQueries.list` が WHERE / ORDER / RANGE を正しく組み立てる
  - `identityDocumentQueries.detail` が members を join 取得する
  - `getSignedUrl` が `createSignedUrl(path, 3600)` を呼ぶ
  - 各 mutation が `WHERE id=:id and status='pending'` を含む UPDATE を発行する
- **Component test** (Vitest + @vue/test-utils):
  - `IdentityDocumentsListPage` の 4 状態出し分け / フィルタ / 検索 / ページネーション / URL クエリ同期
  - `IdentityDocumentDetailPage` の 4 状態 / マイナンバーリマインダー表示条件 / 各アクション AlertDialog 開閉 / 二重承認防止 / mailto: リンクの href 構築
  - `Dialog` プリミティブ単体 (フォーカストラップ / ESC / 背景クリック)
  - `PendingCountBadge` の 0 件 / N 件 / aria-label
- **E2E** (Playwright、本 change で 1 件):
  - happy path: 認証済 admin で `/identity-documents` を開く → pending 行を選択 → 詳細画面で承認 → 一覧から該当行が消える / approved 件数が増える

#### Scenario: Component test の網羅
- **WHEN** `pnpm --filter @high-q/admin test` を実行
- **THEN** IdentityDocumentsListPage / IdentityDocumentDetailPage / Dialog / 各 composable / 各 mutation の test がすべて pass する

#### Scenario: E2E の通過
- **WHEN** `pnpm --filter @high-q/e2e test` を実行 (admin プロジェクト)
- **THEN** 「`/identity-documents` を開く → 承認 → 一覧から消える」の happy path が pass する
