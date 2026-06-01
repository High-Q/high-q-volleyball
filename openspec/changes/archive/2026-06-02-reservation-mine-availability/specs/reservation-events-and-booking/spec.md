## MODIFIED Requirements

### Requirement: 予約埋まり具合の表示

会員サイトのイベント一覧（「他のイベント」セクションの各行）、イベント詳細画面、および **NEXT カード** は、当該イベントの予約埋まり具合を SHALL 表示する。表示は `capacity` の有無で動的に切り替わり、admin と同じ集計母集団（本人 + 同伴の人数ベース、`status IN ('reserved', 'attended')` をカウント、`cancelled` は除外）を共有する MUST。

表示テキストは以下の規則に従う MUST:

| capacity 状態 | 一覧チップ | 詳細 facts 行 | 詳細「予約に進む」CTA | NEXT カード strip |
|---|---|---|---|---|
| `capacity = NULL` | 「N 名 予約中」 | ラベル「予約状況」/ 値「N 名 予約中」 | 通常表示 | 「N 名 予約中」 + `UNCAPPED` モノラベル |
| `capacity` あり、`booked < capacity` | 「あと N 名 募集」（N = `capacity - booked`） | ラベル「残り」/ 値「あと N 名 募集」 | 通常表示 | 「あと N 名 募集」 + 黒地用 progress bar |
| 満員（`booked >= capacity`） | 「満員」 | ラベル「予約状況」/ 値「満員」 | disabled + ラベル「予約締切」 | 「満員」 + 黒地用 progress bar |

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

#### Scenario: 満員時の詳細 CTA disabled
- **WHEN** capacity = 18、予約埋まり具合の集計値が 18 名以上の状態で詳細画面に到達
- **THEN** 「予約に進む」CTA は disabled となり、ラベルは「予約締切」と表示される

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
