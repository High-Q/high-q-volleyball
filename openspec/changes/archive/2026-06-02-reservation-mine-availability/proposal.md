Issue: #305

## Why

前回 change (`reservation-event-availability`) で NEXT カードと予約詳細画面には「予約埋まり具合を出さない」と決めたが、翔太郎くんがその判断を反転したい意図を表明した（参考デザイン `予約中UI/hq-availability.jsx` の `ReservedHero` + `ReservedDetailScreen` で明示的に予約状況 strip を盛り込んでいる）。前回 D6 で「予約判断には使われないから出さない」と書いたが、改めて考えると会員にとっての価値は「予約判断材料」だけではなく「自分以外に何人来るのか / コミュニティの賑わい」が見えることで、参加モチベーションと安心感が上がる UX 効果がある。とりわけ参加者の多くが過去に参加経験のある常連の場合、「14 名 予約中」が見えるだけで「賑やかになりそう」というポジティブなシグナルになる。

加えて、現状 NEXT カードはイベント名 / 日時 / 会場 / 予約番号 / カウントダウンしか出ておらず情報量がやや薄く、「予約済の高揚感」を表現する要素を 1 つ足したい意図とも合致する。

## What Changes

- **NEXT カード**（黒地ヒーローカード）下端に予約埋まり具合の strip を追加
  - `capacity = NULL`: 「N 名 予約中」 + 右側に `UNCAPPED` モノラベル
  - `capacity` あり残あり: 「あと N 名 募集（定員 cap）」 + 黒地用 progress bar
  - 満員（`capacity` ありかつ booked >= capacity）: 「満員 · 予約締切」 + 黒地用 progress bar (full)
- **予約詳細画面**（`/reservations/:reservationId`）に「予約状況」セクションを追加
  - `capacity = NULL`: 「N 名 予約中」
  - `capacity` あり残あり: 「あと N 名 募集（定員 cap）」 + light 用 progress bar
  - 満員: 「booked / cap 名」（自分は既に予約済みなので「予約締切」とは表現しない、ただ事実として満員）
- イベント一覧 / 詳細 / NEXT カード / 予約詳細画面のすべての画面で文言を一貫させる（「あなたを含む」のような自分視点補足は付与しない）
- 黒地でのコントラストを確保するため `design-tokens` に dark トーン色 3 段階（`successOnDark` / `warnOnDark` / `dangerOnDark`）を追加
- 「他のイベント」リストの自分予約混在表示（`MineBadge` 等）は本変更スコープ外。前回 change で確立した「NEXT カードに上がっているイベントを他のイベントから除外する」設計を維持

### Propose で疑った UI/UX 論点

- **自分視点の補足文言（「あなたを含む」等）は付与しない**: 自分が予約済であることは画面コンテキスト（NEXT カード / 予約詳細画面）で自明。文言で明示すると冗長で視覚密度も上がる。イベント一覧 / 詳細と完全同一の表記に統一することで、UI 全体の一貫性も得られる
- **NEXT カードに progress bar 自体を表示するのは capacity あり時のみ**: capacity NULL では bar が意味を持たないので、代わりに `UNCAPPED` モノラベルで「上限なし」を視覚的に伝える
- **MineBadge（参考 jsx の自分予約マーカー）は採用しない**: 「他のイベント」リストに自分の予約を混在させる設計に踏み込むことになり、前回 change の「NEXT は除外」設計を破る。前回維持で OK
- **満員時の予約詳細画面で「予約締切」とは書かない**: 詳細画面は自分が既に予約済の状態で開かれる場面。「予約締切」は他人視点の表現で会員視点では違和感がある。「booked / cap 名」と中立的に出す

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `reservation-events-and-booking`: 前回追加した「予約埋まり具合の表示」要件のうち NEXT カード非描画ルールを反転し、NEXT カードでも strip 形式で表示する規定を追加
- `reservation-detail-page`: 予約詳細画面に「予約状況」セクション要件を追加
- `design-tokens`: トークンカテゴリ要件のカラーリストに dark トーン 3 個（`successOnDark` / `warnOnDark` / `dangerOnDark`）を追加

## Impact

- **コード**:
  - `apps/reservation/src/widgets/home-next-card/ui/HomeNextCard.vue`
  - `apps/reservation/src/widgets/reservation-detail-card/` 配下（既存予約詳細レンダリング箇所）
  - `apps/reservation/src/entities/reservation/`（型に availability 追加 + API 拡張）
  - `apps/reservation/src/shared/ui/AvailabilityStrip.vue`（NEXT 用、新規）または既存 `AvailabilityChip` の variant 拡張で対応
- **DB**:
  - 新規 migration なし。既存 `event_availability_view` をそのまま再利用
- **デザイントークン**:
  - `packages/design-tokens/src/index.ts` にカラー 3 個追加 → `tokens.css` 自動生成
  - `packages/tailwind-preset` 経由で `text-success-on-dark` 等が自動 export
- **依存**:
  - 前回 change `reservation-event-availability` 実装に依存（`event_availability_view`、`formatAvailability` 関数、`EventAvailability` 型）
- **テスト**:
  - HomeNextCard.spec / 予約詳細画面 spec / 新規 strip コンポーネント spec
