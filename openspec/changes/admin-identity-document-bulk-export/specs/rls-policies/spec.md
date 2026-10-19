## ADDED Requirements

### Requirement: identity_document_downloads の RLS と GRANT

システムは MUST `identity_document_downloads` テーブルに RLS を有効化し、以下のポリシーを適用する SHALL:

- **SELECT**: `is_admin()` のユーザーのみ可。非 admin（authenticated / anon）は MUST 1 行も読めない SHALL。
- **INSERT**: `is_admin()` のユーザーのみ可（WITH CHECK で `is_admin()` を強制）。
- **UPDATE / DELETE**: ポリシーを MUST 作成しない（追記専用の不変監査ログ）SHALL。

GRANT は MUST 3 ロール明示で付与する SHALL（`alter default privileges` の自動付与に依存しない）:

- **anon**: GRANT を付与しない（監査ログは非公開）。
- **authenticated**: `select, insert` のみ付与する（行レベルの可否は RLS の `is_admin()` で制御）。
- **service_role**: 全権限（`select, insert, update, delete`）を付与する。

#### Scenario: RLS 有効化の確認
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'identity_document_downloads'`
- **THEN** `relrowsecurity = true` が返る

#### Scenario: admin の記録と閲覧
- **WHEN** admin が一括ダウンロードを実行して identity_document_downloads に INSERT し、その後 SELECT する
- **THEN** INSERT が成功し、自身が記録したログ行を SELECT で取得できる

#### Scenario: 非 admin は読めない
- **WHEN** 非 admin の authenticated ユーザーが `select * from identity_document_downloads` を実行する
- **THEN** RLS により 0 行が返る

#### Scenario: 非 admin は記録できない
- **WHEN** 非 admin の authenticated ユーザーが identity_document_downloads に INSERT を試みる
- **THEN** RLS の WITH CHECK（`is_admin()`）により拒否される

#### Scenario: anon は到達できない
- **WHEN** anon ロールが identity_document_downloads に SELECT / INSERT を試みる
- **THEN** GRANT 未付与によりテーブルに到達できない
