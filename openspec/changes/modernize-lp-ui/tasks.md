# Tasks: LP UI モダン化リフレッシュ

> **承認ゲート**: Proposal + Design + 本 Tasks の3点セットが承認済みであることを確認してから Apply する。

## 進捗

- 完了: 62 / 70 タスク（残: 15.3/15.5/16.2/16.3/16.5/16.6 = 手動確認 5件 + PR 作成 1件）

---

## 1. セットアップ

- [x] 1.1 `feature/107-modernize-lp-ui` ブランチを作成
- [x] 1.2 既存テスト7件が GREEN（`pnpm exec vitest run`）であることを確認
- [x] 1.3 ローカル起動（`pnpm dev:lp`）で4セクション中3つ（Hero/Concept/Event）が表示されることを baseline 撮影（レビュー時画面確認済みのためスキップ）

## 2. デザイントークン拡張

- [x] 2.1 `apps/lp/src/plugins/vuetify.js` に `surface-alt: "#F5F8FA"` と `text-muted: "#6A96A4"` を追加
- [x] 2.2 既存トークン（primary / secondary / third）と並ぶ位置に追記し、コメントで用途を明記

## 3. shared/ui/XIcon コンポーネント新規作成

- [x] 3.1 `apps/lp/src/shared/ui/XIcon.vue` を作成（公式 X ロゴの inline SVG）
  - props: `size`(Number, default 24), `color`(String, default 'currentColor')
  - `aria-hidden="true"` を付与
- [x] 3.2 `apps/lp/src/shared/ui/XIcon.spec.js` を作成（5テスト GREEN）
  - props.size が svg width/height にバインド
  - props.color が path fill にバインド

## 4. shared/lib/useFadeInOnScroll composable 新規作成

- [x] 4.1 `apps/lp/src/shared/lib/useFadeInOnScroll.js` を作成
  - IntersectionObserver で要素到達検知
  - `prefers-reduced-motion: reduce` のとき即時 `isVisible = true`
  - `IntersectionObserver === undefined` のとき即時 `isVisible = true`
  - `onBeforeUnmount` で `observer.disconnect()`
- [x] 4.2 `apps/lp/src/shared/lib/useFadeInOnScroll.spec.js` を作成（7テスト GREEN）
  - 通常: observer 発火後 `isVisible.value === true`
  - reduced-motion: 初期から `true`
  - undefined フォールバック: 初期から `true`
  - unmount で `disconnect` 呼び出し

## 5. ActivitiesSection の修復と整備（バグ修正）

- [x] 5.1 `apps/lp/src/widgets/activities-section/ui/ActivitiesSection.vue`: `import SubTitle from "./SubTitle.vue"` を `import SubTitle from "@shared/ui/SubTitle.vue"` に修正
- [x] 5.2 同ファイルの `style="background-color: #F5F8FA;"` を `class="bg-surface-alt"`（または scoped CSS でトークン参照）に置換
- [x] 5.3 `<v-btn color="#6A96A4">` を `<v-btn color="third">` に置換
- [x] 5.4 SNS ボタンの `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="18" color="white" />` に置換し、`aria-label="X (Twitter) でお問い合わせ"` 付与
- [x] 5.5 `<section>` ルート要素に `id="activities"` を追加

## 6. Hero セクションに CTA とスクロールヒント追加

- [x] 6.1 `apps/lp/src/widgets/hero-section/ui/HeroSection.vue` に CTA エリアを追加
  - 「X でお問い合わせ」ボタン（`color="secondary" variant="flat"` + `XIcon` prepend、`href="https://twitter.com/c8w5y" target="_blank"`、`aria-label`）
  - 「イベントを見る」ボタン（`color="white" variant="outlined"`、`href="#event"`）
- [x] 6.2 Hero 下部中央に `<v-icon icon="mdi-chevron-double-down" aria-hidden="true">` のスクロールヒントを追加（`@keyframes bounce` で上下に揺れるアニメーション）
- [x] 6.3 CTA レイアウト: xs は縦積み、sm 以上は横並び（gap 16px）
- [x] 6.4 高さを sm 以下 480px / md 以上 560px に変更（メディアクエリ）

## 7. Header の刷新（アンカーナビ・スクロール反応・X アイコン）

- [x] 7.1 `apps/lp/src/shared/ui/HeaderLine.vue` に `data() { return { scrolled: false } }` を追加し、`mounted/beforeUnmount` で `scroll` イベントを listen
- [x] 7.2 `<v-app-bar :color="scrolled ? 'primary' : 'transparent'" :elevation="scrolled ? 4 : 0">` で動的切替
- [x] 7.3 ナビボタン3つを追加: CONCEPT (`href="#concept"`) / ACTIVITIES (`href="#activities"`) / EVENT (`href="#event"`)
  - md+ ではテキストボタン横並び
  - xs/sm では `v-app-bar-nav-icon` + `v-menu` でドロップダウン
- [x] 7.4 SNS ボタンの `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="20" color="white" />` に置換
- [x] 7.5 全セクションに `scroll-margin-top: 64px` を CSS で設定（ヘッダー高さ補正、HomePage の各 wrapper か共通スタイルに）

## 8. ConceptCard の再設計（モダンカード化）

- [x] 8.1 `apps/lp/src/shared/ui/ConceptCard.vue` の border-left スタイルを廃止
- [x] 8.2 `border-radius: 16px` + `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` の elevation 表現に変更
- [x] 8.3 ホバー時 `transform: translateY(-4px)` + `box-shadow` 強化（200ms transition）
- [x] 8.4 アイコンサイズを 80px → 56px に縮小、上部に丸い `surface-alt` チップ背景を追加
- [x] 8.5 `secondary` prop（中央カード強調）の挙動を「primary 反転（背景 primary・文字 white）+ elevation 強化」に変更
- [x] 8.6 `prefers-reduced-motion: reduce` で transition 無効化

## 9. ConceptSection の調整

- [x] 9.1 `<section>` ルート要素に `id="concept"` を追加
- [x] 9.2 `useFadeInOnScroll` を組み込み、ルート要素で `ref` バインド・`is-visible` クラス切替
- [x] 9.3 フェードイン用 CSS（`opacity: 0 → 1`、`translateY(24px) → 0`、600ms transition、reduced-motion 例外）を追加

## 10. ActivitiesSection の追加調整（モダン化）

- [x] 10.1 `useFadeInOnScroll` を組み込み・フェードイン CSS を追加
- [x] 10.2 セクションルートを `<section id="activities" class="bg-surface-alt">` 形式に統一

## 11. EventCalendar セクションの ID 付与とフェードイン

- [x] 11.1 `apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` の `<section>` に `id="event"` を追加
- [x] 11.2 `useFadeInOnScroll` を組み込み・フェードイン CSS を追加（既存ロジックを壊さないよう wrapper で対応）

## 12. Footer の3カラム化

- [x] 12.1 `apps/lp/src/shared/ui/FooterLine.vue` を3カラム構成に再設計
  - カラム1: サークル名 + 紹介文（江東区バレーボールサークル）
  - カラム2: アンカーナビ（CONCEPT / ACTIVITIES / EVENT）
  - カラム3: SNS（X リンク + `XIcon`）
- [x] 12.2 レスポンシブ: lg 3列 / md 2列 / sm 以下 1列
- [x] 12.3 `style="color: #6A96A4"` を `class="text-muted"` または `text-color: rgb(var(--v-theme-text-muted))` に置換
- [x] 12.4 `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="20" color="white" />` に置換

## 13. HomePage の組み立て

- [x] 13.1 `apps/lp/src/pages/home/ui/HomePage.vue` の template に `<ActivitiesSection />` を Concept と Event の間に追加
- [x] 13.2 `import { ActivitiesSection } from '@widgets/activities-section'` を script に追加し `components` に登録
- [x] 13.3 マウント順: Hero → Concept → Activities → Event の順序で表示されることを確認

## 14. ハードコード撲滅検証

- [x] 14.1 `grep -rn "#F5F8FA\|#6A96A4\|#182F43\|#85BBCC" apps/lp/src/ | grep -v plugins/vuetify.js` が 0 件
- [x] 14.2 `grep -rn "mdi-twitter" apps/lp/src/` が 0 件
- [x] 14.3 残存していたら個別に置換し、再度 grep で 0 件確認（hero overlay の rgba(24,47,67) を rgba(var(--v-theme-primary)) に置換）

## 15. アクセシビリティ確認

- [x] 15.1 全 SNS ボタン・CTA に `aria-label` が付与されている（grep 確認済）
- [x] 15.2 アンカーリンクが Tab キーで順序通りフォーカスできる（`<a href="#...">` / `v-btn href="#..."` を使用、Vuetify default の outline を保持）
- [ ] 15.3 `prefers-reduced-motion: reduce` でアニメーションが停止することを Chrome DevTools で確認（手動・PR 時）
- [x] 15.4 `XIcon` SVG に `aria-hidden="true"` が付与されている（grep 確認済）
- [ ] 15.5 主要テキストのコントラスト比 AA（4.5:1）以上を Lighthouse で確認（手動・PR 時。design 時試算では primary on white = 12.6:1）

## 16. 動作確認・PR

- [x] 16.1 `pnpm exec vitest run` で全テスト（既存7件 + 新規 useFadeInOnScroll/XIcon）が GREEN（19/19）
- [ ] 16.2 `pnpm dev:lp` でローカル起動し以下を確認（ユーザー手動）
  - Hero に CTA 2種が表示・クリックで遷移／アンカーが動く
  - Header アンカー3つで各セクションへスクロール
  - Header がスクロール反応で透明 → primary 切替
  - Concept カードのホバー浮き上がり
  - Activities が表示されている
  - Footer 3カラム構成
  - 各セクション初回スクロール到達でフェードイン
- [ ] 16.3 Chrome DevTools で 375px / 768px / 1280px のレイアウトを目視確認（ユーザー手動）
- [x] 16.4 `pnpm build:lp` でビルド成功（CSS 101.70 kB / JS 350.24 kB）
- [ ] 16.5 PR を作成（base: master、本 change と issue #107 を関連付け）
- [ ] 16.6 Render PR プレビューで本番ドメイン以外でもレイアウトと動作を確認（ユーザー手動）

---

## 17. X 凍結対応・セクション見出し統一・Header フルブリード化（追加）

> **背景**: X 公式アカウントが凍結中につき、SNS リンクと X 経由 CTA を全撤廃。
> あわせてセクション見出しデザインの不統一と Header の左右余白を整理する。

- [x] 17.1 design.md §2/§5/§11 を更新（X 撤廃方針、SectionDivider、Header フルブリード）
- [x] 17.2 `apps/lp/src/shared/ui/SectionDivider.vue` を新規作成（タイトル + 下線の共通コンポーネント）
- [x] 17.3 ConceptSection の section-title + section-hr を SectionDivider に置換
- [x] 17.4 ActivitiesSection の SubTitle を SectionDivider に置換
- [x] 17.5 EventCalendar の section-header (section-title + section-bar) を SectionDivider に置換
- [x] 17.6 Hero CTA「X でお問い合わせ」を削除、「イベントを見る」のみ。サブに「メンバー受付窓口は準備中です」テキスト追加
- [x] 17.7 HeaderLine の X アイコンボタンを削除（XIcon import も削除）
- [x] 17.8 HeaderLine をフルブリード化（v-app-bar の左右 padding 0）
- [x] 17.9 FooterLine の SNS カラムを削除、ブランド + ナビの 2 カラム構成に変更（XIcon import 削除）
- [x] 17.10 ActivitiesSection の X ボタンを「メンバー受付窓口は準備中です」テキストに置換（XIcon import 削除）
- [x] 17.11 セクション左右余白の差を v-container の使い方で統一（ActivitiesSection の v-row に no-gutters を付与し、Vuetify v-row の negative margin による左右ズレを解消）
- [x] 17.12 `grep -rn "XIcon" apps/lp/src/` で残存箇所を確認（XIcon.vue と XIcon.spec.js のみ残存。X 復活時の再利用用に保持）
- [x] 17.13 vitest run (19/19 GREEN) + pnpm build:lp (成功・CSS 102KB/JS 349KB) + grep 検証 (ハードコード/mdi-twitter/stray XIcon すべて0件) で最終確認

---

## 備考・ブロッカー

- Issue 番号は Apply 開始時にユーザーから確定情報をもらう
- 画像差し替えは別 issue（本 PR では現行画像のまま）
- Render PR プレビューはイベントカレンダーが空表示になる（CORS 既知問題）が、レイアウト確認は可能
