## MODIFIED Requirements

### Requirement: `/members` 画面の DataTable 列構成

`apps/admin` の `/members` 画面は、以下の列を持つ DataTable で会員を一覧表示しなければならない（SHALL）:

1. **名前** — `members.display_name`。先頭文字のアバター丸 + 氏名を横並び表示。修正依頼が 1 件以上ある会員は **氏名の横に「修正依頼 N」バッジ**（N は `correction_request_count`）を MUST 表示する（warning tone の小さい chip）
2. **メール** — `members.email`。等幅フォント・muted トーン
3. **経験** — `members.experience_level` を `初回`（beginner）/ `中級`（intermediate）/ `経験者`（experienced）に翻訳した Badge。tone は `experienced = success` / `intermediate = accent` / `beginner = neutral`
4. **初回参加** — `member_list_view.first_attended_at` を `YYYY/MM/DD` 形式で表示。NULL（未参加）の場合は `—`
5. **累計** — `member_list_view.attended_count` を「N 回」形式で右寄せ表示。10 回以上は accent カラー + 太字で強調
6. **最終参加** — `member_list_view.last_attended_at` を `YYYY/MM/DD` 形式で表示。NULL の場合は `—`
7. **メモ** — `members.admin_note` を 1 行プレビュー（最大 40 文字、超過は ellipsis）。NULL / 空文字は `—`

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は `<Table>` の `overflow-auto` で横スクロールに自動対応する SHALL。

#### Scenario: 列順序が仕様どおり
- **WHEN** `/members` を Success 状態で描画
- **THEN** 上記 1〜7 の列が左から順に表示される

#### Scenario: 累計 10 回以上の強調表示
- **WHEN** ある会員の `attended_count = 11` の行を描画
- **THEN** 累計セルが accent カラー + 太字で表示される

#### Scenario: 初参加待ちの会員
- **WHEN** `attended_count = 0` かつ `first_attended_at IS NULL` / `last_attended_at IS NULL` の会員を描画
- **THEN** 累計セルは `0 回`、初回・最終参加セルは `—` が表示される

#### Scenario: メモ未設定
- **WHEN** `admin_note IS NULL` または空文字の会員を描画
- **THEN** メモセルは `—` が表示される

#### Scenario: メモ長文のプレビュー
- **WHEN** `admin_note` が 100 文字の値の会員を描画
- **THEN** メモセルは先頭 40 文字 + `…` で表示される（行を超えた省略）

#### Scenario: 修正依頼バッジの表示
- **WHEN** `correction_request_count = 2` の会員行を描画
- **THEN** 氏名セル内に「修正依頼 2」の warning tone バッジが表示される

#### Scenario: 修正依頼ゼロでバッジなし
- **WHEN** `correction_request_count = 0` の会員行を描画
- **THEN** 氏名セルにバッジは表示されない

### Requirement: 詳細 sheet の表示

`/members` 画面は、行クリックまたは行の「詳細」アクションで、画面右側に slide-in する詳細 sheet を SHALL 表示する。sheet は以下を含む:

- 会員基本情報（氏名 / メール / 経験レベル / 生年月日 / 電話 / 初回参加日 / 累計参加回数 / 最終参加日）
- 参加履歴テーブル（`member_history_view` から member_id でフィルタ取得）
- 運営メモ編集フォーム（textarea、最大 500 文字、改行可、保存ボタン）
- **修正依頼セクション** — 当該会員の未対応 `correction_requests` 一覧を表示し、新規作成 / 取り下げ操作を行う。詳細は `member-correction-requests` capability「admin 詳細 sheet の修正依頼セクション」を参照

sheet の開閉状態は URL クエリ `?detail=:id` で同期 SHALL し、ブラウザ戻る/進む/リロードで復元される。Esc キー / 背景クリック / 閉じるボタンで `?detail=` がクリアされ sheet が閉じる。

#### Scenario: 行クリックで sheet が開く
- **WHEN** 一覧の行をクリック
- **THEN** URL に `?detail=:id` が追加され、当該会員の詳細 sheet が右側に slide-in する

#### Scenario: URL から直接 sheet を開く
- **WHEN** `/members?detail=<uuid>` を直接開く
- **THEN** 一覧が描画され、当該会員の sheet が初期表示で開いている

#### Scenario: 存在しない member id
- **WHEN** `/members?detail=<missing-uuid>` を開く
- **THEN** sheet は描画されるが内容は Empty / Error 状態（「会員が見つかりません」）

#### Scenario: Esc キーで閉じる
- **WHEN** sheet 開いた状態で Esc キーを押下
- **THEN** `?detail=` がクリアされ sheet が閉じる

#### Scenario: 背景クリックで閉じる
- **WHEN** sheet 開いた状態で背景の overlay 領域をクリック
- **THEN** `?detail=` がクリアされ sheet が閉じる

#### Scenario: ブラウザ戻るで閉じる
- **WHEN** sheet 開いた状態でブラウザの戻るボタン
- **THEN** sheet が閉じ、一覧画面に戻る（フィルタ・ページネーション状態は保持）

#### Scenario: 修正依頼セクションの表示
- **WHEN** 修正依頼 2 件を持つ会員の詳細 sheet を開く
- **THEN** 運営メモ編集フォームの下（または横）に修正依頼セクションが描画され、2 件の未対応エントリと「修正依頼を作成」ボタンが見える
