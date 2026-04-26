# RLS Policies Spec

## ADDED Requirements

### Requirement: 全テーブル RLS 有効化

システムは Phase 1 で作成する全テーブル（events / members / reservations）に対して `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を適用する。RLS なしのテーブルが本番に存在することを禁止する。

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('events','members','reservations')`
- **THEN** すべての行で `relrowsecurity = true` が返る

### Requirement: events の閲覧と編集ポリシー

システムは `events` テーブルに以下のポリシーを適用する:
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

システムは `members` テーブルに以下のポリシーを適用する:
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

システムは `reservations` テーブルに以下のポリシーを適用する:
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

システムは RLS ポリシー内で繰り返し使用する管理者判定を `is_admin()` SQL 関数として `security definer` で定義する。

#### Scenario: 関数の使用
- **WHEN** ポリシー内で `is_admin()` を呼ぶ
- **THEN** `auth.uid()` の users.role が `'admin'` のとき true、それ以外 false を返す

#### Scenario: 関数の権限
- **WHEN** 任意のロールから `is_admin()` を実行
- **THEN** SECURITY DEFINER により所有者権限で members を読めるが、他のテーブルへの副作用はない
