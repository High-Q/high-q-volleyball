## Context

LP は MVP1 時点で AWS API Gateway + DynamoDB を独自データソースとして残し、Supabase 連携を Phase 2 へ先送りしてきた（`env-management` spec §LP は env 共有スコープ外）。MVP2 入りに合わせて 3 アプリ（LP / admin / reservation）のデータ源を Supabase `events` に統一する。これは LP 刷新 (#160) で reservation サイトへの deep-link を組む際にもイベント識別子の整合性が必要になるための前提整備でもある。

現状:
- `apps/lp` は Vue 3 + Vuetify、TypeScript 未導入の **JS 主体**
- イベント取得は `apps/lp/src/entities/event/api/eventQueries.js` で `fetch()` 直叩き + DynamoDB レスポンスを `{ id, name, start, end, location }` に整形
- 利用側は `useEventCalendar.js` のみ。`calendarEvents` で `{ title, name, start, end, color, location }` に再整形してカレンダーへ流す
- admin / reservation は `@high-q/shared` の `createSupabaseClient()` を経由して Supabase に接続している
- `events` テーブルの RLS は anon 全件 SELECT を許可（`rls-policies` spec）
- LP は `envDir` 共有スコープ外 / `apps/lp/.env*` を持たない契約（`env-management` spec §LP は env 共有スコープ外）

## Goals / Non-Goals

**Goals:**
- LP からのイベント取得を Supabase `events` に切替え、admin / reservation と同一の真実の源を共有する
- LP に `shared/api/` レイヤーを正式に導入し、Supabase クライアントを単一インスタンスで提供する
- 公開向け契約として「未来イベントのみ」「`visibility = 'published'` のみ」を query 側で明示する
- 既存 `useEventCalendar.js` の interface（`{ id, name, start, end, location }`）を温存し、widgets 以上の差分をゼロにする
- AWS API Gateway 経路（Vite proxy 含む）を完全に撤去する

**Non-Goals:**
- LP UI 刷新（#160 で扱う）
- イベント一覧以外の Supabase 連携（会員機能・予約は LP では扱わない）
- AWS DynamoDB に残る既存データの Supabase 移行（別 Issue D）
- AWS Lambda / DynamoDB / API Gateway リソースの削除判断
- TypeScript 全面導入（LP は JS のまま、`@high-q/shared` 経由で型は享受する）

## Decisions

### D1. Supabase クライアントは `@high-q/shared` 経由で取得（独自実装しない）

`apps/lp/src/shared/api/supabase.js` を新設し、内部で `@high-q/shared` の `createSupabaseClient()` を 1 回だけ呼ぶ薄いシングルトンとする。admin / reservation の `supabase.ts` と同じパターン。

**Why**: env バリデーション・キー名・E2E `*.invalid` 対応など、共通仕様を packages/shared が既に保有しているため再実装しない。

**Alternative considered**:
- LP 内に `@supabase/supabase-js` を直接呼ぶ実装 → env バリデーションが二重化し、`VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` のキー名表記揺れリスクが生じる。却下。

### D2. LP は JS のまま、ファイル拡張子は `.js`

Issue 本文は `supabaseClient.ts` と書いているが、LP は TS 設定を持たず（`tsconfig.json` なし、すべて `.vue` / `.js`）、ここだけ `.ts` を入れると Vite / ESLint / Vitest の追加設定が必要になる。

**Why**: 1 ファイルのために型基盤を導入するのは過剰。`@high-q/shared` 側が TS で書かれているため、型補完は consumer 側で `// @ts-check` か JSDoc を必要に応じて入れれば享受できる（本 change では JSDoc は最小限）。

**Alternative considered**:
- LP に TS を部分導入する → `typescript-baseline` spec の影響範囲を広げる別議論になる。本 change のスコープを越える。却下。

### D3. クエリは「未来イベント × published」を Supabase 側で絞り込み、`venues` を join して `location` を取り出す

```
supabase
  .from('events')
  .select('id, name, start_at, end_at, venues:venue_id ( name )')
  .eq('visibility', 'published')
  .gte('start_at', new Date().toISOString())
  .order('start_at', { ascending: true })
```

返り値を以下の shape に正規化して既存 consumer と互換にする:
```
{ id, name, start: Date, end: Date, location: string }
```

`location` は `row.venues?.name ?? ''`。RLS 上は anon でも `venues.name` まで SELECT 可能（`rls-policies` spec、venues は anon 含めて全件 SELECT 可）。

**Why**:
- 「未来イベント中心」「公開のみ」の絞り込みを **DB レイヤで明示**することで、過剰取得・private 漏洩のリスクを設計時点で潰す
- `location` は DynamoDB 時代の text 列を踏襲。`venues` join で同等の文字列を出す（DB 正規化の利点を享受）

**Alternative considered**:
- クライアント側で全件取得 → JS で filter / sort → ペイロード増・将来イベント数が増えた時の劣化要因。却下。
- `event_list_view` を使う → このビューは admin 向け契約で `SECURITY INVOKER` かつ anon SELECT 権限なし（`rls-policies` spec §179）。LP では使えない。却下。

### D4. エラー処理：CORS フォールバックの `return []` は廃止し、Supabase エラーは throw して TanStack Query の `isError` に乗せる

DynamoDB 時代は AWS API Gateway の CORS / プレビュー環境ドメイン未許可で fetch が落ちる事案があり、空配列で代替していた。Supabase 化後は CORS が原因で落ちることはなく、落ちた場合は**真にエラー**なので `useEventCalendar` の `isError → v-alert` 経路に乗せて利用者へ可視化する。

**Why**:
- 「エラーを握り潰して空状態と区別不能にする」のは UX 上の負債。Loading / Empty / Error の 3 状態を分けることが `lp-calendar` spec の要件
- Supabase クライアントは CORS 例外を投げず、`.select()` が `{ data, error }` を返す。`error` が truthy なら `throw new Error(error.message)` する

### D5. テストは Supabase builder の mock で行う（admin/reservation 既存パターン）

`vi.mock('@shared/api')` で `getSupabase` を差し替え、`from().select().eq().gte().order()` の builder チェーンを `vi.fn().mockReturnThis()` で組み立てる。admin の `eventDetailQueries.spec.ts` と同じパターン。

**Why**:
- MSW + 実クライアントを使う案は env stubbing（`VITE_SUPABASE_URL` が `https://*.supabase.co|*.invalid` の正規表現を通る）と timing 制約があり、テストごとに env を切替える保守コストが高い
- 本変更の検証対象は「正しい query DSL（テーブル名・select 列・visibility=published・start_at>=now・order）」であり、builder mock は呼び出し引数を直接 assert できるためむしろ意図に忠実
- admin / reservation で確立済のパターンを 3 アプリで揃え、認知コストを増やさない

カバレッジ:
- Success（1 件以上の published 未来イベントが返る → shape 整形）
- Empty（0 件 → 空配列を返す）
- Error（Supabase が `error` を返す → throw）
- Query 契約（`from('events')` / select に id/name/start_at/end_at/venues join / `eq('visibility','published')` / `gte('start_at', ISO)` / `order('start_at', {ascending:true})`）

### D6. `env-management` spec の「LP は env 共有スコープ外」条項を削除し、LP も envDir に組み込む

`apps/lp/vite.config.js` に `envDir: path.resolve(__dirname, '../..')` を追加。これにより root の `.env.local` が LP でも読まれるようになる。LP 配下に `.env*` ファイルは置かない（admin / reservation と同じ運用）。

`render.yaml` の LP service (`high-q-volleyball`) には `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を admin / reservation と同じ `sync: false` + `previewValue` の 2 段構造で追加する。`previewValue` は admin / reservation と完全同一の dev プロジェクトを参照する。

**Why**: env 規約は 3 アプリで対称に揃え、LP だけ例外を残さない。`env-management` spec の意図そのもの。

### D7. AWS 経路の撤去範囲

- `apps/lp/vite.config.js` の `server.proxy['/api/event']` 設定を削除
- `eventQueries.js` 内の `API_URL` 定数と `https://ptfomh71x9.execute-api...` URL を削除
- AWS API Gateway / Lambda / DynamoDB リソース自体は本 change で削除しない（運用判断・別 Issue）

## Risks / Trade-offs

- **[リスク]** Supabase の anon が未来 published events に正しくアクセスできるか、本番 prd プロジェクトで検証していない
  → **緩和**: PR Preview で dev プロジェクトに対し動作確認 → 本番マージ後に prd の events を 1 件 published 状態で投入し直接確認。RLS spec §15 で anon SELECT 許可は明文化されている

- **[リスク]** AWS DynamoDB 時代に運用されてきた既存イベントが Supabase に未投入で、切替後にカレンダーが空になる
  → **緩和**: 本 change の Apply 時点で「過去 DynamoDB データの Supabase 移行は別 Issue D」と明言。切替前後で表示件数が変わることを Render Preview 確認手順に明記。Empty 状態（"予定されているイベントはありません"）が正しく出ることで縮退は安全側

- **[トレードオフ]** `venues` join により取得列が増えるが、ペイロードは依然軽量（数 KB オーダー）。逆に admin 側で venue 名を後から変更しても LP に自動反映される利点を取る

- **[リスク]** Issue 本文の `VITE_SUPABASE_ANON_KEY` 表記を踏襲すると `env-management` spec §環境変数キー名統一に違反する
  → **緩和**: 本 design で `VITE_SUPABASE_PUBLISHABLE_KEY` に統一すると明示。proposal にも記載済

- **[リスク]** Render Preview は Render PR Preview から `previewValue` の dev Supabase へ向く。dev に published 未来イベントが 1 件もないと Preview 確認時に Empty になり一見壊れて見える
  → **緩和**: Apply 完了報告で dev に動作確認用 events 投入手順を案内するか、テスト用 fixture seeding を Apply タスクに含めるかを Apply 開始時に判断

## Migration Plan

1. `@high-q/shared` を `apps/lp` の dependencies に追加
2. `apps/lp/src/shared/api/supabase.js` を新設（admin / reservation と同じ singleton パターン）
3. `apps/lp/vite.config.js` に `envDir` 追加、`/api/event` proxy 削除
4. `eventQueries.js` を Supabase 経路に書き換え（D3 のクエリ）
5. `eventQueries.spec.js` を MSW ベースに書き換え
6. `render.yaml` の LP service に `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を追加
7. specs delta（`env-management` / `lp-fsd-structure` / `lp-calendar` / `render-deployment`）を作成
8. PR → Render PR Preview で dev Supabase から実データ取得を確認
9. master マージ後、prd Supabase の Dashboard で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を LP service に手動入力（admin / reservation と同じ値）
10. prd で動作確認 → AWS API Gateway 経路の停止判断は別 Issue で扱う

**ロールバック戦略**: マージ後に問題が出た場合は revert PR で `eventQueries.js` を AWS API Gateway 経路に戻す。AWS Lambda / DynamoDB は本 change では削除しないので即座にロールバック可能。

## Open Questions

- dev Supabase に動作確認用の published 未来イベントを 1 件以上 seed する作業は本 change に含めるか、それとも翔太郎くんが admin から手動投入するか（Apply 開始時に確認）
- `useEventCalendar.js` の `color: 'secondary'` ハードコードを `events.status` 連動（cancelled は warning など）にする拡張は本 change で扱うか、別 Issue とするか（デフォルト: 別 Issue。本 change は経路切替に集中）
