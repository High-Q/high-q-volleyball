## 1. Supabase クライアント基盤の整備

- [x] 1.1 `apps/lp/package.json` の `dependencies` に `"@high-q/shared": "workspace:*"` を追加し、`pnpm install` で lockfile を更新（注: 既に master の package.json に含まれていた）
- [x] 1.2 `apps/lp/src/shared/api/supabase.js` を新設。`@high-q/shared` の `createSupabaseClient()` を 1 回だけ呼び、`getSupabase()` と `_resetSupabaseForTest()` を export する singleton 実装（admin/reservation の `supabase.ts` を JS 化したもの）
- [x] 1.3 `apps/lp/src/shared/api/index.js` を新設（または既存ファイルに追記）し、`getSupabase` を Public API として再 export
- [x] 1.4 `apps/lp/vite.config.js` に `import path from 'node:path'` と `envDir: path.resolve(__dirname, '../..')` を追加し、`server.proxy['/api/event']` 設定ブロックを削除

## 2. eventQueries の Supabase 化（TDD）

- [x] 2.1 `apps/lp/src/entities/event/api/eventQueries.spec.js` を Supabase builder mock ベースに書き換える: `vi.mock('@shared/api')` で `getSupabase` を差し替え、Success / Empty / Error の 3 ケースを定義（テストが落ちることを確認）。MSW 案は env stubbing コストが高く却下（design.md D5 参照）
- [x] 2.2 さらに「`from('events')` 呼び出し / select に id/name/start_at/end_at/venues join / `eq('visibility','published')` / `gte('start_at', ISO)` / `order('start_at', {ascending:true})` が発行される」ことを assert する 4 ケース目を追加（テストが落ちることを確認）
- [x] 2.3 `apps/lp/src/entities/event/api/eventQueries.js` を Supabase 経路に書き換える: `getSupabase()` を呼び、`design.md D3` のクエリを発行。返り値を `{ id, name, start: Date, end: Date, location: string }` に整形。`error` が truthy なら throw。AWS 関連の `API_URL` 定数と CORS フォールバックを削除
- [x] 2.4 `pnpm --filter @high-q/lp test` を実行して 2.1〜2.2 の全テストが green になることを確認
- [x] 2.5 `apps/lp/src/widgets/event-calendar/model/useEventCalendar.spec.js` を再実行し、entities 側 mock 経由のため変更不要だが green を確認

## 3. Render 設定の更新

- [x] 3.1 `render.yaml` の LP service (`high-q-volleyball`) の `envVars` 配下に `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を追加（`sync: false` + `previewValue` の 2 段構造、`previewValue` は admin / reservation と完全同一の dev プロジェクト値）
- [x] 3.2 LP service の envVars コメントを admin / reservation と表記揃え（dev/prd 切替の説明 1 行を維持）

## 4. ローカル動作確認

- [ ] 4.1 リポジトリ root の `.env.local` に既存の `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`（dev）があることを確認し、必要なら `.env.example` も最新化（**翔太郎くん側で確認** — Claude は .env 系を読まない方針）
- [ ] 4.2 `pnpm dev:lp` で起動し、ブラウザで LP カレンダーが Supabase の events を表示することを確認（dev に published 未来イベントが 0 件なら Empty 状態が出ることを確認）（**翔太郎くん側のブラウザ確認**）
- [x] 4.3 `pnpm --filter @high-q/lp build` でプロダクションビルドが通ることを確認
- [x] 4.4 `pnpm --filter @high-q/lp test` と `pnpm -r test` 全体の green を確認（lp 49, admin 706, reservation 548, packages/* 110, supabase/functions 34 — workspace 全 1472 件 green）
- [x] 4.5 `grep -RIn "ptfomh71x9.execute-api\|/api/event" apps/lp/ packages/` を実行し、マッチが 0 件であることを確認（`/api/eventQueries` のパス相対 import は機能上 LP の AWS 経路ではなく、grep 上の偽陽性として確認済）

## 5. spec / 後処理

- [x] 5.1 PR を作成（#231）。Render Preview で dev Supabase から実データが取得されていることを確認 → **翔太郎くん側のブラウザ確認待ち**
- [ ] 5.2 ユーザー OK 後、`/opsx-ship` で sync (specs/docs 更新) → archive → push → merge → ブランチ削除 + Issue クローズ
- [ ] 5.3 master マージ後、Render の LP service Dashboard で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の prd 値を手動で設定し、本番 URL でイベントが表示されることを確認（admin / reservation と同じ値を貼り付け）
