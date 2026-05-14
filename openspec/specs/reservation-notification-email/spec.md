# reservation-notification-email Specification

## Purpose
TBD - created by archiving change reservation-completion-email. Update Purpose after archive.
## Requirements
### Requirement: 予約完了通知メールの送信

会員サイト (`apps/reservation`) は予約成立イベント時に会員へ予約完了メールを SHALL 送信する。送信対象イベントは以下の両方を MUST 含む:

- `reservations` 行が新規 INSERT され `status='reserved'` で確定したとき
- 既存の `status='cancelled'` 行が同一会員 / 同一イベントの再予約により `status='reserved'` に再活性化されたとき

送信先は **当該予約の会員自身のメールアドレス** とする MUST。`auth.users.email` または `members.email` から決定し、第三者の任意メールに送信できる経路を持たせてはならない MUST NOT。

メール本文に **MUST 含める** 要素:

- 予約番号（reservations.id を表示用フォーマット `#HQ-XXXX-XXXX` に変換した文字列。生 UUID を含めてはならない MUST NOT）
- イベント名
- 開催日時（JST、和暦・西暦どちらかに統一）
- 会場名
- 会場住所（venues.address）— `data-schema` spec で「有明会場の実住所秘匿」運用が定義されており、未認証ページから取得できる住所は駅住所等にマスクされる。本メール本文では DB に保管されている `venues.address` をそのまま含める MUST。秘匿会場の場合これがメールで会員に初めて開示される情報となる
- 集合地点（venues.meeting_point）— 登録されている会場では本文に含める MUST。これも秘匿会場の場合は本メールで初めて開示される情報となる
- 会場マップ URL（venues.map_url が登録されていれば本文にリンクとして含める）
- 参加費および同伴者数を反映した合計金額（当日現金払いの旨を併記）
- 連絡事項（reservations.note）— 空のときは当該行を出さない MUST
- 当日連絡用 LINE オープンチャットの URL（`shared/lib/contact-channels` 定数経由、ハードコード禁止 MUST NOT）
- マイページ / 予約詳細画面の URL（自分の予約を確認・キャンセルできる導線）
- 迷惑メールフォルダ確認の案内（届かない場合の救済導線）

メール本文に **MUST NOT 含める** 要素:

- 運営オーナー個人連絡先（電話・SNS ID 等。連絡経路は LINE オープンチャットに一元化する MUST）
- 他会員の個人情報
- 生の UUID / 内部 ID / Service Role キー等のシークレット

メール件名は予約番号またはイベント名を含む日本語の固定書式とし、Gmail SMTP の Q-encode 文字化けを避けるため UTF-8 が安全に通る形式で生成する MUST（既存 signup メール送信と同じ送信パスを使う）。

送信は Supabase Edge Function を経由し、`supabase/functions/_shared/mailer.ts` の `sendMail` を利用する MUST。直接 SMTP 接続をクライアント側 / アプリ側で開いてはならない MUST NOT。

#### Scenario: 新規予約成立時の送信
- **WHEN** 会員が予約 Bottom Sheet で「予約を確定する」を押下し、reservations に新規 `status='reserved'` 行が成立
- **THEN** 当該会員のメールアドレス宛に予約完了メールが送信され、本文には予約番号 / イベント名 / 開催日時 / 会場名 / 会場住所 (venues.address) / 合計金額 / LINE オープンチャット URL が含まれる

#### Scenario: 集合地点が登録されている会場での開示
- **WHEN** 予約したイベントの venues.meeting_point が NULL でない状態で予約完了メールが送信される
- **THEN** 本文に集合地点が描画される

#### Scenario: 秘匿会場の実住所をメールで初めて開示
- **WHEN** 公開ページで住所が秘匿されている会場（例: 有明会場）に対する予約完了メールが送信される
- **THEN** 本文の会場住所欄には venues.address に保管されている実住所が描画される

#### Scenario: 再活性化（キャンセル後の再予約）時の送信
- **WHEN** 会員が過去にキャンセル済み (`status='cancelled'`) の予約を持つ状態で同一イベントを再予約し、当該行が `status='reserved'` に再活性化
- **THEN** 新規予約成立時と同様の予約完了メールが当該会員のメールアドレス宛に再送信される

#### Scenario: 予約成立はメール送信失敗の影響を受けない
- **WHEN** 予約は成立したが Edge Function 経由のメール送信が SMTP エラーで失敗
- **THEN** 予約完了画面への遷移と reservations 行の整合性は保たれ、UI にはメール送信失敗エラーが描画されない

#### Scenario: 生 UUID の非露出
- **WHEN** 送信されたメール本文を確認
- **THEN** 予約番号は `#HQ-XXXX-XXXX` 形式で記載され、UUID 形式 (8-4-4-4-12 hex) の文字列は本文 / 件名のどこにも存在しない

#### Scenario: 連絡事項が空のときの非表示
- **WHEN** reservations.note が NULL または空文字で予約が成立
- **THEN** メール本文には連絡事項のセクション自体が描画されない

#### Scenario: 送信先は会員自身のメールアドレスに限定
- **WHEN** リクエスト改ざんで他会員の reservation_id を指定してメール送信 Edge Function を直接呼び出す
- **THEN** Edge Function は呼び出し元の認証情報から会員 ID を取得し、reservations.member_id が一致しないリクエストは拒否する

### Requirement: 予約キャンセル通知メールの送信

会員サイトは予約キャンセル成立イベント時に会員へキャンセル完了メールを SHALL 送信する。送信対象イベントは reservations 行の status が `'reserved' → 'cancelled'` に更新されたときに限定する MUST。

送信先・送信経路・件名のエンコード方針は予約完了メールと同一とする MUST。

メール本文に **MUST 含める** 要素:

- 予約番号（表示用フォーマット）
- キャンセル対象イベント名 / 開催日時 / 会場名
- キャンセル成立時刻（JST）
- 再予約案内（イベント詳細画面の URL — 当該イベントがまだ受付可能な場合のみリンクを生かす運用を許容 SHALL、リンク自体は常に含めてよい）
- 当日連絡用 LINE オープンチャットの URL（やむを得ない事情で当日連絡が必要な場合の窓口として）

#### Scenario: キャンセル成立時の送信
- **WHEN** 会員がキャンセル ConfirmDialog から確定を押下し、reservations.status が `'cancelled'` に更新成功
- **THEN** 当該会員のメールアドレス宛にキャンセル完了メールが送信され、本文には予約番号 / イベント名 / キャンセル時刻 / LINE オープンチャット URL が含まれる

#### Scenario: キャンセル成立はメール送信失敗の影響を受けない
- **WHEN** キャンセルは成立したがメール送信が SMTP エラーで失敗
- **THEN** キャンセル成功トーストと画面遷移は通常どおり完了し、UI にはメール送信失敗エラーが描画されない

#### Scenario: キャンセル UPDATE が 0 行のときメールは送られない
- **WHEN** RLS 違反 / 既に cancelled 等で UPDATE の影響行数が 0 行
- **THEN** キャンセル完了メールは送信されない

### Requirement: 送信失敗のログ記録

メール送信の成功 / 失敗は Edge Function のログに SHALL 記録する。会員 ID と予約 ID と送信種別（完了 / キャンセル）を相関キーとして残し、後追い調査ができる粒度を MUST 保つ。

失敗時はスタックトレースまたはエラーコードと、Gmail SMTP / nodemailer から返ったエラーメッセージを記録する MUST。会員のメールアドレスをログに残す場合は個人情報保護方針（`docs/06-品質・セキュリティ/07-ロギング方針.md`）に沿う形式とする MUST。

#### Scenario: 成功時のログ記録
- **WHEN** メール送信が成功
- **THEN** Edge Function のログに「成功」「会員 ID」「予約 ID」「送信種別」が出力される

#### Scenario: 失敗時のログ記録
- **WHEN** メール送信が SMTP エラーで失敗
- **THEN** Edge Function のログにエラー内容 / 会員 ID / 予約 ID / 送信種別が出力される

### Requirement: 環境別の送信ガード

dev / preview / 本番のいずれの環境でも同じ Edge Function コードが動くが、dev / preview 環境では会員アドレスへの実送信を抑制する手段を SHALL 提供する。

具体的には、環境変数で「送信抑制モード」または「許可リスト宛のみ送信」を MUST 切り替えられるようにする。本番では当該設定を OFF とし、すべての会員に通常配信される MUST。

#### Scenario: 送信抑制モードのとき実送信されない
- **WHEN** 送信抑制モードが有効な環境で予約が成立
- **THEN** Edge Function は送信処理を実行せず、ログに「抑制モードのためスキップ」を残す

#### Scenario: 本番では送信抑制が無効
- **WHEN** 本番環境で予約が成立
- **THEN** 通常どおり会員アドレス宛に送信される

### Requirement: 文面レンダラの純粋関数化

予約完了 / キャンセル完了メールの文面生成は、副作用を持たない純粋関数として `_shared` 配下に SHALL 配置する。入力は予約 / イベント / 会場 / 会員の構造化データのみ、出力は `{ subject, body }` 形式の文字列ペアとする MUST。

レンダラは送信本体（SMTP / Edge Function ハンドラ）から独立してテスト可能でなければならない MUST。

#### Scenario: 同一入力で同一出力
- **WHEN** 同一の予約 / イベント / 会場 / 会員データでレンダラを 2 回呼ぶ
- **THEN** subject / body が完全一致する

#### Scenario: レンダラのユニットテスト
- **WHEN** Edge Function のテストスイートでレンダラを直接呼ぶ
- **THEN** SMTP / DB モックなしで文面が検証できる

