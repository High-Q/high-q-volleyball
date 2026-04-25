## ADDED Requirements

### Requirement: イベント取得中にローディング状態が表示される

イベントデータの取得中、カレンダー領域にスケルトンローダーが表示されなければならない（SHALL）。

#### Scenario: API レスポンス待機中のローディング表示

- **WHEN** ページ読み込み直後で API レスポンスがまだ返っていない場合
- **THEN** カレンダー領域に `v-skeleton-loader` が表示される

### Requirement: イベントが0件のとき空状態が表示される

API からイベントが1件も返されなかった場合、「予定されているイベントはありません」というメッセージが表示されなければならない（SHALL）。

#### Scenario: 空のイベントリスト

- **WHEN** API が空配列を返した場合
- **THEN** カレンダーの代わりに空状態メッセージが表示される

### Requirement: API エラー時にエラー状態が表示される

API の取得が失敗した場合、ユーザーにエラーメッセージが表示されなければならない（SHALL）。カレンダーは表示されない（SHALL）。

#### Scenario: API 通信エラー

- **WHEN** API への通信が失敗した場合
- **THEN** `v-alert type="error"` でエラーメッセージが表示され、カレンダーは表示されない

## MODIFIED Requirements

### Requirement: APIからイベントを取得してカレンダーに表示する

AWS API Gateway からイベント一覧を取得し、カレンダー上に表示しなければならない（SHALL）。データ取得には TanStack Query を使用しなければならない（SHALL）。

#### Scenario: イベントがカレンダー上に表示される

- **WHEN** APIレスポンスに1件以上のイベントが含まれる
- **THEN** 各イベントが対応する日付のカレンダーセル上に表示される
