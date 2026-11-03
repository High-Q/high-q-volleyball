## MODIFIED Requirements

### Requirement: グローバルナビ項目の集約

シェルは MUST 以下の実在ルートをグローバルナビ項目として提供する: ダッシュボード（`/`）/ イベント（`/events`）/ 会員（`/members`）/ 会場（`/venues`）/ 本人確認書類（`/identity-documents`）/ 告知テンプレート（`/announcement-template`）。本人確認書類項目には MUST pending 件数 Badge を表示する。ログアウトは MUST サイドバー/ドロワーから常時実行できる。

ルートが存在しない項目（設定 等）は MUST ナビに表示しない。各ページは自前のグローバルナビ行を持たず、ページ header はパンくず + タイトル + ページ固有アクションのみに縮約する SHALL。

#### Scenario: ナビ項目は実在ルートのみ
- **WHEN** シェルのナビを描画する
- **THEN** ダッシュボード / イベント / 会員 / 会場 / 本人確認書類 / 告知テンプレート の 6 項目が表示され、未実装の「設定」項目は表示されない

#### Scenario: 本人確認書類の pending Badge
- **WHEN** pending な本人確認書類が 1 件以上存在する
- **THEN** 本人確認書類ナビ項目に件数 Badge が表示される
