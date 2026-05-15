## ADDED Requirements

### Requirement: 詳細 sheet の「危険な操作」セクション

`/members` 画面の詳細 sheet は、参加履歴・運営メモ編集に続く最下部に「危険な操作」セクションを MUST 表示する。本セクションは danger tone（赤系トークン）でスタイリングし、「この会員を削除」ボタン（danger variant）を含む。

セクションは admin（`role = 'admin'`）のみが利用可能な動線であり、非 admin はそもそも `/members` 画面に到達できない（admin-auth capability に従う）。

#### Scenario: セクションの表示
- **WHEN** admin が `/members` の任意の会員詳細 sheet を開く
- **THEN** sheet 最下部に「危険な操作」セクションと「この会員を削除」ボタンが表示される

#### Scenario: 視覚的な分離
- **WHEN** セクションが描画される
- **THEN** 上部の参加履歴・運営メモ編集と明確に視覚分離（divider または十分な余白）され、danger tone のラベル（「危険な操作」など）で誤操作リスクを伝える

### Requirement: 削除確認 AlertDialog

「この会員を削除」ボタン押下時は、AlertDialog 形式の確認 dialog を MUST 表示する。dialog は以下の要素を含む:

- 警告文: 削除によって失われるデータの内容を明示（基本情報 / 過去予約 N 件 / 本人確認書類 M 件 / Storage オブジェクト）
- 「未来予約 K 件は退会前に自動キャンセルされます」の明示（K > 0 のときのみ）
- **対象会員のメールアドレス再入力フィールド**（type=email）と、入力値が対象 member の email と完全一致した場合のみ「削除する」ボタンが enabled になる
- 「キャンセル」ボタン
- 「削除する」ボタン（danger variant、初期状態 disabled）

dialog はフォーカストラップ・Esc キー・背景クリックで閉じる動作を MUST 提供する（既存 AlertDialog プリミティブの挙動を踏襲）。

#### Scenario: 確認 dialog の構成
- **WHEN** admin が「この会員を削除」ボタンを押下
- **THEN** 上記要素を含む AlertDialog が表示される

#### Scenario: メール再入力で削除有効化
- **WHEN** admin が対象会員のメールアドレスを正確に再入力
- **THEN** 「削除する」ボタンが enabled になる

#### Scenario: メール不一致で削除不可
- **WHEN** admin が対象会員のメールアドレスとは異なる値を入力
- **THEN** 「削除する」ボタンは disabled のまま

#### Scenario: 未来予約件数の表示
- **WHEN** 対象会員が未来予約を 2 件持つ
- **THEN** dialog に「未来予約 2 件は退会前に自動キャンセルされます」が表示される

#### Scenario: 未来予約ゼロ件
- **WHEN** 対象会員に未来予約がない
- **THEN** 未来予約に関する文言は dialog に表示されない

#### Scenario: Esc で閉じる
- **WHEN** dialog 表示中に Esc キー押下
- **THEN** dialog が閉じ、削除は実行されない

### Requirement: 削除実行と一覧更新

「削除する」ボタン押下時は、admin アプリは MUST `withdraw-member` Edge Function を `target_member_id = <対象 id>` で呼び出す。成功時（200 / 204）には次の挙動を MUST 提供する:

- dialog と詳細 sheet を閉じる
- 一覧から当該会員行を即座に消す（楽観的更新 もしくは refetch）
- Toast「会員を削除しました」を表示

失敗時（403 / 500 / ネットワークエラー）には次の挙動を MUST 提供する:

- dialog 内に error メッセージを表示（「削除に失敗しました。時間をおいて再試行してください」相当）
- 「削除する」ボタンを再 enabled にし、再試行可能にする
- 一覧と詳細 sheet の状態は変更しない

#### Scenario: 削除成功
- **WHEN** admin が確認 dialog で「削除する」を押し、Function が 200 を返す
- **THEN** dialog / 詳細 sheet が閉じ、一覧から当該行が消え、Toast が表示される

#### Scenario: 既に削除済み
- **WHEN** admin が「削除する」を押した時点で対象会員が既に削除されている（別経路で先に削除された）
- **THEN** Function は 204 を返し、UI は成功扱い（一覧から行を消す）

#### Scenario: Function 失敗
- **WHEN** Function が 500 を返す
- **THEN** dialog 内に error メッセージが表示され、ボタンが再 enabled になる。一覧の当該行は残ったまま

#### Scenario: ネットワーク失敗
- **WHEN** Function 呼び出しがタイムアウトする
- **THEN** dialog 内に「ネットワークエラー。再試行してください」が表示され、ボタンが再 enabled になる

### Requirement: 削除済み会員の予約は一覧から消える

`/members` 画面の一覧は `members` テーブルから派生するため、退会済み会員は MUST 表示されない。`event_participants_view` 経由で参加者一覧に「退会済み会員」として現れる経路（`/events/:id` 画面）は admin-members-list capability の範囲外であり、本 capability では一覧と詳細 sheet からの完全な消失のみを保証する。

#### Scenario: 削除後の一覧から消失
- **WHEN** ある会員が削除された後に `/members` をリロード
- **THEN** 一覧に当該会員の行は存在しない（フィルタ・ソート問わず）

#### Scenario: 削除後の直接 URL アクセス
- **WHEN** 削除済み会員の id で `/members?detail=<deleted-uuid>` を直接開く
- **THEN** 一覧は正常描画され、sheet は Empty / Error 状態（「会員が見つかりません」）で開く（既存「存在しない member id」シナリオに準拠）
