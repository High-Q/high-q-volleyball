## ADDED Requirements

### Requirement: 予約状況セクション

予約詳細画面（`/reservations/:reservationId`）は、Meta テーブル（参加費 / 同伴者 / 予約日時）の **下** かつ Cancel Policy ボックスの **上** に「予約状況」セクションを SHALL 表示する。本セクションは当該予約に紐付くイベントの予約埋まり具合（本人 + 同伴の人数ベース集計）を会員に提示し、「予約埋まり具合の表示」要件（`reservation-events-and-booking` capability）と集計母集団・トーン規則を共有する MUST。

表示テキストは以下の規則に従う MUST:

| capacity 状態 | セクションラベル | 値 | 補助表示 |
|---|---|---|---|
| `capacity = NULL` | 「予約状況」 | 「N 名 予約中」 | 「UNCAPPED · 定員上限なし」モノラベル |
| `capacity` あり、`booked < capacity` | 「あと何名」 | 「あと N 名 募集」 | light テーマ progress bar |
| 満員（`booked >= capacity`） | 「満員」 | 「満員」 | light テーマ progress bar (full) |

文言には自分視点の補足（「（あなたを含む）」等）を MUST NOT 付与する。本画面が「自分の予約に関する画面」であることは画面コンテキストで自明であり、補足文言は冗長になるため。イベント一覧 / 詳細と完全同一の表記 (`formatAvailability` 関数の出力) に統一する MUST。

満員時の値文言には「予約締切」を含めない MUST NOT。「予約締切」は他人視点の表現であり、自分が既に予約済みの本画面では違和感を生むため、中立的な「満員」表記に統一する。

availability 取得失敗時は値部分を `—` で fallback し、セクションラベルと補助表示は描画継続する MUST。チップ個別の retry 操作は MUST NOT 配置する（画面全体の retry に集約）。

#### Scenario: capacity NULL の予約状況表示
- **WHEN** capacity NULL のイベントの予約詳細画面を開き、予約埋まり具合の集計値が 9 名
- **THEN** 「予約状況」セクションに「9 名 予約中」と表示され、補助表示「UNCAPPED · 定員上限なし」が描画される

#### Scenario: capacity あり残ありの予約状況表示
- **WHEN** capacity = 18 のイベントの予約詳細画面を開き、予約埋まり具合の集計値が 14 名
- **THEN** 「あと何名」セクションに「あと 4 名 募集」と表示され、light テーマ progress bar が描画される

#### Scenario: 満員の予約状況表示
- **WHEN** capacity = 18 のイベントの予約詳細画面を開き、予約埋まり具合の集計値が 18 名以上
- **THEN** 「満員」セクションに「満員」と表示され、「予約締切」文言は含まれない。light テーマ progress bar (full) が描画される

#### Scenario: 取得失敗時の fallback
- **WHEN** 予約詳細画面で予約埋まり具合の取得のみ失敗
- **THEN** 「予約状況」セクションの値部分は `—` で fallback され、Meta テーブル / Cancel Policy / イベント基本情報の描画は通常通り継続される。チップ個別の retry ボタンは描画されない

#### Scenario: 自分視点の補足文言は付与されない
- **WHEN** 予約詳細画面の予約状況セクションの DOM 全体を確認（capacity NULL / 残あり / 満員いずれの状態でも）
- **THEN** 「（あなたを含む）」「あなた」等の自分視点補足は描画されない

#### Scenario: セクション配置
- **WHEN** 予約詳細画面の DOM 上での要素順序を確認
- **THEN** Meta テーブル → 予約状況セクション → Cancel Policy ボックス の順で並ぶ
