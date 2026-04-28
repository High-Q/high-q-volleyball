# 本人確認書類取扱 SOP

## 目的

High Q では参加者の安全確保と役所への団体登録（スポーツ団体登録 / 社会教育団体登録）の証憑として、会員登録時に本人確認書類を提出してもらう。本書は提出から保管・審査・削除までの運用手順を定義する。

関連 Issue: #92（reservation 側アップロード）/ #171（admin 側確認・承認）

---

## 1. 受付書類（10 種類）

| 書類 | 受付条件 |
|---|---|
| 運転免許証 | 有効期間内であること |
| 運転経歴証明書 | 交付日の記載があること |
| 住民票 | 発行から 3 か月以内であること |
| 身体障害者手帳等 | 交付日の記載があること |
| 在留カード | 有効期間内であること |
| 特別永住者証明書 | 有効期間内であること |
| 学生証 | 有効期間内であること |
| パスポート | 令和 2 年 2 月 4 日以前に発給申請されたもの（住所記載欄があるもの）のみ可 |
| マイナンバーカード | 有効期間内、**個人番号 12 桁を完全マスクした画像のみ受付**。通知カードは不可 |
| 健康保険資格確認書 | 有効期間内であること |

DB enum 値と日本語ラベルの対応は [packages/shared/src/types/labels.ts](../../packages/shared/src/types/labels.ts) を参照。

---

## 2. マイナンバーカードのマスク要件（重要）

CLAUDE.md セキュリティルール「マイナンバーカードの個人番号 (12 桁) をテキスト列として保管するコード禁止」を維持しつつ、**マスク済み画像のみ**は本人確認書類として受け付ける。

### アップロード時の UX 三重防壁（reservation 側 #92 で実装）

1. **注意喚起 UI**: 書類種別で「マイナンバーカード」を選択した時点で警告メッセージを表示
   > 「個人番号（裏面 12 桁）を完全に隠してから撮影してください。マスキングテープ・付箋などで確実に隠せていない画像は受け付けられません」
2. **サンプル画像**: マスク前 / マスク後の対比画像を表示し、適切なマスクの目安を視覚化
3. **同意チェックボックス**: 「個人番号を隠して撮影したことを確認しました」のチェック必須

### admin レビュー時の確認フロー（admin 側 #171 で実装）

1. admin が画像を確認
2. **個人番号 12 桁が完全にマスクされている場合**: status を `'approved'` に更新
3. **マスク不十分（番号の一部または全部が見える場合）**:
   - status を `'rejected'` に更新
   - rejection_reason に「個人番号がマスクされていないため再提出をお願いします」を入力
   - **「マスク漏れ即時削除」アクション**で Storage から画像を完全削除（次節）

### マスク漏れ即時削除 SOP

マイナンバーカード画像で個人番号が露出している場合は、**承認画面から 1 タップで即削除**するフローを admin に提供する（#171 で実装）。

削除アクション:
1. admin が画面上で「マスク漏れ削除」ボタンを押下
2. 確認ダイアログ: 「この画像を Storage から完全削除し、ユーザーに再提出を依頼します」
3. 確認後の処理:
   - `storage.objects` から画像オブジェクトを DELETE（RLS で admin 権限が必要）
   - `identity_documents.status = 'rejected'`、`rejection_reason = '個人番号がマスクされていないため削除しました。再提出をお願いします'`、`storage_path = NULL` (or 削除済みマーカー)、`reviewed_at = now()`、`reviewed_by = <admin_member_id>`
   - ユーザーにメール通知（rejection_reason をテンプレートに含める）
4. 監査ログ（将来 #172 関連で実装）に削除イベントを記録

**目視確認の精度**: admin は画像を 100% 拡大して個人番号領域を目視確認する。判断に迷う場合は安全側に倒し reject する。

---

## 3. 役所提出の用途

提出された書類は以下の用途で利用する想定:

- **スポーツ団体登録**（江東区 / 都への登録）
- **社会教育団体登録**

MVP1 では admin が個別画像を SQL Editor 経由でダウンロード（手作業運用）。MVP2 で #172「役所提出用 一括ダウンロード」を実装し、ZIP + メタデータ CSV で出力可能にする。

役所提出時の取扱:
- 提出先の役所窓口に必要書類のみを物理印刷 or USB で提供
- ネットワーク経由の送信は不可（窓口対面のみ）
- 提出後の控えは 1 年間 admin が保管、その後シュレッダー処分

---

## 4. データ保管

### DB

- テーブル: `public.identity_documents`
- 列: `id` / `member_id` / `document_type` / `storage_path` / `status` / `rejection_reason` / `uploaded_at` / `reviewed_at` / `reviewed_by`
- RLS: 自分の書類は本人と admin のみ SELECT 可。status / rejection_reason / reviewed_at / reviewed_by の UPDATE は admin のみ
- 関連 spec: [openspec/specs/data-schema/spec.md](../../openspec/specs/data-schema/spec.md) / [openspec/specs/rls-policies/spec.md](../../openspec/specs/rls-policies/spec.md)

### Storage

- バケット: `identity-documents`（private、public フラグ false）
- パス命名: `<member_id>/<document_id>-(front|back).(jpg|png|heic)`
- 暗号化: Supabase Storage デフォルト（at-rest 暗号化）
- アクセス: signed URL を admin / 本人のみ発行可。直接 URL アクセスは 403

### 退会時

- `members.id` の DELETE で identity_documents 行は ON DELETE CASCADE で自動削除
- Storage オブジェクトはアプリ層から明示的に DELETE 呼び出し（DB トリガーでは Storage 操作不可）
- アプリ実装: members 削除前に `storage.from('identity-documents').remove([<paths>])` を呼ぶ

---

## 5. 監査・運用ログ

MVP1 では特別な監査ログテーブルは持たず、Supabase Dashboard の query log で操作履歴を遡る。MVP2 以降:
- 削除操作の監査ログ（誰がいつ何を削除したか）
- 役所提出ダウンロードのログ
- マスク漏れ事案の年次集計

---

## 6. 緊急時のエスカレーション

- 個人番号が見える画像が長期保管されていることが発覚した場合
  1. 翔太郎くんがオーナー権限で即時 Storage 削除
  2. 該当ユーザーにメールで謝罪と再提出依頼
  3. 削除日時 / 該当 member_id / 経緯を本 SOP の末尾に追記
- 書類画像が外部に漏洩した場合
  1. 該当 Storage バケットを一時的に無効化（Supabase Dashboard）
  2. 全ユーザーに告知メール
  3. 個人情報保護委員会への報告検討

---

## 改訂履歴

| 日付 | 改訂内容 | 改訂者 |
|---|---|---|
| 2026-04-28 | 初版（#147 で SOP 新設） | 翔太郎くん / レム |
