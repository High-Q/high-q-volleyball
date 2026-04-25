# Proposal: LP UI モダン化リフレッシュ

> **承認ゲート**: このドキュメントをレビューし、Design / Tasks と合わせて3点セットを承認後に Apply へ進む。

## Why

現状の LP は **2018年頃のフラットデザイン** にとどまっており、モダンLPの基本要件（CTA・ナビゲーション・マイクロインタラクション・適切なリブランディング対応）が複数欠落している。さらに、リファクタ移行時に **`ActivitiesSection` がページに mount されておらず、import パスも壊れている** という機能不全状態。今、LPの第一印象が新規メンバー獲得の最大ボトルネックになっており、デザインリフレッシュとバグ修正をまとめて行うべきタイミング。

### 現状レビューの主な発見

| 領域 | 問題 | 重大度 |
|------|------|--------|
| **HomePage** | `ActivitiesSection` が呼ばれていない（コンテンツ欠落） | 致命的 |
| **ActivitiesSection** | import パスが旧 `./SubTitle.vue` のままで起動時エラー | 致命的 |
| **Hero** | CTA ボタンなし／スクロールヒントなし／背景画像が generic | 高 |
| **HeaderLine** | ナビゲーションメニュー皆無、`mdi-twitter` (旧アイコン) | 高 |
| **FooterLine** | リンク類なし、`mdi-twitter`、`#6A96A4` ハードコード | 高 |
| **ActivitiesSection** | `#F5F8FA`・`#6A96A4` ハードコード、`mdi-twitter` | 高 |
| **ConceptCard** | border-left＋角張ったカードはトレンド遅れ | 中 |
| **全体** | スクロール連動アニメーションなし、セクション境界が無味、フォーカス状態地味 | 中 |
| **a11y** | スキップリンクなし、アンカーナビなし | 中 |

## What Changes

### 修復（バグ）
- `HomePage.vue` に `ActivitiesSection` を mount
- `ActivitiesSection.vue` の import を `@shared/ui/SubTitle.vue` に修正
- 残存ハードコード値（`#F5F8FA`・`#6A96A4`・`mdi-twitter`）を全て撤廃

### 改善（モダン化）
- **Hero**: CTA ボタン2種（「メンバー募集中」→ X DMリンク、「イベントを見る」→ #event アンカー）、下部スクロールヒント追加
- **Header**: アンカーナビ（CONCEPT / ACTIVITIES / EVENT）追加。スクロール量に応じてスタイル変化（透明 → 不透明 + シャドウ）
- **Concept カード**: モダンな elevation + ホバー浮き上がり、border-left を廃止し全周シャドウへ
- **Activities**: 表示の修復＋画像差し替え可能な構造、SNSボタン (X) を改善
- **Footer**: アンカーリンク復習＋SNS＋コピーライトの3カラム化
- **アニメーション**: Intersection Observer による各セクションのフェードインアップ、`prefers-reduced-motion` 尊重
- **アイコン**: 全 `mdi-twitter` を X のロゴ（カスタム SVG または `mdi-alpha-x-circle` フォールバック）へ統一
- **デザイントークン**: `surface-alt`（セクション背景用 `#F5F8FA`）と `text-muted` を追加してハードコード一掃

### Non-Goals（今回スコープ外）

- カレンダーUIの大幅刷新（別 issue）
- ダークモード対応
- 画像差し替え（写真素材調達は別タスク・現行画像のまま運用）
- WebP/AVIF 変換
- OGP / メタタグ整備
- TypeScript 化

## Capabilities

### New Capabilities

なし（仕様レベルでの新規能力追加はなし）

### Modified Capabilities

- `lp-layout`: ナビゲーション・Hero CTA・Footer 構造を変更。新規 ID（`concept` / `activities` / `event`）でアンカー機能を追加。`ActivitiesSection` の表示を必須要件として明記。

## Impact

### 影響するコンポーネント・ファイル

- `apps/lp/src/plugins/vuetify.js` — surface-alt / text-muted トークン追加
- `apps/lp/src/pages/home/ui/HomePage.vue` — ActivitiesSection マウント、各セクションに ID 付与、フェードイン wrapper
- `apps/lp/src/widgets/hero-section/ui/HeroSection.vue` — CTA ボタン・スクロールヒント追加
- `apps/lp/src/widgets/concept-section/ui/ConceptSection.vue` — section ID
- `apps/lp/src/widgets/activities-section/ui/ActivitiesSection.vue` — import 修復、ハードコード撤廃、SNS ボタン改善、section ID
- `apps/lp/src/shared/ui/HeaderLine.vue` — アンカーナビ追加、X アイコン置換、スクロール反応
- `apps/lp/src/shared/ui/FooterLine.vue` — 3カラム化、アンカーリンク、X アイコン置換、ハードコード撤廃
- `apps/lp/src/shared/ui/ConceptCard.vue` — モダンカードへの再設計
- `apps/lp/src/shared/ui/XIcon.vue`（新規） — X 公式ロゴの inline SVG コンポーネント
- `apps/lp/src/shared/lib/useFadeInOnScroll.js`（新規） — Intersection Observer composable

### 制約・前提条件

- Vuetify 3 + 既存テーマトークンを最大限活用（独自 CSS 最小化）
- 既存テスト（eventQueries・useEventCalendar の計7件）は影響を受けない
- モバイル（375px）からデスクトップ（1280px+）まで全幅で破綻しない
- `prefers-reduced-motion: reduce` でアニメーションを無効化

### 成功基準

- [ ] `grep -r "#F5F8FA\|#6A96A4\|mdi-twitter" apps/lp/src/` が0件
- [ ] HomePage に4セクション（Hero / Concept / Activities / Event）すべてが表示される
- [ ] Header からアンカーリンクで各セクションへスムーズスクロールできる
- [ ] Hero の CTA 2種が機能する（X DM リンクと event アンカー）
- [ ] 各セクション初回スクロール到達でフェードイン
- [ ] `prefers-reduced-motion: reduce` でアニメーションが無効化される
- [ ] 既存テスト（7件）が GREEN を維持
- [ ] `pnpm build:lp` が成功
- [ ] モバイル（375px）でレイアウト破綻しない
