## Context

会員サイト (`apps/reservation`) のイベント一覧 / 詳細では、現状予約状況が一切見えない。MVP1 当初は残席数表示を意図的にスコープオフしていたが、Issue #277 で「会員が予約判断する材料がない」課題が顕在化した。一方で admin 側 (`admin-event-detail`) には `event_detail_view` v3 で確立した「人数（本人+同伴）ベース集計」のパターンが既にあり、`event_list_view` も `reserved_count` を含む。これら admin 用 view は `SECURITY INVOKER` で作成されており、非 admin ロールが呼ぶと `reservations` の RLS（`auth.uid() = member_id OR is_admin()`）が評価され、**自分の予約しか COUNT されない**。会員に全件集計を見せるには、admin view をそのまま流用できない。

参考デザイン `/Users/mshotaro/Downloads/予約枠UI/hq-availability.jsx` で 3 つの文言アプローチ × 3 つの capacity 状態 × 4 状態 UI を比較済みで、B 案「動詞型: 予約中 / あと N 名 募集」が CHOSEN として明示されている。

## Goals / Non-Goals

**Goals:**
- 会員が一覧 / 詳細を見た時点で「あと何名募集中か / 何名予約中か」を把握できる
- admin と同じ集計ロジック（人数ベース、本人 + 同伴）を共有し、表記だけ会員向け文言にローカライズ
- capacity NULL / capacity あり / 満員 の 3 ケースを単一の表現体系でカバー
- 4 状態（Loading / Empty / Error / Success）を漏れなく実装
- 個人情報（誰が予約したか）は会員に漏らさない（aggregate のみ開示）

**Non-Goals:**
- admin-events-crud の capacity 入力 UI 拡張（別 Issue）。本変更は capacity NULL のまま価値が出る設計とする
- キャンセル待ち登録導線（#154）。本変更は満員時に CTA を disabled にして「予約締切」を出すだけ
- NEXT カード（自分の次回予約）への適用。NEXT は会員自身が予約済みなので埋まり具合の意味が薄い
- `apps/reservation` の E2E 整備（#201 で別途）
- 経験レベルバッジ表示の復活（MVP1 scope-off のまま）

## Decisions

### D1. データ取得: 会員向け aggregate-only view を新設する

**Decision**: `event_availability_view`（仮称、tasks.md で確定）を新設し、`SECURITY DEFINER` + 関数所有者が `reservations` を全件集計できる構造で実装する。返す列は集計のみで、個人情報は含めない。

**Why**:
- 既存 `event_list_view` / `event_detail_view` は `SECURITY INVOKER` で、admin 専用契約（`rls-policies/spec.md:214-216`）。流用すると会員のセルフカウントになる
- `reservations` の SELECT RLS を緩めて全件公開すると、会員 ID が露出する（プライバシー違反）
- view を `SECURITY DEFINER` にしつつ、列を `(event_id, reserved_count)` のような集計のみに絞れば、個人情報を漏らさず全件 COUNT を会員へ開示できる
- 既存 admin view を改造して列追加するより、用途別 view 分離のほうが契約境界が明確

**Alternatives considered**:
- (a) `event_list_view` / `event_detail_view` を `SECURITY DEFINER` に変える → admin と会員でクエリは共有できるが、view 全列に対する権限漏れリスクが大きい（columns に予約者 ID 等が間接的に紐づく将来拡張で漏れる）。NG
- (b) `reservations` の SELECT RLS を緩める → 会員 ID が漏れる。NG
- (c) `events` テーブルに `reserved_count` カラム + trigger 同期 → 書き込みコストと整合性リスクが上がり、ロールバック容易性も下がる。NG
- (d) Edge Function で集計してから返す → 既存パターン (admin view) から逸脱し、保守コスト増。view で解決できる以上採用しない

**集計ロジック**:
admin の `event_detail_view` v3 と同じく `SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))` を採用。チェックイン操作で人数が減らないこと、cancelled は除外することを共有する。

### D2. 表示文言: 参考デザイン B 案を採用

| capacity 状態 | 一覧チップ | 詳細 facts grid 行 | 詳細 CTA |
|---|---|---|---|
| `capacity = NULL` | `N 名 予約中` | 「Booked / N 名 予約中」 | 通常「予約に進む」 |
| `capacity` あり (残あり) | `あと N 名 募集` | 「Remain / あと N 名 募集（定員 cap）」 | 通常「予約に進む」 |
| 満員 (`booked >= cap`) | `満員` | 「Status / 満員 · 予約締切」 | disabled「予約締切」 |

**Why**:
- 「席」を回避し物理席との混同を避ける（issue で論点になっていた）
- 動詞型文言「予約中 / 募集」が静的な数字より状況が伝わる
- admin（StatCard で「予約数 / 残席」）と表記は分かれるが、読み手（運営者 vs 会員）が違うので OK
- 詳細 facts grid 行に追加する方式は jsx VARIANT a 相当。ヒーロー扱い (c) は capacity NULL 時に大味、専用バーセクション (b) は capacity NULL のとき情報過少

### D3. プログレスバーを描画しない（当面）

**Decision**: 一覧チップ・詳細行ともに、プログレスバーは描画しない。

**Why**:
- 当面全イベント `capacity = NULL`（admin-events-crud の capacity 入力 UI が未提供）であり、バーが意味を持たない
- capacity 入力 UI 復活時にバーを追加する余地は残す（型 / view 側は `capacity` を返す設計にしておく）

### D4. 一覧チップは EventRow 内に 1 つだけ配置、参加費の左隣

**Decision**: `apps/reservation/src/features/event-listing/ui/EventRow.vue` の最下段（時刻 + 参加費 の行）にチップを追加する。レイアウト構造は変えず、参加費との視覚的バランスを維持。

### D5. 詳細画面は facts grid に 1 行追加（VARIANT a 相当）

**Decision**: `apps/reservation/src/features/event-detail/ui/EventInfoBlock.vue` の Date / Time / Venue / Fee 並びに、capacity 状態で動的にラベル / 値が変わる 1 行を追加する。満員時は `tone` を変えて視覚的に強調する。

### D6. NEXT カードには適用しない

**Decision**: `apps/reservation/src/features/next-reservation/`（NEXT カード）には予約埋まり具合を描画しない。

**Why**: NEXT は会員自身が既に予約済みのイベント。「自分が予約済みかつ全体 N 名予約中」の情報を出しても、予約判断に使われない。情報過多を避ける。

### D7. 4 状態 UI の実装方針

- **Loading**: チップ位置に `width: 42px` 程度の shimmer プレースホルダ（参考 jsx `ChipState state="loading"` 準拠）
- **Empty (0 名)**: 「0 名 予約中」と素直に表示。CTA は付けない（参考 jsx の「一番乗りになろう」は不採用 — 押し売り感）
- **Error**: 一覧 / 詳細の主データは表示継続、チップだけ控えめな `—` で fallback。チップ個別 retry は設けない（一覧 / 詳細の既存 retry に乗せる）
- **Success**: 通常表示

### D8. 「予約に進む」CTA の disabled 化

**Decision**: 満員時のみ、詳細画面の sticky CTA を disabled + 「予約締切」ラベルに切り替える。capacity NULL 時は常に enabled。

**Why**: capacity NULL は「満員」状態が存在しないため、現行 CTA 挙動を維持。capacity あり時のみ満員概念が成立。

### D9. テスト戦略

- `apps/reservation` には Playwright E2E 環境が未整備（#201 で別途整備）。本変更は component test（Vitest + @vue/test-utils）で代替する
- 新規追加するチップコンポーネントを `apps/reservation/src/shared/ui/` に切り出し、capacity NULL / capacity あり / 満員 / loading / error の 5 ケースで spec を書く
- `EventRow.spec.ts` の「残席数バッジが描画されない」テスト（spec.md:54-62）は本変更で逆向きに書き換え（チップが描画されることをアサート、ただし経験レベルバッジは引き続き不描画）

## Risks / Trade-offs

- **[新 view の SECURITY DEFINER に伴う権限漏れリスク]** → 列を集計のみ `(event_id, reserved_count, capacity)` に限定し、`reservations` 個別行を返さない設計で多層防御。GRANT は authenticated のみ、anon は revoke
- **[admin view との集計ロジック二重管理]** → 関数化（`reserved_headcount(event_id)`）して view 間で共有することも検討したが、現状 admin view にインライン化されているため対称的にインライン化で良い。乖離検知は単体テストで `event_detail_view.reserved_count` と `event_availability_view.reserved_count` の同値性を assertion
- **[satisfaction: 会員が予約直後に表示が変わらない可能性]** → 既存 `reservation-booking-flow` の予約確定後に一覧 / 詳細を refetch する経路があるか確認が必要（tasks.md で調査タスクを立てる）
- **[NEXT カードに出さないことの違和感]** → 出さない理由を Empty state コピーで補完しない（無音の方が自然）。リスク低
- **[render 切替時の DB migration 反映]** → 既存パターン通り `supabase db push` で dev → prd に手動 sync（memory: prd Supabase 切替時は Edge Function + Migration 両方を手動 sync）

## Migration Plan

1. dev DB に新 view migration を `supabase db push` で適用
2. `apps/reservation` の型 / API クライアント / UI を実装、component test 緑
3. PR 作成 → Render preview で動作確認
4. Sync / Archive コミットを同 PR に push
5. master merge → prd Supabase に migration 手動 push（memory 参照）

ロールバック: view DROP のみで型 / UI 側は graceful にエラー fallback する設計のため、UI 側 revert は不要（チップが `—` になるだけ）。

## Open Questions

- 新 view の正式名（`event_availability_view` で良いか、`event_summary_view` のほうが将来拡張で意味が広いか）→ tasks.md で確定
- 一覧チップの満員時、行全体を視覚的に dim する（hover / 押下無効ではなく見た目だけ薄く）か → 参考 jsx は行は押下可能なまま。詳細画面に到達して CTA disabled で気づく動線で OK か翔太郎くんに確認したい
- 予約確定直後の一覧 refetch ロジックが現状あるかの調査結果は Apply の最初のタスクに含める
