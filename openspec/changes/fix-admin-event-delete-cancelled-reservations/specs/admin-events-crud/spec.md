## MODIFIED Requirements

### Requirement: 即時公開ポリシー（visibility 固定）

`EventForm` は MUST INSERT 時に `events.visibility = 'published'` を固定で投入する。UPDATE 時も既存の `visibility` を上書きしない（読み込んだ値をそのまま戻す）。下書き / 限定公開 / 中止 など、公開状態の切替 UI は MVP1 では提供しない SHALL。

理由: 「登録 → 即時表示 / 削除 → 即時非表示」を MVP1 の運用方針として確立し、admin 操作の認知負荷を最小化する。下書きや限定公開は MVP2 で公開設定セクションが追加される際に再設計する。

#### Scenario: 新規作成は published で投入
- **WHEN** ユーザーが `/events/new` で「保存」を押下
- **THEN** API ペイロードに `visibility: 'published'` が含まれ、INSERT 直後に LP / 予約サイトの公開イベント一覧に表示される

#### Scenario: 編集は visibility を維持
- **WHEN** ユーザーが `/events/:id/edit` で「保存」を押下
- **THEN** UPDATE ペイロードに `visibility` フィールドは含まれない（または読み込んだ値をそのまま送る）。既存値が `'draft'` だったとしても、本画面の操作で意図せず `'published'` に変わってはならない

#### Scenario: 削除は即時非表示
- **WHEN** ユーザーが Edit 画面で削除を確定する
- **THEN** events から DELETE され、`reservations.event_id` の FK CASCADE により紐づく予約レコードも整合的に削除される。LP / 予約サイトのイベント一覧からも消える

### Requirement: 削除の AlertDialog による二重確認

Edit mode のヘッダ「削除」ボタンは MUST AlertDialog（shadcn-vue `AlertDialog`）を開き、ユーザーが「削除する」を **2 段階で（Dialog 内で再度押下）** 確認した場合のみ削除 API を呼ぶ。Dialog の Cancel または ESC キーで閉じた場合は何も起きない。

AlertDialog は対象イベントに紐づく予約の内訳（有効予約 = reserved + attended の合計 / キャンセル済 = cancelled + no_show の合計）を表示 SHALL。有効予約が 1 件以上ある場合は、削除により当該予約も同時に削除される旨と「予約者には別途ご連絡ください」の注意書きを Dialog 内に明示 MUST する。

削除確定時は `DELETE FROM events WHERE id = ?` を 1 回呼び出し、reservations は FK CASCADE で連鎖削除される。削除成功後は Toast（予約 0 件なら「削除しました」、予約あり なら「削除しました（N 件の予約も整理されました）」）を表示し、`/events`（一覧）に redirect する。

#### Scenario: 削除キャンセル
- **WHEN** Edit 画面で「削除」を押下し AlertDialog を開く → 「キャンセル」を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない（API も呼ばれない）

#### Scenario: 削除確定（予約 0 件）
- **WHEN** 有効予約 0 件・キャンセル済 0 件のイベントで AlertDialog 内「削除する」を押下
- **THEN** event が削除され、`/events` に redirect。Toast「削除しました」を表示する

#### Scenario: 削除確定（キャンセル済のみ残存）
- **WHEN** 有効予約 0 件・キャンセル済 / no_show が N 件残るイベントで AlertDialog 内「削除する」を押下
- **THEN** event および N 件のキャンセル履歴行が削除される。`/events` に redirect、Toast「削除しました（N 件の予約も整理されました）」を表示する

#### Scenario: 削除確定（有効予約あり）
- **WHEN** 有効予約 M 件が残るイベントで AlertDialog を開き、Dialog 内に内訳と「予約者には別途ご連絡ください」が表示されている状態で「削除する」を押下
- **THEN** event および M 件の有効予約 + 同イベントの全 reservations が CASCADE 削除される。`/events` に redirect、Toast「削除しました（M 件の予約も整理されました）」を表示する

#### Scenario: ESC キーで Dialog 閉鎖
- **WHEN** AlertDialog 表示中に ESC を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない

#### Scenario: 内訳の取得失敗
- **WHEN** AlertDialog 表示中の予約内訳取得クエリが失敗する
- **THEN** Dialog 内に `role="alert"` でエラーメッセージが表示され、「削除する」ボタンは disabled になる
