## MODIFIED Requirements

### Requirement: 一覧 DataTable の列構成

`/identity-documents` 画面は MUST 以下 6 列を持つ DataTable で identity_documents を一覧表示する:

1. **提出日時**: `uploaded_at` を `MM/DD HH:mm` で表示。mono フォント
2. **ユーザー名**: アバター (先頭文字の丸チップ) + `members.display_name` (join 取得)
3. **メール**: `members.email`。mono + muted 色
4. **書類種別**: `DOCUMENT_TYPE_LABELS[document_type]` を Badge で表示。`document_type === 'my_number_card_masked'` のみ赤系 (`bg-danger-soft text-danger`) で警告色
5. **ステータス**: `status` を翻訳した Badge — `pending` (neutral / 黄系)「未対応」/ `approved` (success / 緑)「承認済」/ `rejected` (danger / 赤)「差し戻し」
6. **操作**: 「詳細」`<router-link>` (押下で `/identity-documents/:id` へ遷移)

デスクトップ（≥ `md`）は DataTable で表示し、各セルは `whitespace-nowrap` で改行抑止する。**モバイル（< `md`）は MUST 横スクロールではなくカード縦積みで表示し、上記 1〜6 の全項目をカード内に保持する**（ユーザー名・書類種別・ステータスを上段、提出日時・メール・操作を下段に「ラベル: 値」相当で配置）。横スクロールは使わない（`admin-responsive-shell` capability のレスポンシブ表示規約に従う）。

#### Scenario: 列順序が仕様どおり
- **WHEN** Success 状態で 1 件以上ある状態で描画
- **THEN** 上記 1〜6 の列が左から順に表示される

#### Scenario: モバイル幅ではカード縦積みで表示される
- **WHEN** 画面幅 375px で `/identity-documents` を Success 状態で描画
- **THEN** DataTable ではなくカード縦積みで表示され、横スクロールは発生せず、提出日時 / ユーザー名 / メール / 書類種別 / ステータス / 操作の全項目が各カード内で確認できる

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
