## MODIFIED Requirements

### Requirement: ACCOUNT セクション（アカウント情報の表示と編集）

ProfilePage は ACCOUNT セクションで以下 4 行を SHALL 表示する:

- 「お名前」 = `members.display_name`（トリガ同期された `last_name + ' ' + first_name` を 1 行で表示）
- 「ニックネーム」 = `members.nickname ?? '未設定'`
- 「メール」 = `members.email`
- 「電話番号」 = `members.phone`

各行右端に「編集」リンクを配置し、押下でフィールド単独の編集モーダル（shadcn-vue Dialog）を開く MUST。生年月日 (`members.birthday`) は本セクションに表示しない MUST NOT。

各モーダルは以下を含む:

- ラベル + 現在値プリフィル + バリデーションエラー表示
- 「キャンセル」ボタン（モーダルを閉じる）
- 「保存」CTA

「お名前」行のモーダルは **姓・名 2 入力** を提供する（後続 Requirement 参照）。表示行自体は引き続き結合済み `display_name` を 1 行で見せ、編集時のみ姓・名に分かれる SHALL。

#### Scenario: ACCOUNT セクションの 4 行構成
- **WHEN** 会員が `/profile` を開いて ACCOUNT セクションを確認する
- **THEN** お名前 / ニックネーム / メール / 電話番号 の 4 行が表示され、生年月日の行は描画されない

#### Scenario: ニックネーム未設定の表示
- **WHEN** `members.nickname = null` の会員が `/profile` を開く
- **THEN** ACCOUNT セクションのニックネーム行に「未設定」と灰色の小さい文字で表示される

#### Scenario: お名前行は結合表示
- **WHEN** `members.last_name = '田中'` / `first_name = '美咲'` の会員が `/profile` を開く
- **THEN** ACCOUNT セクションのお名前行に「田中 美咲」が 1 行で表示される

### Requirement: 氏名編集モーダル

「お名前」行の編集モーダルは `members.last_name` と `members.first_name` の **2 つを同時に更新** する SHALL。モーダルは姓・名の独立した 2 つの入力フィールド（横並び）を提供 MUST し、各フィールドはそれぞれ 1〜32 文字の Smart constructor（`createLastName()` / `createFirstName()`）のバリデーションを通る値のみ保存される MUST。autocomplete 属性は姓フィールドが `family-name`、名フィールドが `given-name` MUST。

UPDATE は `last_name` / `first_name` の両列を 1 回の UPDATE 文で同時に行う SHALL。アプリ層から `display_name` 列を直接指定 SHALL NOT し、DB トリガ `sync_members_display_name()` による同期に依存する MUST。

#### Scenario: 姓のみ変更成功
- **WHEN** モーダルで姓「田中」→「鈴木」に変更し（名「美咲」は据置）「保存」を押す
- **THEN** `UPDATE members SET last_name = '鈴木', first_name = '美咲'` が発行され、トリガにより `display_name = '鈴木 美咲'` に更新される。モーダルが閉じてヘッダ大見出し（ニックネーム未設定時）と ACCOUNT 行が新しい値に更新される

#### Scenario: 名のみ変更成功
- **WHEN** モーダルで名「美咲」→「美希」に変更し（姓「田中」は据置）「保存」を押す
- **THEN** `UPDATE members SET last_name = '田中', first_name = '美希'` が発行され、トリガにより `display_name = '田中 美希'` に更新される

#### Scenario: 姓・名 同時変更成功
- **WHEN** モーダルで姓・名を「田中 美咲」→「佐藤 健太」に変更し「保存」を押す
- **THEN** 1 回の UPDATE で両列が更新され、`display_name = '佐藤 健太'` に同期される

#### Scenario: 姓を空欄で保存を試みる
- **WHEN** モーダルで姓を空欄、名「美咲」を入力して「保存」を押す
- **THEN** API は呼ばれず、姓フィールドに「姓を入力してください」のエラーが表示される

#### Scenario: 名を空欄で保存を試みる
- **WHEN** モーダルで姓「田中」、名を空欄にして「保存」を押す
- **THEN** API は呼ばれず、名フィールドに「名を入力してください」のエラーが表示される
