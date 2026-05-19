## MODIFIED Requirements

### Requirement: 削除の AlertDialog による二重確認

Edit mode のヘッダ「削除」ボタンは MUST AlertDialog（shadcn-vue `AlertDialog`）を開き、ユーザーが「削除する」を **2 段階で（Dialog 内で再度押下）** 確認した場合のみ削除 API を呼ぶ。Dialog の Cancel または ESC キーで閉じた場合は何も起きない。

AlertDialog は対象イベントに紐づく予約の内訳（有効予約 = reserved + attended の合計 / キャンセル済 = cancelled + no_show の合計）を表示 SHALL。有効予約が 1 件以上ある場合は、削除により当該予約も同時に削除される旨と「対象の予約者にはキャンセル通知メールを自動で送信します」の注意書きを Dialog 内に明示 MUST する。

AlertDialog は MUST 主催者からの一言メッセージを任意で添えられる textarea を提供する。textarea は空欄のままでもよく、入力された場合は通知メール本文の理由欄にそのまま反映される SHALL。textarea 文字数は 500 文字以内を上限とする MUST。

AlertDialog は MUST textarea の直下に、実際に会員へ送信されるメール本文のプレビューを描画する SHALL。プレビューは件名と本文の両方を表示し、textarea の入力に reactive に追従する MUST。event meta 取得失敗時はプレビューを非表示にする SHALL。

削除確定時は MUST 以下の順序で処理する:

1. 有効予約者の `members.email` を `reservations` 経由で SELECT してスナップショット取得（CASCADE 削除前に行う）
2. `DELETE FROM events WHERE id = ?` を 1 回呼び出し、reservations は FK CASCADE で連鎖削除
3. DELETE 成功後、スナップショットが 1 件以上かつ送信先がある場合のみ `send-event-cancellation-notification` Edge Function を fire-and-forget で呼び出す（主催者メッセージを引数に渡す）
4. Toast を表示（予約 0 件なら「削除しました」、予約あり なら「削除しました（N 件の予約も整理されました）」）
5. `/events`（一覧）に redirect

Edge Function 呼び出しの成功 / 失敗は MUST 上位の Toast / redirect / Success 状態を妨げない（fire-and-forget）。

#### Scenario: 削除キャンセル
- **WHEN** Edit 画面で「削除」を押下し AlertDialog を開く → 「キャンセル」を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない（API も呼ばれない）

#### Scenario: 削除確定（予約 0 件）
- **WHEN** 有効予約 0 件・キャンセル済 0 件のイベントで AlertDialog 内「削除する」を押下
- **THEN** event が削除され、`/events` に redirect。Toast「削除しました」を表示する。Edge Function 呼び出しは発火しない

#### Scenario: 削除確定（キャンセル済のみ残存）
- **WHEN** 有効予約 0 件・キャンセル済 / no_show が N 件残るイベントで AlertDialog 内「削除する」を押下
- **THEN** event および N 件のキャンセル履歴行が削除される。`/events` に redirect、Toast「削除しました（N 件の予約も整理されました）」を表示する。Edge Function 呼び出しは発火しない（有効予約者が 0 件のため）

#### Scenario: 削除確定（有効予約あり）
- **WHEN** 有効予約 M 件が残るイベントで AlertDialog を開き、Dialog 内に内訳と「対象の予約者にはキャンセル通知メールを自動で送信します」が表示されている状態で「削除する」を押下
- **THEN** メールアドレススナップショットを取得 → event および M 件の有効予約 + 同イベントの全 reservations が CASCADE 削除 → `/events` に redirect、Toast「削除しました（M 件の予約も整理されました）」を表示 → `send-event-cancellation-notification` Edge Function が fire-and-forget で呼び出される

#### Scenario: 主催者メッセージ欄を伴う削除
- **WHEN** AlertDialog の主催者メッセージ textarea に文章を入力した状態で「削除する」を押下
- **THEN** Edge Function 呼び出しのペイロードに当該メッセージが含まれ、通知メール本文の理由欄に描画される

#### Scenario: 削除前のメール本文プレビュー
- **WHEN** 有効予約のあるイベントで AlertDialog を開き、主催者メッセージ textarea に文章を入力
- **THEN** textarea 直下のプレビューブロックに、入力文言を反映した実送信メール件名と本文が描画される

#### Scenario: メール送信失敗が削除成功を妨げない
- **WHEN** Edge Function 呼び出しがネットワークエラー / SMTP エラーで失敗
- **THEN** Toast 表示と `/events` redirect は通常どおり完了し、UI には「メール送信に失敗しました」エラーは描画されない

#### Scenario: ESC キーで Dialog 閉鎖
- **WHEN** AlertDialog 表示中に ESC を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない

#### Scenario: 内訳の取得失敗
- **WHEN** AlertDialog 表示中の予約内訳取得クエリが失敗する
- **THEN** Dialog 内に `role="alert"` でエラーメッセージが表示され、「削除する」ボタンは disabled になる
