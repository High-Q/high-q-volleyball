## ADDED Requirements

### Requirement: 参加者一覧の内側スクロール

イベント詳細画面（`/events/:id`）は、参加者数が画面高を超えた場合に、**参加者一覧テーブル領域の内側のみ**で縦スクロールを発生させること SHALL。ページ全体（ブラウザの外側スクロールバー）でのスクロール解決は禁止する。

TopBar / StatCards / RemainBar / Tabs / 参加者一覧 Toolbar は MUST 画面上部に固定され、参加者テーブルのスクロール操作によって位置が変化してはならない。

#### Scenario: 参加者多数イベントでテーブル領域のみがスクロールする

- **WHEN** 参加者が縦スクロールを必要とする数（例: viewport 高に対しテーブル行数が超過する状態）だけ存在するイベントの詳細画面を開く
- **THEN** 参加者テーブル領域の内側にのみスクロールバーが表示される
- **AND** ページ全体のスクロールバーは発生しない
- **AND** TopBar / StatCards / RemainBar / Tabs / Toolbar は固定位置に留まる

#### Scenario: 参加者 0 件 / Loading / Error 状態でレイアウトが崩れない

- **WHEN** 参加者一覧が Empty（0 件）/ Loading（pending）/ Error のいずれかの状態で描画される
- **THEN** Toolbar および状態メッセージが参加者一覧領域に収まり、外側へはみ出さない
- **AND** TopBar / StatCards / RemainBar / Tabs は通常通り固定表示される

#### Scenario: モバイル幅でも内側スクロールが機能する

- **WHEN** 画面幅 375px で参加者多数イベントの詳細画面を開く
- **THEN** 参加者テーブル領域の内側のみで縦スクロールが機能する
- **AND** 上部の固定要素群（TopBar / StatCards / RemainBar / Tabs / Toolbar）は画面外にスクロールしない
