## ADDED Requirements

### Requirement: 退会済み会員の予約行のアクセス制御

システムは `reservations.member_id IS NULL` の行（退会済み会員の過去予約）に対するアクセス制御を MUST 規定する:

- SELECT: admin のみ可。一般会員はそもそも `member_id = auth.uid()` で SELECT するため NULL 行はマッチせず、結果的に閲覧不可
- INSERT: MUST NOT 許容（WITH CHECK 句で `member_id IS NOT NULL` を強制し、新規予約で NULL になる経路を遮断）
- UPDATE: admin のみ可。一般会員は `member_id = auth.uid()` の WHERE 句で対象外
- DELETE: admin のみ可

退会経路（`withdraw-member` Edge Function）からの ON DELETE SET NULL による NULL 化は RLS 評価を経由しない（`service_role` 権限）ため、本ポリシーの制約を受けない。

#### Scenario: 一般会員からは退会済み行が見えない
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM reservations WHERE member_id IS NULL` を実行
- **THEN** 結果は 0 行（RLS の `member_id = auth.uid()` で除外）

#### Scenario: admin からは退会済み行が見える
- **WHEN** `is_admin()` のユーザーが `SELECT * FROM reservations WHERE member_id IS NULL` を実行
- **THEN** 退会済み会員の過去予約が全件返る

#### Scenario: 一般会員による NULL 行の INSERT は拒否
- **WHEN** 一般会員が `INSERT INTO reservations (event_id, member_id, ...) VALUES (..., NULL, ...)` を試みる
- **THEN** RLS WITH CHECK 句で拒否される

#### Scenario: 一般会員による NULL 行 UPDATE は無効
- **WHEN** 一般会員が `UPDATE reservations SET status = 'cancelled' WHERE member_id IS NULL` を実行
- **THEN** USING 句 (`member_id = auth.uid()`) によりマッチする行が無く、UPDATE は 0 行に終わる

### Requirement: `withdraw-member` Edge Function の認可と権限

システムは `withdraw-member` Edge Function に対して以下の認可契約を MUST 提供する:

- Function は `service_role` キーで Supabase Client を初期化し、RLS を bypass して `members` / `reservations` / `identity_documents` / Storage / `auth.users` を操作する
- Function 内で呼び出し元 JWT（Authorization ヘッダ）を Supabase Auth で検証し、`auth.uid()` を取得 MUST する
- 取得した `auth.uid()` が `target_member_id` と一致する（本人）か、または当該 `auth.uid()` を持つ `members` 行の `role = 'admin'` である（admin）場合のみ削除を実行 MUST する。それ以外は 403 を返す
- 認可検証で取得する admin 判定は、`is_admin()` ヘルパー関数を Function 内で SQL 呼び出しせず、`SELECT role FROM members WHERE id = :auth_uid` の直接クエリで判定 SHALL する（Function は service_role なので RLS なしで取得可能）
- Function の呼び出し成功・失敗・実行者・対象 member_id は Function ログに MUST 記録する

#### Scenario: 本人呼び出しの認可成功
- **WHEN** 認証済み一般会員が自分の `member_id` を引数に Function を呼ぶ
- **THEN** `auth.uid() === target_member_id` が成立し、削除が実行される

#### Scenario: admin 呼び出しの認可成功
- **WHEN** `role = 'admin'` のユーザーが他人の `member_id` を引数に Function を呼ぶ
- **THEN** admin 判定 SQL で `role = 'admin'` が確認され、削除が実行される

#### Scenario: 第三者からの呼び出し拒否
- **WHEN** `role = 'member'` のユーザーが他人の `member_id` を引数に Function を呼ぶ
- **THEN** Function は 403 を返し、DB / Storage / Auth に対する操作を実行しない

#### Scenario: 未認証呼び出しの拒否
- **WHEN** Authorization ヘッダなしで Function を呼ぶ
- **THEN** Function は 401 を返す
