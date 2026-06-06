## Context

`/events/:id` の予約者リストは `EventParticipantsTable` が `ParticipantRow` 配列を受け取り、`display_name` をプレーンテキストとして描画している。`ParticipantRow.member_id` は既に含まれており、データ的にはリンク化に追加 API は不要。

会員詳細シート `MemberDetailSheet` 自体は `widgets/member-detail-sheet/` に既に存在し、`/members` 画面ではページ末尾に常駐マウントされ、URL クエリ `?detail=<memberId>` の出現をトリガに開閉する。その駆動 composable `useMemberDetailSheet` は内部で `useMembersFilter()` を呼び、`filter.value.detail` と `closeDetail()` を購読する構造で、`/members` 専用 URL スキーマ全体（exp / attended / last / q / sort / dir / page / detail）にバインドされている。

そのため `EventDetailPage` で同じシートを使うには、`useMemberDetailSheet` を `useMembersFilter` から疎結合化する必要がある。

主要制約:
- **既存 `/members` の挙動 / URL スキーマ / テストを壊さない**
- FSD 依存方向（pages → widgets → features → entities → shared）を守る
- `widgets` 間の横並び import 禁止（`event-participants` widget は `member-detail-sheet` を直接 import しない）
- `?detail=` のクエリキーは `/members` と同名にする（同じシート、同じセマンティクス、ブラウザ戻る進む統一）

## Goals / Non-Goals

**Goals:**
- 予約者リストの会員名から、現在表示中の `/events/:id` を離れずに `MemberDetailSheet` を開ける
- `useMemberDetailSheet` を「`?detail=<id>` を読む source」を注入できる形に refactor し、`/members` と `/events/:id` の双方から再利用
- キーボード操作 (Tab → Enter) / モバイルタップ / ホバー視覚フィードバック対応

**Non-Goals:**
- `MemberDetailSheet` 内部の機能変更
- `/members` 画面の URL スキーマ変更
- 予約者リストの並び替え / フィルタ / 検索機能
- イベント詳細以外のページ（`/events`, `/identity-documents` 等）からの会員詳細リンク化

## Decisions

### D1: シートの開閉方式 — インライン マウント方式（B 案）を採用

**選択肢:**
- A. クリックで `/members?detail=<id>` へ `router.push` する遷移方式
- B. `EventDetailPage` 上に `MemberDetailSheet` を常駐マウントし、`?detail=<id>` でオーバーレイ表示する

**決定: B 案。**

理由:
- Issue Why に「会員一覧画面へ別途遷移する必要があり、運営効率が落ちる」と明記されており、A 案は遷移先が `/members` に変わるため Why を満たさない
- B 案はシートを閉じると `EventDetailPage` のスクロール位置・タブ状態・mutation 中の checkin/guest 編集状態を維持できる
- 運営者の動線「予約者 → 本人確認確認 → イベントに戻ってチェックイン操作」が 1 画面で完結する

トレードオフ:
- `useMemberDetailSheet` を refactor する必要がある（D2）
- `/events/:id?detail=<uuid>` の直リンクが新たに公開 URL になる（admin 専用 + RLS で保護されているため漏洩リスクは低い）

### D2: `useMemberDetailSheet` の疎結合化 — `source` 注入パターン

**現状:** `useMemberDetailSheet()` 内部で `useMembersFilter()` を直接呼ぶ。
**変更:**

```ts
export interface MemberDetailSource {
  detail: ComputedRef<string | undefined>;
  closeDetail: () => Promise<void>;
}

export function useMemberDetailSheet(
  source?: MemberDetailSource,
): UseMemberDetailSheet { ... }
```

`source` 省略時は `useMembersFilter()` を内部で呼ぶ（`/members` 既存挙動を保持）。`EventDetailPage` 系では別の source を渡す。

**代替案検討:**
- `provide` / `inject` パターン → 暗黙の依存になりテスト書きづらい。却下
- props で `MemberDetailSheet.vue` に渡す → リアクティブ Ref を props で渡すと Vue の reactivity 損失リスク。却下

### D3: 汎用 `?detail=<id>` source — `features/route-detail-query` を新設

`MemberDetailSource` の `EventDetailPage` 用実装を `features/route-detail-query/composables/useRouteDetailQuery.ts` として切り出す。`/members` 専用フィルタとは独立した最小の composable。

```ts
useRouteDetailQuery(): {
  detail: ComputedRef<string | undefined>;  // route.query.detail を読む
  openDetail: (id: string) => Promise<void>; // router.push で ?detail=<id> 追加
  closeDetail: () => Promise<void>;          // router.push で ?detail= 削除
}
```

他クエリ（タブ位置等）は触らない。`useMembersFilter` のように全フィルタを serialize しないため、`/members` 以外でも安全に使える。

**FSD 配置:** `features/` に置く理由 — URL 駆動の状態同期は「フィルタ系 feature」と同レイヤー。`shared/lib` でも可だが、Vue Router 依存があるため UI フレームワーク中立な `shared/lib` よりは `features/` が妥当。

### D4: 氏名セルの interactive 化 — `<button>` 採用

**選択肢:**
- a. `<router-link to="?detail=<id>">` で `router-link` 使用
- b. `<button @click>` + `openDetail(id)` 呼び出し

**決定: b 案（`<button>`）。**

理由:
- `router-link` 経由だと「`/events/:id?detail=<id>` への `push`」が semantic に「ページ遷移」のように見えるが、実態は同じページのオーバーレイ表示
- `<button>` のほうがスクリーンリーダーに「会員詳細を開く」アクションとして自然
- Issue 完了条件「`<router-link>` または `<button>` + `aria-label`」のどちらも許容

スタイル: 既存テキスト見た目を保ちつつ、`hover:underline` + `focus-visible:ring-1 focus-visible:ring-accent` を付与。タッチターゲット最小 44×44px を満たすため、ボタンの上下パディング確保。

`aria-label`: `「<display_name> の詳細を開く」`。スクリーンリーダーがニックネーム括弧含めて読まないよう、aria-label には氏名のみ。

### D5: widget 間の通信 — `member-clicked` イベント emit

`EventParticipantsTable` → `EventParticipantsWidget` → `EventDetailWidget` → `EventDetailPage` のチェーンで `member-clicked` イベントを bubble させ、Page が `openDetail(memberId)` を呼ぶ。

**理由:** widgets 間の横並び import 禁止ルール準拠。`event-participants` widget は `member-detail-sheet` の存在を知らない。Page が両方を組み合わせる役割。

既存 `checkin-flip` / `guest-changed` / `cancelled` / `mutation-settled` 等と同じ emit パターン。

### D6: テスト方針

- **EventParticipantsTable.spec.ts** — 「氏名ボタンクリックで `member-clicked` イベントが正しい `member_id` で emit される」「Tab → Enter で同じ挙動」「aria-label が氏名 + 「の詳細を開く」になっている」
- **EventDetailPage.spec.ts** — 「`member-clicked` を受けると URL に `?detail=<id>` が追加される」「`?detail=<id>` ありで page をマウントすると `MemberDetailSheet` が開く」「シート閉で `?detail=` が消える」
- **useMemberDetailSheet.spec.ts**（既存）— 引数なし呼び出し時の挙動が変わらないことを既存テストで担保
- **useRouteDetailQuery.spec.ts**（新規）— URL クエリ ↔ 状態の双方向同期、open / close の push 動作

E2E は **追加しない**。シート開閉は MVP1 の `/members` で既に E2E カバー済、UI 配線テストは component 試験で十分。

## Risks / Trade-offs

- **[Risk] `useMemberDetailSheet` 既存呼び出し側に意図せず影響** → `source?` を **optional** にし、省略時 = 旧挙動。既存テスト（`useMemberDetailSheet.spec.ts` / `MembersListPage` 関連）が全て緑なら互換性担保
- **[Risk] `?detail=` が `/events/:id` の他クエリ（タブ位置等の将来追加分）と衝突** → 現状 `EventDetailPage` は他のクエリ駆動状態を持たない（`EventDetailTabs` は state 内部管理）。将来追加時は `useRouteDetailQuery` が `?detail` キーのみ操作する設計で安全
- **[Risk] `MemberDetailSheet` が `saved` / `withdrawn` / `correctionChanged` を emit するが、`EventDetailPage` 側に伝搬先がない** → 当面はリスナー未設定で吸収。Page の participants 一覧は `mutation-settled` 時に refetch されるため、メモ編集 / 退会等の結果は次回シートを開いた時 or タブ再表示時に反映される（許容範囲）
- **[Trade-off] `?detail=` 直 URL で会員詳細を開けるようになる** → 既に `/members?detail=<id>` で同等の動線あり、admin 認証 + RLS 配下のため新規セキュリティ面なし

## Migration Plan

DB migration なし。デプロイは通常の Render auto-deploy。ロールバックは PR revert で完結（feature flag 不要）。
