# admin-operational-settings Specification

## Purpose
TBD - created by archiving change member-registration-toggle. Update Purpose after archive.
## Requirements
### Requirement: 運営設定テーブルと受付可否フラグ

システムは運営グローバル設定を保持する 1 行運用のテーブルを持つ SHALL。本テーブルは新規会員登録の受付可否を表すブール値を 1 つ保持し、既定値は「受付中（true）」とする MUST。単一行制約により行は常に 1 行のみ存在する SHALL。テーブルは RLS を有効化し、anon / authenticated / service_role の 3 ロールへ明示 GRANT を行う MUST。

#### Scenario: migration 適用直後は受付中の 1 行が存在する
- **WHEN** migration 適用後に運営設定テーブルを確認する
- **THEN** 行がちょうど 1 行存在し、受付可否フラグが true（受付中）である

#### Scenario: 2 行目を挿入できない
- **WHEN** 運営設定テーブルへ 2 行目の INSERT を試みる
- **THEN** 単一行制約により拒否される

#### Scenario: RLS が有効である
- **WHEN** 運営設定テーブルの RLS 設定を確認する
- **THEN** row level security が有効で、anon から直接の SELECT / INSERT / UPDATE / DELETE が全て拒否される

### Requirement: 管理者による受付可否の切替

管理者（authenticated かつ role='admin'）は受付可否フラグを SELECT / UPDATE できる SHALL。admin 以外の authenticated ユーザーは本テーブルを読み書きできない MUST。更新時は最終更新時刻と最終更新者が記録される SHALL。

#### Scenario: 管理者が受付を停止へ切り替える
- **WHEN** role='admin' の会員が受付可否フラグを false に UPDATE する
- **THEN** 更新が成功し、最終更新時刻と最終更新者（当該 admin）が記録される

#### Scenario: 一般会員は設定を変更できない
- **WHEN** role='member' の会員が受付可否フラグの SELECT または UPDATE を試みる
- **THEN** RLS により拒否され、値を読むことも変えることもできない

### Requirement: 受付可否の公開参照関数

システムは現在の受付可否を 1 bit だけ返す `SECURITY DEFINER` 関数を提供する SHALL。本関数は anon / authenticated から EXECUTE 可能とし、運営設定テーブル本体は公開しない MUST。関数は受付中なら true、停止中なら false を返す SHALL。

#### Scenario: 匿名ユーザーが受付可否を取得できる
- **WHEN** 未認証（anon）ユーザーが受付可否参照関数を呼ぶ
- **THEN** 現在の受付可否を表すブール値が返る（テーブル本体へは直接アクセスしない）

#### Scenario: 停止中は false を返す
- **WHEN** 受付可否フラグが false の状態で参照関数を呼ぶ
- **THEN** false が返る

### Requirement: admin 運営設定ページ

admin アプリは運営設定ページを持ち、受付可否トグルを表示する SHALL。ページは Loading / Error / Success / 通常 の 4 状態を持つ MUST。トグルの状態変更時は確認ダイアログを挟み、確定操作でのみ永続化する SHALL。ページはデザイントークン経由で描画し、ナビゲーションから到達できる MUST。

#### Scenario: 現在値の読み込み（Loading → 通常）
- **WHEN** 管理者が運営設定ページを開く
- **THEN** 現在値取得中は Loading を表示し、取得完了後にトグルが現在の受付可否を反映して表示される

#### Scenario: トグル切替は確認を経て確定する
- **WHEN** 管理者がトグルを切り替える
- **THEN** 切替後の状態を説明する確認ダイアログが表示され、確定で永続化され Success フィードバックが出る。取消では値が変わらない

#### Scenario: 更新失敗時の Error 表示
- **WHEN** 受付可否の更新がサーバーエラーで失敗する
- **THEN** Error フィードバックが表示され、トグルは変更前の状態に戻る

#### Scenario: ナビゲーション導線
- **WHEN** 管理者が admin のナビゲーションを見る
- **THEN** 運営設定ページへの導線が存在する

