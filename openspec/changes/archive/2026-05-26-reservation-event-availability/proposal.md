## Why

会員サイトのイベント一覧 / 詳細では、現状「予約がどれくらい埋まっているか」を会員が知る手段がない。MVP1 では残席数表示をスコープオフしていたが、会員が予約判断する際に「あと何人入れるのか / 自分以外に誰か来るのか」が見えないと心理的ハードルが高い（特に capacity 未設定でも「誰も来ない練習」という不安は残る）。admin 側 (`admin-event-detail`) には既に確立した動的表記パターンがあり、これを会員向け文言にローカライズして同じ集計値を表示することで、追加コスト最小で予約前判断材料を提供できる。

## What Changes

- 会員サイトのイベント一覧（「他のイベント」セクションの各行）に、予約埋まり具合のチップを 1 つ表示
  - `capacity` 未設定（MVP1 既定）: 「N 名 予約中」
  - `capacity` あり: 「あと N 名 募集」
  - 満員 (`booked >= capacity`): 「満員」表記 + そのイベント行は予約導線が disabled になることを視覚的に示唆
- 会員サイトのイベント詳細の主要情報セクション（Date / Time / Venue / Fee 並び）に、同じ表記の行を追加
- 満員時はイベント詳細の「予約に進む」CTA を disabled + 「予約締切」表示に切り替え
- 「席」という語は使わない（会場物理席との混同回避、参考デザイン B 案の指針に従う）
- NEXT カードには予約埋まり具合を表示しない（NEXT は会員自身が予約済みのイベントなので、表示意義が薄い）
- 4 状態（Loading / Empty / Error / Success）の UI を整理:
  - Loading: チップ位置に細い shimmer プレースホルダ
  - Error: 一覧 / 詳細の主データは表示継続、チップだけ控えめな fallback（数値の代わりに `—`）。再読込は既存の全体 retry に乗せる（チップ個別 retry は設けない）
  - Empty (予約 0 件): 「0 名 予約中」と素直に表示。煽り CTA は設けない
- 会員向けに予約集計のみを返す DB ビュー（個人情報を含まない aggregate のみ）を新設し、`SECURITY DEFINER` で安全に全件集計を会員へ開示
- `reservation-events-and-booking` capability のスコープオフ記述および「他のイベントにバッジが表示されない」シナリオを、本変更内容に合わせて書き換え（残席数表示と満員表示は scope-in、経験レベルバッジは引き続き scope-off）

### Propose で疑った UI/UX 論点（採否を翔太郎くんに確認したい）

- **チップ単独で出す（プログレスバー併用しない）**: 当面 capacity NULL 一辺倒のためバーは描画意義が薄く、行内ノイズが増えるだけ。capacity 入力 UI 復活（admin-events-crud 拡張）時に追加するのを提案
- **詳細画面は facts grid 内に 1 行追加する方式**: 参考 jsx の VARIANT a 相当。ヒーロー扱い (variant c) や専用バーセクション (variant b) は capacity NULL 時に情報過少 / 過剰演出になる
- **「一番乗りになろう」CTA は採用しない**: 会員視点では押し売り感が出やすい。0 名は 0 名として素直に出す
- **チップ個別の再読込ボタンは作らない**: 会員サイトには既に一覧 / 詳細の retry 導線がある。重複させない

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `reservation-events-and-booking`: 一覧行 / 詳細画面 / 4 状態 / 自動テストカバレッジ要件に「予約埋まり具合」表示を追加。スコープオフ記述（満員 / 残席数の非描画）を撤回し、経験レベルバッジのみ scope-off として残す。詳細画面の「予約に進む」CTA に満員時の disabled 挙動を追加
- `data-schema`: 会員向け予約集計ビュー（個人情報を含まない aggregate）を `SECURITY DEFINER` で追加。`event_list_view` / `event_detail_view` の `reserved_count` は admin 専用契約のまま変更しない
- `rls-policies`: 新ビューへの authenticated GRANT と、関数所有者経由で `reservations` を集計する経路を許可

## Impact

- **コード**:
  - `apps/reservation/src/features/event-listing/` (一覧行 / コンポーザブル)
  - `apps/reservation/src/features/event-detail/` (詳細画面 facts grid / sticky CTA)
  - `apps/reservation/src/entities/event/` (型に予約数フィールド追加 / 一覧・詳細クエリ拡張)
- **DB**:
  - 会員向け予約集計ビューの新設 migration（aggregate only）
  - 既存 `event_list_view` / `event_detail_view` には触らない（admin 契約維持）
- **依存**:
  - admin-events-crud (#86) の capacity 入力 UI とは独立。capacity NULL でも価値が出るスコープで完結
  - キャンセル待ち管理 (#154) とは別レイヤー（満員時は本変更で「予約締切」を出すのみ、待ち登録導線は設けない）
- **テスト**:
  - component test を新規 / 既存 spec ファイルに追加
  - E2E は `apps/reservation` に未整備（#201 で別途扱う）
