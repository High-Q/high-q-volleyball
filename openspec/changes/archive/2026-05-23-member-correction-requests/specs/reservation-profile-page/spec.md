## ADDED Requirements

### Requirement: 生年月日編集モーダル

ProfilePage は **生年月日編集モーダル**（`BirthdayEditDialog`）を MUST 提供する。本モーダルはバナー経由（`/profile?edit=birthday`）または将来的な ACCOUNT セクションからの編集動線で起動 SHALL される。

入力フォーマット: `<input type="date">`（YYYY-MM-DD）。バリデーションは Smart constructor `createBirthday()` で過去日付 + 100 年以内を担保 MUST する。

更新時は `members.birthday` を SET し、対応する `profile.correction_requests` の `field=birthday` エントリを **同時に削除** MUST する（`member-correction-requests` capability「修正完了時の自動消化」に従う）。

#### Scenario: 生年月日変更成功
- **WHEN** モーダルで生年月日を `1995-03-15` に設定して「保存」を押す
- **THEN** `members.birthday` が `1995-03-15` に UPDATE され、もし `field=birthday` の `correction_request` エントリがあれば削除される

#### Scenario: 未来日付を弾く
- **WHEN** 未来日付を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「生年月日は過去の日付を入力してください」のエラーが表示される

#### Scenario: 100 年より前を弾く
- **WHEN** 100 年より前の日付を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「生年月日が正しくありません」のエラーが表示される

### Requirement: `?edit=` クエリパラメータでの初期モーダル起動

ProfilePage は URL クエリ `?edit=<field>` を持って到達した場合、`onMounted` 時に該当 field の編集モーダルを自動で開く MUST。許容値:

- `?edit=displayName` → 氏名編集モーダル（姓・名 2 フィールド）
- `?edit=birthday` → 生年月日編集モーダル
- `?edit=phone` → 電話番号編集モーダル
- `?edit=nickname` → ニックネーム編集モーダル
- `?edit=email` → メール編集モーダル

許容値以外のクエリは無視 SHALL（モーダルは開かない）。クエリは ProfilePage マウント時に消費 MUST し、モーダル close で URL から `?edit=` を除去 SHALL する（ブラウザの戻る/進む操作で同モーダルを再起動できる挙動は維持しない）。

ProfilePage 内の `experience_level` は LEVEL セクションが inline 配置のためモーダル経路を持たない MUST NOT。`?edit=experienceLevel` のような値は未サポート SHALL であり、代替手段として LEVEL セクションへのスクロール動線（バナー側で実装）を持つ。

#### Scenario: ?edit=birthday でのアクセス
- **WHEN** 認証済会員が `/profile?edit=birthday` を直接開く
- **THEN** ProfilePage が描画完了し次第、生年月日編集モーダルが `:open=true` の状態で表示される

#### Scenario: モーダル close で URL クエリ除去
- **WHEN** `?edit=birthday` で開かれたモーダルを閉じる
- **THEN** URL が `/profile` に書き換わり、`?edit=` クエリが消える

#### Scenario: 未サポート値の無視
- **WHEN** `/profile?edit=invalid` を開く
- **THEN** ProfilePage は通常表示され、モーダルは開かない（クエリも変化させない）

#### Scenario: experience_level は未サポート
- **WHEN** `/profile?edit=experienceLevel` を開く
- **THEN** モーダルは開かない（experience_level は LEVEL セクションの inline 編集のため）

## MODIFIED Requirements

### Requirement: LEVEL セクション（経験レベル変更）

ProfilePage は LEVEL セクションで `members.experience_level` を変更可能にする SHALL。3 択ラジオ（`'beginner' = 初めて` / `'intermediate' = 中級` / `'experienced' = 経験者`）と各選択肢のサブテキスト（説明文）を表示する MUST。

選択肢の押下で即時保存（`supabase.from('members').update({ experience_level: <value> }).eq('id', auth.uid())`）を行い、成功で `useAuthSession.refresh()` を呼ぶ MUST。「変更ボタン」を別途設けない（即時保存方式）。

経験レベル更新成功時、対応する `profile.correction_requests` の `field=experience_level` エントリを **同時に削除** MUST する（`member-correction-requests` capability「修正完了時の自動消化」に従う）。

説明文「当日のチーム分けと、初心者向けイベントのご案内に使います。いつでも変更できます。」をセクション冒頭に表示する MUST。

#### Scenario: 初期表示
- **WHEN** 会員が `/profile` を開いて LEVEL セクションを確認する
- **THEN** 3 つのラジオが表示され、現在の `members.experience_level` に対応する選択肢が選択状態になる

#### Scenario: 経験レベルの即時変更
- **WHEN** 「中級」ラジオを押下する
- **THEN** `members.experience_level` が `'intermediate'` に UPDATE され、UI も「中級」が選択状態に切り替わる

#### Scenario: 保存失敗時のロールバック
- **WHEN** 経験レベル変更時に UPDATE が失敗（ネットワークエラー / RLS 違反等）
- **THEN** UI 上の選択は元の値に戻り、Error バナーで「変更を保存できませんでした。再試行してください」が表示される

#### Scenario: enum 外の値を弾く
- **WHEN** Smart constructor `createExperienceLevel('unknown')` が経験レベル UPDATE 前に呼ばれる
- **THEN** 例外が投げられ、UPDATE は発行されない

#### Scenario: 修正依頼の自動消化
- **WHEN** `field=experience_level` の `correction_request` を持つ会員が経験レベルを押下して即時保存成功
- **THEN** 該当エントリが `profile.correction_requests` から削除される

### Requirement: 氏名編集モーダル

「お名前」行の編集モーダルは `members.last_name` と `members.first_name` の **2 つを同時に更新** する SHALL。モーダルは姓・名の独立した 2 つの入力フィールド（横並び）を提供 MUST し、各フィールドはそれぞれ 1〜32 文字の Smart constructor（`createLastName()` / `createFirstName()`）のバリデーションを通る値のみ保存される MUST。autocomplete 属性は姓フィールドが `family-name`、名フィールドが `given-name` MUST。

UPDATE は `last_name` / `first_name` の両列を 1 回の UPDATE 文で同時に行う SHALL。アプリ層から `display_name` 列を直接指定 SHALL NOT し、DB トリガ `sync_members_display_name()` による同期に依存する MUST。

更新成功時、対応する `profile.correction_requests` の `field=display_name` エントリを **同時に削除** MUST する（`member-correction-requests` capability「修正完了時の自動消化」に従う）。`display_name` は姓・名 を一括で扱う統合 field であり、admin / 会員側とも「お名前」1 つとして提示される。

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

#### Scenario: 修正依頼の自動消化
- **WHEN** `field=display_name` の `correction_request` を持つ会員が氏名編集モーダルで保存成功
- **THEN** 該当エントリが `profile.correction_requests` から削除される

### Requirement: ニックネーム編集モーダル

「ニックネーム」行の編集モーダルは `members.nickname` を更新する SHALL。文字種・文字数のバリデーションは reservation-member-auth および data-schema spec の既存ルール（1〜15 文字 / 日本語+ASCII英字のみ / 数字・記号・絵文字禁止）に従う MUST。

モーダルには「ニックネームをクリア」ボタンを併置し、押下で `nickname = NULL` に UPDATE する MUST。空文字で「保存」を押した場合も NULL 化として扱う SHALL。

更新成功時（NULL 化を含む）、対応する `profile.correction_requests` の `field=nickname` エントリを **同時に削除** MUST する。

#### Scenario: ニックネーム新規設定
- **WHEN** ニックネーム未設定の会員が「ミサキ」を入力して「保存」を押す
- **THEN** `members.nickname = 'ミサキ'` に UPDATE され、ヘッダ大見出しが「ミサキ」に切り替わる

#### Scenario: ニックネームクリア（明示ボタン）
- **WHEN** 設定済の会員が「ニックネームをクリア」ボタンを押す
- **THEN** `members.nickname = null` に UPDATE され、ヘッダ大見出しが氏名 fallback に戻る

#### Scenario: ニックネームクリア（空文字保存）
- **WHEN** 設定済の会員が入力欄を空にして「保存」を押す
- **THEN** `members.nickname = null` に UPDATE される

#### Scenario: 文字種違反
- **WHEN** 「たろ123」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「ニックネームは日本語と英字のみで入力してください（数字・記号・絵文字は使えません）」のエラーが表示される

#### Scenario: 文字数違反
- **WHEN** 16 文字以上の値を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「ニックネームは 15 文字以内で入力してください」のエラーが表示される

#### Scenario: 修正依頼の自動消化
- **WHEN** `field=nickname` の `correction_request` を持つ会員がニックネーム編集モーダルで保存成功（設定 / NULL 化 いずれも）
- **THEN** 該当エントリが `profile.correction_requests` から削除される

### Requirement: 電話番号編集モーダル

「電話番号」行の編集モーダルは `members.phone` を更新する SHALL。Smart constructor `createPhone()` のバリデーション（070/080/090 から始まる携帯番号 / 桁数チェック / ハイフン正規化）を通る値のみ保存される MUST。

更新成功時、対応する `profile.correction_requests` の `field=phone` エントリを **同時に削除** MUST する。

#### Scenario: 電話番号変更成功（区切りなし入力）
- **WHEN** 「09098765432」を入力して「保存」を押す
- **THEN** `createPhone()` で正規化された `'090-9876-5432'` が `members.phone` に UPDATE される

#### Scenario: 固定電話を弾く
- **WHEN** 「03-1234-5678」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください」のエラーが表示される

#### Scenario: 桁数不足
- **WHEN** 「090-1234」を入力して「保存」を押す
- **THEN** API は呼ばれず、フィールドに「電話番号の桁数が正しくありません」のエラーが表示される

#### Scenario: 修正依頼の自動消化
- **WHEN** `field=phone` の `correction_request` を持つ会員が電話番号編集モーダルで保存成功
- **THEN** 該当エントリが `profile.correction_requests` から削除される
