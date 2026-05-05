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

### アップロード時の UX 三重防壁（reservation 側 #92 ✅ 実装済 / 2026-05-05）

1. **注意喚起 UI**: 書類種別で「マイナンバーカード」を選択した時点で警告メッセージを表示
   > 「個人番号（裏面 12 桁）を完全に隠してから撮影してください。マスキングテープ・付箋などで確実に隠せていない画像は受け付けられません」
2. **サンプル画像**: マスク前 / マスク後の対比表示を CSS のみで描画し、適切なマスクの目安を視覚化（画像アセット非依存）
3. **同意チェックボックス**: 「個人番号を完全に隠して撮影したことを確認しました」のチェック必須（チェック前は CTA disabled）

### admin レビュー時の確認フロー（admin 側 #171 ✅ 実装済 / 2026-05-05）

1. admin が `/identity-documents` で pending 一覧を確認 (TopNav に件数 Badge 表示)
2. 詳細画面で画像 (signed URL 1 時間) を 100% 拡大確認 (Dialog の 1x/2x/4x ズーム)
3. **個人番号 12 桁が完全にマスクされている場合**: 「承認」ボタン → status を `'approved'` に更新
4. **マスク不十分（番号の一部または全部が見える場合）**:
   - 「マスク漏れ削除」ボタン (マイナンバー時のみ表示) → 次節
5. **書類が不鮮明・氏名や住所が読み取れない等の他の理由**:
   - 「差し戻し」ボタン → 理由テキストエリアに入力 (1〜500 文字必須) → status を `'rejected'` に更新
   - 連鎖予約キャンセル発動 (#171 で実装、後述「連鎖予約キャンセル」参照)
   - 完了後 mailto: リンクが Dialog に表示 → admin の手元の Gmail から再提出依頼メール送信

### マスク漏れ即時削除 SOP（admin 側 #171 ✅ 実装済 / 2026-05-05）

マイナンバーカード画像で個人番号が露出している場合は、**承認画面から 1 タップで即削除**するフローを admin に提供する。

削除アクション:
1. admin が画面上で「マスク漏れ削除」ボタンを押下 (マイナンバーカード時のみ表示)
2. 確認ダイアログ: 「この画像を Storage から完全削除し、ユーザーに再提出を依頼します。この操作は元に戻せません。当該会員の予約 (reserved / waitlist) も自動でキャンセルされます。」
3. 「削除する」確定後の処理:
   - **Step 1**: `storage.objects` から `storage_path_front` + `storage_path_back` (NOT NULL のとき) のオブジェクトを `remove()` で完全削除
   - **Step 2**: `identity_documents.status = 'rejected'`、`rejection_reason = '個人番号がマスクされていないため削除しました。再提出をお願いします'`、`storage_path_front = NULL`、`storage_path_back = NULL`、`reviewed_at = now()`、`reviewed_by = <admin_member_id>`
   - **Step 3**: 連鎖予約キャンセル (後述)
4. 完了後、Dialog に mailto: リンクが表示される
5. admin が mailto: リンクを押下 → 手元の Gmail (or デフォルトメーラー) で件名 / 本文 / 宛先 / キャンセル件数が自動入力された状態で起動 → admin が中身を確認して送信
6. 監査ログ（将来 #172 関連で実装）に削除イベントを記録

**目視確認の精度**: admin は画像を 100% 拡大して個人番号領域を目視確認する。判断に迷う場合は安全側に倒し reject する。

### 連鎖予約キャンセル SOP (admin 側 #171 ✅ 実装済 / 2026-05-05)

差し戻し / マスク漏れ削除のいずれの mutation でも、**identity_documents UPDATE 成功後に当該 member の active 予約を一括キャンセル** する。

#### 対象範囲

| reservations.status | 動作 | 理由 |
|---|---|---|
| `'reserved'` | **`'cancelled'` へ UPDATE** | 未来予約。本人確認未承認のためキャンセル相当 |
| `'waitlist'` | **`'cancelled'` へ UPDATE** | キャンセル待ちも本人確認未承認のため無効化 |
| `'attended'` | **対象外 (変更しない)** | 来場済の事実は保持。運営ログ・統計の整合性を優先 |
| `'no_show'` | **対象外** | 過去イベントの記録なので変更しない |
| `'cancelled'` | **対象外** | 既にキャンセル済 |

既存トリガー `set_reservations_cancelled_at` が `cancelled_at = now()` を自動設定する。

mailto: リンクの body に **キャンセル件数** が自動で含まれる (テンプレート関数で条件分岐)。ユーザーは「予約 N 件がキャンセルされました」を認識しつつ、書類再提出後に改めて予約する。

#### reservation 側 auth guard との連動

reservation 側の `useAuthSession.hasIdentityDocument` は `status IN ('pending', 'approved')` の行が 1 件以上あるか判定する (#171 で SQL 拡張)。差し戻された (rejected 化された) member は次回ログイン時に `false` 扱いとなり、router guard で `/signup/identity` への再提出フローへ強制誘導される。

これにより「差し戻し → 連鎖予約キャンセル → 再提出フロー強制誘導 → 再提出 → admin レビュー」のループが完成する。

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
- 列: `id` / `member_id` / `document_type` / **`storage_path_front`** / **`storage_path_back`** / `status` / `rejection_reason` / `uploaded_at` / `reviewed_at` / `reviewed_by`
- 表裏 2 ファイル対応 (#92 で `storage_path` を分割): `storage_path_front` は INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL になる (#171 で NOT NULL 制約解除)、`storage_path_back` は NULL 可 (任意提出時のみ値)
- マスク漏れ削除済の状態: `storage_path_front IS NULL` AND `storage_path_back IS NULL` AND `status = 'rejected'` で「Storage オブジェクト削除済」を表現
- RLS: 自分の書類は本人と admin のみ SELECT 可。status / rejection_reason / reviewed_at / reviewed_by の UPDATE は admin のみ
- 関連 spec: [openspec/specs/data-schema/spec.md](../../openspec/specs/data-schema/spec.md) / [openspec/specs/rls-policies/spec.md](../../openspec/specs/rls-policies/spec.md)

### Storage

- バケット: `identity-documents`（private、public フラグ false）
- パス命名: `<member_id>/<document_id>-(front|back).(jpg|png)` (heic/heif は `heic2any` でクライアント変換し `.jpg` で保存)
- 表裏ペアリング: 同じ `<document_id>` で `front` と `back` のオブジェクトが同一の `identity_documents.id` 行 (`storage_path_front` / `storage_path_back`) から参照される。admin レビューでは 1 行 = 1 提出セットとして扱う
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
- **mutation 部分失敗による不整合 (#171 admin レビュー画面)**:
  - **Storage 削除済 / DB UPDATE 失敗** (マスク漏れ削除途中): admin に Toast「DB 更新に失敗しました。Storage は削除済みです」が表示される。Supabase Dashboard SQL Editor で `UPDATE identity_documents SET status='rejected', rejection_reason='個人番号がマスクされていないため削除しました。再提出をお願いします', storage_path_front=NULL, storage_path_back=NULL, reviewed_at=now(), reviewed_by='<admin>' WHERE id='<doc_id>'` を手動実行
  - **identity_documents UPDATE 済 / 連鎖予約キャンセル失敗** (差し戻し or マスク漏れ削除の最終段階): admin に Toast「予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください」が表示される。SQL Editor で `UPDATE reservations SET status='cancelled' WHERE member_id='<member_id>' AND status IN ('reserved', 'waitlist')` を手動実行

---

## 7. pending 会員の予約可否方針 (#171 で確定)

翔太郎くん 2026-05-05 判断: **pending 会員の予約は許容する** (旧 #196 方針からの転換)。

| status | 予約可否 | reservation 側 auth guard 動作 |
|---|---|---|
| `'pending'` | 可能 | `hasIdentityDocument === true`、通常通り予約可 |
| `'approved'` | 可能 | 同上 |
| `'rejected'` のみ | 不可 (再提出強制) | `hasIdentityDocument === false`、`/signup/identity` へ強制誘導 |
| 提出ゼロ | 不可 (Step 3/3 強制) | 同上 |

トレードオフ:
- pending 会員の予約をそのまま active で残すと、後で reject されたときにイベント定員に「実は来ない人」がカウントされる期間が発生
- これは admin 側の差し戻し / マスク漏れ削除アクションで **連鎖予約キャンセル** (§2 参照) を発動して即座に解消する

#196 (旧「pending 予約禁止ガード」Issue) は本件 #171 で代替実装され、本件マージ時にクローズされた。

---

## 改訂履歴

| 日付 | 改訂内容 | 改訂者 |
|---|---|---|
| 2026-04-28 | 初版（#147 で SOP 新設） | 翔太郎くん / レム |
| 2026-05-05 | #92 reservation 側アップロード実装に合わせて改訂: 表裏 2 列分割 (`storage_path_front` / `storage_path_back`)、heic2any クライアント変換、Storage パス拡張子は jpg/png に統一 | 翔太郎くん / レム |
| 2026-05-05 | #171 admin レビュー画面実装に合わせて改訂: §2 admin レビュー / マスク漏れ即時削除 / 連鎖予約キャンセル / mailto: 起動方式 / §4 storage_path_front の NOT NULL 制約解除 / §6 mutation 部分失敗時の手動復旧手順 / §7 pending 会員予約可否方針 (新規・#196 supersede) | 翔太郎くん / レム |
