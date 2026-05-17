## Why

LP の `ReassuranceStrip` で持ち物・服装・参加費を示す 3 つの絵文字（👜 / 👟 / 💴）は、OS / ブラウザ / フォント環境によって描画が大きく異なる。Apple Color Emoji と Windows Segoe UI Emoji ではテイストが異なり、Android 端末では別の絵文字フォントが当たる。これでは「クラフト感のある HQ ブランド」を統一できない。

#160 (LP redesign v2) で他のすべての要素は HQ デザイントークンに揃えたが、絵文字だけが OS の表現に委ねられている状態。商用リリース前に絵文字を線画 SVG に置換し、ブランド体験を完全に統制する。

## What Changes

- `apps/lp/src/widgets/reassurance-strip/` の 3 絵文字を、HQ トーンに揃えた線画 SVG アイコンに置換する
- `apps/lp/src/shared/ui/icons/` に Vue SFC 形式の SVG アイコンコンポーネントを新設する
- アイコンはストロークを HQ デザイントークン (`currentColor` 経由で `--hq-color-ink-soft`) で着色し、サイズは props で制御
- LP 全体の絵文字残存を `grep` で棚卸しし、検出ゼロを確認

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `lp-layout`: ReassuranceStrip の視覚要素について、絵文字ではなく HQ トーンに揃えた SVG アイコンを使うこと、および LP 全体で OS 依存の絵文字をブランド要素として用いないことを要件として追加する。
- `lp-fsd-structure`: LP 固有の SVG アイコンを `apps/lp/src/shared/ui/icons/` に配置することを規定する。

## Impact

- 修正: `apps/lp/src/widgets/reassurance-strip/ui/ReassuranceStrip.vue`
- 新設: `apps/lp/src/shared/ui/icons/` 配下に最小 3 種のアイコン SFC
- 既製パッケージ (`lucide-vue-next` 等) は新規依存追加せず、SVG をインラインで保持する（バンドル肥大化回避）
- E2E / 単体テストへの影響なし（`aria-hidden` 要素のため。ただし置換後も `aria-hidden` を維持）
