## ADDED Requirements

### Requirement: イベント詳細の vol 取得

会員サイトのイベント詳細取得（`entities/event` の単一イベント取得 API）は、`events.vol` を `EventDetail` の `vol`（`number | null`）として SHALL 返す。取得は `event_detail_view` の `vol` 列（または同等の SELECT）を経由し、回号を name 文字列からパースして得てはならない MUST NOT。`vol` が NULL のイベント（未採番）も正常に取得できる MUST。

#### Scenario: 詳細取得が vol を含む
- **WHEN** 会員がイベント詳細を取得する
- **THEN** 返却値に当該イベントの `vol`（採番済みなら数値、未採番なら null）が含まれる

#### Scenario: vol は name パースに依存しない
- **WHEN** 単一イベント取得 API の実装を確認する
- **THEN** 回号は `events.vol` 由来であり、`name` 文字列から回号を抽出する処理は存在しない

### Requirement: イベント名見出しの vol editorial 表示

イベント詳細画面（`/events/:id`）のイベント名見出し（`<h1>`）は、ブランド和文セリフ書体による誌面的な大見出しとして SHALL 表示する。本要件は「イベント詳細画面」要件が定める表示情報の範囲を変更せず、イベント名の **見せ方** のみを規定する。

`event.vol` が非 NULL のとき、見出しはシリーズ名（`event.name`）を大見出しで表示し、その下に **改行した上で** `vol.{vol}` を **モノスペース書体 + accent 色** で強調表示する MUST（例: `vol.74`）。`event.vol` が NULL のときは vol 行を描画せず、イベント名全体を大見出しとして表示する MUST（fallback）。回号の表示は `event.vol` を直接用い、`name` 文字列からの抽出を行わない MUST NOT。

色・書体・サイズは HQ デザイントークン経由（Tailwind preset utility または HQ ブランドの CSS 変数）でのみ指定する MUST。生の色コード・ピクセル値・rem 値の直書きを禁止 MUST NOT。本要件は紹介文・写真・キャンセルポリシー欄・会場住所の非表示判断を変更しない MUST NOT。

#### Scenario: vol があれば vol.NN を accent 色で改行強調
- **WHEN** `name='ゆる練'`・`vol=74` のイベント詳細画面を表示する
- **THEN** 見出しに「ゆる練」が大見出しで描画され、その下に改行された別行へ `vol.74` がモノスペース + accent 色で描画される

#### Scenario: vol が NULL なら名前のみ大見出し
- **WHEN** `vol=null` のイベント詳細画面を表示する
- **THEN** 見出しはイベント名全体を大見出しとして描画し、vol 行・accent 強調は描画されない

#### Scenario: 見出しスタイルはトークン経由
- **WHEN** イベント名見出しのテンプレート／スタイルから生の色コード・ピクセル値・rem 値の直書きを検索する
- **THEN** ヒット 0 件（色・書体・サイズはすべて HQ デザイントークン utility 経由）
