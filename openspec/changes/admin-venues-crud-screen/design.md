# Design: 会場マスタ CRUD（管理画面）

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Task の3ファイルをすべて承認後に Apply へ進む。

---

## 0. コンテキスト確認（Apply 開始前に必ず実施）

> Apply 開始時に Claude が宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: [要約]」

**現状**: `venues` テーブル・RLS（SELECT public / INSERT・UPDATE・DELETE は `is_admin()`）・3 ロール GRANT は MVP1 で完備済み。`Venue` / `VenueInsert` 型は `@high-q/shared` に全列定義済み。`entities/venue` は filter dropdown 用の read 専用（`useVenues` / `shortenVenueName`）。本 change は **UI 追加のみで migration を伴わない**。

---

## 1. FSD アーキテクチャ設計

> **設計ピボット（2026-06-17）**: 初版のデータテーブル + 別作成/編集ページ構成は破棄し、プロトタイプ「会場マスタ B案」（claude.ai/design 由来）に基づく **2 ペイン マスター・ディテール型**へ全面置換。下記は確定版。

### 影響レイヤー・スライス

- [x] `entities/venue/` — CRUD クエリ（`fetchVenues` / `fetchVenue` / `createVenue` / `updateVenue` / `deleteVenue`）。read 専用 `useVenues` は併存維持
- [x] `widgets/venues-master-detail/` — 2 ペイン本体。`model/venueDraft`（VM↔DB 写像・検証）/ `composables/useVenuesMaster`（状態機械）/ `ui/VenuesMasterDetail.vue`
- [x] `pages/VenuesPage.vue` — ヘッダー（横遷移リンク + 新規 CTA）+ widget
- [x] `app/router.ts` — `/venues` 単一ルート（/venues/new・/venues/:id/edit は持たない）
- [ ] `packages/shared/` — 変更なし（`Venue` / `VenueInsert` / `VenueId` は既存）
- [ ] `supabase/` — 変更なし（テーブル・RLS・GRANT は既存。**migration なし**）

### 依存関係図

```
VenuesPage → widgets/venues-master-detail → entities/venue(api) → shared/api/supabase
                 ├ model/venueDraft（VM↔DB 写像・検証）
                 └ composables/useVenuesMaster（一覧/選択/dirty/保存/削除/新規）
```

### Branded Types / ドメイン型

新規追加なし。`VenueId` / `Venue` / `VenueInsert`（`@high-q/shared`）を利用。更新用 `VenueUpdate` 型が未定義なら `entities/venue` 内に許可列のみの patch 型として最小定義する（`event` の `EventUpdate` と同じ流儀）。

### エラーコード（追加分）

`entities/venue` の `FetchError` 系に以下を区別して持たせる（`entities/event` の分類関数を踏襲）:

- 技術エラー: `NETWORK_ERROR` / `SERVER_ERROR` / `PERMISSION_DENIED`
- ドメインエラー: `VENUE_IN_USE`（FK 違反 `23503` = 参照中会場の削除）/ `DUPLICATE_NAME`（UNIQUE 違反 `23505` = 会場名重複）

---

## 2. ビジネス異常系の洗い出し（必須）

| # | 異常ケース | エラーコード | ユーザーへのフィードバック |
|---|-----------|-------------|--------------------------|
| 1 | 参照中の会場を削除 | `VENUE_IN_USE` | 「このイベントで使用中のため削除できません」 |
| 2 | 会場名が既存と重複 | `DUPLICATE_NAME` | 「同名の会場が既に存在します」（会場名欄付近） |
| 3 | 会場名が空 | （クライアント検証） | 「会場名を入力してください」（送信前にブロック） |
| 4 | 権限なし（RLS 拒否） | `PERMISSION_DENIED` | 「この操作を行う権限がありません」 |
| 5 | API 通信失敗 | `NETWORK_ERROR` | 「通信に失敗しました。再試行してください」 |
| 6 | サーバーエラー | `SERVER_ERROR` | 「しばらくしてから再試行してください」 |

**UI 表示方針**: エラーコードで分岐し「なぜ失敗したか」を具体的に表示する。「エラーが発生しました」だけは禁止。

---

## 3. UI/UX 設計

### コンポーネント構成（FSD）

```
pages/VenuesListPage.vue   ← header(breadcrumb + 水平リンク + 「新しい会場」CTA) + VenuesListWidget
pages/VenueCreatePage.vue  ← <VenueForm mode="create" />
pages/VenueEditPage.vue    ← <VenueForm mode="edit" :id="..." />

widgets/venues-list/
  ui/VenuesListWidget.vue   ← 4 状態の出し分け
  ui/VenuesTable.vue        ← DataTable 本体（Success 専用）
  ui/VenuesToolbar.vue      ← 会場名・住所の検索
  composables/useVenuesSearch.ts
  index.ts

widgets/venue-form/
  ui/VenueForm.vue          ← create/edit 兼用
  composables/useVenueForm.ts
  model/venueFormSchema.ts  ← zod 検証（会場名必須など）
  index.ts

features/venue-delete/
  ui/VenueDeleteDialog.vue
  composables/useVenueDelete.ts
  index.ts

entities/venue/
  api/venueQueries.ts       ← fetch/create/update/delete + classifyError
  index.ts                  ← 既存 export に追記
```

### デザイントークン使用確認

- [x] 色・spacing・radius は Tailwind preset utility（`bg-paper` / `border-hairline` / `px-hq-*`）または `var(--hq-*)` 経由
- [x] マジックナンバー（生 hex / px）をコードに書かない
- [x] 意匠系は `@high-q/ui`（`Button` / `Badge` 等）、機能系は `shared/ui`（`Table` / `FormField` / `Dialog`）を利用

### 一覧の列（design サンプル `ScreenVenues` 準拠）

メイン会場バッジ（`is_primary`）/ 会場名 / 住所 / 標準参加費（NULL は「都度設定」）/ アクセスメモ / マップリンク（`map_url` があればリンク化）/ 操作（編集・削除）。`meeting_point` は一覧には出さずフォームでのみ編集する。

### 4状態設計（必須）

| 状態 | 条件 | 表示方法 |
|------|------|---------|
| **Loading** | 取得中 | スケルトン／スピナー |
| **Empty** | `venues.length === 0` | 「会場がまだありません」＋「新しい会場」導線 |
| **Error** | 取得失敗 | エラーコードに応じたメッセージ＋再試行 |
| **Success** | データあり | DataTable 表示 |

### レスポンシブ対応

| ブレークポイント | レイアウト |
|---------------|----------|
| xs（〜599px） | フォームは 1 カラム縦積み。一覧は主要列（バッジ・会場名・住所・操作）優先で横スクロール |
| sm〜md（600px〜） | 一覧の全列表示。フォームは適度に 2 カラム |

### アクセシビリティチェックリスト

- [x] 操作ボタン（編集・削除・マップリンク）に `aria-label`
- [x] 検索入力に `<label>`（`FormField` ラップ）
- [x] 削除ダイアログはフォーカストラップ＋ESC で閉じる
- [x] エラーメッセージに `role="alert"`
- [x] フォーム入力は `shared/ui/FormField` でラップ（初期表示で赤枠を出さない）

---

## 4. DB / Supabase 設計

**テーブル変更なし**。既存資産をそのまま利用する:

- テーブル定義: `data-schema` spec「venues テーブル」（`id` / `name` / `address` / `default_fee` / `access_note` / `map_url` / `meeting_point` / `is_primary` / `created_at` / `updated_at`）
- 制約: `venues_name_key`（UNIQUE）/ `venues_single_primary_idx`（partial unique where `is_primary = true`）
- RLS: `venues_select_public`（anon/authenticated・`true`）/ `venues_insert_admin` / `venues_update_admin` / `venues_delete_admin`（いずれも `is_admin()`）
- 参照整合性: `events.venue_id` の `ON DELETE RESTRICT`

→ migration / RLS 設計は本 change の対象外（新規 migration を作らない）。

---

## 5. Decisions（技術的決定）

### D1. メイン会場フラグの自動切替を「旧メイン解除 → 新メイン設定」の順で行う

`is_primary = true` での保存時、`venues_single_primary_idx`（partial unique）に抵触しないよう **既存メイン会場を先に false 化してから** 対象を true 化する。entity API（`createVenue` / `updateVenue`）内で `is_primary === true` のときのみ「他の `is_primary=true` を false に UPDATE → 対象を保存」の 2 ステップを実行する。

- 代替案: 単一 RPC（PL/pgSQL）でトランザクション化 → migration が必要になり「UI のみ」の前提を崩すため不採用。クライアント側で「unset → set」の順序を守れば 2 件が同時に true になる瞬間は生じず、partial unique 違反は起きない。
- 代替案: エラーを出して手動解除を促す → ユーザー判断で「自動解除」を採用済み。

### D2. 会場削除は実行後に FK 違反を捕捉して `VENUE_IN_USE` に分類する

事前に参照イベント件数を数えず、DELETE を実行し Postgres の `23503`（foreign_key_violation）を捕捉して `VENUE_IN_USE` にマップする。`event-delete` と異なり CASCADE しない（会場は恒久マスタ）。

- 代替案: 事前カウントで削除ボタンを無効化 → ユーザー判断で「実行後に捕捉して表示」を採用済み。実装が薄く、競合状態（チェック後に参照が増減）にも強い。

### D3. CRUD クエリは `entities/venue/api` に集約する

read 専用の既存 `useVenues`（widget filter 用 DTO）はそのまま残し、CRUD は entity の API レイヤーに置く。`entities/event` の `eventQueries.ts`（`Result<T, FetchError>` + `classifyError`）を手本に統一する。

### D4. UI は B案（マスター・ディテール）準拠、色は HQ トークンに統一

レイアウト・2 ペイン構造・dirty ガード・トースト等の挙動はプロトタイプ「会場マスタ B案」を pixel-faithful に再現する。ただし色は B案の緑（#3f6b5e）ではなく **既存 admin と同じ HQ デザイントークン（accent 橙 #a44e30 / paper #f7f3ea 等）** を Tailwind preset utility 経由で適用する（CLAUDE.md「HQ トークン単一の真実・生 hex 禁止」遵守 + 全 admin 画面の見た目統一）。将来ブランドを緑化するなら design-tokens レベルの別 Issue。

### D5. プロトタイプ非 DB フィールドの写像（migration 回避）

- 郵便番号(zip): venues に列が無いため**独立フィールドを出さず住所に統合**（migration 回避、#151 の UI のみスコープ維持）
- geo（緯度経度/埋込 URL）: 既存 `map_url` 列に写像（値があればプレビュー、空なら「位置情報が未設定です」）
- feeType + fee: `default_fee`（固定=値 / 都度=NULL）に写像
- `meeting_point`: B案に編集欄が無い。**更新時に送信せず allowlist 除外で既存値を保持**（破壊しない）。編集欄が必要なら別途追加（reservation spec が #151 へ委譲済み・要ユーザー確認）

### D6. 新規会場は保存まで未永続・ドラフト編集モデル

B案の VenueApp はローカル draft で編集し save で commit する。本実装も `useVenuesMaster` がドラフトを保持し、新規は `id=null` のセンチネル行として一覧に出し、保存時に `createVenue`。保存/削除の成功後は `fetchVenues` で refetch し、メイン自動切替・最終更新日・一覧順序を DB 真実に同期する。dirty 中の会場移動・新規追加は `window.confirm` で確認（既存 EventForm と同じ踏襲）。

---

## 6. Risks / Trade-offs

- **[D1 の 2 ステップ間で失敗]** 旧メイン解除に成功し新メイン設定で失敗すると「メイン会場が一時的に 0 件」になりうる → 解除の前に対象保存の成否を見込めないため、新メイン設定を先に試みると unique 違反になる。順序は「解除 → 設定」を維持し、設定失敗時はエラーを返して再操作を促す（メイン 0 件は次回保存で復帰可能・恒久破壊なし）。Apply 時にこの順序と失敗時メッセージをテストで固定する。
- **[水平リンクの対称性崩れ]** 「会場」リンクを Dashboard 等に足すだけで会場画面側の戻り導線を欠くと CLAUDE.md のナビ規約違反 → パンくず＋ヘッダーリンクの双方向を spec シナリオで担保する。
- **[既存 read composable との二重定義]** `useVenues`（filter 用）と新 `fetchVenues`（一覧用）が併存する → 役割コメントを残し、将来の統合候補として index.ts に明記する。

## 7. Migration Plan

- DB migration なし。デプロイは通常の admin ビルド＋ルーティング追加のみ。
- ロールバック: ルート・画面の revert で完結（DB 状態に副作用を残さない）。

## 8. Open Questions

- なし（メインフラグ挙動・削除防御はユーザー確認済み）。
