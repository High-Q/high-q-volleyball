# メール送信設定 SOP（SMTP / Auth メール）

## 目的

High Q の Supabase Auth は admin マジックリンク (#84) と、将来的に予約サイト (#88) のサインアップ確認 / 予約完了通知などのメール送信に依存する。本書は **送信経路の設定運用 / Phase 設計 / 移行条件** を定義し、運用作業（Dashboard / DNS）の真実の源とする。

関連: #84 / #85 / #88 / #183（Phase 1） / Phase 2 (TBD)

---

## 背景：Supabase Inbuilt SMTP の制約

Supabase はデフォルトで Inbuilt SMTP を提供するが、公式が明確に "for testing only" と位置づけており、Free プランでは以下の制約がある:

- **プロジェクト全体で 2 通/hour** という極めて低い hourly cap（実測値、緩和不可）
- 送信元アドレスが `noreply@mail.app.supabase.io` 等の固定値で、配信品質（迷惑メール判定）が劣る
- DKIM / SPF / DMARC の調整不可

このため、**admin (#84-87) の実機検証段階ですら rate limit に hit してブロッカー化**する。本番運用には外部 SMTP の利用が必須。

---

## Phase 設計

| Phase | 送信経路 | 送信元 | 想定期間 | 関連 Issue |
|---|---|---|---|---|
| **Phase 1（暫定）** | Gmail SMTP（個人アカウント + アプリパスワード） | `high.q.volleyball@gmail.com` | admin 開発〜予約サイト着手前まで | #183 |
| **Phase 2（恒久）** | Resend + 独自ドメイン | `noreply@<独自ドメイン>` | 予約サイト稼働前に切替 | TBD |

Phase 1 は **コスト 0 / 設定変更のみ** で rate limit を即時解消するための暫定手段。Phase 2 は会員から見て `@gmail.com` 個人アドレスから登録確認・予約完了メールが届く体験を回避するための恒久対応。

---

## Phase 1: Gmail SMTP 設定手順（#183）

### 前提

- Google アカウント `high.q.volleyball@gmail.com` の所有権を持っている
- Supabase Dashboard の所有者権限を持っている
- 本作業はオーナー（翔太郎くん）のみが実施

### Step 1. Google アカウント側の準備

1. [Google アカウント](https://myaccount.google.com/) にログイン
2. **セキュリティ → 2 段階認証プロセス** を有効化（未設定なら必須）
3. **セキュリティ → アプリ パスワード** を開く（2 段階認証を有効化していないと出現しない）
4. アプリ名: `Supabase High Q Auth`（任意の識別名）で発行
5. 表示された 16 文字のパスワードを **その場で Supabase Dashboard に貼り付ける**

> ⚠️ アプリパスワードは表示画面を閉じると再表示できない。コピー先は Supabase Dashboard 一択。
> ⚠️ コード / Issue 本文 / Claude / Slack / メモアプリ等への貼り付けは **絶対禁止**。

### Step 2. Supabase Dashboard で SMTP を切替

Supabase Dashboard → Authentication → **Emails → SMTP Settings** で以下を設定:

| 項目 | 値 |
|---|---|
| Enable Custom SMTP | ON |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `high.q.volleyball@gmail.com` |
| Password | Step 1 で発行したアプリパスワード（16 文字） |
| Sender email | `high.q.volleyball@gmail.com` |
| Sender name | `High Q バレーボールサークル` |

→ **Save** で確定。

### Step 3. Rate Limit を実用値に緩和

Supabase Dashboard → Authentication → **Rate Limits** → **Rate limit for sending emails** を `30` per hour に変更（Inbuilt の 2 通/h → 30 通/h）。

Gmail SMTP 自体の送信上限は 24 時間で 500 通 / 受信者単位で個別カウントなので、admin + 数十名規模の予約サイト初期運用には十分。

### Step 4. 検証（完了条件）

以下 3 項目すべてを pass させる:

- [ ] admin マジックリンクを **5 分以内に 5 回連続送信** しても `email rate limit exceeded` が出ない
- [ ] 送信されたメールが **迷惑メールフォルダではなく受信トレイ** に届く（Gmail → Gmail なら通常 OK、他プロバイダの場合は迷惑メール判定に注意）
- [ ] メール内のマジックリンクをクリック → AAL2 admin 確立 → `/events` 到達

---

## Phase 2: Resend + 独自ドメインへの移行手順

予約サイト (#88, #89-92, #148) 稼働前までに以下を **別 Issue** で実施する。本書はその時点で改訂する。

### 前提条件

1. **独自ドメイン取得**（例: Cloudflare Registrar で `.club` / `.app` 等、年 USD 10〜20 程度）
2. Resend アカウント作成（Free プランで月 3,000 通まで送信可、Phase 2 初期は十分）
3. オーナー権限で DNS レコードを編集できること

### Step 1. ドメインの DNS に SPF / DKIM / DMARC を追加

Resend Dashboard → Domains → Add Domain で表示される TXT レコードを DNS に追加:

| レコード種別 | 名前 | 値（例） | 目的 |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` | SPF（送信元 IP 認可） |
| TXT | `resend._domainkey` | （Resend が発行する公開鍵） | DKIM（署名検証） |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:high.q.volleyball@gmail.com` | DMARC（SPF/DKIM 失敗時のポリシー） |
| MX | `send` | `feedback-smtp.<region>.amazonses.com` 等 | バウンス受信用（Resend が指示） |

Resend Dashboard で **Verify** が緑になるまで待つ（DNS 反映まで数分〜数時間）。

### Step 2. Supabase Dashboard で SMTP を Resend に切替

| 項目 | 値 |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | Resend Dashboard → API Keys で発行した SMTP パスワード |
| Sender email | `noreply@<独自ドメイン>` |
| Sender name | `High Q バレーボールサークル` |

### Step 3. メールテンプレートの HQ デザイン化

Supabase Dashboard → Authentication → **Email Templates** で以下 4 種を HQ ブランドに合わせた HTML に置換:

- Confirm signup（予約サイト会員登録時）
- Magic Link（admin / reservation 共通）
- Change Email Address
- Reset Password

差し替える際は `@high-q/design-tokens` の CSS 変数（`var(--hq-paper)` 等）は **メール HTML 内で展開できないため値を直書きする**こと（メールクライアントは CSS 変数非対応）。デザインは `docs/10-デザインサンプル/` のメール用カンプ（Phase 2 で別途作成）を参照。

### Step 4. 切替後の検証

- [ ] 独自ドメインから admin マジックリンクが届く（送信元 `@<独自ドメイン>`）
- [ ] mail-tester.com 等で SPF / DKIM / DMARC が pass（スコア 9/10 以上）
- [ ] 主要 ISP（Gmail / iCloud / Yahoo! Japan / Outlook）に送信して受信トレイに届く
- [ ] 予約サイトの会員登録確認メールが届く
- [ ] 予約完了通知メールが届く

### Phase 1 の Gmail SMTP 停止

Phase 2 への切替が安定動作することを確認後、以下を実施:

1. Supabase Dashboard で SMTP 設定を Resend に上書き保存（Phase 1 の Gmail 設定は破棄）
2. Google アカウント設定 → アプリ パスワード → `Supabase High Q Auth` を **revoke**
3. 本書を Phase 2 反映で改訂

---

## セキュリティ留意点

- **アプリパスワード / SMTP パスワードはコードにハードコードしない**。Supabase Dashboard 経由でのみ管理する
- Phase 1 のアプリパスワードを誤って公開（Issue / Slack / Claude へのペースト含む）した場合は Google アカウント設定で **即時 revoke** し、新規発行 + Supabase Dashboard で更新
- Phase 2 の Resend API Key 漏洩時も同様に Resend Dashboard で revoke + 再発行
- DMARC `p=quarantine` は Phase 2 初期の推奨値。配信実績を確認後、`p=reject` への昇格を検討
- 送信元アドレス（`noreply@`）への返信が会員から来る可能性に備え、Phase 2 では `noreply@` への返信を `high.q.volleyball@gmail.com` 等に転送する DNS / メール設定を別途用意する

---

## トラブルシュート

### Q. Phase 1 設定後もマジックリンクが届かない

1. Gmail の **送信済みフォルダ** を確認 → 送信されているか
2. 受信側の **迷惑メールフォルダ** を確認
3. Supabase Dashboard → Logs → **Auth Logs** で `email_send` イベントのエラー有無を確認
4. アプリパスワードの誤入力 / Google アカウント側で 2 段階認証が無効化されている可能性

### Q. Phase 1 で `email rate limit exceeded` が再発する

- Supabase Dashboard → Rate Limits の値が反映されているか確認（Save 押し忘れ）
- Gmail 側の 24 時間 500 通 cap に hit している可能性は通常運用では考えにくい

### Q. Phase 2 で DMARC pass しない

- DNS 反映待ち（最大 24 時間）
- SPF レコードが複数定義されている（DNS の TXT で `v=spf1` が 1 行のみであることを確認）
- DKIM 公開鍵レコードの値が改行・空白で破損していないか確認

### Q. Phase 2 で Gmail に届くが Yahoo! Japan に届かない

Yahoo! Japan は DMARC `p=reject` でなくても比較的厳格なフィルタリングを実施する。送信実績の蓄積（warm-up）が必要な場合がある。Resend の dedicated IP オプションは MVP3 以降で検討。

---

## 改訂履歴

| 日付 | 改訂内容 | 改訂者 |
|---|---|---|
| 2026-04-30 | 初版（#183 で Phase 1 / Phase 2 設計を SOP 化） | 翔太郎くん / レム |
