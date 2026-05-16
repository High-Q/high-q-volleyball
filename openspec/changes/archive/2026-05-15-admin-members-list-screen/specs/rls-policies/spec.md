## MODIFIED Requirements

### Requirement: members の閲覧と編集ポリシー

システムは MUST `members` テーブルに以下のポリシーを適用する:
- SELECT: ログイン中のユーザーは自分の行のみ可。管理者は全件可
- UPDATE: ログイン中のユーザーは自分の行のうち `display_name` / `nickname` / `phone` / `experience_level` / `profile` のみ可（`role` / `admin_note` は変更不可）。管理者は全件・全列可
- INSERT: トリガーから system_role 経由でのみ可（クライアント直接 INSERT を禁止）
- DELETE: 管理者のみ可

本 change で `admin_note` 列が追加されたため、UPDATE WITH CHECK 句で「本人が `admin_note` を変更しようとした場合は拒否」を明示 MUST する。`admin_note` は admin 専用の運営メモであり、本人の閲覧経路（reservation アプリ）では明示的列指定 SELECT で除外する運用ルールを採用 SHALL する。reservation 側の `members` 取得経路（`useAuthSession` / プロフィール取得 / その他 member 行 fetch）は `from('members').select('*')` を使わず、必要列のみを明示列指定 SELECT で取得 MUST する。grep で `from('members').select('*')` の検出件数が 0 件であることを CI / 手動レビューで担保 SHALL する。

#### Scenario: 自分の members 行を取得
- **WHEN** ログイン中の member が `select * from members where id = auth.uid()`
- **THEN** 1 行返る（admin_note も含めて返るが、reservation アプリ側は列指定 SELECT で除外する）

#### Scenario: 他人の members 行を取得
- **WHEN** ログイン中の member が他人の `id` を指定して SELECT
- **THEN** 0 行返る（RLS で除外）

#### Scenario: role の自己昇格を防ぐ
- **WHEN** member が自分の行に `update members set role = 'admin' where id = auth.uid()` を試みる
- **THEN** RLS の UPDATE WITH CHECK 句により `role` 列の変更が拒否される

#### Scenario: 本人による admin_note の更新を拒否
- **WHEN** member が自分の行に `update members set admin_note = '...' where id = auth.uid()` を試みる
- **THEN** RLS の UPDATE WITH CHECK 句により拒否される

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `update members set admin_note = '...' where id = :id` を実行
- **THEN** 1 行更新される（admin の UPDATE 権限は全件・全列）

#### Scenario: 本人 SELECT 経路の列指定
- **WHEN** reservation アプリのコードベースを `grep "from('members').select('\\*')"` で検索
- **THEN** マッチが 0 件である（すべて明示列指定 SELECT に統一されている）
