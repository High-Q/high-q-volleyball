## Context

前回 change `reservation-event-availability` で会員サイトのイベント一覧 / 詳細に予約埋まり具合チップを実装したが、NEXT カードと予約詳細画面（自分の予約に関する画面）は明示的に対象外とした (前回 D6)。本変更でこの対象外決定を反転する。技術基盤（`event_availability_view`、`formatAvailability` 関数、`EventAvailability` 型）は既に整っており、本変更は UI レイヤーと「自分の予約」型への availability merge の拡張が中心となる。

参考デザイン `/Users/mshotaro/Downloads/予約中UI/hq-availability.jsx` で:
- `ReservedHero` (NEXT カード) は黒地ヒーローレイアウトの下端に border-top 区切りの availability strip を持つ
- `ReservedDetailScreen` (予約詳細画面) は facts grid の下に独立した「予約状況」セクションを持つ

参考 jsx は capacity NULL 時に「N 名 予約中（あなたを含む）」と自分視点補足を入れているが、本変更ではこれを採用しない（D2 参照）。

## Goals / Non-Goals

**Goals:**
- NEXT カードに予約埋まり具合 strip を黒地ヒーローカードの一部として統合
- 予約詳細画面に「予約状況」セクションを追加し、自分を含む人数を会員に明示
- 既存 `event_availability_view` を再利用し、DB 変更を行わない
- 黒地でのコントラスト基準（WCAG 2.1 AA）を満たす dark トーンを HQ デザイントークンとして提供

**Non-Goals:**
- 「他のイベント」リストへの自分予約混在表示（`MineBadge`）— 前回 change の「NEXT は除外」設計を維持
- 予約済イベントへの満員時の「予約締切」表記 — 自分が予約してる文脈で他人視点表記は違和感あり
- 予約履歴一覧（`HistoryPage` の過去予約）への availability 表示 — 過去イベントの埋まり具合は会員にとって価値が薄い
- DB マイグレーション — 既存 view を再利用

## Decisions

### D1. NEXT カード: strip を黒地ヒーロー内に統合（独立コンポーネントとして抽出）

**Decision**: 新規共通コンポーネント `AvailabilityStrip.vue` を `apps/reservation/src/shared/ui/` に追加する。NEXT カード（黒地）と予約詳細画面（light）の両方で再利用できるよう `variant: "dark" | "light"` props で切り替える。

**Why**:
- `AvailabilityChip` (前回 change で実装) は inline 文言だけだが、strip は dot + 文言 + progress bar の 3 要素を border-top で区切られた行として配置する別レイアウト
- Chip と Strip は文言ロジックは共有（`formatAvailability` 関数）するが、視覚レイアウトは別物
- variant prop で dark / light のテーマ切替を 1 コンポーネントに集約することで、NEXT カードと予約詳細画面で文言ルールの drift を防ぐ

**Alternatives considered**:
- (a) `AvailabilityChip` に `variant: "chip" | "strip"` を追加 → 単一コンポーネントが過剰責務になり、テンプレートが分岐だらけで保守困難。NG
- (b) HomeNextCard.vue 内に strip をインライン実装 → コードが膨れ、予約詳細画面と二重実装になる。NG

### D2. 自分視点の補足文言（「あなたを含む」等）は採用しない

**Decision**: NEXT カード strip / 予約詳細画面の「予約状況」セクションともに、文言は「N 名 予約中」「あと N 名 募集（定員 cap）」「booked / cap 名」とし、自分視点の補足（「（あなたを含む）」等）は MUST NOT 付与する。イベント一覧 / 詳細と完全同一の表記に統一する。

**Why**:
- 自分が予約済であることは画面コンテキスト（NEXT カード / 予約詳細画面）で自明。文言で明示すると冗長
- 全画面で文言ロジック (`formatAvailability`) を共有でき、コード分岐が減る
- 視覚密度を上げないことが NEXT カードの hero レイアウトと相性が良い
- 参考デザイン jsx の「（あなたを含む）」は採用見送り（翔太郎くんレビューで撤回）

**Trade-off**:
- 「N 名」に自分が含まれているかを会員が瞬時に判断できない可能性 → 画面コンテキスト（自分の予約に関する画面である）で補完されるため許容

### D3. NEXT カードでは progress bar を capacity あり時のみ表示、NULL 時は UNCAPPED ラベル

**Decision**: NEXT カード strip では `capacity = NULL` の時は progress bar を描画せず、代わりに `UNCAPPED` のモノスペースラベルを右端に表示する。capacity あり時は黒地用 progress bar (`ABarDark` 相当) を右端に表示。

**Why**:
- capacity NULL では bar が意味を持たない
- 「定員上限なし」という事実を明示することで「N 名 予約中」と並べた時の情報補完になる（あと何人入るかは未定 = いくらでも参加歓迎の signal）
- 予約詳細画面でも同じパターンを採用するが、light テーマで「UNCAPPED · 定員上限なし」とより親しみやすい表記にする

### D4. 予約詳細画面の「予約状況」セクションは facts grid の **下**、紹介文の **上** に配置

**Decision**: facts grid（Date / Time / Venue / Fee）の直下に「予約状況」セクションを差し込み、紹介文（イベント説明）はその下とする。

**Why**:
- facts grid は「いつ / どこで / いくら」の客観情報。予約状況は「誰が来るか」のコミュニティ情報。情報階層として facts → community → narrative の順が自然
- 予約状況を画面最上部（黒地ヒーロー内）に出すと NEXT カードと重複し、詳細画面の独自情報差分（集合場所、紹介文）が薄まる
- 参考デザイン jsx と同配置

### D5. 黒地用 dark トーンを design-tokens に追加

**Decision**: `packages/design-tokens/src/index.ts` の color object に以下 3 個を追加:
- `successOnDark: "#a8c08a"` (sage 系、黒地でも識別可能な明度)
- `warnOnDark: "#d9a76a"` (橙、黒地で映える)
- `dangerOnDark: "#e08672"` (赤、黒地で識別可能)

**Why**:
- 既存 `success: "#6b7e4f"` / `warn: "#d4a04a"` / `danger: "#9c4030"` は light 背景前提で彩度・明度が抑えめ。黒地に乗せるとコントラストが不足し WCAG AA を満たさない
- 参考デザイン jsx の DARK_OK / DARK_WARN / DARK_FULL の値をそのまま採用（jsx の設計者が黒地での視認性を検討済み）
- 命名は `<base>OnDark` 形式で「どの背景前提の色か」を明示。将来の dark-mode 全体導入時にも整合する

**Alternatives considered**:
- (a) 黒地で既存 success / warn / danger を直接使う → コントラスト不足、AA 不適合
- (b) opacity だけで明るくする (`rgba(107,126,79,0.85)` 等) → 黒地で colored mix になり別色に見える、計算困難
- (c) dark トーンを別パッケージに切り出す → MVP1 段階で over-engineering

### D6. entities/reservation の型に availability を merge する取得層拡張

**Decision**: `MyReservationItem` / `MyReservationDetail` の `event` フィールドに `availability: EventAvailability | null` を追加し、`fetchMyReservations` / `fetchMyReservation` 内で `event_availability_view` から in-list / 単一取得して merge する。前回 change の `event-client.ts` で確立したパターンを踏襲。

**Why**:
- NEXT カードと予約詳細画面の取得経路は `reservations × events × venues` の JOIN がベース。ここに `event_availability_view` の集計を別クエリで取得して merge する方が JOIN の複雑化より保守的
- availability 取得失敗時は `null` で fallback、主データの描画は継続（前回 change と同じエラー方針）

### D7. テスト戦略

- `apps/reservation/src/shared/ui/AvailabilityStrip.spec.ts` を新規追加（5 ケース: capacity NULL / capacity あり / 満員 / availability=null fallback / variant=dark/light）
- `HomeNextCard.spec.ts` に予約埋まり具合 strip 描画 4 ケース追加
- `widgets/reservation-detail-card/` 既存 spec に「予約状況」セクション描画 4 ケース追加
- `entities/reservation/api/myReservations.spec.ts` / `myReservation.spec.ts` に availability merge 動作の確認ケースを追加

## Risks / Trade-offs

- **[前回 D6 決定の反転による設計一貫性懸念]** → 前回 D6 の「情報過多」の懸念は、「（あなたを含む）」明示と strip 配置（hero 下端の独立行）で構造的に分離することで緩和。情報過多の判断は実機目視で再確認
- **[dark トーン追加による design-tokens spec の MODIFY]** → カラーリストに 3 個追加だけなのでマイグレーションリスクは低い。既存 utility 名と衝突しないことを `packages/tailwind-preset/src/index.test.ts` で検証
- **[NEXT カード hero 内に情報を盛り込みすぎて重く見える可能性]** → strip を 1 行（dot + 文言 + bar / UNCAPPED）に絞ることで視覚密度をコントロール。フォントサイズ / 行高は参考 jsx の値を踏襲
- **[全画面で文言統一する結果、自分が N 名に含まれているか不明瞭な可能性]** → 画面コンテキストで補完される前提（NEXT カード / 予約詳細画面は自分の予約に関する画面）。実機目視で違和感あれば再検討

## Migration Plan

DB マイグレーション不要のため、ロールバックは UI コードの revert のみで完結。design tokens 追加もカラー 3 個追加であり、既存利用箇所への影響なし（追加した色を誰も使わなければ無害）。

## Open Questions

- AvailabilityStrip の variant 名は `"dark" | "light"` で十分か、または `"on-dark" | "on-light"` の方が意図明示的か → tasks.md 着手時に確定
- 予約詳細画面の「予約状況」セクションラベルは「予約状況」固定で良いか、capacity 状態に応じて「予約状況 / あと何名 / 満員」と動的切替するか → 参考デザイン jsx は動的切替パターン。これに従う

## 翔太郎くんレビューによる修正履歴

- 初稿 D2「『あなたを含む』は capacity NULL のときだけ付与」→ 撤回。全状態で自分視点の補足文言を付与しない方針に変更。理由: 自分が予約済であることは画面コンテキストで自明、文言で明示すると冗長、全画面で文言統一できる
