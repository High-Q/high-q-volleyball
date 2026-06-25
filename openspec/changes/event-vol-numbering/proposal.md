## Why

イベントの「回号」（第 N 回 / vol.N）が現状 `events.name` に手書きで埋め込まれており、機械的に扱える単一の真実が存在しない。admin には `ゆる練 vol.NN` を推測してタイトル欄に提案する best-effort 補完（`useVolumeSuggest`）があるだけで、実 prod は `第73回` / `第74回` のように手入力されている。この状態では「次の回は何番か」を確実に決められず、開催日を入れ替えたときの番号整合も人手頼みで、予約サイトで回号を視覚的に強調する（editorial 見出し）こともできない。

回号を `events.vol` という独立カラムに格上げし、開催日時順で自動採番する。**開催済みの回番号は歴史的事実として永久固定**し、**未開催の回だけ**が日付順の割り込みに応じてシフトする。これにより回号が機械可読な単一の真実になり、admin はシリーズ名だけを入力すれば番号が自動で付き、予約サイトは回号を `vol.NN` として誌面的に強調できる。

## What Changes

- **DB**: `events.vol smallint NULL` 採番カラムを追加。非 cancelled の vol に部分一意制約。
- **採番ロジック（DB 側 / 単一の真実）**: `events` の statement-level トリガで、書き込み（INSERT / DELETE / `start_at`・`status` 変更）のたびに **未開催イベントの vol だけを開催日時順で再計算**する。過去（`start_at <= now()`）は対象外＝凍結。割り込み登録・再スケジュールで以降の未開催回が自動的に +1 シフトする。
- **中止イベント**: 未開催の `status='cancelled'` は採番対象外（vol を解放し以降を詰める）。過去の中止は凍結したまま。
- **マイグレ（BREAKING / 本番データ書き換え）**: 既存 `events.name` の回号（`第N回` / `vol.NN`）をパースして `vol` へ移し、name から回号を除去する（`第74回ゆる練` → name=`ゆる練`, vol=74）。アンカーは商用最新の第73 / 第74回。
- **admin**: `useVolumeSuggest`（name 埋め込みのプレースホルダ補完）を撤去。`EventForm` はシリーズ名のみ入力し、vol は保存時に自動採番・**読み取り専用表示**にする。
- **view**: `event_list_view` / `event_detail_view` に `vol` 列を追加。予約サイトの単一取得にも vol を含める。
- **予約サイト表示**: イベント詳細のイベント名見出しを editorial 化し、`event.vol` を `vol.NN`（モノスペース・accent 色・改行）で強調。name パース版 `splitEventTitle` は廃止し vol カラム直読みに置換。

## Capabilities

### New Capabilities
- `event-vol-numbering`: `events.vol` の自動採番規則（過去凍結・未開催シフト・中止解放）、再計算を保証する DB トリガ/関数、既存データのパース移行と name 分離

### Modified Capabilities
- `data-schema`: `events.vol` カラム定義（一意制約含む）と `event_list_view` / `event_detail_view` への vol 列追加
- `admin-events-crud`: `EventForm` の回号運用を name 手入力（`ゆる練 vol.NN` 補完）から `events.vol` 自動採番 + 読み取り専用表示へ変更
- `admin-events-list`: `/events` 一覧の各行に回号 `vol.NN` を表示（`event_list_view.vol` 由来）
- `reservation-events-and-booking`: イベント詳細のイベント名見出しを `event.vol` 由来の `vol.NN` editorial 表示にし、単一取得 API に vol を含める
- `lp-calendar`: LP のイベント取得に `vol` を含め、イベントカードに回号 `vol.NN` を表示

## Impact

- **DB**: `supabase/migrations/` に新規 migration（vol カラム + 一意 index + 再採番関数 + トリガ + 既存データの backfill/name 分離）。RLS は events 既存ポリシーを継承、再採番関数は `SECURITY DEFINER` + 明示 GRANT。
- **本番影響（重大）**: 商用 prd の本番 events 行（約 74 件）の `name` を書き換え + `vol` を backfill する破壊的移行。merge → `db-push-prd` CI の承認ゲート適用前に prd フルバックアップ（schema / data / roles の 3 ファイル）を取得。migration に `-- ROLLBACK:` 手順を明記。
- **admin**: `apps/admin` の `event-form`（`useVolumeSuggest` 撤去 / vol 読み取り専用表示）、event 型、list/detail view 取得。
- **reservation**: `apps/reservation` の `EventDetail` 型 + 取得クエリに vol 追加、`EventDetailPage` の見出し、`splitEventTitle` 廃止。
- **テスト**: 採番ロジック（SQL: 凍結 / 割り込みシフト / 再スケジュール / 中止解放）、migration backfill、admin フォーム、reservation 表示。
