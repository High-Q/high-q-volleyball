## ADDED Requirements

### Requirement: signup_pending の RLS は service_role 限定

システムは MUST `signup_pending` テーブルに RLS を有効化し、SELECT / INSERT / UPDATE / DELETE のすべてを **service_role からのみ可** とする。anon / authenticated の両ロールからのすべてのアクセスを SHALL NOT 許可する。Supabase Edge Function は内部的に service_role キーを使用してアクセスする SHALL。

`signup_pending` には氏名 / 電話 / 生年月日 / メールアドレスといった個人情報を含む payload が一時保管されるため、ブラウザクライアントから直接読み書きできてはならない。

#### Scenario: anon から SELECT 試行
- **WHEN** anon ロールが `select * from signup_pending` を試みる
- **THEN** 0 行返る（または明示的な権限エラー）

#### Scenario: authenticated から SELECT 試行
- **WHEN** ログイン中の `authenticated` ロールが `select * from signup_pending where email = 'self@example.com'` を試みる
- **THEN** 0 行返る（自分のメールであっても直接アクセス不可）

#### Scenario: anon から INSERT / UPDATE / DELETE 試行
- **WHEN** anon ロールが `signup_pending` に INSERT / UPDATE / DELETE を試みる
- **THEN** すべて RLS により拒否される

#### Scenario: service_role からの SELECT / INSERT / UPDATE / DELETE
- **WHEN** Supabase Edge Function が service_role キーで `signup_pending` に対して SELECT / INSERT（UPSERT）/ UPDATE / DELETE を発行する
- **THEN** すべて成功する（Edge Function は本テーブルを完全に管理できる）

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'signup_pending'` を実行
- **THEN** `relrowsecurity = true` が返る

## MODIFIED Requirements

### Requirement: 全テーブル RLS 有効化

システムは Phase 1 で作成する全テーブル (events / members / reservations / venues / identity_documents) に加え、本 change で追加する `signup_pending` に対して `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を適用 MUST する。RLS なしのテーブルが本番に存在することを禁止 SHALL する。

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('events','members','reservations','venues','identity_documents','signup_pending')`
- **THEN** すべての行で `relrowsecurity = true` が返る
