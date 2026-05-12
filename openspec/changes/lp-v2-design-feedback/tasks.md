## 1. 先行実施分の整理 (本 change より前に `feature/238-button-variant-tokens-refactor` に commit 済み)

- [x] 1.1 `@high-q/ui` Button の variant 体系を再定義 (primary=ink / outline=旧secondary / ghost / danger=本物 destructive #9c4030)
- [x] 1.2 `packages/design-tokens` の accent `#b85c3c → #a44e30` / warn `#c08442 → #d4a04a` トーン調整 + tokens.css 再生成 + 単体テスト更新
- [x] 1.3 admin / reservation の Button `variant="secondary"` を `variant="outline"` にリネーム (全 14 箇所)
- [x] 1.4 LP の `variant="accent"` を `variant="primary"` にリネーム (HeroFirst の 1 箇所)
- [x] 1.5 全 13 セクション kicker を accent 色で描画する (Kicker の color prop / 素 div の color 直指定)
- [x] 1.6 Features `__number` / FirstTimeFlow `__bullet` / FAQ `__index` / Worries Q マーカー / FirstTimeFlow reassurance border-left を accent に集約
- [x] 1.7 accent カラーを kicker / 番号 / Q マーカー / NEXT タグ / focus outline 以外から完全に除去 (event-card hover / consent link / gallery hover 等は hairline / ink-soft で代替)
- [x] 1.8 セクション背景色をプロトタイプ準拠で全 8 箇所修正 (Worries / NextStrip を dark theme に復元、About / Features / Events / FAQ / NotForYou / Gallery を正しい paper / paper-warm に振り分け)
- [x] 1.9 全幅レイアウト化 + 各セクションに `padding-inline: max(<base>, calc((100% - <max>) / 2))` で PC レスポンシブ対応 (HeroFirst PC で 640px 高)
- [x] 1.10 `apps/lp/index.html` に Google Fonts (Klee One / Shippori Mincho / Zen Kaku Gothic New / JetBrains Mono) の link を追加し preconnect も設定
- [x] 1.11 `ConsentBanner` を Vuetify `v-snackbar` 依存から `<Teleport to="body">` + `<Transition>` + HQ トークンベースに再実装
- [x] 1.12 Footer に LP 内アンカーリンク (About / Features / 当日の流れ / Events / FAQ) を追加し、Instagram リンクは未開設のため Gallery と Footer から削除
- [x] 1.13 全 kicker テキストに「— 」prefix を統一付加
- [x] 1.14 `useFadeInOnScroll` 経由のフェードイン演出を全 widget から削除 (CSS の opacity/transform/transition と `.is-visible` トグル削除)
- [x] 1.15 NextStrip 全体を `<a>` でラップしクリッカブル化 (URL 未設定時は LINE OpenChat に fallback)、「予約 ›」を arrow として常時表示

## 2. ハンバーガーメニュー実装

- [x] 2.1 `apps/lp/src/widgets/site-header/ui/SiteHeader.vue` にプロトタイプ準拠のハンバーガーアイコン (横線 22px × 高さ 1px × 2 本 / gap 4px) を右端に追加
- [x] 2.2 ハンバーガークリックで開閉する menuOpen state を SiteHeader 内に持たせる
- [x] 2.3 menuOpen=true 時にドロップダウンメニュー要素を表示 (LP 内アンカー 5 リンク: About / Features / 当日の流れ / Events / FAQ)
- [x] 2.4 ドロップダウン背景・文字色は HQ トークン (paper bg / ink 文字 / hairline border) で実装。dark overlay の SiteHeader 上でも、ドロップダウンは Header 直下にスライドダウン
- [x] 2.5 ESC キー / 外側クリック / リンククリック / ルート遷移 で menuOpen=false にする
- [x] 2.6 a11y: ハンバーガーボタンに `aria-label="メニューを開く"` / `aria-expanded` 属性を付ける。ドロップダウンに `role="navigation"` を付ける

## 3. 検証と PR

- [x] 3.1 `pnpm --filter @high-q/lp test` 緑 (38 件)
- [x] 3.2 `pnpm build:lp` / `pnpm --filter @high-q/admin build` / `pnpm --filter @high-q/reservation build` 全て成功
- [x] 3.3 `pnpm exec playwright test --project=lp` 緑 (3 件)
- [x] 3.4 PR #239 (release/lp-redesign-v2 への中間 PR) の Render Preview で翔太郎くんが視認確認 (ハンバーガー右上表示・開閉動作・配色リズム・全 kicker accent・体験参加してみるボタン黒)
