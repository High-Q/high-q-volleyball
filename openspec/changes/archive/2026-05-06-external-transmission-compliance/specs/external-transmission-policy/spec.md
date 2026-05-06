## ADDED Requirements

### Requirement: `/external-transmission` ルートが LP に存在する

`apps/lp` に `/external-transmission` ルートが存在し、改正電気通信事業法 §27の12 に基づく外部送信規律の通知ページとして機能する SHALL。本ページは 3 アプリ共通の単一 source of truth として運用される。

#### Scenario: ルート到達
- **WHEN** ユーザーがブラウザで `<lp-origin>/external-transmission` にアクセスする
- **THEN** 200 で外部送信ポリシーページが表示される

#### Scenario: 公開アクセス
- **WHEN** 未認証のユーザーがアクセスする
- **THEN** 認証なしでページ全文を閲覧できる

### Requirement: ページに外部送信先テーブルが全件記載される

ページ本文には、High Q プロダクト全体（lp / admin / reservation）から第三者に送信される情報を網羅した外部送信先テーブルが記載される MUST。

#### Scenario: 必須カラムの存在
- **WHEN** 外部送信先テーブルが描画される
- **THEN** 各行に「送信先」「送信される情報」「利用目的」「送信タイミング」「オプトアウト手段」の 5 カラムが揃っている

#### Scenario: 送信先の網羅性
- **WHEN** テーブルが描画される
- **THEN** 以下の送信先が最低限すべて記載されている: Google Tag Manager / Google Analytics（analytics 区分）, Google Fonts CDN（必要）, Supabase（必要）, Render（必要）, AWS API Gateway / DynamoDB（LP 既存・必要）

#### Scenario: 区分の明示
- **WHEN** テーブルが描画される
- **THEN** 各送信先が「必須 cookie / 必要な通信」か「任意（同意で制御可能）」かが明示されている

### Requirement: ページに同意状態の確認・変更導線が表示される

ページ末尾に「Cookie 同意設定を変更する」操作 UI が表示され、押下すると同意バナーが再表示され「全て許可」/「拒否」を選び直せる MUST。

#### Scenario: 同意設定再表示
- **WHEN** ユーザーが「Cookie 同意設定を変更する」を押下する
- **THEN** 同意バナーが再表示され、「全て許可」「拒否」の 2 ボタンで選び直せる

### Requirement: ページに最終更新日と問い合わせ先が記載される

ページには最終更新日（YYYY-MM-DD 形式）と問い合わせ先（メールアドレス）が記載される MUST。

#### Scenario: 更新日表示
- **WHEN** ページが描画される
- **THEN** 最終更新日が `YYYY-MM-DD` 形式で表示されている

#### Scenario: 問い合わせ先表示
- **WHEN** ページが描画される
- **THEN** 問い合わせ先メールアドレスが mailto: リンクで表示されている

### Requirement: 3 アプリのフッターから本ページへのリンクが常設される

`apps/lp` / `apps/admin` / `apps/reservation` の全画面共通フッターに「外部送信ポリシー」リンクが表示され、本ページへ遷移できる SHALL。lp 以外からは別オリジンへの外部リンク扱いとなる。

#### Scenario: lp フッターからの遷移
- **WHEN** ユーザーが lp の任意画面のフッターで「外部送信ポリシー」を押下する
- **THEN** `/external-transmission` ルートへ遷移する（同一オリジン内）

#### Scenario: admin フッターからの遷移
- **WHEN** ユーザーが admin の任意画面のフッターで「外部送信ポリシー」を押下する
- **THEN** lp の `<lp-origin>/external-transmission` が新規タブで開かれる

#### Scenario: reservation フッターからの遷移
- **WHEN** ユーザーが reservation の任意画面のフッターで「外部送信ポリシー」を押下する
- **THEN** lp の `<lp-origin>/external-transmission` が新規タブで開かれる
