# PR 本文用メモ — lp-bundle-optimization

PR 本文に貼り付ける before/after 比較表。`/opsx-ship` 時に PR description に転記する。

## Bundle size (gzip)

ローカル `pnpm --filter @high-q/lp build`（`VITE_SENTRY_DSN` セット時の本番想定）で測定:

| ファイル | before | after | delta |
|---|---|---|---|
| `index-*.js`（initial） | 160.28 KB | **16.32 KB** | **-143.96 KB / -89.8%** |
| `index-*.css`（initial） | 43.64 KB | 6.40 KB | -37.24 KB / -85.3% |
| `vendor-vue-*.js` | — | 43.29 KB | new chunk |
| `vendor-vuetify-*.js` | — | 46.27 KB | new chunk |
| `vendor-vuetify-*.css` | — | 39.23 KB | new chunk |
| `vendor-supabase-*.js` | — | 51.80 KB | new chunk |
| `vendor-sentry-*.js` | — | 33.76 KB | new chunk |
| `NotFoundView-*.js` | — | 0.53 KB | new chunk |
| Privacy page chunk | — | 2.18 KB | new chunk |
| ExternalTransmission page chunk | — | 3.84 KB | new chunk |

**初期画面で必要な chunk 合計（parallel download）**: index + vendor 4 種で gzip 約 **191 KB**。HTTP/2 multiplexing 前提で並列取得され、戻り訪問では vendor が cache hit する。

> **Note**: ローカルで `VITE_SENTRY_DSN` 未設定の場合は Sentry が tree-shake で全消失し `vendor-sentry` は 0 KB になる。本番（Render Dashboard で DSN セット済み）では上記の構成。

## Lighthouse (Mobile, Slow 4G)

`vite preview` (port 4173 想定) で測定。中央値を貼ること。

| 指標 | before | after |
|---|---|---|
| LCP | _measure_ | _measure_ |
| FCP | _measure_ | _measure_ |
| TBT | _measure_ | _measure_ |
| Performance score | _measure_ | _measure_ |

## Follow-up Issue 候補（目標達成済みのため任意）

initial chunk gzip 16 KB で Issue #233 の目標を大幅達成したため、以下は**緊急性なし**。将来更なる最適化が必要になった場合の候補:

- Sentry の遅延 init（idle 後 / consent 後）— エラーキャプチャ取りこぼしリスクあり、慎重判断
- Vuetify styles の手動分割（`vendor-vuetify.css` 39 KB → critical / non-critical 分離）
- Supabase client の lazy import（HomePage が同期使用しているため要改修）
- `chunkSizeWarningLimit` を 200 KB 等に下げてリグレッション検知に活用
