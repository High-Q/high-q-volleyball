# RLS Policies Spec

## Purpose

High Q の Supabase PostgreSQL 全テーブルに対する Row Level Security ポリシーを規定する。`is_admin()` ヘルパー関数を中心に、anon / authenticated / admin の 3 段階で SELECT/INSERT/UPDATE/DELETE を制御する。Storage バケット (identity-documents) のオブジェクトレベル RLS も含む。
## Requirements
### Requirement: 全テーブル RLS 有効化

システムは Phase 1 で作成する全テーブル (events / members / reservations / venues / identity_documents) に対して `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を適用 MUST する。RLS なしのテーブルが本番に存在することを禁止 SHALL する。

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('events','members','reservations','venues','identity_documents')`
- **THEN** すべての行で `relrowsecurity = true` が返る

### Requirement: events の閲覧と編集ポリシー

システムは MUST `events` テーブルに以下のポリシーを適用する:
- SELECT: 誰でも可（`USING (true)`）。LP / Reservation での公開カレンダー表示を許可
- INSERT / UPDATE / DELETE: `auth.jwt() ->> 'role' = 'admin'` または `members.role = 'admin'` を満たすユーザーのみ可

#### Scenario: 公開ユーザーが events を閲覧
- **WHEN** 未認証ユーザー（anon）が `select * from events` を実行
- **THEN** 全 events の行が返る

#### Scenario: 一般会員が events を作成しようとする
- **WHEN** `role = 'member'` のユーザーが `insert into events ...` を実行
- **THEN** RLS 違反で 0 行 INSERT（または明示的なエラー）

#### Scenario: 管理者が events を作成
- **WHEN** `role = 'admin'` のユーザーが events を INSERT
- **THEN** 行が作成される

### Requirement: members の閲覧と編集ポリシー

システムは MUST `members` テーブルに以下のポリシーを適用する:
- SELECT: ログイン中のユーザーは自分の行のみ可。管理者は全件可
- UPDATE: ログイン中のユーザーは自分の行のうち `display_name` / `profile` のみ可（role は変更不可）。管理者は全件可
- INSERT: トリガーから system_role 経由でのみ可（クライアント直接 INSERT を禁止）
- DELETE: 管理者のみ可

#### Scenario: 自分の members 行を取得
- **WHEN** ログイン中の member が `select * from members where id = auth.uid()`
- **THEN** 1 行返る

#### Scenario: 他人の members 行を取得
- **WHEN** ログイン中の member が他人の `id` を指定して SELECT
- **THEN** 0 行返る（RLS で除外）

#### Scenario: role の自己昇格を防ぐ
- **WHEN** member が自分の行に `update members set role = 'admin' where id = auth.uid()` を試みる
- **THEN** RLS の UPDATE WITH CHECK 句により `role` 列の変更が拒否される

### Requirement: reservations の閲覧と編集ポリシー

システムは MUST `reservations` テーブルに以下のポリシーを適用する:
- SELECT: 自分の予約のみ可。管理者は全件可
- INSERT: 自分の `member_id` を指定する場合のみ可
- UPDATE: 自分の予約の `status` を `'reserved' → 'cancelled'` に変えるケースのみ可。管理者は全件・全 status へ変更可
- DELETE: 管理者のみ可

#### Scenario: 自分の予約を一覧
- **WHEN** ログイン中の member が `select * from reservations where member_id = auth.uid()`
- **THEN** 該当の予約のみ返る

#### Scenario: 他人を予約させようとする
- **WHEN** member が `insert into reservations(event_id, member_id) values (?, '<other-member-id>')`
- **THEN** RLS WITH CHECK で拒否

#### Scenario: 予約をキャンセル
- **WHEN** member が `update reservations set status = 'cancelled' where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新

#### Scenario: 管理者が attended に更新
- **WHEN** admin が任意の予約の status を `'attended'` に UPDATE
- **THEN** 行が更新される

### Requirement: 管理者判定ヘルパー関数

システムは MUST RLS ポリシー内で繰り返し使用する管理者判定を `is_admin()` SQL 関数として `security definer` で定義する。

#### Scenario: 関数の使用
- **WHEN** ポリシー内で `is_admin()` を呼ぶ
- **THEN** `auth.uid()` の users.role が `'admin'` のとき true、それ以外 false を返す

#### Scenario: 関数の権限
- **WHEN** 任意のロールから `is_admin()` を実行
- **THEN** SECURITY DEFINER により所有者権限で members を読めるが、他のテーブルへの副作用はない

### Requirement: venues の閲覧と編集ポリシー

システムは `venues` テーブルに以下のポリシーを適用 MUST する:
- SELECT: 誰でも可 (`USING (true)`)。LP / Reservation で会場情報を表示するため
- INSERT / UPDATE / DELETE: `is_admin()` を満たすユーザーのみ可

#### Scenario: 公開ユーザーが venues を閲覧
- **WHEN** 未認証ユーザーが `select * from venues` を実行
- **THEN** 全 venues の行が返る

#### Scenario: 一般会員が venues を作成しようとする
- **WHEN** `role = 'member'` のユーザーが venues を INSERT
- **THEN** RLS 違反で 0 行 INSERT (または明示的なエラー)

#### Scenario: 管理者が venues を作成
- **WHEN** `role = 'admin'` のユーザーが venues を INSERT
- **THEN** 行が作成される

### Requirement: identity_documents の閲覧と編集ポリシー

システムは `identity_documents` テーブルに以下のポリシーを適用 MUST する:
- SELECT: 自分の行 (`member_id = auth.uid()`) のみ可。`is_admin()` のユーザーは全件可
- INSERT: 自分の `member_id` を指定する場合のみ可
- UPDATE: 自分の行のうち `storage_path` の差し替え (再アップロード) のみ可。`is_admin()` のユーザーは `status` / `rejection_reason` / `reviewed_at` / `reviewed_by` を更新可
- DELETE: 自分の行は可 (再アップロード時の置き換え)。`is_admin()` のユーザーは全件可 (マスク漏れ削除 SOP のため)

#### Scenario: 自分の書類を一覧
- **WHEN** ログイン中の member が `select * from identity_documents where member_id = auth.uid()`
- **THEN** 該当の書類のみ返る

#### Scenario: 他人の書類を取得
- **WHEN** member が他人の `member_id` を指定して SELECT
- **THEN** 0 行返る (RLS で除外)

#### Scenario: 管理者が pending を取得
- **WHEN** admin が `select * from identity_documents where status = 'pending'`
- **THEN** 全 member の pending 書類が返る

#### Scenario: 自己承認を防ぐ
- **WHEN** member が自分の identity_documents の `status` を `'approved'` に UPDATE しようとする
- **THEN** WITH CHECK 句により拒否される (status は admin のみ変更可)

#### Scenario: 管理者が承認操作
- **WHEN** admin が任意の identity_documents の status を `'approved'` または `'rejected'` に UPDATE
- **THEN** 行が更新される

#### Scenario: 管理者によるマスク漏れ削除
- **WHEN** admin がマイナンバー画像のマスク漏れを発見し DELETE を実行
- **THEN** RLS で許可される (Storage 側オブジェクト削除はアプリ層から別途呼ぶ)

### Requirement: Storage バケット identity-documents のアクセスポリシー

システムは Storage バケット `identity-documents` に以下の RLS を適用 MUST する (storage.objects テーブル):
- SELECT: パスの先頭ディレクトリが `auth.uid()::text` と一致するオブジェクトのみ可。`is_admin()` のユーザーは全件可
- INSERT: パスの先頭ディレクトリが `auth.uid()::text` と一致する場合のみ可
- UPDATE / DELETE: SELECT と同条件
- 公開アクセス: バケットの public フラグは false で、未認証アクセスを禁止 SHALL

#### Scenario: 他人の画像を直接 URL で取得
- **WHEN** ユーザーが他人の `member_id/<file>` への signed URL を持たない状態で直接アクセス
- **THEN** 403 が返る

#### Scenario: 自分のディレクトリへの upload
- **WHEN** ログイン中の member が `<auth.uid()>/<doc_id>-front.jpg` に upload
- **THEN** RLS で許可される

#### Scenario: 他人のディレクトリへの upload
- **WHEN** member が `<other_user_id>/<doc_id>-front.jpg` に upload を試みる
- **THEN** RLS で拒否される

