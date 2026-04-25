# Design: LP UI モダン化リフレッシュ

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Tasks の3ファイルをすべて承認後に Apply へ進む。

---

## 0. コンテキスト確認（Apply 開始前に必ず実施）

> Apply 開始時に Claude が宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: Vuetify 3 + 既存テーマトークン優先・既存テスト7件不変・375pxでも破綻しない」

---

## 1. Context

**現状（リファクタ #105 直後）**:
- FSDレイヤー構造は整備済み（`pages/home → widgets/* → shared/ui`）
- TanStack Query 化・4状態カレンダーは実装済み
- ただし **Hero / Header / Footer / Concept / Activities** は中身がほぼ pre-refactor 当時のまま
- `ActivitiesSection` はマウントされておらず、import パスも壊れている（致命的）
- 残存ハードコード: `#F5F8FA`, `#6A96A4`, `mdi-twitter`（X リブランディング以前）

**ステークホルダー**: サークルオーナー（一人）／新規参加検討者（LP閲覧者）

**制約**:
- Vuetify 3 の機能を最大活用、独自CSS は最小化
- 画像素材は現行のまま運用（差し替えは別 issue）
- TypeScript 化は別 issue
- 既存テスト7件（`eventQueries.spec.js` 3件 + `useEventCalendar.spec.js` 4件）に影響を与えない

---

## 2. Goals / Non-Goals

**Goals**
- 第一印象を「2018年風」→「2025年トレンドに乗ったLP」に引き上げる
- ~~「メンバー応募 → X DM」の動線を Hero CTA で明確化（CV最優先）~~
- **【T-17 で方針変更】X 公式アカウントが凍結中のため、SNS リンク・X 経由 CTA を全て撤廃。メンバー受付窓口は「準備中」表示で復活待ち（CV 動線は X 復活 or 別手段整備まで保留）**
- ナビゲーション欠落を解消（アンカーリンクで全セクションを案内）
- 壊れている `ActivitiesSection` を表示・整備
- 残存ハードコード値（`#F5F8FA`・`#6A96A4`・`mdi-twitter`）を完全撤廃
- **セクション見出しデザインを共通 `SectionDivider` で統一、Header をフルブリード化**

**Non-Goals**
- カレンダーUI刷新／ダークモード／写真素材調達／WebP化／OGP整備／TS化
- ロジック層（entities・useEventCalendar）の変更
- 新規 API 接続

---

## 3. FSD アーキテクチャ設計

### 影響レイヤー・スライス

- [x] `shared/ui/` — HeaderLine / FooterLine / ConceptCard 改修、`XIcon.vue` 新規
- [x] `shared/lib/` — `useFadeInOnScroll.js` 新規（Intersection Observer composable）
- [x] `widgets/hero-section/` — CTA・スクロールヒント追加
- [x] `widgets/concept-section/` — section ID 追加
- [x] `widgets/activities-section/` — import 修復、ハードコード撤廃、SNS ボタン
- [x] `pages/home/` — ActivitiesSection マウント、各セクションに ID と FadeIn ラッパー
- [x] `plugins/vuetify.js` — `surface-alt` / `text-muted` トークン追加
- [ ] `entities/` — 変更なし
- [ ] `features/` — 変更なし

### 依存関係図

```
pages/home/HomePage
  ├─ widgets/hero-section/HeroSection ── shared/ui/XIcon
  ├─ widgets/concept-section/ConceptSection ── shared/ui/ConceptCard
  ├─ widgets/activities-section/ActivitiesSection ── shared/ui/{SubTitle, XIcon}
  └─ widgets/event-calendar/EventCalendar （変更なし）

shared/ui/HeaderLine ── shared/ui/XIcon
shared/ui/FooterLine ── shared/ui/XIcon

各 widget の root <section> ── shared/lib/useFadeInOnScroll
```

### Value Object / Branded Types

このリリースに新規ドメイン型なし（UI のみの変更）。

### エラーコード

このリリースに新規エラーコードなし。

---

## 4. ビジネス異常系の洗い出し

> このリリースは UI/Visual のみの変更で、業務ロジックの異常系は発生しない。
> ただし以下の表示仕様の異常系を整理する。

| # | 異常ケース | 想定挙動 | UI フィードバック |
|---|-----------|---------|-----------------|
| 1 | アンカー先 ID（`#concept`等）が DOM に存在しない | ブラウザは無反応、クラッシュなし | 不要（事前検証で防止） |
| 2 | `prefers-reduced-motion: reduce` のユーザー | フェードインを無効化 | アニメーションなしで即時表示 |
| 3 | `IntersectionObserver` 非対応ブラウザ（古い Safari 等） | フォールバックとして即時表示 | `IntersectionObserver === undefined` ガード |
| 4 | スクロール最上部で Header 透明 → 不透明遷移中の崩れ | CSS transition で滑らかに遷移 | 視覚的に違和感なし |

---

## 5. UI/UX 設計

### デザイントークン拡張（`vuetify.js`）

```javascript
const myCustomTheme = {
  dark: false,
  colors: {
    primary:    "#182F43",   // 既存
    secondary:  "#85BBCC",   // 既存
    third:      "#6A96A4",   // 既存（残置）
    "surface-alt": "#F5F8FA", // 新規: セクション交互背景
    "text-muted":  "#6A96A4", // 新規: 補助テキスト
  },
};
```

### Hero セクション再設計

```
┌─────────────────────────────────────────┐
│  [背景画像 + dark overlay]               │
│                                         │
│         High Q (大見出し)               │
│         江東区バレーボールサークル       │
│         (サブテキスト)                  │
│                                         │
│   [X でお問い合わせ]  [イベントを見る]  │
│                                         │
│            ↓ scroll                      │
└─────────────────────────────────────────┘
```

- CTA 1: `<v-btn color="secondary" variant="flat">` → `https://twitter.com/c8w5y` (新規ウィンドウ・X DM 想定)
- CTA 2: `<v-btn color="white" variant="outlined">` → `#event` アンカー
- スクロールヒント: 下中央に `mdi-chevron-double-down` を `animate: bounce` で表示

### Header 再設計

- ナビ: `CONCEPT` / `ACTIVITIES` / `EVENT` の3アンカーリンク（テキストボタン）
- スクロール量に応じて変化: `scrollY === 0 → background: transparent` / `scrollY > 0 → background: primary + elevation`
- モバイル（xs）はナビをドロップダウンメニュー（`v-menu` + `v-list`）に集約
- X アイコン → 新規 `XIcon` コンポーネント

### Concept カード再設計

| 項目 | 変更前 | 変更後 |
|------|-------|-------|
| 構造 | border-left + 角張りカード | フルシャドウカード + 角丸 16px |
| ホバー | なし | `transform: translateY(-4px)` + シャドウ強化（200ms） |
| アイコン | 80px | 56px に縮小、上部背景に丸い surface-alt のチップを敷く |
| タイトル/本文 | 中央寄せ | 中央寄せ（変更なし） |
| 中央カード強調 | border-left navy のみ | 全体を primary 反転（背景 primary, 文字 white） |

### Activities セクション再設計

- import 修復: `import SubTitle from "@shared/ui/SubTitle.vue"`
- 残存ハードコード（`#F5F8FA`・`#6A96A4`）→ `surface-alt` / `text-muted` トークンへ
- X SNS ボタン → 新規 `XIcon` コンポーネント
- 構造維持（左テキスト・右画像の2カラム、xs では縦積み）

### Footer 再設計

```
┌─────────────────────────────────────────┐
│  High Q (logo)     ナビ           SNS    │
│  江東区バレー…    CONCEPT          [X]   │
│                   ACTIVITIES             │
│                   EVENT                  │
│  ─────────────────────────               │
│        © 2026 High Q                    │
└─────────────────────────────────────────┘
```

- 3カラム（lg+）／2カラム（md）／1カラム（sm 以下）
- text-muted トークンで著作権表記
- X アイコン置換

### SectionDivider コンポーネント（T-17 追加）

3 セクション（Concept / Activities / Event）で異なっていた見出しデザインを共通化する。

```vue
<!-- shared/ui/SectionDivider.vue -->
<template>
  <div class="section-divider">
    <h2 class="section-divider__title">{{ title }}</h2>
    <div class="section-divider__bar" />
  </div>
</template>
```

- props: `title`（String, required）
- スタイル: タイトルは大見出し（`primary` カラー、letter-spacing 0.08em、margin-bottom 12px）+ 下線 44px グラデーション（primary→secondary）
- 各セクションの section-hr / section-bar / SubTitle は撤廃して本コンポーネントに統一

### Header フルブリード化（T-17 追加）

`<v-app-bar>` の左右内側 padding を 0 にし、ロゴが画面左端、SNS/メニューが画面右端に張り付くモダン LP スタイル。`<v-container fluid class="px-4">` 等で内側調整。

### X 撤廃方針（T-17 追加）

X 公式アカウント凍結中につき、以下を実施:

| 箇所 | 変更前 | 変更後 |
|------|-------|-------|
| Hero CTA | 「X でお問い合わせ」+「イベントを見る」 | 「イベントを見る」のみ。サブに「メンバー受付窓口は準備中です」テキスト |
| Header | X アイコンボタン（右上） | 削除（ナビとロゴのみ） |
| Footer | SNS カラム（X リンク） | 削除。ブランド + ナビの 2 カラム構成 |
| Activities | 「X でお問い合わせ」ボタン | 「メンバー受付窓口は準備中です」テキスト表示 |

**XIcon コンポーネント自体は保持**（X 復活時に再利用するため）。各ファイルからの import のみ削除。

### XIcon コンポーネント

- 公式 X ロゴの inline SVG（24x24 viewBox）
- props: `size`（デフォルト 24）, `color`（CSS color string、デフォルト `currentColor`）
- aria-hidden="true"（ボタンの `aria-label` で意味を持たせる）

```vue
<svg :width="size" :height="size" viewBox="0 0 24 24" :fill="color" aria-hidden="true">
  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
</svg>
```

### useFadeInOnScroll composable

```javascript
// shared/lib/useFadeInOnScroll.js
import { onMounted, onBeforeUnmount, ref } from 'vue'

export function useFadeInOnScroll(options = { threshold: 0.15 }) {
  const el = ref(null)
  const isVisible = ref(false)
  let observer = null

  onMounted(() => {
    // reduced motion はそのまま表示
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isVisible.value = true
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      isVisible.value = true
      return
    }
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    }, options)
    if (el.value) observer.observe(el.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { el, isVisible }
}
```

- 各 widget の root `<section ref="el" :class="{ 'is-visible': isVisible }">` で利用
- CSS:

```css
section { opacity: 0; transform: translateY(24px); transition: opacity 600ms, transform 600ms; }
section.is-visible { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) {
  section { opacity: 1; transform: none; transition: none; }
}
```

### デザイントークン使用確認

- [x] 色は `color="primary"` / `rgb(var(--v-theme-secondary))` 等のトークンを使用
- [x] マジックナンバー `#F5F8FA` / `#6A96A4` / `#182F43` / `#85BBCC` をコードに書かない（vuetify.js を除く）

### 4状態設計

このリリースのコンポーネントは静的のため、Loading/Empty/Error/Success の状態管理は EventCalendar（変更なし）にのみ存在。

### レスポンシブ対応

| ブレークポイント | Hero | Header | Concept | Activities | Footer |
|---------------|------|--------|---------|-----------|--------|
| xs (〜599px) | 高さ 480px、CTA縦積み | ハンバーガーメニュー | 1列 | 1列 | 1列 |
| sm (600〜959px) | 高さ 480px、CTA横並び | アンカー横並び | 1列 | 2カラム | 2カラム |
| md+ (960px〜) | 高さ 560px、CTA横並び | アンカー横並び | 3列 | 2カラム | 3カラム |

### アクセシビリティチェックリスト

- [ ] Header / Hero CTA に `aria-label` を設定
- [ ] アンカーリンクは `<a href="#concept">` ベースで Tab キー操作可能
- [ ] X ロゴ SVG は `aria-hidden="true"`、ボタン側に `aria-label="X (Twitter) でお問い合わせ"`
- [ ] スクロールヒント `mdi-chevron-double-down` は `aria-hidden`
- [ ] フォーカス時の outline を消さない（Vuetify default を尊重）
- [ ] テキストコントラスト AA 以上（primary `#182F43` on white = 12.6:1 OK）
- [ ] `prefers-reduced-motion: reduce` を尊重

---

## 6. DB / Supabase 設計

> このリリースに DB 変更なし。

---

## 7. テスト設計

### テスト対象

| 対象 | 種別 | ツール |
|------|------|--------|
| `useFadeInOnScroll` composable | ユニットテスト | Vitest（IntersectionObserver mock） |
| `XIcon` コンポーネント | スナップショット軽め | Vitest + @vue/test-utils |

### テストケース

**正常系**
- [ ] `useFadeInOnScroll`: IntersectionObserver が発火したら `isVisible.value === true`
- [ ] `useFadeInOnScroll`: `prefers-reduced-motion: reduce` のとき初期から `isVisible.value === true`
- [ ] `useFadeInOnScroll`: `IntersectionObserver === undefined` のとき初期から `true`（フォールバック）
- [ ] `XIcon`: props.size=32 が `<svg width="32" height="32">` にバインドされる
- [ ] `XIcon`: props.color が `fill` 属性に反映される

**ビジネス異常系**: なし（UI のみ）

**技術エラー系**
- [ ] `useFadeInOnScroll`: `onBeforeUnmount` で observer.disconnect が呼ばれる

---

## 8. Decisions（主要な技術判断）

### D1. Intersection Observer を採用（vs CSS-only `@scroll-timeline`）
**理由**: `scroll-timeline` は 2025年時点で Safari 未対応。Intersection Observer は IE 11 を除き全モダンブラウザ対応で、reduced-motion／非対応フォールバックも実装容易。

### D2. X ロゴはカスタム SVG コンポーネント（vs MDI の `mdi-alpha-x-circle`）
**理由**: MDI の `mdi-alpha-x-circle` は X 公式ブランドガイドラインと異なる。公式 SVG path を直接使うことでブランド忠実性を担保。

### D3. Header はスクロール量で背景変化（vs 常に primary）
**理由**: モダンLPの標準パターン（透明 hero overlap → 不透明）。Hero の背景画像をフルに見せる効果がある。実装は `window.scrollY` を `mounted` で listen し computed で `:class` 切り替え。

### D4. ConceptCard 中央強調を「primary 反転」に（vs border 色変更のみ）
**理由**: 視覚的なヒエラルキーを強める。3枚のうち1枚を強くフィーチャーすることで「行きたいときだけ来ればいい」が最重要メッセージとして印象付けられる。

### D5. アンカーナビは `<a href="#id">` 派（vs Vue Router）
**理由**: SPA だが LP は1ページ構成。ハッシュアンカーは a11y 的にもキーボード操作的にも標準準拠で、Vue Router を入れるオーバーヘッドを避ける。

### D6. アニメーションは `opacity + transform: translateY` のみ（vs 複雑な keyframes）
**理由**: GPU アクセラレーション対応で滑らか／低スペック端末でも 60fps を維持／実装が単純。

---

## 9. Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Hero の CTA 文言ミスでクリック率低下 | A/B テストはしない（規模的に意味なし）。シンプルな日本語でユーザーフィードバックを直接受ける |
| Intersection Observer が古い Safari で動かない | `typeof IntersectionObserver === 'undefined'` ガードで即時表示にフォールバック |
| `prefers-reduced-motion` ユーザー体験が opt-out 強制になる | composable 側で必ず尊重、CSS でも `@media` 二重防御 |
| Header の透明→不透明遷移が Hero と重なって読みづらい | Hero 側で `padding-top` を `v-app-bar` 高さ分確保せず、Header を absolute（最初は透明）→ scroll で fixed に変更 |
| ConceptCard の primary 反転で中央が浮きすぎる | 中央カードのみ `elevation="6"`、両サイドは `elevation="2"` で奥行き差をつける |
| アンカースクロールが Header 高さで隠れる | `<section style="scroll-margin-top: 64px">` で補正 |

---

## 10. Migration Plan

このリリースは静的 UI のみで、データ移行・DB 変更・破壊的 API 変更なし。
PR レビュー → Render PR プレビューで目視確認 → master マージで即時反映。
ロールバックは `git revert` のみで完結。

---

## 11. Open Questions

- **Hero の背景画像**: 現行 `chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg` を継続使用で OK か？（バレーボールっぽくないが、画像差し替えは別 issue とした）→ **継続**
- ~~**CTA 1 の遷移先**: X プロフィール直リンクで OK か、それとも DM 直リンク URL を使うか？~~ → **【T-17 で X 撤廃】CTA 1 自体を削除**
- **Header の表示順**: `CONCEPT / ACTIVITIES / EVENT` の順序で固定 → **OK**
- **【T-17 追加】メンバー応募の代替動線**: メール公開・Google フォーム等の選択肢があるが、当面は **「準備中」表示で待機**（オーナー判断 / X 復活待ち）

---

## 12. ロギング設計

このリリースに新規ログなし（UI のみ）。
