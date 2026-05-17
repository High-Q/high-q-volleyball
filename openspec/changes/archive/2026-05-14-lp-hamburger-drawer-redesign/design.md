## Context

LP のヘッダーは `apps/lp/src/widgets/site-header/ui/SiteHeader.vue` 内で、ハンバーガー押下時に `<nav>` がヘッダー直下にインライン展開する単純な構造になっている。一方、`docs/10-デザインサンプル/lp/HighQ Hamburger Drawer.html` プロトタイプでは、フルスクリーン Drawer と sticky CTA フッタを組み合わせたエディトリアル指向のナビゲーションが提示されており、LP 全体の和紙トーン刷新（#160 系）と方向性が一致している。本変更で site-header のメニュー部分のみをこのプロトタイプに揃える。

CTA 戦略は final-cta widget の現行実装と同期する：Primary = LINE オープンチャット（継続接点）、Secondary = `#event-list-heading` へのスクロール。これは `lp-layout` spec の「Final CTA セクションは LINE 主・event-list 副」要件とも整合する。

## Goals / Non-Goals

**Goals:**

- ハンバーガー押下時の体験を、現在のインライン展開からフルスクリーン Drawer に置き換え、プロトタイプの意匠（大型タイポ・番号・矢印・sticky CTA フッタ・body lock・ハンバーガーアニメ）を取り込む
- アクセシビリティを `aria-*` / Esc / フォーカス管理 / `prefers-reduced-motion` まで含めて整備する
- final-cta の CTA 戦略と Drawer フッタを揃え、ユーザーがどこからでも同じ Primary 動線（LINE）に到達できるようにする
- `var(--hq-*)` トークンのみで完結させ、マジックナンバーを残さない

**Non-Goals:**

- 画面右下のフローティング LINE FAB の追加（別 Issue で扱う）
- ナビ項目体系そのものの再設計（既存の About / Features / 当日の流れ / Events / FAQ をそのまま採用）
- ヘッダー以外（footer / final-cta / hero）の改修
- デスクトップ向けの横並びメニュー追加（モバイル / 全画面幅で Drawer を採用）

## Decisions

### Decision 1: SiteHeader.vue 内に Drawer を内包し、別 widget に切り出さない

site-header と Drawer は開閉状態・フォーカス管理・スクロールロックを共有する。別 widget に切り出すと props や ref の受け渡しが煩雑になり、可読性が下がる。Drawer 用テンプレート / styles を SiteHeader.vue 内のスコープに保つ。

**Alternatives considered:** `widgets/site-drawer` として分離 → 状態同期のオーバーヘッドが利益を上回らないため却下。

### Decision 2: Drawer は `<Teleport to="body">` で body 直下に出す

ヘッダーの sticky / overlay 配置による stacking context の影響を受けず、`position: fixed; inset: 0` を素直に効かせるため。

**Alternatives considered:** ヘッダーの兄弟要素として配置 → 親の transform / overflow に影響される可能性があるため却下。

### Decision 3: body スクロールロックは `body.classList.add('is-locked')` 方式

プロトタイプ準拠。CSS 側で `body.is-locked { overflow: hidden; }` を定義。Vue 側からは class 操作のみ。タッチデバイスのスクロール伝播対策として `overscroll-behavior: contain` を Drawer 内コンテナに付与。

**Alternatives considered:** スクロール位置を保存して `position: fixed` を切り替える方式 → iOS Safari で不要なジャンプが起きる懸念があり、本ケースでは class 切替で十分。

### Decision 4: フォーカス管理は最小限（focus trap 完全実装はしない）

開放時に最初の Drawer リンクへフォーカスを移し、閉鎖時にハンバーガーへ戻す。Tab キーが Drawer 外へ抜ける可能性は残るが、Drawer 開放中は背後コンテンツが視覚的にも見えないため、現実的なリスクは低い。完全な focus trap ライブラリ導入は本変更ではコスト過剰。

**Alternatives considered:** `focus-trap` パッケージ導入 → 依存追加と LP バンドルサイズへの影響を考慮し見送り。

### Decision 5: アニメーション値はプロトタイプ準拠の `cubic-bezier(.22,.61,.36,1)` を `--hq-motion-ease` トークンとして共用

LP 内で同じイージングが他にも使われていれば同名トークンを再利用。なければ本変更で `--hq-motion-ease` を tokens.css に追加（design-tokens パッケージへの追加が筋）。

**Alternatives considered:** 各コンポーネントでハードコード → マジックナンバー禁止規約に反するため却下。

## Risks / Trade-offs

- **Risk:** body lock 中に Drawer 内 `overflow-y: auto` のスクロール伝播がブラウザによって背面に漏れる → **Mitigation:** Drawer インナーに `overscroll-behavior: contain` を付与
- **Risk:** Teleport で body 直下に出すため、SSR / hydration 観点で initial render に Drawer DOM が表示される一瞬がある → **Mitigation:** `opacity: 0; pointer-events: none` を初期値とし、`is-open` class でのみ visible に。FOUC は実質発生しない
- **Risk:** 既存 LP E2E のメニュー開閉セレクタが変わる → **Mitigation:** SiteHeader.vue の data-testid / role を維持し、E2E 側を最小修正
- **Risk:** focus trap 不完全により a11y 監査で指摘される可能性 → **Mitigation:** 受け入れる。問題化したら追加 Issue で対応

## Migration Plan

不要（UI 内部実装の刷新であり、外部 API・データモデル・URL 構造は変わらない）。

## Open Questions

- なし。Apply 開始時点での未確定事項なし。
