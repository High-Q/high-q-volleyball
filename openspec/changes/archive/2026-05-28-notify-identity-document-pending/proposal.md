Issue: #284

## Why

会員が本人確認書類をアップロードしても、現状はオーナーが `/identity-documents` を能動的に開かないと `pending` 件数に気づけない。会員は pending 状態でも予約自体は可能だが、admin が差し戻し / マスク漏れ削除を行うと当該会員の active 予約が連鎖キャンセルされる (`admin-identity-document-review` 「差し戻し / マスク漏れ削除に伴う連鎖予約キャンセル」要件)。pending を放置すると「会員が予約 → 後日 reject → 連鎖キャンセル」の悪い体験が発生し、ホスピタリティ面で大きな負債になる。pending 発生即時にオーナーへ Push 通知することで、reject 判断 (差し戻し / マスク漏れ削除) を会員の予約より前に間に合わせ、連鎖キャンセル発動の機会を最小化する。

## What Changes

- 会員サイトで本人確認書類のアップロードが成功し `identity_documents` に新規 `pending` 行が成立した直後、オーナー宛にメール通知を fire-and-forget で送信する
- メール本文には会員識別情報 (display_name と提出日時) と admin 詳細画面への直リンクのみを含め、書類画像・個人情報そのものは含めない (リンク経由で管理画面から閲覧する設計)
- 既存の予約通知メール基盤 (Edge Function + nodemailer + 純粋関数レンダラ + mailer-policy による環境別送信抑制) を踏襲し、新規 Edge Function を 1 つ追加する
- 送信先のオーナーアドレスは Edge Function の secret として 1 箇所に固定保持し、コード・DB に直書きしない
- 通知送信の失敗は upload フローを止めない (会員にエラーを返さない、ログと Sentry で観測する)

### Propose で疑った UI/UX 論点

- **Issue 記載の遷移リンク `/admin/members/{memberId}/identity-documents` は実在しない**: admin 側の実装は単一書類詳細画面 `/identity-documents/:id` (`admin-identity-document-review` spec)。会員ごとに書類リストをまとめる集約画面は MVP1 範囲外。本提案では「直近 pending になった書類 1 件の詳細画面」への直リンク (`/identity-documents/{identityDocumentId}`) を採用する。同会員が表裏 2 枚で 1 件として登録する設計のため 1 件 1 リンクで業務上問題なし
- **再提出時 (差し戻し後の再アップロード) も通知を送るか**: 送る。差し戻し → 会員が再撮影 → 再 INSERT → オーナーが再確認 という業務フローは新規提出と同じ確認 SLA を必要とするため、新規 / 再提出を区別せず INSERT 単位で通知する
- **マイナンバーカード (要マスク確認の高優先度書類) を件名で強調するか**: 強調しない。書類種別は admin 詳細画面で赤系 Badge により視覚的に判別済。件名は固定化して通知の予測可能性を優先する
- **通知トリガを DB Webhook (INSERT trigger) ではなくクライアント呼び出しにする理由**: 既存メール通知 3 件 (#248 / #251 / #272) がすべてクライアント fire-and-forget で確立されているパターンを踏襲。Webhook 経路は障害切り分け面が増え、現段階の運用規模では不要
- **通知の送信抑制**: 既存 `mailer-policy` (`MAIL_SUPPRESS_SEND` / `MAIL_ALLOWED_RECIPIENTS`) を流用するため新規ガード追加不要。dev / preview では既定で抑制、本番では実送信される

### スコープオフ照合

- 本人確認結果 (`approved` / `rejected`) の会員側通知 — 別 Issue (記憶では未起票)
- 通知設定 (通知 ON/OFF UI、頻度制御) — `#157 プロフィール詳細` で扱う
- Slack / LINE 等メール以外のチャネル — スコープ外
- 集約画面 `/admin/members/{memberId}/identity-documents` の新設 — `admin-identity-document-review` spec で MVP1 単一詳細画面のみ。本変更でも集約 UI を作らない

## Capabilities

### New Capabilities

- `identity-document-pending-notification-email`: pending 状態の identity_documents 行が新規発生した際にオーナー宛通知メールを送信する Edge Function とレンダラの仕様を定義する

### Modified Capabilities

- `reservation-identity-document-upload`: upload 成功フローの末尾でオーナー通知 Edge Function を fire-and-forget で呼び出す要件を追加する (通知失敗が upload 成功判定を覆さない保証も含む)

## Impact

- **コード**:
  - `supabase/functions/send-identity-document-pending-notification/` (新規 Edge Function ディレクトリ)
  - `supabase/functions/_shared/` — 通知用バリデーション・純粋レンダラ・必要なら共通ユーティリティ追加
  - `apps/reservation/src/shared/api/` — 通知 trigger composable 追加 (既存 `reservation-notification.ts` と同じ形)
  - `apps/reservation/src/features/identity-document/composables/useUploadIdentityDocument.ts` — 成功末尾で trigger 呼び出し
- **DB**: 追加なし (テーブル変更 / RLS 変更 / migration なし)
- **環境変数**:
  - `OWNER_NOTIFICATION_EMAIL` (Edge Function secret, 新規)
  - `ADMIN_BASE_URL` (Edge Function secret, 新規。dev / preview / 本番で admin の URL が異なるため)
- **依存**: 既存 nodemailer / mailer-policy / Sentry helper をそのまま流用
- **テスト**: vitest (純粋レンダラ + ハンドラ単体 + trigger composable) と dev Supabase での実送信目視確認
