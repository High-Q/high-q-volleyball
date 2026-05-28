## Context

会員サイトの本人確認書類アップロード機能は既に商用稼働しており、admin 側にも `/identity-documents` レビュー画面と pending 件数 Badge が実装済 (`admin-identity-document-review` capability)。会員は pending 状態でも予約自体は可能 (`reservation-identity-document-upload` の `hasIdentityDocument` 判定では pending を有効提出物として扱う)。一方で admin が差し戻し / マスク漏れ削除を行うと当該会員の active 予約 (`status='reserved' | 'waitlist'`) が連鎖キャンセルされる仕組みが `admin-identity-document-review` に定義されている。

このため pending が放置されると「会員が pending 中に予約 → 後日 admin が reject → 連鎖キャンセル → 会員に予約取消通知が届く」という流れが発生し、ホスピタリティ面で大きな負債となる。現状 pending は admin が能動的に画面を開かない限り気づけない pull モデルで、reject 判断が会員の予約より遅れるリスクが構造的に存在する。

メール通知基盤は #248 / #251 / #272 を通じて確立されている (Edge Function + Gmail SMTP via nodemailer + 純粋関数レンダラ + `mailer-policy` による環境別送信抑制 + Sentry 例外捕捉)。本提案はこの基盤に「オーナー宛 1 アドレス通知」という新カテゴリを足す形で実装する。

## Goals / Non-Goals

**Goals:**

- pending 行の発生から 1 分以内にオーナーへメール到達する観測可能な経路を作り、reject 判断を会員の予約発生より前に間に合わせる確率を上げる
- 既存メール通知 3 件と同じ実装パターン (fire-and-forget / 失敗を upload に伝播しない / 純粋レンダラ独立テスト可能 / dev・preview は送信抑制) を踏襲する
- 本人確認画像・個人情報はメール本文に含めず、admin 詳細画面への直リンクのみで完結させる
- オーナー宛アドレスを 1 箇所 (Edge Function secret) に集約し、コード・DB に散らさない

**Non-Goals:**

- 通知 ON/OFF UI / 頻度制御 (#157 で扱う)
- Slack / LINE / Web Push 等メール以外のチャネル
- approved / rejected の会員側通知 (別 Issue)
- 集約画面 `/admin/members/{memberId}/identity-documents` の新設 (`admin-identity-document-review` の MVP1 範囲外)
- pending → approved → 再 reject 等のステータス遷移時の通知 (本変更は INSERT 起点のみ)

## Decisions

### D1. 通知のトリガは「クライアントからの fire-and-forget invoke」

**選択**: 会員サイト側で upload 成功 (storage_path UPDATE 成功) 直後に Edge Function を `void invoke(...)` で呼ぶ。await しない。

**理由**:
- 既存メール通知 (#248 / #251 / #272) がすべてこのパターン。実装・運用パターンの一貫性
- Database Webhook (INSERT trigger → Edge Function) は障害切り分け面が増える (Supabase Webhook 設定の管理 + retry セマンティクス + 認証の取り扱い)。現運用規模で必要性が薄い
- 「INSERT 成功 = upload 完了 = client から呼べる」が成立しており、二重 INSERT (再提出) も client から自然に発火する

**却下案**:
- DB Webhook: 上記理由で却下
- pg_cron でポーリング: リードタイムが伸びる、運用コスト

### D2. オーナー宛アドレスは Edge Function secret に固定

**選択**: 新規 secret `OWNER_NOTIFICATION_EMAIL` を追加。Edge Function 内で `Deno.env.get()` で取得。未設定時は send 処理をスキップしログを残す。

**理由**:
- DB に持つと「誰が変更可能か」のガバナンスが必要 (`members.role='admin'` の人全員に送るか等)。MVP1 範囲としてオーバー
- 既存 `GMAIL_USER` (`high.q.volleyball@gmail.com`) を流用する選択肢もあるが、「送信元 = 送信先」を暗黙固定にすると将来オーナーアドレスを別にしたいときに変更経路が複雑化する。明示的に分離

**却下案**:
- `members where role='admin'` から動的取得: admin 役割の運用ポリシー (1 名固定 vs 複数 admin) が定義されていない段階で実装コストが先行する
- `GMAIL_USER` 流用: 暗黙結合になり保守性低下

### D3. メール本文は「会員識別 + 直リンク」のみ、書類画像・個人情報は含めない

**選択**:
- 件名: 固定文言「【High Q】本人確認書類の確認依頼があります」
- 本文に含む: 会員 display_name / 提出日時 (JST) / admin 詳細画面 URL (`{ADMIN_BASE_URL}/identity-documents/{identityDocumentId}`)
- 本文に含めない: 会員 email / 電話 / birthday / 書類画像 signed URL / document_type の生 enum 値

**理由**:
- 個人情報をメールに含めると保管・破棄ポリシーの管理対象が増える。メールは「気づきの導線」に絞り、判断は admin 画面で行う
- 書類画像は性質上メール添付すべきでない (Storage 直リンクは signed URL でも署名期限管理が必要)
- 詳細リンクは admin 認証配下のため、メール経由でリンクを踏んでも未認証なら `/login` にリダイレクトされる (`admin-identity-document-review` の guard)

**却下案**:
- document_type を件名に含めて優先度判別 (マイナンバー時赤系等): 件名固定化を優先 (通知の予測可能性)
- 提出日時を本文だけでなく件名にも入れる: 件名のスキャナビリティ低下。本文で十分

### D4. admin 詳細画面の URL は単一書類詳細 `/identity-documents/{id}`

**選択**: Issue が示唆した `/admin/members/{memberId}/identity-documents` は実在しないため採用しない。`admin-identity-document-review` が定義する単一書類詳細画面 `/identity-documents/{identityDocumentId}` をリンク先にする。

**理由**:
- 1 会員が 1 書類アップロードで 1 件の identity_documents 行を持つ運用 (表裏 2 ファイルで 1 行)。1 件 1 リンクで業務上不足なし
- 集約画面の新設は本変更スコープ外 (`admin-identity-document-review` MVP1 で却下済)

### D5. リンクの base URL は環境別 secret `ADMIN_BASE_URL` で外部化

**選択**: 新規 secret `ADMIN_BASE_URL`。dev / preview / 本番で値が異なる (`https://high-q-admin.onrender.com` など)。未設定時は本番既定値にフォールバックする。

**理由**:
- 既存 `RESERVATION_BASE_URL` (`send-reservation-notification` / `send-event-cancellation-notification` で使用) と同じ運用パターン
- dev で受信したメールから dev admin URL に遷移できる必要があり、ハードコード不可

### D6. 認証は「会員自身の書類のみ通知 trigger 可能」を Edge Function 内で検証

**選択**: 既存 `send-reservation-notification` と同じ方式。Authorization ヘッダーの JWT から `auth.uid()` を取得 → `identity_documents.member_id` と一致するときのみ送信処理に進む。

**理由**:
- Edge Function は公開エンドポイントのため、authorization なしで任意の `identityDocumentId` を投げられるとオーナーへの spam リスクがある
- 既存 reservation 通知と同じ防御策で一貫性を取る

### D7. 失敗時の取り扱い

**選択**:
- Edge Function 内のすべての失敗 (member_id 不一致 / Edge Function 内例外 / SMTP 失敗 / レンダラ例外) は HTTP 200 + `{ ok: false, error: <code> }` で返す (member_id 改ざんのみ HTTP 403)
- client 側は `await` せず response を見ない (fire-and-forget)
- Edge Function 内例外は Sentry に `captureException` で記録 (既存 `sentry.ts` を流用)
- upload UI 側は本通知の成否に関わらず "アップロード成功" を表示する

**理由**:
- 通知失敗が upload 成功判定を覆す UX を取ると会員視点で混乱
- ログ + Sentry で観測経路は確保

### D8. 送信抑制は既存 `mailer-policy` を流用

**選択**: 新規ガードを追加せず、`loadMailPolicy(Deno.env)` + `shouldSuppressSend(policy, ownerEmail)` で抑制判定。dev / preview は `MAIL_SUPPRESS_SEND=true` 既定。本番は OFF で実送信。

**理由**:
- 既存メール通知 3 件と同じ環境制御。設定の二重化を避ける
- preview 環境で翔太郎くん自身が動作確認したい場合は `MAIL_ALLOWED_RECIPIENTS` にオーナーアドレスを入れる運用で対応可能

### D9. 純粋レンダラを `_shared/mailer-templates.ts` に追加

**選択**: 既存 `mailer-templates.ts` に `renderIdentityDocumentPendingNotificationMail(input)` を追加 (新規ファイル化はしない)。入力は `{ memberDisplayName, uploadedAtIso, detailUrl }` だけの構造化データ。出力 `{ subject, body }`。

**理由**:
- 既存レンダラ群と同居でテストファイルも共通化
- 入力は最小限にし、Edge Function の責務 (DB 取得 / URL 組み立て) と分離

### D10. テスト戦略

- **純粋レンダラ** (vitest): `renderIdentityDocumentPendingNotificationMail` の subject / body 完全一致 + 日時 JST 換算 + 個人情報非露出
- **payload validator** (vitest): `validateIdentityDocumentPendingNotificationPayload` の UUID 受理 / 欠落 / 形式違反
- **trigger composable** (vitest): セッション欠落時 skip / invoke 失敗時握りつぶし / Edge Function `{ ok: false }` 時 warn ログ
- **useUploadIdentityDocument 組み込み** (vitest): happy path trigger 発火 / ロールバック分岐で非発火 / 表裏成功でも 1 回
- **Edge Function ハンドラ単体**: vitest 範囲外 (既存 `supabase/functions/vitest.config.ts` 方針に従う。`Deno.serve` / `npm:nodemailer` を直 import する entry は node ランナーで実行不可、既存 `send-reservation-notification` 本体も vitest テストを持たない)。ハンドラの正しさは ① `_shared` 層 (validator + renderer) のロジック網羅、② `send-reservation-notification` と同形コードの構造的一貫性、③ dev 実送信観測で担保する
- **dev 環境実送信**: `MAIL_SUPPRESS_SEND=false` + `MAIL_ALLOWED_RECIPIENTS=<オーナー>` で 1 通受信確認

E2E は追加しない (admin / reservation 両方の認証セッションが必要で E2E コスト高、メール送信の到達確認はテスト環境では困難)。

## Risks / Trade-offs

- **Risk**: client fire-and-forget のため通知発火タイミングが client の生存に依存 (タブを閉じる瞬間に upload 完了したケースで `invoke` が abort される可能性)
  → **Mitigation**: 既存メール通知 3 件と同じ受容リスク。会員が upload 成功画面まで遷移したケースでは `invoke` リクエストは送出済。タブを閉じる前の race window は極小。次フェーズで Webhook 化が必要になったら本 spec を MODIFY する

- **Risk**: オーナーアドレスを secret に持つため変更時に Supabase Dashboard 操作が必要
  → **Mitigation**: 変更頻度は年単位想定。1 アドレス運用の MVP1 で十分。複数 admin になった段階で DB ベースに切り替える前提を `Open Questions` に残す

- **Risk**: pending 通知が頻発するとオーナーのメールが埋もれる
  → **Mitigation**: 件名固定 + Gmail のフィルタで [High Q] プレフィックスで仕分け可能 (運用判断、本変更スコープ外)

- **Trade-off**: 件名固定 (document_type を含めない) を選んだため、マイナンバーカード優先確認のトリアージが本文を開かないとできない
  → 件名スキャナビリティと予測可能性を優先。admin 詳細画面で document_type Badge 赤系表示 (`admin-identity-document-review` 既存) で実害なし

## Migration Plan

新規 Edge Function 追加 + secret 2 つ追加のみ。DB 変更なし。

1. PR merge 前 (dev): Edge Function deploy + secret 設定 + dev 実送信確認
2. PR merge 後 (本番): 自動 deploy → 本番 secret 設定 → 本番 1 件目の upload で実送信確認

ロールバック: revert PR + Edge Function 削除 (`supabase functions delete send-identity-document-pending-notification`)。DB 影響なしのため即時可能。

## Open Questions

- 複数 admin 運用に移行する際の通知先決定ロジック: 全 admin に送るか / メイン admin 1 名固定か。MVP1 範囲ではオーナー 1 名のため `OWNER_NOTIFICATION_EMAIL` 単独で十分
- 通知のスロットリング / ダイジェスト: 短時間に多件 pending が発生した場合の体験。現状の上限は会員登録ペースで自然に律速されるため不要だが、運用次第で再評価
