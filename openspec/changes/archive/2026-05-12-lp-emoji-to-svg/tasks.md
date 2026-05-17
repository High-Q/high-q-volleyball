## 1. 準備

- [x] 1.1 `apps/lp/src/shared/ui/icons/` ディレクトリを作成し、空の `index.ts`（barrel）を置く
- [x] 1.2 LP 全体の絵文字残存を `grep` で棚卸し（U+1F300〜U+1FAFF / U+2600〜U+27BF）して現状を確認

## 2. アイコン SFC 実装

- [x] 2.1 `BagIcon.vue`（持ち物 / トートバッグ線画）を `apps/lp/src/shared/ui/icons/` に新設。`size` prop（デフォルト 28）、stroke 1.5px / `currentColor` / `stroke-linecap=round` / `stroke-linejoin=round` / `fill=none` / viewBox 24×24
- [x] 2.2 `ApparelIcon.vue`（服装 / T シャツ線画）を同様に新設。`size` prop（デフォルト 22）
- [x] 2.3 `CoinIcon.vue`（参加費 / 円マーク入りコイン or コインスタック線画）を同様に新設。`size` prop（デフォルト 22）
- [x] 2.4 `apps/lp/src/shared/ui/icons/index.ts` で 3 アイコンを named export として公開

## 3. ReassuranceStrip 置換

- [x] 3.1 `apps/lp/src/widgets/reassurance-strip/ui/ReassuranceStrip.vue` の `<div class="reassurance__ico">👜</div>` を `<BagIcon :size="28" />` に置換し、`aria-hidden` を SVG ルートに維持
- [x] 3.2 `<div class="reassurance__cell-ico">👟</div>` を `<ApparelIcon :size="22" />` に置換、`aria-hidden` を SVG ルートに維持
- [x] 3.3 `<div class="reassurance__cell-ico">💴</div>` を `<CoinIcon :size="22" />` に置換、`aria-hidden` を SVG ルートに維持
- [x] 3.4 `<script setup>` に `BagIcon` / `ApparelIcon` / `CoinIcon` の import を `@/shared/ui/icons` から追加
- [x] 3.5 不要になった `.reassurance__ico` / `.reassurance__cell-ico` の `font-size` / `line-height` を CSS から削除（残置不要のスタイル整理）。アイコン親要素は `color: var(--hq-color-ink-soft)` を継承する形に整える

## 4. 検証

- [x] 4.1 `grep -rnP "[\\x{1F300}-\\x{1FAFF}\\x{2600}-\\x{27BF}]" apps/lp/src --include="*.vue" --include="*.ts" --include="*.css"` を実行して該当 0 件を確認
- [x] 4.2 `pnpm --filter @high-q/lp build` が成功する
- [x] 4.3 ローカルで `pnpm --filter @high-q/lp dev` を起動し、420px / 768px / 1280px の各幅で ReassuranceStrip のアイコンが崩れず HQ トーンで描画されることを目視確認
- [x] 4.4 既存の E2E（`e2e/lp/`）が通ることを確認（アイコンは `aria-hidden` で E2E セレクタには干渉しないため、回帰がないこと）
