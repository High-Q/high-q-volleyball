## ADDED Requirements

### Requirement: announcement_templates テーブル
システムは告知文テンプレートを保存する `announcement_templates` テーブルを以下の列で定義 MUST する: `channel` (text PK — 告知チャネル。許可値は `line` のみ)、`body` (text NOT NULL — テンプレート本文。1 文字以上 5,000 文字以下)、`updated_by` (uuid NULL — 最終更新者。`members(id)` を参照し、会員削除時は NULL)、`created_at` (timestamptz NOT NULL default now)、`updated_at` (timestamptz NOT NULL default now。既存 `set_updated_at()` トリガーで更新)。

本テーブルは RLS を有効化 MUST し、SELECT / INSERT / UPDATE は `public.is_admin()` が真のユーザーにのみ許可 MUST する。DELETE ポリシーは定義 MUST NOT（テンプレートを削除する操作は提供しない）。`anon` には一切の権限を付与 MUST NOT し、`authenticated` には SELECT / INSERT / UPDATE を、`service_role` には全操作を明示 GRANT MUST する。

migration は初期テンプレート（チャネル `line`）を、既存行がある場合は上書きせずに投入 MUST する。

#### Scenario: admin がテンプレートを読み書きできる
- **WHEN** `is_admin()` が真のユーザーが `announcement_templates` の `line` 行を SELECT / UPDATE する
- **THEN** 行を取得・更新でき、`updated_at` が更新される

#### Scenario: 会員・未ログインからの露出禁止
- **WHEN** admin でない authenticated ユーザー、または anon が `announcement_templates` を SELECT / INSERT / UPDATE しようとする
- **THEN** RLS / GRANT により参照・変更できない

#### Scenario: 許可外チャネルの拒否
- **WHEN** `channel = 'jimoty'` の行を INSERT しようとする
- **THEN** CHECK 制約違反となり挿入されない

#### Scenario: 本文の長さ制約
- **WHEN** 空文字、または 5,001 文字以上の `body` を保存しようとする
- **THEN** CHECK 制約違反となり保存されない

#### Scenario: 初期テンプレートの投入
- **WHEN** migration を適用する
- **THEN** `line` 行が存在しなければ初期テンプレートが投入され、既に存在すれば内容は変更されない
