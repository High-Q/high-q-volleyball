# event-cancellation-notification-email Specification

## Purpose

admin がイベント削除を確定した際、当該イベントに紐づく有効予約 (`status='reserved'` または `status='attended'`) を保持する会員全員に対して、Supabase Edge Function 経由でキャンセル通知メールを自動配信する経路を定義する。受信者決定 (削除前のメールアドレススナップショット)、本文要素、admin 権限以外からの実行禁止、削除フローを妨げない fire-and-forget 構造、dev / preview 環境での送信抑制、admin Dialog における送信前プレビュー描画を規定する。

## Requirements

### Requirement: イベントキャンセル通知メールの送信

admin がイベント削除を確定したとき、当該イベントに紐づく有効予約 (`status='reserved'` または `status='attended'`) を持つ会員全員に対し、システムは SHALL キャンセル通知メールを自動配信する。

送信先決定は admin の削除操作直前にアプリ層が `reservations` を SELECT して当該会員の `members.email` をスナップショット取得 MUST し、Edge Function 呼び出し時にスナップショットを渡す。削除実行後に reservations を再取得する経路を持ってはならない MUST NOT（CASCADE 削除により取得不能になる）。

送信先は **有効予約を保持していた会員自身のメールアドレス** のみに限定する MUST。第三者のメールアドレスをリクエストパラメータとして受け付けてはならない MUST NOT。

メール本文に **MUST 含める** 要素:

- 対象イベント名
- 開催日時（JST、和暦・西暦どちらかに統一）
- 会場名
- キャンセル成立の旨と理由欄（主催者が任意で添えた一言メッセージを表示する。空欄なら理由欄全体を本文から省略する MUST）
- 当日連絡用 LINE オープンチャットの URL（`shared/lib/contact-channels` 定数 / Edge Function 側の定数を二重保持する既存方針に揃える MUST、ハードコード禁止 MUST NOT）
- 会員のマイページ URL（再予約可能な他イベントを探す導線）
- 迷惑メールフォルダ確認の案内

メール本文に **MUST NOT 含める** 要素:

- 他会員の個人情報（メールアドレス / 氏名 / 予約 ID 等）
- 削除済イベントの予約番号（`#HQ-XXXX-XXXX` 形式の予約識別子）— CASCADE 削除後に当該予約番号は無効化されるため、メール本文に予約番号を含めない MUST
- 運営オーナー個人連絡先（電話・SNS ID 等）
- 生 UUID / 内部 ID / Service Role キー等のシークレット

メール件名はイベント名を含む日本語の固定書式とし、Gmail SMTP の Q-encode 文字化けを避けるため UTF-8 が安全に通る形式（既存 `_shared/mailer.ts` 経路）で生成する MUST。

送信は Supabase Edge Function `send-event-cancellation-notification` を経由し、`supabase/functions/_shared/mailer.ts` の `sendMail` を利用する MUST。アプリ側 / クライアント側で直接 SMTP 接続を開いてはならない MUST NOT。

#### Scenario: 有効予約者全員への一斉送信
- **WHEN** admin が有効予約 M 件のイベント削除を AlertDialog で確定し、events 行と reservations 行が CASCADE 削除される
- **THEN** M 件の有効予約に紐づく会員全員 (重複排除済み) のメールアドレス宛にキャンセル通知メールが送信され、本文にはイベント名 / 開催日時 / 会場名 / LINE オープンチャット URL / マイページ URL が含まれる

#### Scenario: 主催者メッセージ欄の有無による本文分岐
- **WHEN** 主催者が AlertDialog の一言メッセージ欄に文章を入力して削除確定
- **THEN** メール本文の理由欄に当該メッセージが描画される

#### Scenario: 主催者メッセージ欄が空の場合
- **WHEN** 主催者が一言メッセージ欄を空欄のまま削除確定
- **THEN** メール本文には理由欄のセクション自体が描画されない

#### Scenario: キャンセル済 / no_show / waitlist の予約者には送信されない
- **WHEN** 有効予約者 M 件・キャンセル済 / no_show / waitlist の予約者 N 件を持つイベントを削除
- **THEN** 通知メールは有効予約者 M 件の会員にのみ送信され、キャンセル済 / no_show / waitlist 行の会員には送信されない

### Requirement: admin 権限以外からの実行禁止

`send-event-cancellation-notification` Edge Function は MUST 呼び出し元の認証情報を検証し、`members.role = 'admin'` を保持する会員以外からのリクエストは拒否する SHALL。

呼び出し元の JWT は `Authorization: Bearer <token>` ヘッダで受け取り、Edge Function 側で `auth.getUser(token)` を経由して `auth.uid()` を確定する MUST。Service Role キーをクライアントに露出させてはならない MUST NOT。

リクエストパラメータで指定された `eventId` は削除済 or 削除直前のイベントを想定するが、admin 権限を持たない呼び出し元から任意の `eventId` を指定して送信させる経路を提供してはならない MUST NOT。

#### Scenario: admin 以外からのリクエストは 403
- **WHEN** 一般会員の JWT で `send-event-cancellation-notification` を直接呼び出す
- **THEN** Edge Function は 403 を返し、メール送信は実行されない

#### Scenario: 認証なしのリクエストは 401
- **WHEN** Authorization ヘッダなしで `send-event-cancellation-notification` を直接呼び出す
- **THEN** Edge Function は 401 を返し、メール送信は実行されない

### Requirement: 削除フローを妨げない fire-and-forget

通知メール送信の成功 / 失敗は、events DELETE の成立や AlertDialog の Success 状態 / `/events` への redirect を妨げてはならない MUST NOT。

`useEventDelete` の confirm フローは MUST 以下の順序で進行する:

1. AlertDialog で確定操作が押下される
2. 有効予約者のメールアドレスを `reservations` から SELECT してスナップショット取得（取得失敗時も 3 に進む。CASCADE 後の retry 経路を作らない）
3. `DELETE FROM events WHERE id = ?` を発火し、CASCADE で reservations を削除
4. DELETE 成功後に `send-event-cancellation-notification` Edge Function を fire-and-forget で呼び出す（スナップショットが空または取得失敗だった場合は呼び出しをスキップ）
5. Toast 表示 + `/events` へ redirect

Edge Function 呼び出しが throw / reject しても上位の confirm フローは Success 扱いで完了する MUST。

#### Scenario: メール送信失敗が削除成功を妨げない
- **WHEN** 有効予約者 M 件のイベントで DELETE は成功したが Edge Function 呼び出しが SMTP エラーで失敗
- **THEN** events 行 / reservations 行は CASCADE 削除され、Toast 「削除しました（M 件の予約も整理されました）」と `/events` redirect は通常どおり完了する

#### Scenario: メールアドレススナップショット取得失敗時の挙動
- **WHEN** 削除確定直前のメールアドレス SELECT がネットワークエラーで失敗
- **THEN** Edge Function 呼び出しはスキップされ、DELETE と Toast / redirect は通常どおり進行する。通知が届かなかった旨は Edge Function ログには残らない（呼び出し自体が発生していないため）

#### Scenario: 有効予約が 0 件のときは Edge Function を呼ばない
- **WHEN** 有効予約 0 件（キャンセル済のみ残存、または予約 0 件）のイベントを削除
- **THEN** Edge Function 呼び出しは行われず、メール送信もログ出力も発生しない

### Requirement: 送信成功 / 失敗のログ記録

`send-event-cancellation-notification` Edge Function は MUST 送信ごとの成功 / 失敗を構造化ログに記録する。eventId（削除済でも値そのものはログに残す）/ 送信件数 / 失敗件数 / 失敗時のエラー内容を相関キーとして残し、後追い調査ができる粒度を MUST 保つ。

会員のメールアドレスをログに残す場合は個人情報保護方針 (`docs/06-品質・セキュリティ/07-ロギング方針.md`) に沿う形式とする MUST。

#### Scenario: 一部成功 / 一部失敗のログ
- **WHEN** 3 名宛の送信で 2 名は成功 / 1 名は SMTP エラーで失敗
- **THEN** Edge Function ログに「成功 2 / 失敗 1」「失敗会員に関するエラーコード」「eventId」が出力される

#### Scenario: 全件成功のログ
- **WHEN** N 名宛の送信が全件成功
- **THEN** Edge Function ログに「成功 N / 失敗 0」「eventId」が出力される

### Requirement: 環境別の送信ガード

dev / preview / 本番のいずれの環境でも同じ Edge Function コードが動くが、dev / preview 環境では会員アドレスへの実送信を抑制する手段を SHALL 提供する。送信抑制モードまたは許可リスト宛のみ送信モードは既存の `_shared/mailer-policy.ts` の枠組みを流用する MUST。

本番では送信抑制を OFF とし、すべての対象会員に通常配信される MUST。

#### Scenario: 送信抑制モードでは実送信されない
- **WHEN** 送信抑制モードが有効な環境で admin がイベントを削除
- **THEN** Edge Function は送信処理を実行せず、ログに「抑制モードのためスキップ」を残す

#### Scenario: 許可リストのみ送信モード
- **WHEN** 許可リスト宛のみ送信モードが有効な環境で許可リスト外の会員が削除対象に含まれる
- **THEN** 当該会員には送信されず、ログに「許可リスト対象外のためスキップ」を残す

### Requirement: 文面レンダラの純粋関数化

イベントキャンセル通知メールの文面生成は、副作用を持たない純粋関数として `packages/shared/src/mail-templates/event-cancellation.ts` 配下に SHALL 配置する (Edge Function / admin アプリ双方から SSOT として共有 MUST)。入力はイベント / 会場 / 主催者メッセージ / URL 群の構造化データのみ、出力は `{ subject, body }` 形式の文字列ペアとする MUST。

レンダラは送信本体（SMTP / Edge Function ハンドラ）および UI から独立してテスト可能でなければならない MUST。会員固有データ（氏名 / 予約番号等）を入力に取らない MUST — 本文は会員 N 名全員で同一になる前提を保つ。

Edge Function 側 (`supabase/functions/_shared/mailer-templates.ts`) は `packages/shared` から `renderEventCancellationMail` / `EventCancellationMailInput` を相対パス import で re-export し、独自実装を持たない MUST。

#### Scenario: 同一入力で同一出力
- **WHEN** 同一のイベント / 会場 / 主催者メッセージ / URL でレンダラを 2 回呼ぶ
- **THEN** subject / body が完全一致する

#### Scenario: SMTP / DB モックなしでの単体テスト
- **WHEN** Edge Function のテストスイートでレンダラを直接呼ぶ
- **THEN** SMTP / DB モックなしで文面が検証できる

#### Scenario: 会員固有データを含まない本文
- **WHEN** N 名の会員にメールを送信するためにレンダラを 1 回だけ呼び、同一の `{ subject, body }` を全会員に送る
- **THEN** 本文には会員氏名 / 予約 ID / 同伴者数 / 連絡事項といった会員固有のデータが含まれない

### Requirement: 送信前プレビューの描画

admin 削除確認 Dialog は MUST 主催者が「削除する」を押す前に、実際に会員へ送信されるメール本文を Dialog 内で描画 SHALL する。プレビュー描画には Edge Function と同一の `renderEventCancellationMail` を `packages/shared/src/mail-templates/` 経由で再利用する MUST (Dialog 専用に簡略版を再実装してはならない MUST NOT)。

プレビューは以下の制約を満たす MUST:

- 主催者メッセージ textarea の入力に reactive に追従する SHALL (`computed` 等)
- 件名と本文を分けて描画する SHALL (件名行 + `<pre>` 形式の本文ブロック)
- `event meta` (eventName / startAt / venueName) の取得に失敗している場合はプレビューを描画しない SHALL (Dialog 上の他要素 / textarea / 削除ボタンは引き続き機能する)
- 有効予約が 0 件のイベント削除 (キャンセル通知メールが送信されないケース) では textarea とプレビューの両方を非表示にする MUST
- プレビュー描画で使う LINE オープンチャット URL / マイページ root URL / 迷惑メールフォルダ案内 は Edge Function 側の定数と完全同期する MUST (drift 防止コメントを両ファイルに残す)

#### Scenario: 主催者メッセージ未入力時のプレビュー
- **WHEN** 有効予約のあるイベントで削除 Dialog を開き、主催者メッセージ textarea が空の状態
- **THEN** プレビューブロックが描画され、本文に「主催者からのお知らせ:」セクションが含まれない

#### Scenario: 主催者メッセージ入力時のプレビュー追従
- **WHEN** textarea に文章を入力
- **THEN** プレビュー本文に「主催者からのお知らせ:」セクションが現れ、入力文字列がそのまま描画される

#### Scenario: event meta 取得失敗時のプレビュー非表示
- **WHEN** Dialog open 時の event meta 取得が RLS 拒否 / ネットワークエラーで失敗
- **THEN** プレビューブロックは描画されないが、textarea と削除ボタンは引き続き表示される

#### Scenario: 有効予約 0 件時のプレビュー非表示
- **WHEN** 有効予約 0 件のイベントで削除 Dialog を開く (キャンセル通知メール送信なしのケース)
- **THEN** textarea / プレビューブロックともに描画されない
