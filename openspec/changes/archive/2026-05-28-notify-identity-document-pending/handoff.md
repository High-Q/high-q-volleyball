# notify-identity-document-pending — 翔太郎くん作業ハンドオフ

Issue #284 / Change `notify-identity-document-pending` の Apply が完了したわ、翔太郎くん。実装は全件 PR 作成可能な状態。翔太郎くん側で必要な作業を以下にまとめるね。

---

## 1. PR 作成

ブランチ作成・コミット・PR 作成は通常フロー。本変更は新規 Edge Function 追加のみで DB migration なし。

---

## 2. Supabase Edge Function Secrets 投入 (PR Preview / 本番 merge 前後)

**Supabase Dashboard → Edge Functions → Secrets** で dev / 本番それぞれの Supabase Project に投入する。

### dev Supabase

| secret | 値 |
|---|---|
| `OWNER_NOTIFICATION_EMAIL` | `high.q.volleyball@gmail.com` |
| `ADMIN_BASE_URL` | `http://localhost:5173` (admin の vite dev サーバー単独起動時) または `http://localhost:5174` (reservation も同時起動時、port が衝突して自動的に +1 される) |

**補足**: dev admin は Render にデプロイしておらずローカルホスト常駐。dev で実送信確認するときに翔太郎くんのローカル admin が起動していない場合、メール経由のリンクは当然 404 になるけど、文字列として URL が正しく組み立てられているかの検証はできる (本確認の主目的)。リンク先まで踏みたいときは確認直前に `pnpm --filter @high-q/admin dev` を起動しておくこと。

### 本番 (prd) Supabase

| secret | 値 |
|---|---|
| `OWNER_NOTIFICATION_EMAIL` | `high.q.volleyball@gmail.com` |
| `ADMIN_BASE_URL` | `https://high-q-admin.onrender.com` |

未設定でも Edge Function は呼ばれた瞬間に 200 + `{ ok: false, error: 'no-owner-email' }` を返してログを残すだけで爆発しない設計だけど、通知が飛ばないので投入忘れに注意ね。

---

## 3. Edge Function の手動デプロイ

新規 Edge Function 追加は Render 自動デプロイ範囲外（メモリ `feedback_supabase_prd_edge_functions_initial_deploy` 参照）。dev / 本番それぞれで手動 deploy が必要よ。

### dev

```bash
pnpm exec supabase functions deploy send-identity-document-pending-notification --project-ref <dev-project-ref>
```

### 本番

```bash
pnpm exec supabase functions deploy send-identity-document-pending-notification --project-ref <prd-project-ref>
```

`--no-verify-jwt` フラグは **付けない**。本 Edge Function は認証済み会員からの呼び出しを前提とし、JWT で `member_id` を確定する設計だから。

---

## 4. dev 実送信確認 (tasks 9.5)

PR Preview / dev デプロイ後に dev Supabase で 1 通受信確認をするわ。

### 手順

1. dev Supabase Dashboard → Edge Functions → Secrets で **一時的に** 以下を変更:
   - `MAIL_SUPPRESS_SEND` → `false` に変更 (または削除)
   - `MAIL_ALLOWED_RECIPIENTS` → `high.q.volleyball@gmail.com` のみ設定 (オーナーアドレスのみ実送信)
2. dev 環境の reservation アプリで翔太郎くん自身のテストアカウントで `/signup/identity` から本人確認書類をアップロード
3. オーナー宛アドレス (`high.q.volleyball@gmail.com`) で件名「**【High Q】本人確認書類の確認依頼があります**」を受信確認
4. 本文に以下が含まれることを確認:
   - 会員 display_name
   - 提出日時 (JST、`YYYY/MM/DD HH:mm` 形式)
   - admin 詳細画面 URL (`{ADMIN_BASE_URL}/identity-documents/{uuid}` 形式)
5. 本文に以下が **含まれない** ことを確認:
   - 会員 email / 電話 / birthday
   - document_type の値 (運転免許証 / マイナンバーカード 等)
   - 書類画像 URL

### Edge Function ログ確認

Supabase Dashboard → Edge Functions → `send-identity-document-pending-notification` → Logs で以下が出ること:

```
[send-identity-document-pending-notification] sent ok kind=identity-document-pending identityDocumentId=<uuid> memberId=<uuid> ownerEmail=high.q.volleyball@gmail.com
```

---

## 5. dev 環境設定を元に戻す (tasks 9.6)

実送信確認が完了したら **必ず** 元に戻すわよ。

dev Supabase Dashboard → Edge Functions → Secrets:

- `MAIL_SUPPRESS_SEND` → `true` に戻す
- `MAIL_ALLOWED_RECIPIENTS` → 削除 (or 元の値に戻す)

これを忘れると次回 dev 利用時に本物の会員宛にメールが飛ぶ事故になるから気をつけてね。

---

## 6. 本番 merge 後の確認

本番 merge → Render 自動デプロイ → 上記「3. Edge Function の手動デプロイ」を本番 Supabase に対して実行 → 「2. Secrets 投入」が本番側で完了していることを確認。

初回 pending 発生時 (本番の新規会員が本人確認書類をアップロードした瞬間) にオーナー宛メールが届くはず。

---

## 設計サマリ (参考)

- pending 行が新規発生した瞬間にオーナーへ fire-and-forget でメール通知
- 動機: 会員は pending でも予約可能だが reject 時に active 予約が連鎖キャンセルされる悪体験を抑制するため、reject 判断を会員予約より先に間に合わせる
- メール本文は会員識別 (display_name + 提出日時) + admin 詳細画面直リンクのみ。書類画像・個人情報は含めない
- 認証: JWT で `auth.uid()` 確定 → `identity_documents.member_id` 一致のみ通知許可 (他人のドキュメント ID 指定で 403)
- 失敗: HTTP 200 + `{ ok: false, error }` で表現、client は fire-and-forget で見ない。SMTP 例外は Sentry 記録
- dev / preview は既存 `MAIL_SUPPRESS_SEND` で抑制される (本変更で追加実装不要)

詳細は `openspec/changes/notify-identity-document-pending/{proposal,design}.md` 参照。
