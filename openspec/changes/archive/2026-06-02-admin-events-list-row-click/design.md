## Context

`/events` 一覧画面（admin）の `EventsTable.vue` は現在、タイトルセル内の `<router-link>` のみが clickable で、他セルは dead area。本 capability の `admin-events-list` spec は当初「同一行に編集リンクが既に存在し、誤操作リスクを避けるため行全体クリックは行わない」と決定していたが、編集列をクリック範囲から除外する形であれば誤操作懸念は解消できる。

技術スタック前提:

- `TableRow` (`apps/admin/src/shared/ui/TableRow.vue`) は既に `border-b border-hairline transition-colors hover:bg-paper-warm` を持つ。**行全体クリック化後はこの hover state がそのまま「クリック可能」の視覚フィードバック**として機能する
- 「日付」「ステータス」列ヘッダー (`<TableHead>`) は `<TableRow>` 外（ヘッダ行内）にあり、ソート挙動は行クリックの影響を受けない
- 「編集」列の `<router-link>` 遷移先は `/events/:id/edit` で、行全体の遷移先 `/events/:id` と異なるため、編集列クリック時は **行クリック遷移を奪う必要がある**
- 既存実装は shadcn-vue Table primitives（`<TableRow>` → `<tr>`）

## Goals / Non-Goals

**Goals:**

- 行内の主要セル（日付 / タイトル / 会場 / 時間 / 予約 / ステータス）クリックで `/events/:id` へ遷移
- 「編集」列クリックは `/events/:id/edit` を維持（行クリック遷移を奪う）
- 行ホバー時の視覚フィードバック（背景色変化）が出る
- キーボード操作（Tab で行に focus → Enter で遷移）対応
- ソート可能列ヘッダー（日付・ステータス）のソート機能が回帰しない
- a11y セマンティクス上、行 1 つあたりリンクは過剰に増やさない

**Non-Goals:**

- `apps/reservation` 側の行クリック範囲拡大（別 Issue で個別対応）
- DataTable プリミティブ層（`shared/ui/TableRow.vue`）の API 変更
- 「ステータス Badge クリック」「会場名クリック」等の意味付け（あくまで「行 = 詳細遷移」の一意な動線）

## Decisions

### Decision 1: 行全体クリック化の実装方式

**選択肢:**

- **A. オーバーレイ `<router-link class="absolute inset-0">` を日付セル内に配置** — `<tr>` と日付 `<TableCell>` を `relative` にして、絶対配置の透明リンクを敷く
- **B. 各セルを個別に `<router-link>` でラップ** — 「編集」列以外の各セルの中身を `<router-link>` で囲む
- **C. card-link パターン: タイトル列の `<router-link>` に `before:absolute before:inset-0 before:content-['']` を付与** — リンク本体はタイトル文字列、`::before` 疑似要素が `<TableRow class="relative">` を positioning context として行全体まで広がる

**選定: C（card-link `::before` パターン）**

**実装中に A から C に切り替えた経緯:**

当初は A（オーバーレイ link を日付セル内に配置）で実装したが、日付 `<TableCell>` 自身にも `relative` を付けてしまったため、`<a class="absolute inset-0">` の positioning context が日付セルになり、結果としてオーバーレイが日付セル分しか覆わないバグが発生（翔太郎くんから「日付エリアしか押せない」とフィードバック）。修正方針として「日付セルの `relative` を外して `<tr>` を context にする」も検討したが、ブラウザ間で `<tr>` への `position: relative` の扱いに微妙な差がある懸念があり、より堅牢で a11y セマンティクスとしても優れた C パターンに切り替えた。

**理由:**

- a11y: 行 1 つあたりリンクが 2 個（タイトルリンク + 編集リンク）で済む。B は最大 6 リンク/行 になり SR ナビゲーションが冗長
- セマンティクス: リンク本体がタイトル文字列そのもの。スクリーンリーダーには `aria-label="<イベント名> の詳細を見る"` で読み上げられる
- DOM 構造: B では各セルの `text-overflow / whitespace-nowrap / RemainBar / Badge` をリンクでラップする必要があり、レイアウトが崩れるリスクがある
- 堅牢性: `::before` の positioning context は `<TableRow class="relative">` を確実に拾う。`<tr>` への positioning は仕様上 OK だが、card-link `::before` パターンの方が広く使われており枯れた実装
- shadcn-vue Table primitives との相性: `<TableRow class="relative">` の追加で完結、Table 系プリミティブを改変しない

**実装メモ:**

- タイトル列 `<router-link>` のクラスに `before:absolute before:inset-0 before:content-['']` を追加。`<TableRow>` には `relative` を付与
- 編集列の `<router-link>` には `relative z-10` を付与し、`::before` より上層でクリックを奪う
- リンクテキスト自体は `block truncate max-w-[12rem] sm:max-w-xs hover:underline underline-offset-4` で従来どおり truncate、`title` 属性は `<TableCell>` 側に移管

### Decision 2: 行ホバー時の視覚フィードバック

**選定:** 既存の `TableRow` の `hover:bg-paper-warm` をそのまま使用。追加トークン・追加 utility は不要。

**理由:** 現状すでに hover 時に背景色が変わる状態が用意されているが、クリック可能なセルがタイトルのみだったため気付きにくかった。行全体クリック化により既存 hover state が初めて意味を持つ。

### Decision 3: キーボード操作

**選定:** オーバーレイ `<router-link>` を tabindex なしのデフォルト挙動（`<a>` はネイティブで Tab focus 可能）に任せる。Tab 順序は「日付列内のオーバーレイリンク」→「編集列リンク」となる。

**理由:**

- ネイティブ `<a>` の挙動を尊重することで Enter キー押下時の遷移は自動的に成立
- `tabindex` を明示しないことで、ブラウザのデフォルト focus visible リング（CSS `:focus-visible`）が機能する
- focus 時の視覚フィードバックは既存トークン (`--hq-color-accent` 等) を活用したい場合に Apply で追加検討

### Decision 4: テスト方針

**選定:** `EventsTable.spec.ts` に component test を 3 件追加。E2E は新規追加 SHALL NOT。

**理由:**

- 既存の `EventsTable.spec.ts` がすでに整備されており、router-link 配置確認は vue-router の memory mode + Vue Test Utils で十分検証可能
- E2E は 1 機能 1〜2 件ルール（CLAUDE.md Pillar 3）。本変更は既存「詳細遷移」E2E の延長で、新規 happy path は不要

**追加テストケース:**

1. 行内の日付セル（オーバーレイ）クリック → `/events/:id` 遷移
2. 「編集」列リンククリック → `/events/:id/edit` 遷移（オーバーレイに奪われない）
3. ソート可能ヘッダー（日付・ステータス）クリック → `update:sort` emit（行クリック遷移は発火しない）

## Risks / Trade-offs

- **[Risk] オーバーレイ `<router-link>` がセル内テキストの選択（drag select）を妨げる** → Mitigation: `user-select` を阻害しない CSS 設計（`<router-link>` を `absolute inset-0 pointer-events-auto` のみとし、テキスト自体は親 `<td>` 内に通常配置）。テキスト選択が必要なシナリオは現状想定されていない（コピペは詳細画面で対応）
- **[Risk] 行内に複数 `<router-link>` が並ぶことで SR ユーザーに「同行 = 詳細リンク + 編集リンク」が混乱しうる** → Mitigation: オーバーレイリンクに `aria-label="<event_name> の詳細を見る"` を設定し、編集リンクは既存テキスト「編集」を保持
- **[Risk] sortable header (`<TableHead>`) の `@click` がオーバーレイより上層になっていないと、ヘッダクリック時にオーバーレイへ伝搬する懸念** → Mitigation: ヘッダは `<TableRow>` 内ではなく `<TableHeader>` 内の別 `<tr>` にあり、ボディ行のオーバーレイとは別 DOM ツリー。伝搬問題は構造上発生しない

## Migration Plan

破壊的変更なし。spec 上は MODIFIED Requirement（行全体非リンク → 編集列除く行全体リンク）だが、UI 側は既存タイトルクリック動線を維持しつつ範囲を拡大する形のため、ユーザーから見ても無影響〜改善のみ。ロールバック手段: `EventsTable.vue` を revert すれば即復帰。

## Open Questions

なし。
