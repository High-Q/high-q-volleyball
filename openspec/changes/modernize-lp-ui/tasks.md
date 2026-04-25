# Tasks: LP UI モダン化リフレッシュ

> **承認ゲート**: Proposal + Design + 本 Tasks の3点セットが承認済みであることを確認してから Apply する。

## 進捗

- 完了: 3 / 57 タスク

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

- [ ] 5.1 `apps/lp/src/widgets/activities-section/ui/ActivitiesSection.vue`: `import SubTitle from "./SubTitle.vue"` を `import SubTitle from "@shared/ui/SubTitle.vue"` に修正
- [ ] 5.2 同ファイルの `style="background-color: #F5F8FA;"` を `class="bg-surface-alt"`（または scoped CSS でトークン参照）に置換
- [ ] 5.3 `<v-btn color="#6A96A4">` を `<v-btn color="third">` に置換
- [ ] 5.4 SNS ボタンの `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="18" color="white" />` に置換し、`aria-label="X (Twitter) でお問い合わせ"` 付与
- [ ] 5.5 `<section>` ルート要素に `id="activities"` を追加

## 6. Hero セクションに CTA とスクロールヒント追加

- [ ] 6.1 `apps/lp/src/widgets/hero-section/ui/HeroSection.vue` に CTA エリアを追加
  - 「X でお問い合わせ」ボタン（`color="secondary" variant="flat"` + `XIcon` prepend、`href="https://twitter.com/c8w5y" target="_blank"`、`aria-label`）
  - 「イベントを見る」ボタン（`color="white" variant="outlined"`、`href="#event"`）
- [ ] 6.2 Hero 下部中央に `<v-icon icon="mdi-chevron-double-down" aria-hidden="true">` のスクロールヒントを追加（`@keyframes bounce` で上下に揺れるアニメーション）
- [ ] 6.3 CTA レイアウト: xs は縦積み、sm 以上は横並び（gap 16px）
- [ ] 6.4 高さを sm 以下 480px / md 以上 560px に変更（メディアクエリ）

## 7. Header の刷新（アンカーナビ・スクロール反応・X アイコン）

- [ ] 7.1 `apps/lp/src/shared/ui/HeaderLine.vue` に `data() { return { scrolled: false } }` を追加し、`mounted/beforeUnmount` で `scroll` イベントを listen
- [ ] 7.2 `<v-app-bar :color="scrolled ? 'primary' : 'transparent'" :elevation="scrolled ? 4 : 0">` で動的切替
- [ ] 7.3 ナビボタン3つを追加: CONCEPT (`href="#concept"`) / ACTIVITIES (`href="#activities"`) / EVENT (`href="#event"`)
  - md+ ではテキストボタン横並び
  - xs/sm では `v-app-bar-nav-icon` + `v-menu` でドロップダウン
- [ ] 7.4 SNS ボタンの `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="20" color="white" />` に置換
- [ ] 7.5 全セクションに `scroll-margin-top: 64px` を CSS で設定（ヘッダー高さ補正、HomePage の各 wrapper か共通スタイルに）

## 8. ConceptCard の再設計（モダンカード化）

- [ ] 8.1 `apps/lp/src/shared/ui/ConceptCard.vue` の border-left スタイルを廃止
- [ ] 8.2 `border-radius: 16px` + `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` の elevation 表現に変更
- [ ] 8.3 ホバー時 `transform: translateY(-4px)` + `box-shadow` 強化（200ms transition）
- [ ] 8.4 アイコンサイズを 80px → 56px に縮小、上部に丸い `surface-alt` チップ背景を追加
- [ ] 8.5 `secondary` prop（中央カード強調）の挙動を「primary 反転（背景 primary・文字 white）+ elevation 強化」に変更
- [ ] 8.6 `prefers-reduced-motion: reduce` で transition 無効化

## 9. ConceptSection の調整

- [ ] 9.1 `<section>` ルート要素に `id="concept"` を追加
- [ ] 9.2 `useFadeInOnScroll` を組み込み、ルート要素で `ref` バインド・`is-visible` クラス切替
- [ ] 9.3 フェードイン用 CSS（`opacity: 0 → 1`、`translateY(24px) → 0`、600ms transition、reduced-motion 例外）を追加

## 10. ActivitiesSection の追加調整（モダン化）

- [ ] 10.1 `useFadeInOnScroll` を組み込み・フェードイン CSS を追加
- [ ] 10.2 セクションルートを `<section id="activities" class="bg-surface-alt">` 形式に統一

## 11. EventCalendar セクションの ID 付与とフェードイン

- [ ] 11.1 `apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` の `<section>` に `id="event"` を追加
- [ ] 11.2 `useFadeInOnScroll` を組み込み・フェードイン CSS を追加（既存ロジックを壊さないよう wrapper で対応）

## 12. Footer の3カラム化

- [ ] 12.1 `apps/lp/src/shared/ui/FooterLine.vue` を3カラム構成に再設計
  - カラム1: サークル名 + 紹介文（江東区バレーボールサークル）
  - カラム2: アンカーナビ（CONCEPT / ACTIVITIES / EVENT）
  - カラム3: SNS（X リンク + `XIcon`）
- [ ] 12.2 レスポンシブ: lg 3列 / md 2列 / sm 以下 1列
- [ ] 12.3 `style="color: #6A96A4"` を `class="text-muted"` または `text-color: rgb(var(--v-theme-text-muted))` に置換
- [ ] 12.4 `<v-icon>mdi-twitter</v-icon>` を `<XIcon :size="20" color="white" />` に置換

## 13. HomePage の組み立て

- [ ] 13.1 `apps/lp/src/pages/home/ui/HomePage.vue` の template に `<ActivitiesSection />` を Concept と Event の間に追加
- [ ] 13.2 `import { ActivitiesSection } from '@widgets/activities-section'` を script に追加し `components` に登録
- [ ] 13.3 マウント順: Hero → Concept → Activities → Event の順序で表示されることを確認

## 14. ハードコード撲滅検証

- [ ] 14.1 `grep -rn "#F5F8FA\|#6A96A4\|#182F43\|#85BBCC" apps/lp/src/ | grep -v plugins/vuetify.js` が 0 件
- [ ] 14.2 `grep -rn "mdi-twitter" apps/lp/src/` が 0 件
- [ ] 14.3 残存していたら個別に置換し、再度 grep で 0 件確認

## 15. アクセシビリティ確認

- [ ] 15.1 全 SNS ボタン・CTA に `aria-label` が付与されている
- [ ] 15.2 アンカーリンクが Tab キーで順序通りフォーカスできる
- [ ] 15.3 `prefers-reduced-motion: reduce` でアニメーションが停止することを Chrome DevTools で確認
- [ ] 15.4 `XIcon` SVG に `aria-hidden="true"` が付与されている
- [ ] 15.5 主要テキストのコントラスト比 AA（4.5:1）以上を Lighthouse で確認

## 16. 動作確認・PR

- [ ] 16.1 `pnpm exec vitest run` で全テスト（既存7件 + 新規 useFadeInOnScroll/XIcon）が GREEN
- [ ] 16.2 `pnpm dev:lp` でローカル起動し以下を確認
  - Hero に CTA 2種が表示・クリックで遷移／アンカーが動く
  - Header アンカー3つで各セクションへスクロール
  - Header がスクロール反応で透明 → primary 切替
  - Concept カードのホバー浮き上がり
  - Activities が表示されている
  - Footer 3カラム構成
  - 各セクション初回スクロール到達でフェードイン
- [ ] 16.3 Chrome DevTools で 375px / 768px / 1280px のレイアウトを目視確認
- [ ] 16.4 `pnpm build:lp` でビルド成功
- [ ] 16.5 PR を作成（base: master、本 change と issue を関連付け）
- [ ] 16.6 Render PR プレビューで本番ドメイン以外でもレイアウトと動作を確認

---

## 備考・ブロッカー

- Issue 番号は Apply 開始時にユーザーから確定情報をもらう
- 画像差し替えは別 issue（本 PR では現行画像のまま）
- Render PR プレビューはイベントカレンダーが空表示になる（CORS 既知問題）が、レイアウト確認は可能
