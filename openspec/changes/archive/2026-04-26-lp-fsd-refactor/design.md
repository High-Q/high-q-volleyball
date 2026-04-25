## Context

### 現状

```
apps/lp/src/
  App.vue               Options API・直接 import
  main.js
  plugins/vuetify.js    ← テーマトークンは定義済み（primary/#182F43, secondary/#85BBCC）
  components/           ← 全コンポーネントがフラットに混在
    EventContent.vue    ← fetch・状態管理・UI がすべて同居
    HeaderLine.vue
    HeaderLine_ori.vue  ← 未使用の旧ファイル
    FooterLine.vue
    MainImage.vue
    ConseptContent.vue  ← typo: "Consept"
    ConceptCard.vue
    ActivitiesContent.vue
    SubTitle.vue
    IconButtons.vue
  pages/
    HomePage.vue
  sass/variables.scss
```

**課題:**
- `components/` に役割の異なるコンポーネントが混在（レイヤー判別不能）
- `EventContent.vue` が fetch・ローカル状態・UI を1ファイルに抱えている
- 色値がインライン CSS にハードコードされている（Vuetify テーマトークンが使われていない）
- Loading / Empty / Error 状態の UI が存在しない

### 制約

- TypeScript 化はスコープ外（JavaScript のまま移行）
- `@unplugin-vue-components` による自動 import が有効なため、`<script>` の明示 import は一部不要
- `@` エイリアスは `./src` を指している

---

## Goals / Non-Goals

**Goals:**
- FSD レイヤー構造への再配置
- デザイントークン（Vuetify テーマ）の徹底適用
- TanStack Query によるイベントデータ取得の置き換え
- Loading / Empty / Error / Success の4状態実装

**Non-Goals:**
- TypeScript・`<script setup lang="ts">` への移行
- 新機能追加・UI デザインの変更
- ルーティング追加

---

## Decisions

### 1. FSD ディレクトリ構造

```
apps/lp/src/
  App.vue               ← Vite エントリーのため src/ 直下を維持
  main.js               ← 同上
  plugins/              ← Vuetify 初期化（FSD では app/ だが Vite 慣例で維持）
  assets/               ← 画像など（変更なし）
  sass/                 ← グローバル SCSS（変更なし）

  pages/
    home/
      ui/HomePage.vue   ← 移動（pages/HomePage.vue → pages/home/ui/）
      index.js

  widgets/
    hero-section/
      ui/HeroSection.vue          ← リネーム（MainImage → HeroSection）
      index.js
    concept-section/
      ui/ConceptSection.vue       ← リネーム（ConseptContent → ConceptSection）
      index.js
    activities-section/
      ui/ActivitiesSection.vue    ← リネーム（ActivitiesContent → ActivitiesSection）
      index.js
    event-calendar/
      ui/EventCalendar.vue        ← UI部分（旧 EventContent.vue の template）
      ui/EventDetailDialog.vue    ← ダイアログを分離
      model/useEventCalendar.js   ← TanStack Query composable（旧 fetchEvents）
      index.js

  entities/
    event/
      api/eventQueries.js         ← queryOptions（AWS API Gateway）
      index.js

  shared/
    ui/
      HeaderLine.vue    ← 移動
      FooterLine.vue    ← 移動
      ConceptCard.vue   ← 移動
      SubTitle.vue      ← 移動
      IconButtons.vue   ← 移動
    api/
      awsClient.js      ← fetch wrapper（AWS API Gateway URL を集約）
```

**理由:** `main.js`・`App.vue`・`plugins/` は Vite エントリー規約上 src/ 直下を維持する。FSD の `app/` レイヤーに相当するが、今回の移動コストを最小化する。

**代替案:** `src/app/` に完全移行 → `vite.config.js` の `input` 変更が必要で破壊リスクあり。TypeScript 化と同時に行う判断とする。

### 2. パスエイリアスの追加

`vite.config.js` に FSD レイヤーへのエイリアスを追加する。

```javascript
alias: {
  '@':          fileURLToPath(new URL('./src', import.meta.url)),
  '@pages':     fileURLToPath(new URL('./src/pages', import.meta.url)),
  '@widgets':   fileURLToPath(new URL('./src/widgets', import.meta.url)),
  '@entities':  fileURLToPath(new URL('./src/entities', import.meta.url)),
  '@shared':    fileURLToPath(new URL('./src/shared', import.meta.url)),
}
```

### 3. TanStack Query の導入

`@tanstack/vue-query` を追加し、`VueQueryPlugin` を `plugins/index.js` で登録。

`EventContent.vue` の手書き fetch ロジックを以下に分離する：
- `entities/event/api/eventQueries.js` — `queryOptions`（クエリキー・fetch関数）
- `widgets/event-calendar/model/useEventCalendar.js` — `useQuery` を呼ぶ composable
- `EventCalendar.vue` は `setup()` で composable を呼び出し、Options API の `data()` を排除

**代替案:** Options API の `mounted` に `useQuery` をそのまま書く → setup() 不使用で可だが、テスト不能・責務混在のため却下。

### 4. デザイントークン適用

`vuetify.js` に `primary: "#182F43"`・`secondary: "#85BBCC"` が定義済み。
コンポーネント内のインライン CSS を Vuetify ユーティリティクラス・`color` prop に置き換える。

```css
/* Before */
color: #182F43;
background-color: #85BBCC;

/* After */
class="text-primary"
color="secondary"
```

### 5. 4状態の実装

TanStack Query の `isPending`・`isError`・`data` を使い `v-if` / `v-else-if` で切り替える。

| 状態 | 条件 | 表示 |
|------|------|------|
| Loading | `isPending` | `v-skeleton-loader` |
| Error | `isError` | `v-alert type="error"` |
| Empty | `!isPending && events.length === 0` | テキストメッセージ |
| Success | それ以外 | 既存カレンダー |

---

## Risks / Trade-offs

- **[Risk] `unplugin-vue-components` の自動解決が FSD パスに対応しているか** → ファイル移動後に `vite.config.js` の `include` パスが拾うか確認が必要。Mitigation: `pnpm dev` で即確認する。
- **[Risk] `HeaderLine_ori.vue` が参照されている可能性** → `grep` で確認し、未参照なら削除。
- **[Trade-off] Options API の維持** → `setup()` 関数内に TanStack Query を局所的に使うハイブリッドになる。TypeScript 化時に Composition API へ一本化する。

---

## Migration Plan

1. パスエイリアスと TanStack Query のセットアップ（Vite config・plugins）
2. `entities/event/` の作成（型・クエリオプション）
3. `widgets/event-calendar/` の作成（composable + UI コンポーネント分離）
4. `shared/ui/` への静的コンポーネント移動
5. `widgets/` への各セクションコンポーネント移動
6. `pages/home/` への HomePage 移動
7. `App.vue` の import パス更新
8. `components/HeaderLine_ori.vue` の削除
9. ローカル動作確認

ロールバック: git で差し戻し可能。Render へのデプロイは PR プレビューで確認後。

---

## Open Questions

- なし（スコープを TypeScript 化と明確に分離済み）
