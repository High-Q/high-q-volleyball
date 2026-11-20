# admin-announcements Specification

## Purpose
TBD - created by archiving change general-announcements. Update Purpose after archive.
## Requirements
### Requirement: お知らせテーブルと掲載属性

システムは複数のお知らせを保持するテーブルを持つ SHALL。各お知らせはタイトル・本文・出す相手（audience）・掲載開始時刻・任意の掲載終了時刻を持つ MUST。出す相手は「公開（public）」「会員（members）」「両方（all）」のいずれかである MUST。掲載終了は未設定（無期限）を許す SHALL。掲載終了を設定する場合は掲載開始より後でなければならない MUST。テーブルは RLS を有効化し、anon / authenticated / service_role の 3 ロールへ明示 GRANT を行う MUST。掲載期間の判定は端末のタイムゾーンによらずサーバーの絶対時刻（`now()`）で行う MUST。

#### Scenario: お知らせを複数保持できる
- **WHEN** 掲載期間や出す相手が異なる複数のお知らせを作成する
- **THEN** それぞれ独立した行として保持される

#### Scenario: 掲載終了は開始より後
- **WHEN** 掲載終了を掲載開始より前または同時に設定して保存しようとする
- **THEN** 制約により拒否される

#### Scenario: 掲載終了は無期限を許す
- **WHEN** 掲載終了を未設定でお知らせを保存する
- **THEN** 保存でき、掲載開始以降は無期限に掲載対象となる

#### Scenario: RLS が有効である
- **WHEN** お知らせテーブルの RLS 設定を確認する
- **THEN** row level security が有効で、ポリシーに合致しない直接アクセスは拒否される

### Requirement: 公開読取の安全境界

お知らせの公開読取は RLS により掲載期間と出す相手で制限される MUST。匿名（anon）は「公開（public / all）」かつ掲載期間内の行のみ SELECT できる MUST。一般会員（admin でない authenticated）は「会員（members / all）」かつ掲載期間内の行のみ SELECT できる MUST。掲載開始前・掲載終了後の行、および対象外の相手の行は、admin 以外に漏れてはならない MUST。

#### Scenario: 匿名は公開・掲載期間内のみ読める
- **WHEN** 匿名ユーザーがお知らせを SELECT する
- **THEN** 出す相手が public / all かつ掲載期間内の行だけが返り、members 専用・掲載前・掲載終了後の行は返らない

#### Scenario: 一般会員は会員・掲載期間内のみ読める
- **WHEN** 一般会員がお知らせを SELECT する
- **THEN** 出す相手が members / all かつ掲載期間内の行だけが返り、public 専用・掲載前・掲載終了後の行は返らない

#### Scenario: 掲載終了後は消える
- **WHEN** 掲載終了時刻を過ぎたお知らせを匿名／一般会員が SELECT する
- **THEN** その行は返らない

### Requirement: 管理者によるお知らせ管理

管理者（authenticated かつ role='admin'）はお知らせを作成・編集・削除できる SHALL。管理者は掲載期間・出す相手を問わず全てのお知らせを一覧で参照でき、各お知らせの掲載状態（掲載予定／掲載中／掲載終了）を把握できる SHALL。管理者以外の authenticated / anon はお知らせを作成・編集・削除できない MUST。作成時は作成者が記録される SHALL。

#### Scenario: 管理者がお知らせを作成する
- **WHEN** role='admin' の会員がタイトル・本文・出す相手・掲載期間を指定して作成する
- **THEN** 作成が成功し、一覧に掲載状態つきで表示され、作成者が記録される

#### Scenario: 管理者が掲載前・掲載終了後も含めて一覧できる
- **WHEN** 管理者がお知らせ一覧を参照する
- **THEN** 掲載予定・掲載中・掲載終了のすべてが掲載状態つきで表示される

#### Scenario: 管理者がお知らせを編集・削除する
- **WHEN** 管理者が既存お知らせの本文や掲載期間を更新、または削除する
- **THEN** 更新・削除が反映される

#### Scenario: 一般会員は管理操作ができない
- **WHEN** role='member' の会員がお知らせの作成・編集・削除を試みる
- **THEN** RLS により拒否される

### Requirement: お知らせ本文の安全な取り扱い

お知らせ本文はプレーンテキストとして扱い、表示時に HTML を解釈してはならない MUST。改行は保持される SHALL。

#### Scenario: 本文の HTML が解釈されない
- **WHEN** 本文に HTML タグを含むお知らせを掲載し、各サイトで表示する
- **THEN** タグは実行・描画されず、文字列として表示される（改行は保持される）

