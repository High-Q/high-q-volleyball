## MODIFIED Requirements

### Requirement: イベント詳細画面

会員サイトはイベント詳細画面を SHALL 提供する。本画面はミニマル構成とし、会員が予約判断に必要な情報を簡潔に提示する MUST。

画面に含む要素:

- 開催日見出し
- イベント名
- 主要情報（開催日時・会場名・**集合場所**・参加費・**予約埋まり具合**）
- 参加費を併記した「予約に進む」ボタン（画面下部に常時可視で配置）

**集合場所**は一覧カードには表示せず、詳細画面でのみ表示する SHALL。これにより詳細画面が一覧カードに対する情報差分を持ち、「タップして見る価値」が成立する。集合場所のデータは `venues` テーブルの `meeting_point` 列をマスタとして保管し、未設定会場は default 値「現地集合」が表示される。

**予約埋まり具合**は facts grid 内に 1 行追加する形で表示し、「予約埋まり具合の表示」要件のテキスト規則に従う MUST。

「予約に進む」ボタンは押下時に予約確認 **Bottom Sheet** を開く MUST。独立した予約確認ルートには遷移しない MUST NOT (詳細画面 URL を維持し、Sheet 内で同伴者数 / 連絡事項 / 合計金額 / 確定 CTA を完結させる)。本ボタンは予約導線 (`reservation-booking-flow` capability) の入口として機能する。

満員時（capacity あり、かつ 予約埋まり具合 >= capacity）の下部 CTA は、当該会員の自己予約状態に応じて分岐する SHALL。当該会員が当該イベントへ未登録（予約もキャンセル待ちも持たない）の場合は、無効化された「予約締切」ではなく、押下可能なキャンセル待ち登録導線を提示する MUST。当該会員が既にキャンセル待ち登録済みの場合は登録済みの無効状態を表示する MUST。具体的な CTA 分岐・キャンセル待ち登録の振る舞いは `reservation-waitlist-registration` capability が規定する。capacity NULL の場合は満員概念が成立しないため通常挙動を維持する MUST。

紹介文・写真・キャンセルポリシー欄・会場住所そのものは本画面に **含まない** MUST（MVP1 スコープアウト + UX 観点での廃止）。

#### Scenario: 詳細画面の基本表示
- **WHEN** ログイン済み会員が任意イベントの詳細画面にアクセス
- **THEN** 開催日・イベント名・主要情報（開催日時・会場名・集合場所・参加費・予約埋まり具合）・「予約に進む」ボタンが描画される

#### Scenario: 集合場所の表示
- **WHEN** 詳細画面に到達
- **THEN** 会場名と集合場所が両方表示される（一覧では会場名のみだったが、詳細では集合場所も加わる）

#### Scenario: 集合場所が未設定の会場
- **WHEN** `venues.meeting_point` が default 値「現地集合」のまま運用されている会場の詳細を表示
- **THEN** 集合場所欄に「現地集合」が表示される

#### Scenario: 存在しないイベント ID
- **WHEN** 存在しないイベント ID で詳細画面にアクセス
- **THEN** 該当イベントが見つからない旨の表示と、イベント一覧へ戻る導線が提示される

#### Scenario: 「予約に進む」ボタンの押下
- **WHEN** ユーザーが「予約に進む」ボタンを押下する
- **THEN** 予約確認 Bottom Sheet が画面下部から立ち上がる（独立ルートには遷移せず、URL は詳細画面のまま。「準備中」案内表示も描画されない）

#### Scenario: 満員 + 未登録時はキャンセル待ち導線
- **WHEN** capacity あり・予約埋まり具合 >= capacity の状態で、当該イベントへ予約もキャンセル待ちも持たない会員が詳細画面に到達
- **THEN** 下部 CTA は無効化された「予約締切」ではなく、押下可能なキャンセル待ち登録導線として描画される（詳細は `reservation-waitlist-registration` capability に従う）

#### Scenario: 紹介文・写真・キャンセルポリシー・会場住所の非表示
- **WHEN** 詳細画面の DOM を確認
- **THEN** 紹介文セクション・写真領域・キャンセルポリシー欄・会場住所欄のいずれも存在しない

### Requirement: 予約埋まり具合の表示

会員サイトのイベント一覧（「他のイベント」セクションの各行）、イベント詳細画面、および **NEXT カード** は、当該イベントの予約埋まり具合を SHALL 表示する。表示は `capacity` の有無で動的に切り替わり、admin と同じ集計母集団（本人 + 同伴の人数ベース、`status IN ('reserved', 'attended')` をカウント、`cancelled` は除外）を共有する MUST。

表示テキストは以下の規則に従う MUST:

| capacity 状態 | 一覧チップ | 詳細 facts 行 | 詳細「予約に進む」CTA | NEXT カード strip |
|---|---|---|---|---|
| `capacity = NULL` | 「N 名 予約中」 | ラベル「予約状況」/ 値「N 名 予約中」 | 通常表示 | 「N 名 予約中」 + `UNCAPPED` モノラベル |
| `capacity` あり、`booked < capacity` | 「あと N 名 募集」（N = `capacity - booked`） | ラベル「残り」/ 値「あと N 名 募集」 | 通常表示 | 「あと N 名 募集」 + 黒地用 progress bar |
| 満員（`booked >= capacity`） | 「満員」 | ラベル「予約状況」/ 値「満員」 | 自己予約状態で分岐（未登録時はキャンセル待ち登録導線） | 「満員」 + 黒地用 progress bar |

満員時の詳細「予約に進む」CTA は、当該会員が未登録のときキャンセル待ち登録導線を提示し、キャンセル待ち登録済みのとき登録済みの無効状態を表示する MUST。その分岐・振る舞いの詳細は `reservation-waitlist-registration` capability が規定する。

「席」という語は使用 SHALL NOT する（物理席との混同回避）。一覧チップ / 詳細 facts 行ともにプログレスバーは描画 MUST NOT する（当面 `capacity = NULL` 一辺倒のため意味を持たない。`capacity` 入力 UI 復活時に追加検討）。

NEXT カードでは availability strip を黒地ヒーローカードの下端に `border-top` 区切りで配置する MUST。strip は左端に色付き dot indicator、中央に文言、右端に `capacity` あり時は黒地用 progress bar、`capacity = NULL` 時は `UNCAPPED` モノスペースラベルを配置する SHALL。

#### Scenario: capacity NULL のイベント一覧チップ
- **WHEN** capacity NULL のイベントで予約埋まり具合の集計値が 11 名（本人 + 同伴の人数ベース）
- **THEN** 該当行のチップに「11 名 予約中」と表示される

#### Scenario: capacity あり、残席ありのイベント一覧チップ
- **WHEN** capacity = 18、予約埋まり具合の集計値が 11 名
- **THEN** 該当行のチップに「あと 7 名 募集」と表示される

#### Scenario: 満員のイベント一覧チップ
- **WHEN** capacity = 18、予約埋まり具合の集計値が 18 名以上
- **THEN** 該当行のチップに「満員」と表示される

#### Scenario: 詳細画面 facts grid に予約埋まり具合行が追加される
- **WHEN** イベント詳細画面が描画される
- **THEN** Date / Time / Venue / Fee に加えて、予約埋まり具合の行が facts grid に表示される

#### Scenario: 満員 + 未登録時の詳細 CTA はキャンセル待ち導線
- **WHEN** capacity = 18、予約埋まり具合の集計値が 18 名以上の状態で、当該イベントへ未登録の会員が詳細画面に到達
- **THEN** 「予約に進む」CTA は無効化された「予約締切」ではなく、押下可能なキャンセル待ち登録導線として描画される

#### Scenario: NEXT カードに予約埋まり具合 strip が描画される (capacity NULL)
- **WHEN** capacity NULL のイベントを NEXT カードとして表示し、予約埋まり具合の集計値が 9 名
- **THEN** NEXT カード下端の strip に「9 名 予約中」と表示され、右端に `UNCAPPED` モノラベルが描画される

#### Scenario: NEXT カードに予約埋まり具合 strip が描画される (capacity あり残あり)
- **WHEN** capacity = 18 のイベントを NEXT カードとして表示し、予約埋まり具合の集計値が 14 名
- **THEN** NEXT カード下端の strip に「あと 4 名 募集」と表示され、右端に黒地用 progress bar が描画される

#### Scenario: NEXT カードに予約埋まり具合 strip が描画される (満員)
- **WHEN** capacity = 18 のイベントを NEXT カードとして表示し、予約埋まり具合の集計値が 18 名以上
- **THEN** NEXT カード下端の strip に「満員」と表示され、右端に黒地用 progress bar (full) が描画される

#### Scenario: 「席」表記の不採用
- **WHEN** 会員サイトの DOM 全体を `残席` / `空席` 等の「席」を含む表記で検索
- **THEN** いずれの画面にも該当表記は存在しない
