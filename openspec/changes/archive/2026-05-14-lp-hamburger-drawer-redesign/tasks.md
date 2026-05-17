## 1. デザイントークン整備

- [x] 1.1 `packages/design-tokens/src/index.ts` に `motion.ease = "cubic-bezier(.22,.61,.36,1)"` を追加し、`build:tokens` で tokens.css に `--hq-motion-ease` を再生成。`src/index.test.ts` に motion 検証を追加
- [x] 1.2 `pnpm --filter @high-q/design-tokens test` で 12/12 pass。drift 検出により HQ オブジェクト ↔ tokens.css の同期を保証

## 2. SiteHeader.vue の Drawer 化

- [x] 2.1 SiteHeader.vue のインライン展開 `<nav>` を撤去、`<Teleport to="body">` で `.site-drawer` を body 直下に配置
- [x] 2.2 ハンバーガーを 2 本線アイコン (`.site-header__hamburger-icon` 内に top/bottom bar) に変更、`menuOpen` で `--open` モディファイア付与し ✕ にトランスフォーム。`aria-expanded` / `aria-label` / `aria-controls="site-drawer"` を結線
- [x] 2.3 ナビ項目を「番号 (01–05) + 大型タイポラベル + ›」の 3 カラム grid で描画。href は 5 アンカーを維持、ラベルはプロトタイプ準拠の文言（はじめての方へ / High Q について / 当日の流れ / 開催スケジュール / よくある質問）に更新
- [x] 2.4 Drawer footer に Primary `data-testid="drawer-cta-line"` (LINE_OPEN_CHAT_URL / `target="_blank" rel="noopener noreferrer"`) と Secondary `data-testid="drawer-cta-event-list"` (`#event-list-heading`) を配置
- [x] 2.5 footer 下端に `Tokyo · Koto-ku` / `© 2026 High Q` の meta 行を mono フォント・muted カラーで追加

## 3. 開閉ロジック・アクセシビリティ

- [x] 3.1 `watch(menuOpen)` で `<body>` に `is-locked` class を toggle、Drawer 自身は `:class="{ 'site-drawer--open': menuOpen }"` で同期
- [x] 3.2 開放時 `nextTick` 後 220ms 遅延で `drawerLinkEls[0]` へフォーカス移動、閉鎖時にハンバーガーへフォーカスを戻す
- [x] 3.3 Esc keydown で `closeMenu` + ハンバーガーへフォーカス復帰
- [x] 3.4 ナビリンク / Secondary CTA クリック時に `setTimeout(closeMenu, 80)` でアンカー遷移後に閉じる（Primary LINE は新規タブのため即時 closeMenu）
- [x] 3.5 `site-header--menu-open` モディファイアで Drawer 開放中はヘッダー paper 背景・ink 文字色を維持（既存 `--scrolled` と同じスタイル分岐）

## 4. CSS 仕上げ

- [x] 4.1 全プロパティを `var(--hq-color-*)` / `var(--hq-font-*)` / `var(--hq-motion-ease)` / `var(--hq-radius-*)` / `var(--hq-shadow-*)` のみで実装。色・イージングのハードコードはオーバーレイ時の subtle text-shadow（プロトタイプ準拠の `rgba(0,0,0,0.x)`）のみに限定
- [x] 4.2 `.site-drawer__inner` に `overflow-y: auto` + `overscroll-behavior: contain`
- [x] 4.3 `apps/lp/src/App.vue` のグローバル `<style>` に `body.is-locked { overflow: hidden; }` を追加
- [x] 4.4 `@media (prefers-reduced-motion: reduce)` で Drawer 自身・リンク・矢印・CTA・ハンバーガーバーのトランジションを `none` に

## 5. テスト

- [x] 5.1 `e2e/lp/site-drawer.e2e.ts` に Drawer happy path E2E を新規追加（ハンバーガー → Drawer 開 → 開催スケジュールリンク押下 → `#event-list-heading` URL + Drawer 閉鎖 + body unlock）
- [x] 5.2 同ファイルに Drawer footer Primary CTA の LINE URL / target / rel アサーションと Secondary CTA の event-list アサーションを含める
- [x] 5.3 Esc キーで Drawer 閉鎖 + body unlock を確認するシナリオを追加

## 6. 最終確認

- [x] 6.1 `pnpm --filter @high-q/lp build` 成功（CSS 332.49 kB / JS 459.22 kB / 直前と同水準）
- [x] 6.2 `pnpm test` で全パッケージ vitest 1490/1490 pass、`pnpm exec playwright test --project=lp` で 12/12 pass（既存 8 件 + 新規 Drawer 4 件）
- [ ] 6.3 ローカル `pnpm --filter @high-q/lp dev` での目視確認 + Render PR Preview 確認は翔太郎くん側にお願い（PR 作成後に案内）
