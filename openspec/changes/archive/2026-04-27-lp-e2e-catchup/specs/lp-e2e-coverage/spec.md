## ADDED Requirements

### Requirement: イベントカレンダーの happy path E2E が存在する

`e2e/lp/event-calendar.e2e.ts` に、イベントカレンダー widget の happy path を検証する E2E test が 1 件以上存在しなければならない（SHALL）。当該 test は以下を満たさなければならない（SHALL）:
- Playwright `page.route()` で AWS API Gateway のイベント取得エンドポイント（`**/beta/event` 相当のパターン）を intercept し、固定の fixture イベントを返す
- Playwright `page.clock.install({ time: ... })` または `page.clock.setFixedTime()` でブラウザの「今日」を fixture イベントの開催月に固定する
- カレンダー widget root（`[data-testid="event-calendar"]`）が visible であることを確認
- Vuetify v-calendar 内に fixture イベント名のテキストが少なくとも 1 件描画されることを確認
- いずれかの fixture イベントをクリックし、`EventDetailDialog` がオープン（visible）すること、および dialog 内に当該イベント名が表示されることを確認

`@smoke` タグを付けてはならない（SHALL NOT、本 test はデータ依存の dynamic 挙動であり master full 専用とする）。

#### Scenario: API モックされたイベントが描画され、クリックで詳細 dialog が開く
- **WHEN** Playwright が `page.route()` でイベントエンドポイントを intercept し fixture を返す状態で、`page.clock` を fixture 月に固定して `/` を開く
- **THEN** カレンダーに fixture イベント名がレンダリングされ、当該イベントをクリックすると `EventDetailDialog` が開きイベント名が dialog 内に表示される

#### Scenario: happy path test に @smoke タグが付与されていない
- **WHEN** `e2e/lp/event-calendar.e2e.ts` の happy path test の test name および describe name を読み込む
- **THEN** `@smoke` 文字列が含まれていない

### Requirement: イベントカレンダーの Empty 状態 E2E が存在する

`e2e/lp/event-calendar.e2e.ts` に、API が空配列を返した時の Empty 状態を検証する E2E test が 1 件存在しなければならない（SHALL）。当該 test は以下を満たさなければならない（SHALL）:
- Playwright `page.route()` で AWS API Gateway のイベント取得エンドポイントを intercept し、Lambda proxy 形式の空配列レスポンス（`{ body: "[]" }`）を返す
- Empty 状態の文言「予定されているイベントはありません」が visible になることを確認

`@smoke` タグを付けてはならない（SHALL NOT、master full 専用）。

#### Scenario: 空配列が返ると Empty 文言が表示される
- **WHEN** Playwright が `page.route()` で `{ body: "[]" }` を返すモック設定で `/` を開く
- **THEN** カレンダー内に「予定されているイベントはありません」のテキストが visible になる

#### Scenario: Empty 状態 test に @smoke タグが付与されていない
- **WHEN** `e2e/lp/event-calendar.e2e.ts` の Empty 状態 test を読み込む
- **THEN** `@smoke` 文字列が含まれていない

### Requirement: AWS API Gateway イベントエンドポイントを Playwright で intercept する共通ヘルパが存在する

`e2e/lp/_helpers/eventApi.ts` に、Playwright の `page.route()` を呼び出してイベント取得エンドポイントを intercept しレスポンスを差し替えるヘルパ関数が export されていなければならない（SHALL）。当該ヘルパは以下を満たさなければならない（SHALL）:
- 引数として Playwright の `Page` インスタンスとイベント配列（テスト側が組み立てた fixture）を受け取る
- 内部で `page.route()` を呼び出し、`**/beta/event` または `**/event` を含む URL を intercept する
- レスポンスは LP の `eventQueries.fetchEvents` が期待する Lambda proxy 形式（`{ body: <JSON 文字列> }`）で返す
- 副作用としてヘルパ呼び出し以降のリクエストすべてがモックされる（page lifecycle に従う）

ヘルパの存在により `e2e/lp/event-calendar.e2e.ts` および将来追加される LP E2E test で `page.route()` 呼び出しのコード重複を避ける。

#### Scenario: ヘルパが page.route() を呼び出してイベントエンドポイントを intercept する
- **WHEN** test 内で `mockEventApi(page, [<fixture>])` を呼んだ後にイベント取得が発生する URL（fetchEvents の API_URL）にアクセスする
- **THEN** Playwright がリクエストを intercept し、`{ body: JSON.stringify([<fixture>]) }` 形式の HTTP 200 レスポンスを返す

#### Scenario: ヘルパが Lambda proxy 形式でレスポンスを返す
- **WHEN** `mockEventApi(page, events)` を呼ぶ
- **THEN** intercept されたレスポンスの body は JSON で `{ body: <events を JSON 化した文字列> }` の形になっており、LP 側 `JSON.parse(json.body)` で展開可能

### Requirement: 静的コンテンツ（Hero / Concept / Activities）の E2E は本仕様の対象外である

LP の静的セクション（Hero / Concept / Activities / Footer）に関する E2E 追加は本仕様の対象外でなければならない（SHALL NOT）。これらは:
- 既存 smoke (`e2e/lp/smoke.e2e.ts`) が DOM 存在レベルで既にカバーしている
- データ依存がなく、コンテンツ確認は component test レベルで取れる

E2E ピラミッド原則（component で取れるなら component に降ろす）に従い、本仕様では event-calendar の dynamic 挙動のみに集中する。静的コンテンツ確認の追加が必要になった場合は、component test または別 Issue で扱う。

#### Scenario: 本仕様で Hero / Concept / Activities 専用の新規 E2E が追加されない
- **WHEN** `e2e/lp/` 配下の新規ファイルを確認する
- **THEN** `event-calendar.e2e.ts` および `_helpers/eventApi.ts` 以外の test ファイルが本変更で追加されていない
