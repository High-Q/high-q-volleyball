## Context

LP の Vite ビルドは単一の `index-*.js`（minified 571 KB / gzip 178 KB）に Vuetify・Sentry・Supabase・TanStack Query・各ページコンポーネントを積み上げており、Rollup の chunk size 警告が継続的に出ている。LP は SPA だが Vue Router を使わず `window.location.pathname` を見て `App.vue` で 4 ページ（Home / Privacy / ExternalTransmission / NotFound）を `v-if` 切替している簡易構成で、`HomePage` 以外は初回 paint で必要としない。`vite-plugin-vuetify` は導入済みで on-demand コンポーネント import は既に効いている。Sentry はエラーキャプチャ漏れリスクのため遅延 init は本 change のスコープ外とする。

## Goals / Non-Goals

**Goals:**

- `dist/assets/index-*.js`（initial chunk）の **gzip サイズを 130 KB 以下**に短縮する（達成不可な場合は実測値と次施策を明示）
- vendor 別 chunk 分割によって、戻り訪問時のキャッシュヒット率を上げる
- 訪問頻度の低いページ（Privacy / ExternalTransmission / NotFound）を initial bundle から外す
- Lighthouse での LCP / FCP の before/after を PR 説明に残す運用を確立する

**Non-Goals:**

- LP の UI / 機能変更（#160 で扱う）
- Vuetify の他 UI ライブラリへの置き換え（#160 系列）
- Vuetify styles の手動分割（複雑度に対して効果が読みにくい・別 Issue 化）
- Sentry の遅延 init / lazy loading（エラー監視の取りこぼしリスク）
- Service Worker / preload 戦略導入

## Decisions

### Decision 1: vendor chunk は手動 `manualChunks` で 4 グループに分割する

`vite-plugin-vuetify` の auto-import は **コード分割ではなく未使用コンポーネント除外**の役割で、initial chunk のフラグメンテーションは別途必要。Rollup の `output.manualChunks` を関数形式で書き、`node_modules` パス判定で以下に分配する:

- `vendor-vue`: `vue` / `vue-router`（将来導入時）/ `@tanstack/vue-query`
- `vendor-vuetify`: `vuetify` / `vite-plugin-vuetify` ランタイム
- `vendor-sentry`: `@sentry/*`
- `vendor-supabase`: `@supabase/supabase-js` および依存（`@supabase/postgrest-js` 等）

**なぜ関数形式か**: オブジェクト形式は import グラフの最初の一致だけが効くため、依存ツリーが深い Supabase / Vuetify では取りこぼしが起きやすい。関数形式で `id.includes('node_modules/<pkg>')` 判定すれば確実。

**なぜこの 4 分割か**: それぞれ更新頻度・サイズ・キャッシュ寿命が大きく異なるため。これ以上細分化するとブラウザの HTTP/2 並列上限と small-chunk のオーバーヘッドで逆に遅くなる。

### Decision 2: ページ分割は `defineAsyncComponent` で実装する

`App.vue` の `v-if` ベース切替を維持しつつ、`PrivacyPolicyPage` / `ExternalTransmissionPage` / `NotFoundView` を `defineAsyncComponent(() => import('@pages/...'))` で遅延化する。Vue Router 導入はスコープ外（#160 系列で議論される可能性あり）。

**なぜ HomePage を遅延化しないか**: `/` がメインの導線で初回 paint に必須のため。遅延化すると LCP がむしろ悪化する。

**Suspense フォールバック**: 使わない。動的 import 中は Vue 標準のレンダリング保留挙動（コンポーネント解決まで空）に任せる。Privacy / ExternalTransmission は法定ページで遷移は非ハッピーパスのため、数十ミリ秒の白画面は許容範囲。後日必要になれば `<Suspense>` を追加。

### Decision 3: サイズ計測と目標達成判定は build ログ + Lighthouse の 2 系統で行う

- **build ログ**: `pnpm --filter @high-q/lp build` の Rollup 出力に `dist/assets/index-*.js` の minified / gzip サイズが表示される。これを PR 本文に before/after で貼る
- **Lighthouse**: `apps/lp` を `vite preview` で起動し、Chrome DevTools の Lighthouse（Mobile / Slow 4G）で LCP / FCP を測定。before/after の数値を PR 本文に併記

**なぜ Lighthouse CI を入れないか**: 単発の最適化 PR でしきい値ガードを敷くと運用負荷が高い。今回は手動で十分。将来 CI 化する場合は別 Issue。

### Decision 4: 目標未達時の扱い

gzip 130 KB を達成できなかった場合、本 change は「実装した最適化 + 計測結果」で archive し、未達分は Follow-up Issue（候補: Sentry 遅延 init / Vuetify styles 分割 / Supabase の lazy import 等）として切り出す。原則「1 PR で完璧を狙わず、計測と次の打ち手を残す」。

## Risks / Trade-offs

- **[Risk] manualChunks の正規表現/パス判定ミスで意図しない chunk に貼り付き、initial bundle が逆に増える** → build ログで before/after を必ず確認、PR 本文に貼る
- **[Risk] vendor chunk 分割でデプロイ直後の戻り訪問者は一度フル取得が必要（キャッシュキー変更）** → 恒久的副作用ではないため許容。リリースノートに記載は不要
- **[Risk] 動的 import で Privacy / ExternalTransmission の遷移時に白画面が一瞬出る** → 法定ページのため許容。LCP/CLS には影響しない（初回 paint には乗らない）
- **[Risk] 目標 gzip 130 KB が達成できない**（Vuetify だけで gzip 90 KB 程度ある可能性）→ Decision 4 のとおり「計測 + Follow-up Issue」で archive 可能とする。proposal にも明記済み
- **[Trade-off] HTTP リクエスト数が増える**（chunk が 1 → 5+ になる）→ HTTP/2 multiplexing 前提で許容範囲。Render は HTTP/2 対応

## Migration Plan

ロールバック容易性が高いため段階デプロイは不要:

1. feature branch で `vite.config.js` と `App.vue` を変更
2. `pnpm --filter @high-q/lp build` で before/after サイズを取得
3. Lighthouse Mobile で LCP / FCP を取得
4. PR 作成（Render Preview で目視確認、Privacy / ExternalTransmission の動的ロードも踏む）
5. master マージ → 本番 Render が自動デプロイ
6. 問題が出たら revert PR で即座に戻せる（DB やデータ migration を伴わないため）

## Open Questions

- 目標 gzip 130 KB が達成できた場合、`chunkSizeWarningLimit` のしきい値を下げて回帰検知に使うか？（Decision としては「現状の 500 KB のまま据え置き」を仮置きするが、Apply 時に実測値次第で再検討）
