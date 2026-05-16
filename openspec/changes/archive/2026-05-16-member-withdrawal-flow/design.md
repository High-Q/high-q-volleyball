## Context

High Q プラットフォームでは現在、会員の「退会」を実現する仕組みが UI / 削除ロジック / DB 整合性ルールのいずれの層にも存在しない。privacy-policy-page で「退会時は会員データを削除する」と公開しているにもかかわらず、退会要望が来ると運営が手作業で Supabase の DB / Storage / Auth を操作するしかなく、整合性ミスのリスクが高い。

会員自身による退会（#254）と admin による強制削除（#255）は、削除セマンティクスと整合性ルールが完全に共通である。本 change は両 Issue を 1 つの削除基盤に統合し、UI 入口だけを 2 系統用意する設計を採る。

参照前提:
- 既存テーブル: `members` / `reservations` / `identity_documents` / `auth.users`（FK で 1:1 紐付け）
- 既存集計 view: `member_list_view`, `member_history_view`, `event_participants_view`
- 既存 RLS: `members` は `id = auth.uid() OR is_admin()` で SELECT、`is_admin()` で UPDATE。DELETE policy は未定義（実質 admin のみ可能）
- 個人情報保護方針: 「退会時に会員データ（本人確認書類画像を含む）を削除」と明示済み

## Goals / Non-Goals

**Goals:**
- 退会の意味論を 1 か所（`member-withdrawal` capability）に固定し、UI 2 系統がそれを参照する構造にする。
- 退会時に「物理削除する対象」と「履歴として残す対象」を明確に区別する。
- 削除を Edge Function に集約し、Auth / Storage / DB の整合性を 1 か所で担保する。
- 個人情報保護方針の約束を spec の Scenario として検証可能にする。

**Non-Goals:**
- 退会会員の「復活」機能。本 change では物理削除のみ提供し、復元手段は提供しない（誤操作対策は確認 UX で担保）。
- 監査ログ（誰がいつ誰を削除したか）の永続化。MVP では未実装とし、必要が出たら別 change で追加する。
- 退会前のデータエクスポート機能。個人情報保護方針には「保有個人データの開示請求は別途運営に連絡」とあるため、UI から自動エクスポートはしない。
- 「アカウント休止」「一時停止」のような中間状態。退会は完全削除のみ。

## Decisions

### D1. 過去予約は member 参照を匿名化したまま残す（`ON DELETE SET NULL`）

**決定**: `reservations.member_id` を NULL 許容に変更し、FK 動作を `ON DELETE RESTRICT` → `ON DELETE SET NULL` に変更する。退会した会員の過去予約は `member_id = NULL` となり、`event_participants_view` 等の集計では「退会済み会員」として表示される。

**理由**:
- イベント側の参加者数集計（過去のイベントに何人来たか）は運営の歴史的記録として残す必要がある。`ON DELETE CASCADE` で予約も消すと、過去イベントの参加者数が遡及的に減る不整合が発生する。
- 個人情報保護方針との整合は「個人特定不能」になればよく、`member_id` を NULL 化することで `display_name` / `email` への JOIN 経路が遮断され、匿名化が成立する。
- INSERT 時の `member_id IS NOT NULL` は CHECK 制約で強制する（NULL 許容は退会後のみ）。

**却下案**:
- `ON DELETE CASCADE`: 過去予約が消え、集計の歴史的整合性が失われる。
- `reservations` も論理削除（`status='withdrawn_member'` 追加）: status enum の意味論が「予約状態」から逸脱し、集計クエリすべてに退会フィルタを追加する負担が大きい。
- 別テーブル `withdrawn_member_reservations` への移送: ETL ロジックが Edge Function に追加され、整合性チェックポイントが増えるため複雑度が高い。

### D2. members 行と auth.users 行は物理削除、identity_documents は CASCADE で連鎖、Storage は明示削除、reservations の個人情報列は NULL 化

**決定**: 退会時の削除対象は次の通り:
- `members` 行: 物理 DELETE
- `auth.users` 行: Auth admin API で物理 DELETE
- `identity_documents` 行: `ON DELETE CASCADE`（既存）で連鎖削除
- Supabase Storage の `identity-documents/<member_id>/...`: Edge Function 内でリスト → 明示削除
- `reservations` 行: 残す（`member_id` を NULL 化 + **`phone_at_booking` / `note` も NULL 化**）
- 未来の `reservations`（`status IN ('reserved', 'waitlist')`）: 削除前に `status='cancelled'` + `cancelled_at=now()` に UPDATE してから member を消す

**理由**: 個人情報保護方針の「本人確認書類画像を含む会員データを削除」と整合する最小集合。`reservations` 行自体は D1 の理由で残すが、`reservations` には `phone_at_booking`（予約時点の電話番号スナップショット）と `note`（自由記述、個人を識別できる情報を含み得る）という個人情報列が含まれるため、これらは `member_id` NULL 化と同じトランザクション内で MUST NULL 化する。これにより `reservations` に残る情報は「いつ / どのイベントに / 何人で参加したか」という匿名の集計用データのみになる。

**却下案**:
- `phone_at_booking` のみ NULL 化、`note` は運営記録として残す: note は自由記述で氏名・連絡先等の個人特定情報を含み得るため、入力済み内容の遡及審査が不可能であり、退会者の個人情報削除約束を守れない。

### D3. 削除は新規 Edge Function `withdraw-member` に集約

**決定**: 新規 Edge Function `supabase/functions/withdraw-member/` を追加し、reservation と admin の両クライアントから呼び出す。Function は `service_role` 権限で次の順序を実行:

1. 認可検証: 呼び出し元 JWT を読み、`auth.uid() === target_member_id` または `members.role = 'admin'` であることを確認。それ以外は 403。
2. 未来予約のキャンセル: 当該 `member_id` の `status IN ('reserved', 'waitlist')` の予約を `status='cancelled'` + `cancelled_at=now()` に UPDATE。
3. `reservations` 個人情報列の NULL 化: 当該 `member_id` の全 reservations 行に対して `phone_at_booking = NULL` / `note = NULL` を UPDATE（Step 4 の `ON DELETE SET NULL` は `member_id` のみを NULL 化するため、`phone_at_booking` / `note` は明示的に消去する必要がある）。
4. Storage オブジェクト削除: `identity-documents/<member_id>/` 配下を list → 一括 remove。
5. `members` 行 DELETE: `ON DELETE CASCADE` で `identity_documents` も連鎖削除。`reservations.member_id` は `ON DELETE SET NULL` で NULL 化。
6. `auth.users` DELETE: Supabase Auth admin API (`auth.admin.deleteUser`) で削除。
7. ロガーで「削除した member_id / 実行者 / 削除時刻」を記録（永続化はしない、Edge Function ログのみ）。

**冪等性**: target_member_id が既に存在しない場合は 204 を返す（中断後のリトライで安全）。

**実行順序の根拠**: Step 3（個人情報列 NULL 化）を Step 5（`members` DELETE）より前に置く必要がある。Step 5 で `member_id` が NULL になった後では、Step 3 の `WHERE member_id = :id` でマッチする行が無くなり、`phone_at_booking` / `note` が残ったままになるため。

**理由**:
- service_role キーをクライアントに置かない（RLS を通り抜けないため）。
- 4 つの異なるリソース（DB rows / Storage / Auth）への操作を 1 関数に集約して順序とエラーハンドリングを単純化。
- 部分失敗時の整合性: Step 4 が成功すれば DB 側は完結する（identity_documents / reservations は CASCADE と SET NULL で同期）。Storage / Auth の失敗はベストエフォートでログに残し、運営に通知する設計とする。

**却下案**:
- 既存の `verify-signup` Function を拡張: 退会と新規登録を 1 関数に同居させるのは責務分離違反。
- クライアントから直接 DB / Auth API を呼ぶ: service_role がクライアントに渡せず、特に Auth user 削除が不可能。

### D4. 認可: 本人または admin、両方とも Edge Function 経由

**決定**: 削除の認可は Edge Function 内で JWT を検証する。RLS の DELETE policy は `members` に対して **`is_admin()` のみ可** と定義し、本人 (`auth.uid() = id`) からの直接 DELETE は **拒否**する。理由は、本人退会も必ず未来予約キャンセル + Storage 削除 + Auth user 削除を伴うため、Edge Function 経由を必須化する方が整合性が担保しやすい。

reservation アプリの本人退会も Edge Function 経由で実行し、Function 内で `auth.uid() === target_member_id` を確認する経路を採る。

### D5. 集計 view は退会会員（NULL）を集計から除外、admin 列挙系のみ「退会済み」として残す

**決定**: 既存 view の挙動を次のように改定する:
- `member_list_view`: `members` テーブルから派生しているため、退会後は自動的に行が消える（変更不要）。
- `member_history_view`: `reservations.member_id IS NOT NULL` のフィルタを追加し、退会済み会員の履歴行を返さない（admin の会員詳細 sheet で見えなくなる）。
- `event_participants_view`: イベント参加者一覧では退会済み会員も「退会済み会員」として表示する。`display_name` / `email` / `experience_level` を `COALESCE(m.display_name, '退会済み会員')` / `NULL` / `NULL` で返す。チェックイン操作は member_id NULL の行に対しては不可（UI で disabled）。

### D6. UI 確認 UX: reservation は意思確認チェックボックス、admin はメールアドレス再入力

**決定**:
- **reservation 側**: 「予約履歴・本人確認書類画像を含む全データが完全に削除されます。元に戻せません」の警告 + 同意チェックボックス + 「削除する」ボタン。danger tone。
- **admin 側**: 同じ警告 + 削除対象列挙（予約 N 件 / 本人確認書類 M 件） + **対象会員のメールアドレス再入力** + 「削除する」ボタン。本人ではない第三者が削除する操作なので、より強い確認手段を要求する（#255 本文どおり）。

### D7. 退会後のセッション無効化

**決定**: `auth.users` を削除すると Supabase は当該 JWT の refresh を拒否するため、リフレッシュ次第セッションは無効化される。reservation 側の自己退会フローでは、Edge Function 成功後にクライアントで `supabase.auth.signOut()` を呼び、即座に LP へリダイレクトする。

admin 側の強制削除では、対象会員が別ブラウザでログイン中の場合も refresh で自動失効する（即時無効化の保証はないが、許容できるラグ）。

## Risks / Trade-offs

- **[Risk]** `reservations.member_id IS NULL` の行が増えていくと、過去ログ・分析クエリで「不明な参加者」が増える → **Mitigation**: `event_participants_view` で `COALESCE` 表示することで UI 側は壊れない。SQL レベルの分析は別途「退会済み会員除外」の WHERE 句を追加して対応。
- **[Risk]** Step 3 の `phone_at_booking` / `note` NULL 化が漏れると、退会者の個人情報が `reservations` に残り個人情報保護方針違反になる → **Mitigation**: Edge Function の単体テストで「退会後の reservations 行の `phone_at_booking` / `note` がすべて NULL であること」を必須検証項目とする。DB 整合性テストでも同様に確認する。
- **[Risk]** Edge Function 内の Step 3（Storage 削除）が失敗しても Step 4（DB 削除）に進むと、Storage に孤児オブジェクトが残る → **Mitigation**: Step 3 を Step 4 より前に実行し、失敗時は Step 4 を中止して 500 を返す。orphan は別途運営側で手動掃除する SOP を `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` に追記する。
- **[Risk]** Step 4 成功 / Step 5 失敗（auth.users 削除失敗）で、DB 上は退会済みなのに Auth user だけ残ってログインリンクが届く → **Mitigation**: Step 5 失敗時は 500 を返し、運営にアラート。Auth user が「members 行のない孤児」状態でログインしてきた場合は、ログインフロー側で `members` 行が見つからないため弾く挙動になっている（既存の `useAuthSession` で確認済み）。
- **[Risk]** 未来予約キャンセル時、対象会員が当該イベントの満員予約者だった場合、ウェイトリストの繰り上げが必要 → **Mitigation**: 既存のキャンセル繰り上げロジックがあれば再利用、なければ「退会時の未来予約キャンセルは admin 通知のみで自動繰り上げはしない」を明文化（MVP1 のキャンセル繰り上げ実装に依存）。
- **[Trade-off]** 退会の取り消し不可。誤操作 / 後悔した場合の救済がない → 確認 UX（チェックボックス / メール再入力）で予防する。

## Migration Plan

1. **DB マイグレーション**:
   - `ALTER TABLE reservations ALTER COLUMN member_id DROP NOT NULL`
   - FK 制約を `ON DELETE SET NULL` に張り替え
   - `CREATE OR REPLACE VIEW event_participants_view` 等の view を `COALESCE` 表示に更新
   - `member_history_view` に `WHERE member_id IS NOT NULL` を追加
2. **RLS ポリシー追加**: `members` の DELETE policy（admin のみ）、`reservations` の SELECT policy で `member_id IS NULL` の行は admin のみ参照可能であることを確認（既存 `is_admin()` 句で自動的に admin 限定）。
3. **Edge Function deploy**: `withdraw-member` を `supabase/functions/` に追加して deploy。
4. **UI deploy**:
   - reservation: `/profile` 最下部に「アカウント削除」セクション + 確認 dialog
   - admin: 詳細 sheet 最下部に「危険な操作」セクション + 確認 dialog
5. **個人情報保護方針 spec の Scenario 更新**: privacy-policy-page spec に「退会時に削除されるもの」「履歴として残るもの」を明示。
6. **SOP 追記**: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` に「退会時の Storage 残骸チェック手順」を追加。

**Rollback**:
- DB マイグレーションは FK 動作変更を含むため、ロールバックは難しい。Edge Function を無効化して UI を非表示にする緊急対応のみ可能。事前検証は dev 環境で十分に行う。

## Open Questions

- Q1. 未来予約キャンセル時、対象イベントに参加予定だった他会員への通知メールは送るか？ → 暫定: 送らない（MVP）。
- Q2. 退会会員の `members.display_name` を `member-withdrawal` 実行ログにのみ残すか？ → 暫定: 残さない（Edge Function ログのみ）。
- Q3. admin 強制削除時、対象会員に通知メールを送るか？ → 暫定: 送らない（必要なら別 change で追加）。
