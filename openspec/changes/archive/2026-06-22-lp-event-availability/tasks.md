## 1. データ公開（migration）

- [x] 1.1 `supabase/migrations/` に `event_availability_view` へ anon の SELECT を付与する migration を追加（`grant select on public.event_availability_view to anon`）。ファイル冒頭に `-- ROLLBACK: revoke select on public.event_availability_view from anon;` を明記する
- [x] 1.2 dev に適用（`supabase db push` をレムが実行）し、`supabase db query --linked` で anon ロールが当該 view を SELECT できること・列が `event_id, capacity, reserved_count` のみであることを確認
  - 注: dev は別ブランチ進行中の migration `20260622000000` が先行しており `db push` は履歴差異で停止。`migration repair` は並列作業を壊すため避け、GRANT を `db query --linked --file` で直接適用して検証（`has_table_privilege('anon',...,'SELECT')=true` / 列=集計3列）。migration ファイルは prd 向け正本として CI で適用される

## 2. LP データ取得層（entities/event）

- [x] 2.1 `apps/lp/src/entities/event/model/` に残席集計の型（`event_id` / `capacity: number | null` / `reserved_count: number`）を追加
- [x] 2.2 `apps/lp/src/entities/event/api/` に、表示対象イベント ID 群を受け取り `event_availability_view` から残席集計マップ（ID → 集計）を取得する関数を追加。予約サイトの残席マップ取得と同じ構造を踏襲し、取得列は集計3列のみに限定する。**先にテストを書く（TDD）**: クエリ列・フィルタ・失敗時の戻りを検証
- [x] 2.3 `apps/lp/src/entities/event/` の Public API（`index.ts`）に 2.1 / 2.2 を公開

## 3. 残席表現ロジック（entities/event/lib）

- [x] 3.1 `apps/lp/src/entities/event/lib/format-availability.ts` を追加。予約サイトの規則に**完全準拠**する（募集中「あと N 名 募集」/ 満員「満員」/ 無制限「N 名 予約中」/「席」表記禁止 / 80% 以上で警告トーン）。LP 固有分岐は設けない。**先にテストを書く（TDD）**: 募集中・満員・無制限・取得失敗（集計欠落）の各入力に対する出力を固定

## 4. LP イベント一覧への表示（widgets/event-list）

- [x] 4.1 `apps/lp/src/widgets/event-list/model/useEventList.ts` で、イベント取得に加えて 2.2 の残席マップを取得し、各イベントへ 3.1 の残席表現を合成する。残席取得失敗時は当該イベントの残席を伏せ、一覧全体は Error にしない（グレースフル劣化）
- [x] 4.2 `apps/lp/src/widgets/event-list/ui/EventList.vue` に残席バッジを追加（募集中=OK/警告トーン、満員=満員トーン）。デザイントークン経由で着色し、マジックナンバー・生 hex を使わない
- [x] 4.3 満員イベントの CTA を、キャンセル待ちへ向かうことが分かる文言に切り替える（遷移先は当該イベントの予約サイト URL を維持）。無制限・募集中イベントの CTA は従来どおり

## 6. HERO 直下の次回開催ストリップ（widgets/next-session-strip）

- [x] 6.1 `apps/lp/src/widgets/next-session-strip/model/useNextSession.ts` で、直近イベントの id から 2.2 の残席集計を取得し、3.1 の残席表現を合成して返す。取得失敗時はストリップの残席を伏せ、帯自体は通常表示（グレースフル劣化）
- [x] 6.2 `apps/lp/src/widgets/next-session-strip/ui/NextSessionStrip.vue` に残席バッジを追加（ダーク帯背景のため on-dark トークンで着色）。満員時は CTA を「キャンセル待ち」へ切替

## 5. 仕上げ確認（最終タスクでまとめて実行）

- [x] 5.1 `pnpm exec vitest run` で 2.2 / 3.1 のロジックテストと既存テストが緑であることを確認
- [x] 5.2 `pnpm build:lp` でビルドが通ることを確認
- [x] 5.3 dev でローカル動作確認（`pnpm dev:lp --port 5275`）: Loading / Empty / Error / Success の4状態、募集中・満員・無制限の各イベント表示（一覧＋HERO 下ストリップ両方）、残席取得失敗時のグレースフル劣化、モバイル表示、コントラスト（AA）を探索的に確認
- [x] 5.4 `apps/lp` に対し残席ビューの参照が集計列のみであることを grep で確認（個人情報列を取得していない）
