# Tasks: LP UI モダン化リフレッシュ

> **承認ゲート**: Proposal + Design + 本 Tasks の3点セットが承認済みであることを確認してから Apply する。

## 進捗

- 完了: 116 / 124 タスク（T-31 4件追加 / 残: 15.3/15.5/16.2/16.3/16.5/16.6 = 手動確認 5件 + PR 作成 1件）

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

## 18. UI フィードバック対応 #2（追加）

> **背景**: ユーザーローカル確認で 5 件の追加指摘を受領。全タスクをまとめて 1 コミットで実施（CLAUDE.md の新ルール「1 PR = 1 コミット」例外適用）。

- [x] 18.1 design.md §5 を更新（Header sticky 仕様、ConceptCard 静的化＋アクセントバー、Activities 画像撤去、Footer 1カラム化）
- [x] 18.2 HeaderLine: `scroll-behavior="elevate"` を削除し、`position: fixed; top: 0; z-index: 1000` を CSS で明示
- [x] 18.3 ConceptCard: hover の `transform/box-shadow` 強化を撤廃して静的化
- [x] 18.4 ConceptCard secondary: 中央カード**全体の背景を `secondary`（水色）に変更**。chip 背景は white、アイコン・文字は `primary`（navy）に統一してコントラスト確保（白→水色→白のサンドイッチ強調）
- [x] 18.5 ConceptCard 全カードに上端アクセントバー（高さ 4px）追加。通常: `secondary` / 中央: white
- [x] 18.6 ConceptSection: `.concept-grid` に `max-width: 100%; margin-inline: auto` を追加し、スクロールバー幅補正による右寄り解消
- [x] 18.7 ActivitiesSection: v-img 削除、v-row/v-col 撤廃して 1 カラム構成（テキスト + 準備中カード）に変更
- [x] 18.8 FooterLine: MENU カラム削除、ブランド + 1 行紹介文の 1 カラム構成に変更（紹介文の `<br>` 撤去）
- [x] 18.9 最終確認（vitest + build + grep）→ 全タスクまとめて 1 コミット

---

## 19. Header 構造根本見直し・配色 A 採用・カードはみ出し修正（追加）

> **背景**: design D3「透明 hero overlap」が機能していなかった原因 = `<v-app-bar>` が Vuetify app layout に組み込まれて `<v-main>` に padding-top を確保し、Hero が Header の下から始まっていた。あわせてカードのカラーバランスを案 A（ミニマル+強調アクセント）に切替、カードはみ出しと Footer © 色も修正。全タスクをまとめて 1 コミット。

- [x] 19.1 design.md §5 を更新（Header 根本見直し方針、ConceptCard 配色 A 採用）
- [x] 19.2 HeaderLine.vue を `<v-app-bar>` から **独自 `<header position: fixed>`** に書き換え
       （ロゴ + ナビ + ハンバーガーメニュー、scroll で background 切替、`text-shadow` でタイトル可読性確保）
- [x] 19.3 App.vue の `<v-main>` の padding-top を 0 に明示し、Hero が画面最上部から始まるよう構造調整
- [x] 19.4 グローバルに `html { overflow-y: scroll }` を追加し、スクロールバー出現/消失による幅変動を解消
       （カードはみ出しの原因対策）
- [x] 19.5 ConceptCard を **案 A（ミニマル + 強調アクセント）** に書き換え
       - 背景: 全カード白統一
       - アクセントバー: 通常 4px `secondary` / 中央 8px `primary`
       - アイコンチップ: 全カード `surface-alt` 背景、アイコン `primary`
       - 中央カード: 全周 2px solid `primary` ボーダー + 影濃いめ
       - 文字色: 全カード `primary`
- [x] 19.6 FooterLine の © コピーライトテキストを white に変更
- [x] 19.7 ConceptSection の謎の上線を実装側に存在しないことを確認
       （DevTools での確認が必要なら、ユーザーに確認依頼として残す）
- [x] 19.8 最終確認（vitest + build + grep）→ 全タスクまとめて 1 コミット

---

## 20. スマホ Header の wrap / はみ出し対策（追加）

> **背景**: ユーザーローカル確認で「スマホで High Q が 2 行になる」「navbar もはみ出ている」と指摘。flex layout の縮小・wrap 防止対策を追加。

- [x] 20.1 HeaderLine: `.header-brand` に `white-space: nowrap; flex-shrink: 0` を追加して wrap 防止
- [x] 20.2 HeaderLine: `.header-menu-btn` に `flex-shrink: 0` を追加してハンバーガー縮小防止
- [x] 20.3 HeaderLine: `.header-inner` に `overflow: hidden` を追加して子要素のはみ出し防止
- [x] 20.4 build 成功確認

---

## 21. ヘッダーが画面幅をはみ出す問題の根本対策（追加）

> **背景**: T-19 で追加した `html { overflow-y: scroll }` により body 幅がスクロールバー分縮んだ一方、`<header position: fixed>` は viewport 100vw 基準で広がるため、body より広くなり横スクロールが発生して header が画面右端を超えて見える事象。

- [x] 21.1 App.vue: `html { overflow-y: scroll }` を `scrollbar-gutter: stable` に置換 + `html, body { overflow-x: hidden }` 追加
- [x] 21.2 HeaderLine: `.header` に `width: 100%; max-width: 100vw; box-sizing: border-box` を明示してガード
- [x] 21.3 build 成功確認

---

## 22. ハンバーガーボタンの右見切れ修正（追加）

> **背景**: T-21 で header の幅は viewport 内に収まったが、ハンバーガーボタンが右に見切れる事象が残存。原因は `.header-inner` の右 padding が 8px しかなく、v-btn icon のデフォルトサイズ（48x48）が padding-right を超えて溢れていた。

- [x] 22.1 HeaderLine: `.header-inner` の padding を `16px 8px` → 左右対称 `16px` に変更
- [x] 22.2 HeaderLine: `.header-inner` に `width: 100%; box-sizing: border-box` を明示
- [x] 22.3 HeaderLine: ハンバーガー v-btn に `density="comfortable"` を追加してサイズ縮小（48→44px 程度）
- [x] 22.4 build 成功確認

---

## 23. ハンバーガーを独自 button に置換（追加）

> **背景**: T-22 後もハンバーガーが見切れる事象が残存。原因は v-btn の internal な min-width/padding（icon prop でも完全には消せない）が flex-shrink: 0 で縮められず溢れていた可能性。Vuetify 依存を捨てて独自 button で完全サイズコントロールに切替。

- [x] 23.1 HeaderLine: v-btn icon を独自 `<button>` + 内部 `<v-icon>` の構成に置換
- [x] 23.2 HeaderLine: `.header-menu-btn` を 40x40px 固定・透明背景・hover/focus 装飾を実装
- [x] 23.3 build 成功確認

---

## 24. HeaderLine を Teleport + 独自実装で最小化（追加）

> **背景**: T-19〜T-23 を経てもハンバーガーが画面右端からはみ出す事象が解消されない。原因の最有力候補は `<v-app>` 内部の transform/filter 等で fixed 要素の containing block が viewport から v-app に変わっていた可能性。
> **方針**: HeaderLine を **`<Teleport to="body">` で body 直下に脱出**させ、v-app の影響を完全排除。Vuetify の v-menu/v-list/v-btn にも依存せず、独自 button + Transition で完全コントロール。

- [x] 24.1 HeaderLine を `<Teleport to="body">` でレンダリング先を body 直下に変更
- [x] 24.2 内部実装をシンプル化: ロゴ + nav-desktop + 独自ハンバーガー button (3 本線) を `justify-content: space-between` で配置
- [x] 24.3 v-menu / v-list を撤廃し、独自モバイルメニューを `<Transition name="mobile-menu">` で開閉実装
- [x] 24.4 build 成功確認

---

## 25. overflow-x: hidden 撤去で他コンポーネントの右見切れ解消（追加）

> **背景**: T-21 で Header の見切れを `html, body { overflow-x: hidden }` で覆い隠していた。T-24 で Header を Teleport で body 直下に出し、fixed 要素の viewport 計算が正しく動くようになったため、overflow-x: hidden の保険は不要に。これがカード/カレンダーを右で切ってしまっていたため撤去。

- [x] 25.1 App.vue: `html, body { overflow-x: hidden }` を撤去（`scrollbar-gutter: stable` のみ残す）
- [x] 25.2 widgets/shared UI を grep して幅超過の元になる min-width / 大きな fixed width / 負の inset を確認 → 影響範囲は Hero の `.hero-bg { inset: -8px }`（`.hero` 内側で overflow: hidden 済み）と calendar の `min-width: 120px`（v-sheet 内）のみで、いずれも viewport は超えないことを確認
- [x] 25.3 build 成功確認

---

## 26. Hero テキストの改行修正（追加）

> **背景**: ユーザー指摘「サブテキスト・サブサブテキストの改行が不自然」。
> 期待形:
> - サブ: 「江東区を中心に活動しているバレーボールサークルです！」（改行なし1行）
> - サブサブ: 「立ち上げに伴って、メンバーを募集しています。」 改行 「20代〜30代の男女、がちがちの初心者の方から経験者の方まで幅広くメンバー募集中です。」（2行）

- [x] 26.1 HeroSection: hero-sub の `<br />` を撤去して 1 行に統一
- [x] 26.2 HeroSection: hero-body を「メンバーを募集しています。」直後だけ改行する 2 行構成に変更（残りの 3 つの `<br />` を撤去）

---

## 27. scrollbar-gutter 撤去で Hero/Content を viewport 全幅化（追加）

> **背景**: T-25 で `overflow-x: hidden` は撤去したが `scrollbar-gutter: stable` を残してしまい、html 全体に scrollbar 領域 (~15px) を予約した結果、Hero エリアと Activities (Content) セクションの背景色が viewport 幅に届かず右に余白ができていた。

- [x] 27.1 App.vue: `html { scrollbar-gutter: stable }` を撤去。html/body には一切 global ルールを当てない
- [x] 27.2 build 成功確認

> **トレードオフ**: デスクトップで縦スクロール出現時に ~15px のレイアウトシフトが一瞬起こる可能性があるが、Hero / Content セクションを viewport 全幅で表示することを優先（モダン LP では一般的な妥協点）。

---

## 28. body default margin リセットで Hero/Content を真の全幅に（追加）

> **背景**: T-27 で scrollbar-gutter を撤去しても Hero/Content の左右余白が変わらなかった。原因はブラウザ default の `body { margin: 8px }` が残っていたこと。`apps/lp/src/plugins/vuetify.js` で `vuetify/styles` を import していないため Vuetify の base reset が適用されず、body の余白が viewport から差し引かれていた。

- [x] 28.1 App.vue: `html, body { margin: 0; padding: 0 }` を global style に追加
- [x] 28.2 build 成功確認

> **設計判断**: Vuetify base styles を import すると既存スタイルへの広範な影響リスクがあるため、最小限の reset を App.vue に直接書くアプローチを採用

---

## 29. vuetify/styles の正規 import で右余白も含めて根本解消（追加）

> **背景**: T-28 で `body { margin: 0 }` だけ手書きリセットしたため左余白は消えたが右に余白が残った（v-application の layout が styles import なしで正しく組み立てられない事象）。ユーザー指摘の通り Vuetify base styles の import が正攻法。これにより body reset・v-app layout・v-main 計算がすべて正常化する。

- [x] 29.1 `apps/lp/src/plugins/vuetify.js` の先頭に `import "vuetify/styles"` を追加
- [x] 29.2 App.vue の手書き body reset (`html, body { margin: 0; padding: 0 }`) を撤去（vuetify/styles に任せる）
- [x] 29.3 build 成功確認・既存 scoped style と競合しないことを確認

> **教訓**: T-28 で「base styles import は影響範囲が広い」と判断したのは過剰なリスク評価だった。Vuetify component を使っている時点で base styles import は前提条件。最小限の reset だけ書くアプローチは中途半端で、結果として T-28 の左余白だけ解消、右余白を残す結果に。

---

## 30. 反省点の CLAUDE.md 反映 + Hero テキスト変更 + 全カードへの枠線追加（追加）

> **背景**: T-19〜T-29 の Header / overflow 関連で多数の応急手当て的修正を重ねてしまった反省を CLAUDE.md に明文化。あわせてユーザー指示の Hero テキスト微調整と、ConceptCard の通常カードへの枠線追加（中央カードのみ枠が付いていたため統一）。

- [x] 30.1 CLAUDE.md Pillar 5 に「不具合修正の原則（応急手当て禁止）」セクションを追加
       根本原因解消・影響範囲確認・連鎖修正のフローを明文化
- [x] 30.2 HeroSection: hero-body のテキストを 3 行構成に変更
       「新規メンバーを募集しています。」「20代〜30代の男女、…幅広くメンバー募集中です。」「上級者のかたもレベルを合わせていただける方は歓迎します！」
- [x] 30.3 ConceptCard: 通常カードに secondary（水色）の 2px 枠線を追加
       中央カードは引き続き primary（navy）枠で統一感を保持

---

## 31. ワークフローを CLAUDE.md に明文化（追加）

> **背景**: Sync / Archive のタイミング（マージ前 vs マージ後）と、マージ後の後始末（ブランチ削除・Issue クローズ）の手順が CLAUDE.md に明記されていなかった。ユーザー指示の正規フローを最重要原則とフェーズ定義に反映し、忘れないようにする。

- [x] 31.1 CLAUDE.md 最重要原則のフロー図を 9 ステップに更新（PR → ユーザー確認 → sync → archive → push → merge → 後始末）
- [x] 31.2 CLAUDE.md フェーズ定義表を 9 行に拡張、Sync が「マージ前」である旨と Archive 後の push / merge / 後始末を明記
- [x] 31.3 CLAUDE.md に「マージ後の後始末（必須）」セクション追加（branch 削除 + Issue close コマンド付き）
- [x] 31.4 `/opsx:sync` コマンドも openspec コマンド表に追加

---

## 備考・ブロッカー

- Issue 番号は Apply 開始時にユーザーから確定情報をもらう
- 画像差し替えは別 issue（本 PR では現行画像のまま）
- Render PR プレビューはイベントカレンダーが空表示になる（CORS 既知問題）が、レイアウト確認は可能
