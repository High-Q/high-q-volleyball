# Design: admin イベント一覧画面

> 関連: proposal.md / specs/admin-events-list/spec.md / Issue #85 / Epic #167
> Apply 開始時の宣言: 「project.md と本 design.md を読み直しました。現在の進捗: 0 / N タスク完了。技術制約: FSD レイヤー / shadcn-vue 機能系プリミティブ / Tailwind preset / `event_list_view` 単一クエリ」

---

## 0. Context

`apps/admin` は #84 で AAL2 + admin role の認証下に置かれ、ログイン後は `HomePlaceholder.vue`（"準備中" のまま）を表示する。本 change で `/events` 画面を本実装し、admin が events を実際に管理できる起点を作る。

スキーマは #173 で events / venues / reservations / members / identity_documents が確立済み。RLS も既に各テーブルで設定済み（events.SELECT は anon 含めて全公開、reservations.SELECT は自分の予約 + admin は全件）。残席集計用の view は本 change で新設する。

UI スタックは admin-reservation-ui-foundation（#175）で確立済み: `@high-q/ui`（意匠系）+ shadcn-vue（機能系）+ `@high-q/tailwind-preset`。本 change では新たに `Table` / `Select` / `Skeleton` の 3 プリミティブを admin に取り込む。

デザインサンプル `docs/10-デザインサンプル/admin/hq-admin-screens.jsx` の `ScreenEventsList`（line 261-）が 4 状態すべての参照実装を提供しており、本実装はこれを HQ token / Tailwind preset で再現する。

---

## 1. Goals / Non-Goals

### Goals

- admin が `/events` で実データを DataTable 形式で閲覧でき、期間/会場/ステータス/検索/ソート/ページネーションで絞り込める
- 残席バー（RemainBar）で予約状況を一目で把握できる
- 4 状態（Loading / Empty / Error / Success）を網羅し、Error 時は具体的なエラーコードと再試行 CTA を提示する
- 「新規作成」CTA から `/events/new` へ遷移できる（実体は #86 で実装、本 change ではプレースホルダ）
- フィルタ・検索・ソート・ページの状態が URL クエリで同期され、リロード/戻る/進むで復元される
- アクセシビリティ AA 準拠（`<table>` セマンティクス / `aria-sort` / `role="alert"` / キーボードナビ）
- データ取得は SQL view `event_list_view` 経由の単一クエリに統一し、N+1 クエリを発生させない

### Non-Goals

- カレンダービュー / 過去から複製 / 一括公開・終了 (bulk actions) / CSV エクスポート（Issue で明示的に MVP2 押し下げ）
- 行選択チェックボックス（bulk actions 用なので不要）
- イベント編集フォーム（#86）/ 削除実装（別 Issue）
- イベント詳細画面（`/events/:id`）の遷移
- モバイルレイアウト（1280px desktop 主、モバイルは MVP2）
- 公開後の Toast 表示（編集 #86 の責務）
- 会場マスタ・ステータスマスタの編集 UI

---

## 2. Decisions

### D1. データ取得は SQL view `event_list_view` で単一クエリに統一

**選択**: events × venues × reservations の集計を持つ view を 1 つ DB に追加し、admin クライアントは view を `select * from event_list_view` で fetch する。

**代替案**:
- (a) クライアント側で events と reservations を別クエリして join: N+1 / RLS 漏れ（reservations は `is_admin()` で全件返るが、admin は自分が誰か関係なく全件 SELECT 可能なので技術的には可能）/ ページネーション後の集計コスト
- (b) RPC（PL/pgSQL function）として実装: パラメータが多くなりがちで、シグネチャ変更時の破壊的変更コストが高い
- (c) Supabase の `select(..., reservations(count))` 関係クエリ: PostgREST のネスト集計は `count` の絞り込み条件（`status = 'reserved'`）を表現しづらく、view ほど明示的でない

**Why**:
- view 化することで「reserved_count の定義」を SQL 1 箇所に閉じ込められる。将来的に「ウェイトリスト含む / 同伴者含む」などのルール変更があった場合の影響範囲が view 内のみに限定される
- 単一 SELECT で完結するため、ページネーションの offset/limit が綺麗に効く
- テストでも view を mock できれば全フィルタ条件をカバーできる

**Trade-off**:
- view 自体のパフォーマンス: `COUNT FILTER` のサブクエリは reservations の `(event_id, status)` 部分インデックスで高速化される（既存仕様で確保済み）
- view の RLS 透過性: PostgreSQL の view は参照テーブルの RLS を継承する（SECURITY INVOKER）。reservations の RLS が admin だけ全件、それ以外は自分の予約のみ、という条件下で view を呼ぶと、非 admin が呼んだ場合 reserved_count が誤った値（自分の予約分のみ）を返す。これは「admin アプリでのみ呼ぶ」契約で対応し、anon に GRANT しないことで物理的にも遮断する

### D2. shadcn-vue から取り込むのは Table / Select / Skeleton の 3 つ

**選択**: shadcn-vue CLI で `Table` / `Select` / `Skeleton` を取り込み、`apps/admin/src/shared/ui/` に配置する。

**代替案**:
- (a) `@high-q/ui` に `DataTable` を意匠系として追加: 機能系プリミティブを意匠側に混ぜると棲み分けが崩れ、a11y 実装の負担が増す
- (b) より統合された shadcn-vue の `DataTable`（TanStack Table ベース）を使う: 本 Issue の要件に対しオーバースペック。フィルタ・ソート・ページネーションは独自 composable で十分、Table プリミティブだけ欲しい

**Why**:
- CLAUDE.md Pillar 3 の棲み分け（意匠系 = `@high-q/ui` / 機能系 = shadcn-vue）に従う
- shadcn-vue の `Table` は `<table>` セマンティクスをそのまま使うシンプル実装で、`aria-sort` 等の追加 a11y 属性も付けやすい
- `Skeleton` は Loading 状態専用に shadcn-vue から取り込むのが軽量

**Trade-off**:
- shadcn-vue の `Select` は radix-vue (Listbox) ベースで、ネイティブ `<select>` とは異なるが、a11y は radix-vue で担保される
- 取り込み後はリポジトリ内のコードとなり、shadcn-vue の upstream 修正は手動 merge

### D3. フィルタ・検索・ソート・ページの状態は URL クエリ同期

**選択**: `useEventsFilter` composable が `vue-router` の `useRoute` / `useRouter` を介して、URL クエリ（`?period=`/`?venue=`/`?status=`/`?q=`/`?sort=`/`?dir=`/`?page=`）と双方向同期する。

**代替案**:
- (a) Pinia / 独自 store で in-memory に持つ: ブラウザのリロード・URL 共有・戻る/進むで状態が消える
- (b) localStorage に保存: ユーザーが期待しない（別タブと干渉、共有不可）

**Why**:
- admin が「先月の亀戸スポーツセンターの公開中イベント」のような絞り込み URL をブックマークして共有できる
- リロード・戻る/進むで一覧が復元される（オーナーが PC を離れて戻ってきた時の DX）
- E2E テストで URL を直接開くだけで初期化できる（テスタビリティ）

**Trade-off**:
- URL クエリのスキーマ変更時に既存ブックマークが壊れる可能性 → クエリパースは緩やかに（不正値は無視してデフォルト値）
- フィルタ操作のたびに `router.replace` が走ると history が肥大 → `replace` ではなく `replace`（履歴を増やさない）を採用、ページ送りは `push`（戻れる）

### D4. ステータス Badge の優先順位

**選択**: 表示優先度は `status='cancelled'` → `status='closed' OR end_at < now()` → `visibility` の順。`visibility` は `published`=「公開中」/`draft`=「下書き」/`private`=「限定公開」。

**Why**:
- 中止 / 終了は visibility（公開中・下書き）よりオーナーにとって判断優先度が高い
- 終了判定は `status = 'closed'` の明示フラグだけでなく `end_at < now()` も使う。`end_at` 経過後に自動で「終了」表示にすることで、admin が手動で `closed` をセットし忘れていても誤解されにくい

**Trade-off**:
- 当日中のイベントを表示するタイミングで `now()` ベースのボーダーラインが切り替わる：admin 画面のロード時刻で判定するため、表示は再ロードまで反映遅延あり。実害は少ない

### D5. 「新規作成」CTA の遷移先は `/events/new` プレースホルダ

**選択**: 本 change で `/events/new` ルートをプレースホルダコンポーネント（"#86 で実装" メッセージ）として登録する。実体は #86 で `EventEditPage.vue` に置換される。

**Why**:
- CTA を本実装したいが、編集ページ実装は #86 のスコープ
- ルートエントリだけ予約しておくことで、CTA → ナビゲーションの動作確認・E2E が #85 で完結する
- #86 の Apply ではプレースホルダを実体に置き換えるだけで済む

### D6. ページネーションは 25 件固定

**選択**: 1 ページ 25 件固定（per page セレクタは出さない）。

**Why**:
- 1280px デスクトップで 25 行は 1 スクロール内に収まる現実的な密度
- per page セレクタは UX を複雑化させ、URL クエリにも `per` パラメータが追加されて互換性管理が増える
- 後から拡張可能（必要時に `per=` クエリで上書き可能な実装にしておく）

### D7. RemainBar の capacity NULL fallback

**選択**: `events.capacity` が NULL（無制限）の場合、RemainBar は表示せず、「予約 N 件」のテキスト表示にフォールバックする。

**Why**:
- RemainBar は capacity を `aria-valuemax` に使うため、NULL では描画できない
- 「無制限」のイベント（実例: 講習会で定員未設定の case）でも reserved_count は表示する価値がある

### D8. `entities/event` の Branded Types 再利用

**選択**: `EventId` / `VenueId` は #173 で `packages/shared/src/types/ids.ts` に既に Branded Types として定義済み。本 change では再利用のみで、新規作成しない。

**Why**:
- 識別子 Branded Types は packages 横断の真実の源
- 同じ Brand を別箇所で再定義すると型不一致が起きる

---

## 3. ビジネス異常系の洗い出し

| # | 異常ケース | エラーコード | ユーザーへのフィードバック |
|---|-----------|-------------|--------------------------|
| 1 | API 通信失敗（ネットワーク断） | `NETWORK_ERROR` | 「通信に失敗しました。少し待ってから再試行してください」+ ERR コード表示 + 再試行 CTA |
| 2 | Supabase サーバエラー（5xx） | `SERVER_ERROR` | 「イベントを読み込めませんでした」+ `ERR · supabase / events.list · {status}` + 再試行 CTA |
| 3 | RLS 拒否（admin role 喪失等） | `PERMISSION_DENIED` | 「アクセス権限がありません」+ サインアウト + `/login?reason=not-admin` |
| 4 | クエリ結果 0 件（フィルタ後） | `EMPTY` | Empty 状態カード「該当するイベントがありません」+ フィルタリセット案内 |
| 5 | クエリ結果 0 件（一覧自体が空） | `EMPTY` | Empty 状態カード「イベントがまだありません」+ 「新規作成」CTA |
| 6 | URL クエリの不正値（`?period=invalid`） | (silent) | 不正値は無視してデフォルト値で初期化（エラー表示しない） |
| 7 | `?page=999` 範囲外 | `EMPTY` | Empty 状態カード「該当するイベントがありません」 |

**UI 表示方針**: エラーコードで分岐し、「なぜ失敗したか」を具体的に表示する。「エラーが発生しました」だけは禁止。

---

## 4. UI/UX 設計

### コンポーネント構成（FSD）

```
pages/
  EventsListPage.vue          ← ルートエントリ（widget をマウントするだけ）

widgets/events-list/
  ui/
    EventsListWidget.vue      ← TopBar + Toolbar + Table + Pagination + 4 状態の出し分け
    EventsToolbar.vue         ← 検索 input + 期間/会場/ステータス select + 「新規作成」CTA
    EventsTable.vue           ← Table プリミティブを使った DataTable 本体（Success 専用）
    EventsTableSkeleton.vue   ← Loading 状態
    EventsEmptyState.vue      ← Empty 状態
    EventsErrorState.vue      ← Error 状態
    EventsPagination.vue      ← ページ送り
  index.ts

features/events-filter/
  composables/
    useEventsFilter.ts        ← URL クエリ ↔ filter 状態の双方向同期
    useEventsFilter.spec.ts
  types.ts                     ← FilterState / Period / SortKey / SortDir
  index.ts

entities/event/
  api/
    eventQueries.ts            ← TanStack Query 風の queryOptions 関数（fetchEventsList）
    eventQueries.spec.ts
  model/
    event.types.ts             ← EventListRow（view の DTO 型）/ ステータス翻訳ヘルパー
    event.types.spec.ts
  index.ts

shared/ui/
  Table.vue (+ TableHeader / TableBody / TableRow / TableHead / TableCell / TableCaption)
  Table.spec.ts
  Select.vue
  Select.spec.ts
  Skeleton.vue
  Skeleton.spec.ts
```

### デザイントークン使用確認

- 色: `bg-paper` / `bg-paper-warm` / `text-ink` / `text-muted` / `border-hairline` / `text-accent` / `bg-accent-soft` / `bg-danger-soft` / `border-danger`
- spacing: `p-hq-3` / `p-hq-4` / `p-hq-6` / `gap-hq-2` / `gap-hq-3`
- 書体: `font-jp` / `font-jp-display` / `font-mono`
- radius: `rounded-hq-md` / `rounded-hq-lg` / `rounded-hq-pill`
- マジックナンバー禁止: 任意値クラス（`px-[12px]` 等）/ リテラル hex 色 / リテラル font-family 0 件

### 4 状態設計

| 状態 | 条件 | 表示方法 |
|------|------|---------|
| **Loading** | `isPending === true`（フィルタ変更後の refetch 中も含む） | `EventsTableSkeleton` で 6 行分の Skeleton bar。Toolbar は表示済み（フィルタ操作可能） |
| **Empty** | `data.length === 0` | `EventsEmptyState`。フィルタ未設定なら「イベントがまだありません」+ 新規作成 CTA。フィルタ設定済みなら「該当するイベントがありません」+ フィルタリセット |
| **Error** | `isError === true` | `EventsErrorState` (`role="alert"`)。`ERR · supabase / events.list · {code}` 表示 + 再試行 CTA |
| **Success** | `data.length > 0` | `EventsTable` で DataTable 描画 + `EventsPagination` |

### レスポンシブ対応

| ブレークポイント | レイアウト |
|---------------|----------|
| xs〜md（〜959px） | **MVP2 で対応**。本 change ではデスクトップ前提。ヘッダ + DataTable のみが横スクロール可能（最低限の生存性）|
| md〜（960px〜） | フル機能 |
| lg〜xl（1280px〜） | 主対象 |

### アクセシビリティチェックリスト

- [x] DataTable は `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` セマンティクスで実装
- [x] ソート可能な `<th>` には `aria-sort` 属性を付ける（`ascending` / `descending` / `none`）
- [x] 「新規作成」「再試行」「ページ送り」等の操作可能要素に `aria-label`（テキストが明示的でない場合）
- [x] フィルタ select は radix-vue の Listbox（shadcn-vue Select）を使用、キーボード操作可能
- [x] Error 状態のコンテナに `role="alert"` を付与
- [x] 検索 input に `<label>` を関連付け（visually hidden 可）
- [x] フォーカス順序: Toolbar の検索 → 期間 → 会場 → ステータス → 新規作成 → Table の各列ヘッダ（ソート可能なら）→ 各行の操作リンク → Pagination
- [x] テキストコントラスト比: HQ token は AA 以上を満たすよう設計済み（既存仕様）

---

## 5. DB / Supabase 設計

### SQL Migration

```sql
-- migration: 20260430120000_event_list_view.sql

CREATE OR REPLACE VIEW event_list_view
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.name,
  e.description,
  e.start_at,
  e.end_at,
  e.venue_id,
  v.name AS venue_name,
  COALESCE(e.fee, v.default_fee) AS fee,
  e.capacity,
  e.visibility,
  e.status,
  e.cancel_deadline,
  COALESCE(r.reserved_count, 0)::int AS reserved_count,
  e.created_at,
  e.updated_at
FROM events e
LEFT JOIN venues v ON v.id = e.venue_id
LEFT JOIN LATERAL (
  SELECT count(*)::int AS reserved_count
  FROM reservations
  WHERE event_id = e.id
    AND status = 'reserved'
) r ON true;

-- anon に SELECT させない (admin アプリ専用)
REVOKE ALL ON event_list_view FROM anon;
GRANT SELECT ON event_list_view TO authenticated;
```

### RLS ポリシー設計

`event_list_view` は `SECURITY INVOKER` で作成し、参照テーブル（events / venues / reservations）の RLS をそのまま継承する:

- events.SELECT は `USING (true)`（既存）→ view から全件返る
- venues.SELECT も `USING (true)`（既存）→ view から venue_name が返る
- reservations.SELECT は「自分の予約のみ可。admin は全件可」（既存）→ admin で呼べば全予約が COUNT される、非 admin で呼ぶと自分の予約のみ COUNT される

呼び出し元の制約:
- anon ロールは GRANT 不在で SELECT 不可（権限エラー）
- authenticated ロールはすべて SELECT 可能だが、`apps/admin` 以外のクライアントから呼び出さない契約（仕様で担保、技術的には authenticated 全体に GRANT）

| ポリシー名 | 操作 | 対象ロール | 条件 |
|-----------|------|-----------|------|
| (anon revoke) | SELECT | anon | 不可（GRANT 不在） |
| (authenticated grant) | SELECT | authenticated | 可（参照テーブルの RLS で自然に絞り込まれる） |

### TypeScript エンティティとの整合確認

```typescript
// entities/event/model/event.types.ts

import type { EventId, VenueId } from "@high-q/shared";

// view が返す raw 型（snake_case）
export interface EventListRow {
  id: EventId;
  name: string;
  description: string | null;
  start_at: string;          // ISO 8601
  end_at: string;
  venue_id: VenueId;
  venue_name: string | null;
  fee: number | null;
  capacity: number | null;
  visibility: "draft" | "published" | "private";
  status: "scheduled" | "cancelled" | "closed";
  cancel_deadline: string | null;
  reserved_count: number;
  created_at: string;
  updated_at: string;
}

// 表示用ステータスラベル（D4 の優先順位を吸収するヘルパー）
export type DisplayStatus = "published" | "draft" | "private" | "cancelled" | "closed";
export function resolveDisplayStatus(row: EventListRow, now: Date): DisplayStatus {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "closed") return "closed";
  if (new Date(row.end_at) < now) return "closed";
  return row.visibility;
}
```

---

## 6. テスト設計

### テスト対象

| 対象 | 種別 | ツール |
|------|------|--------|
| `useEventsFilter` composable（URL クエリ ↔ 状態） | ユニット（TDD） | Vitest + vue-router |
| `eventQueries.fetchEventsList` API layer | ユニット + MSW | Vitest + MSW |
| `resolveDisplayStatus` ヘルパー | ユニット（TDD） | Vitest |
| `Table` / `Select` / `Skeleton` shadcn プリミティブ | スモーク | Vitest + @vue/test-utils |
| `EventsListWidget` の 4 状態出し分け | コンポーネント | Vitest + @vue/test-utils |
| `EventsToolbar` のフィルタ操作 → emit | コンポーネント | Vitest + @vue/test-utils |
| `EventsTable` の列構成・aria-sort | コンポーネント | Vitest + @vue/test-utils |
| E2E（happy path / filter 適用） | E2E（Playwright） | Playwright + Supabase mock |

### テストケース（事前定義）

**正常系（Component / Composable）**
- [ ] `useEventsFilter` が URL クエリから初期状態を正しくパースする
- [ ] `useEventsFilter.setPeriod('this-month')` で URL クエリが `?period=this-month` に更新される
- [ ] `useEventsFilter.setSearch('ゆる練')` で `?q=...` に更新される
- [ ] `useEventsFilter.setSort('date', 'desc')` で `?sort=date&dir=desc` に更新される
- [ ] `useEventsFilter.setPage(2)` で `?page=2` に更新される
- [ ] `eventQueries.fetchEventsList(filter)` が `event_list_view` を SELECT し、フィルタ条件を WHERE に変換する
- [ ] `resolveDisplayStatus` が `status='cancelled'` 優先、`end_at < now` で `closed` に上書きする
- [ ] `EventsListWidget` が Success 状態で DataTable + Pagination を描画する
- [ ] `EventsToolbar` の select 操作で `update:filter` emit が発生する
- [ ] `EventsTable` のソート可能列ヘッダに `aria-sort` が反映される

**ビジネス異常系**
- [ ] `EventsListWidget` が `isError=true` で `EventsErrorState`（`role="alert"`）を描画する
- [ ] エラーメッセージにエラーコード（例: `NETWORK_ERROR` / `SERVER_ERROR`）が含まれる
- [ ] フィルタ済みで結果 0 件 → 「該当するイベントがありません」+ フィルタリセット
- [ ] フィルタ未設定で結果 0 件 → 「イベントがまだありません」+ 新規作成 CTA

**技術エラー系**
- [ ] API 通信失敗時に `NETWORK_ERROR` で Error 状態
- [ ] サーバ 5xx 時に `SERVER_ERROR` で Error 状態
- [ ] URL クエリ `?period=invalid` 等の不正値は無視してデフォルトに fallback

**Branded Types**
- [ ] `EventListRow.id` が `EventId` Brand を満たす（型レベル検証）

### E2E（上限 2 件）

- (a) **Happy path**: 認証済 admin で `/events` にアクセス → 一覧 10 件が DataTable で見える + Pagination が表示される。Supabase mock で `event_list_view` の応答を fixture で返す
- (b) **Filter 適用**: `/events` で検索ボックスに「ゆる練」を入力 → URL が `?q=ゆる練` に更新され、絞り込まれた結果が表示される

詳細は `e2e/admin/events-list.e2e.ts`。本 change の Apply で書く。

---

## 7. ロギング設計

| 事象 | ログレベル | 含む情報 |
|------|-----------|---------|
| 一覧クエリ成功 | `info`（必要時） | フィルタ条件のメタ（個人情報なし） |
| RLS 拒否（PERMISSION_DENIED） | `warn` | エラーコード、エンドポイント |
| ネットワーク / サーバエラー | `error` | エラーコード、HTTP status、エンドポイント |

詳細は `docs/06-品質・セキュリティ/07-ロギング方針.md` 参照。

---

## 8. Risks / Trade-offs

- **Risk**: `event_list_view` のサブクエリが将来的にデータ増で遅くなる
  → **Mitigation**: reservations の `(event_id, status)` 部分インデックス（既存仕様）が効く。MVP1 のデータ量なら影響なし。EXPLAIN で確認

- **Risk**: 非 admin（authenticated だが member role）が `event_list_view` を呼ぶと `reserved_count` が誤値（自分の予約分のみ）を返す
  → **Mitigation**: admin アプリでのみ呼び出す契約を spec で明示。reservation アプリで使う必要が出た場合は、reservation 専用の view を別途作る or `reserved_count` を含まないクエリを使う

- **Risk**: URL クエリの直列化スキーマが変わると既存ブックマークが壊れる
  → **Mitigation**: 不正値は silent fallback（デフォルトに）。ブレーキングを避ける運用として、クエリ名は今後追加のみ・既存名は意味を変えない

- **Trade-off**: ページネーションが offset ベース。1000 件超で遅くなる可能性。MVP1 では問題なし。MVP2 で cursor ベースへ移行検討

- **Trade-off**: 「新規作成」CTA の遷移先 `/events/new` は本 change ではプレースホルダ。#86 で実装されるまで E2E 上は遷移後にプレースホルダが見える状態で許容

- **Risk**: shadcn-vue の `Select` プリミティブが Tailwind preset と相性問題を起こす可能性
  → **Mitigation**: 取り込み時にスモークテストで HQ token 着色を検証。問題があれば手動で `class` を調整して preset utility に揃える

---

## 9. Migration Plan

1. **DB migration 適用**: `event_list_view` を本番 Supabase に作成
   - 検証: ローカル supabase で apply → admin Sql Editor で `select * from event_list_view limit 5` が動く
   - rollback: `DROP VIEW event_list_view;`（依存なし、すぐ可逆）

2. **shadcn-vue プリミティブ取り込み**: `pnpx shadcn-vue@latest add table select skeleton` を `apps/admin` 配下で実行 → `apps/admin/src/shared/ui/` にファイル追加
   - 検証: スモークテスト pass
   - rollback: ファイル削除（テスト含む）

3. **entities / features / widgets / pages 実装**: TDD で各レイヤー実装
   - 各レイヤーで component / composable test を書く

4. **router 更新**: `/events` / `/events/new` 追加、`/` から `/events` への redirect 追加

5. **HomePlaceholder の役目終了**: 本 change の archive 後、`HomePlaceholder.vue` は `/` ルートから削除されるが、ファイル自体は #84 のテストが参照しているため Sync で整理する候補

6. **PR 作成 → Render プレビューで実機確認**: ユーザー（翔太郎くん）が承認 → ship

---

## 10. Open Questions

- [ ] `events.cancel_deadline` 列を一覧で見せるか？ → **本 change では非表示**（操作列から編集ページに遷移すれば見える #86 で扱う）
- [ ] イベントタイトルが長い場合の truncate ルール → **本 change では `truncate` クラスで 1 行省略**。tooltip での全文表示は MVP2
- [ ] 行クリック全体で編集ページに遷移するか、操作列のリンクのみか → **操作列のリンクのみ**。行全体クリックは将来の詳細画面（`/events/:id`）の責務として予約
- [ ] フィルタ「すべて」の URL 表現 → クエリパラメータを省略する（`?period=` を出さない）。デフォルト値と区別するため、明示的に「すべて」を選んだ場合のみ `?period=all` を入れる
