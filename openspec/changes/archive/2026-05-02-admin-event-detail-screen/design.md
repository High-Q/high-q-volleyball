## Context

Issue #85 で admin の `/events`（一覧）、Issue #86 で `/events/new` と `/events/:id/edit`（CRUD）が完成し、Epic #167「オーナーがイベントを公開する」のコア責務が揃った。本 change は隣接する Epic #168「オーナーが当日運営を回す」のコアフロー — 当日に参加者を確認しながらチェックイン / キャンセル代行を回す — を担う `/events/:id` 画面を立ち上げる。

既存の DB スキーマ（events / members / reservations / venues）と RLS（admin は reservations の SELECT / UPDATE 全件可）は **そのまま使い回せる**。新規追加は SQL view 2 本（`event_detail_view` + `event_participants_view`）と、それらを read する admin 配下のコード一式のみ。下流の LP / 予約サイトには無影響。

設計サンプル `docs/10-デザインサンプル/admin/hq-admin-screens.jsx` の `ScreenEventDetail`（550 行目〜）が UI の信頼源。サンプルには CSV / 一括メール / キャンセル待ちタブ / モバイル UI が含まれるが、proposal で MVP2 押し下げを明示済み。

**既存の関連コード**:
- `apps/admin/src/widgets/events-list/`: 一覧 widget。同等の構成（Toolbar + 4 状態 + Table）を本 change の参加者一覧でも踏襲する
- `apps/admin/src/entities/event/`: `event_list_view` の DTO 型 + `eventQueries.ts`。同パターンで `entities/event-detail/` を新設する
- `apps/admin/src/features/events-filter/`: URL クエリ同期の composable。同パターンで `participants-filter` を新設する
- `apps/admin/src/features/event-delete/`: AlertDialog + composable パターン。同パターンで `reservation-cancel-by-admin` を作る
- `apps/admin/src/shared/ui/`: shadcn-vue 由来の Table / AlertDialog / Toast / Input / Select / Skeleton はすべて取り込み済み。新規プリミティブ追加は不要

## Goals / Non-Goals

**Goals:**

- `/events/:id` で StatCard 4 枚 + 参加者 DataTable を 1 スクロールで完結させる
- 個別チェックイン操作を **クリック 1 回・即時反映** で行える（当日の入場ピーク時間を想定。Optimistic UI）
- 個別キャンセル代行を AlertDialog 二重確認で安全に行える
- 参加者一覧の検索・フィルタは **URL 同期** し、ブラウザ戻る・リロード・他人への URL 共有で復元できる
- 「初回参加」判定を **DB 側（view 内）で計算** し、クライアントの N+1 やフラグ列の冗長保持を避ける
- 4 状態（Loading / Empty / Error / Success）を完全網羅し、event 取得失敗・event not found・参加者取得失敗を分岐表示
- 既存 `/events` 一覧から `/events/:id` への遷移動線を追加し、編集 CTA から `/events/:id/edit` に飛べる

**Non-Goals:**

- CSV エクスポート / 一括メール送信（MVP2）
- キャンセル待ちタブ機能（StatCard 4 枚目の `waitlist_count` 列は view に含めるが、表示は常に 0）
- モバイル専用大型タップチェックイン画面（PC 操作前提。レスポンシブ対応はするが「タブレットで指タップ」専用 UI は MVP2）
- admin による「予約代行追加」（admin が member を選んで予約を作る逆操作 — MVP2）
- 過去ログ / 監査履歴（誰がいつチェックインしたか）の表示（reservations に `checked_in_by` 列を追加する話は MVP2）
- バルクチェックイン（複数行選択 → 一括チェックイン）
- 無限スクロール / ページネーション（1 イベントの参加者は MVP1 想定で 18 名上限。閾値超過は MVP2）

## Decisions

### D1. SQL view を 2 本に分ける（`event_detail_view` + `event_participants_view`）

**Decision**: ヘッダ集計用の `event_detail_view`（1 イベント = 1 行）と、参加者一覧用の `event_participants_view`（1 予約 = 1 行）の **2 view を分離して定義** する。

**Rationale**:
- StatCard ヘッダと参加者テーブルは **更新タイミング・キャッシュ粒度・filter 適用の有無** が異なる
- ヘッダは event 単位で 1 行、参加者テーブルは検索・フィルタを SQL レベルで効かせたい（ILIKE / experience_level / status）
- 単一 view で両用途を兼ねると header 取得時にも参加者全行を joinscanすることになり、無駄
- view を分けることで `event_participants_view` 側に index 効くフィルタ条件（event_id + status）を素直に渡せる

**Alternatives considered**:
- (A) 単一 `event_detail_with_participants_view`: ヘッダ + 全参加者を JSON 集約。1 ラウンドトリップで済むが filter / sort を SQL で効かせられず、クライアントで filter する羽目になる。却下
- (B) View なしで events → reservations → members を直接 join（クライアントクエリ）: 既存 `event_list_view` の方針（「クライアントで join しない」明文化）に反する。却下
- (C) RPC 関数で集計返却: SECURITY DEFINER の権限漏れリスクと、TanStack/関連 ORM の型生成相性が悪い。却下

### D2. 「初回参加」判定は `event_participants_view` 側で NOT EXISTS で計算

**Decision**: `is_first_time` 列を `event_participants_view` で次のように定義する:

```sql
not exists (
  select 1 from public.reservations r2
  where r2.member_id = r.member_id
    and r2.status = 'attended'
    and r2.event_id <> r.event_id
    and exists (select 1 from public.events e2 where e2.id = r2.event_id and e2.start_at < e.start_at)
) as is_first_time
```

**Rationale**:
- 「このイベントが当該 member の最初の参加か」は **過去に attended 履歴があるか** で判定する
- 「reserved（予約のみ）だけある」は first_time に含めない（実際に来場した記録のみカウント）
- `start_at <` で時系列を比較するため、当日朝 admin が他イベントを誤って先に attended にしても本イベントの判定が安定する
- DB 側計算により、admin が参加者一覧を開いた瞬間にフラグが揃う（クライアント N+1 不要）

**Alternatives considered**:
- (A) members に `first_event_id` 列を持つ: 履歴の整合性維持コストが高い（チェックイン取消時に書き戻し必要）。却下
- (B) クライアントで member ごとに過去予約を fetch: N+1 確実。却下
- (C) `created_at` ベース判定（このイベントへの予約が当該 member の最初の予約か）: 「予約だけして来なかった」もカウントしてしまい、初回バッジの意味がブレる。却下

`first_time_count` は `event_detail_view` 側でも同じロジックで集計（`COUNT(*) FILTER WHERE is_first_time AND status='reserved'`）。view 間でロジックを共有するため、判定式は共通の SQL 関数 `public.is_first_time_for_event(member_id, event_id, event_start_at)` として切り出すことを **検討するが MVP1 では各 view にインライン展開** する（複雑度を抑えるため）。

### D3. チェックイン操作は status + checked_in_at の同時 UPDATE、Optimistic UI

**Decision**: チェックインのトグル操作は `reservations` に対して `status` と `checked_in_at` の **2 列同時 UPDATE** を 1 回発行する。

```sql
-- チェックイン
update reservations set status = 'attended', checked_in_at = now()
  where id = :id and status = 'reserved' and checked_in_at is null;
-- チェックイン取消
update reservations set status = 'reserved', checked_in_at = null
  where id = :id and status = 'attended';
```

UI は **Optimistic** に振る舞う: クリック直後にチェックボックスの見た目を更新し、UPDATE 失敗時は元に戻して Toast でエラーを出す。StatCard の集計（チェックイン済 / 残席）は **詳細画面のフォーカス時に再 fetch**（既存パターン）+ 楽観的反映（クライアント側で +1/-1 計算）の併用で「数字がワンテンポ遅れる」体験を回避する。

**Rationale**:
- 当日入場時は **5〜10 秒に 1 件の連続チェックイン** が想定される。各操作で全画面 refetch は UX 劣化
- WHERE に `status = 'reserved'` を付けることで、二重 UPDATE（複数タブから同時に押す）を 0 行更新で安全に弾ける
- `checked_in_at` を NULL に戻す操作は admin のミスタップ救済（チェックイン済を取消）として MVP1 で必要

**Alternatives considered**:
- (A) status だけ更新し checked_in_at は別操作: 2 ラウンドトリップ + 不整合リスク（status='attended' で checked_in_at=NULL 行が生まれる）。却下
- (B) Pessimistic（クリック → ローディング → 結果反映）: 当日の入場ピーク時に体感劣化。却下
- (C) DB トリガーで status 変更時に checked_in_at を自動 set: 「checked_in_at だけ手で書き換える」運用と衝突する可能性 + 既存 `set_reservations_cancelled_at` トリガー以上の複雑度。MVP1 ではアプリ層で扱う方が透明性高い。却下

### D4. キャンセル代行は AlertDialog 二重確認 + status='cancelled' UPDATE のみ

**Decision**: 行の「キャンセル代行」アクションを押下 → AlertDialog で「○○さんの予約をキャンセルします。よろしいですか？」 → 確定で `update reservations set status = 'cancelled' where id = :id` を発行。`cancelled_at` は既存トリガー `set_reservations_cancelled_at` が自動設定する。

**Rationale**:
- admin の「予約は触らずチェックインだけ」と「予約自体を取り消す」を **明示的に分離**（誤操作防止）
- AlertDialog は #86 の event-delete で取り込み済みのプリミティブを再利用
- DB DELETE ではなく status UPDATE にすることで履歴を保持（後日「いつキャンセルされたか」を追える。`cancelled_at` 列がそのため）

**Alternatives considered**:
- (A) DELETE: 予約履歴が消えて「直前キャンセル多い member」を後から検出できなくなる。却下
- (B) ワンタップ確認なし: 当日の慌ただしさで誤操作リスク高い。却下
- (C) cancel_reason をフリーテキストで記録: MVP1 ではフィールド未追加（reservations.note を流用するか MVP2 で専用列追加）。MVP1 ではダイアログ確認のみで cancel_reason は記録しない

### D5. URL クエリ同期は events-filter と同じパターンを踏襲

**Decision**: `?q=` `?exp=` `?ck=` の 3 クエリで「検索文字列 / 経験レベル / チェックイン状態」を保持する。`useParticipantsFilter` composable を `features/participants-filter/` に置き、`router.replace({ query: { ...currentQuery, q: newValue } })` で merge 更新する。

**Rationale**:
- `events-filter` で確立済みの実装パターン。テスト方針も流用可
- ブラウザ戻る / リロード / URL 共有（admin 同士で「この絞り込み状態を見て」）に対応
- `?ck=unchecked` だけ URL に持たせれば、当日 admin の「未チェックイン者を順に呼ぶ」運用で URL がブックマーク可能

**Alternatives considered**:
- (A) `localStorage` に保持: URL 共有不可。戻る/進むに反応しない。却下
- (B) クライアント state のみ（URL 同期なし）: リロードで状態消える。却下

### D6. Tabs は MVP1 では簡易自前実装（shadcn-vue Tabs 取り込みは MVP2）

**Decision**: 「参加者一覧 / キャンセル待ち / 当日チェックイン」の 3 タブのうち、**MVP1 で active になるのは参加者一覧のみ**。残り 2 タブは disabled で「Coming soon」ツールチップ。これだけのために shadcn-vue の Tabs プリミティブを取り込まず、`apps/admin/src/widgets/event-detail/ui/EventDetailTabs.vue` に **約 30 行の自前実装** で済ませる（button + aria-selected + 視覚スタイル）。

**Rationale**:
- 取り込み済プリミティブが増えると保守対象が増える。「使う場面で取り込む」#86 の方針を踏襲
- MVP2 で 2 タブが active になるタイミングで shadcn-vue Tabs を取り込み直しても遅くない
- a11y 要件（aria-selected / role="tab" / Tab キー操作）は 30 行に収まる

**Alternatives considered**:
- (A) shadcn-vue Tabs を取り込む: スコープ外プリミティブが増える。却下
- (B) Tabs を出さない（タイトル下にすぐ Toolbar）: 設計サンプルのビジュアルから乖離 + MVP2 でレイアウト破綻する。却下

### D7. event not found（RLS 含む）は明示的に Error 状態として「一覧へ戻る」CTA 付き

**Decision**: `event_detail_view` の SELECT が 0 行（存在しない id / RLS で見えない）の場合、Error 状態として「イベントが見つかりません。一覧から選び直してください」+ 「一覧へ戻る」CTA を表示する。

**Rationale**:
- `/events/:id` は URL に id を直書きで開ける → 削除済み event の URL を踏むケースが想定される
- 単に Empty にすると「event はあるが参加者がいない」と区別できない
- 既存の event-edit 画面（`EventEditPage`）が同パターンの「編集対象が存在しない」Error を実装済み。揃える

### D8. StatCard 1 番目は「capacity 有無で残席 / 予約数を動的切替」

**Decision**: StatCard 4 枚のうち 1 番目を、`capacity` 列の有無で表示内容を動的に切り替える:

- `capacity = NULL`（MVP1 デフォルト）:
  - Kicker: `— 01`
  - ラベル: 「予約数」
  - 主値: `reserved_count`
  - 補助単位: 「名」
- `capacity` あり（将来 #86 が capacity 入力 UI を MVP2 で復活させた時）:
  - Kicker: `— 01`
  - ラベル: 「残席」
  - 主値: `capacity - reserved_count`
  - 補助単位: `/ capacity 名`

**Rationale**:
- #86 の admin-events-crud で `capacity` をフォームから外した（spec で「INSERT 時 NULL のまま残す」明文化済み）。MVP1 で新規作成された events は **すべて capacity = NULL**。設計サンプルの「残席 2 / 18」表示は当該前提下では機能しない
- 「定員未設定」フォールバックを主表示にすると StatCard が常に縮退表示となり画面が破綻する。MVP1 のサークル運営の実態として **「予約数 16 名」** の方が情報価値が高い
- view 側の列追加は不要（既に `capacity` も `reserved_count` も含まれる）。アプリ側で `capacity === null ? '予約数' : '残席'` の三項演算で出し分ける
- 将来 capacity 入力 UI を復活させた時、view も spec も touch なしで自動的に「残席」表示に切り替わる（switch 文 1 箇所だけが切替点）

**Alternatives considered**:
- (A) StatCard を 3 枚に減らす（チェックイン / 初回 / キャンセル待ち）: 視覚的バランスが崩れる + 設計サンプルからの乖離が大きい + 将来 capacity 復活時に再度 4 枚にレイアウト戻す手間。却下
- (B) 常に「残席」ラベルで capacity NULL は「定員未設定」表示: MVP1 で常時縮退表示となり StatCard の存在価値が薄い。却下
- (C) MVP1 でフォームに capacity を再追加して埋める: スコープ拡張。本 change の責務外（#86 の MVP2 押し下げ判断を覆すことになる）。却下

### D9. RemainBar は capacity ありの時のみ表示

**Decision**: `RemainBar`（`@high-q/ui`）は `capacity` が non-NULL の時のみ描画する。`capacity = NULL` の時は RemainBar を **描画しない**（領域も取らない）。

**Rationale**:
- RemainBar は `booked / capacity` の比率を視覚化するコンポーネント。capacity がないと意味が成立しない
- MVP1 では実質 RemainBar が出ないことになるが、「予約数 N 名」の StatCard で代替できる
- 将来 capacity 入力 UI が復活したら自動で RemainBar が出現する（条件分岐 `v-if="capacity !== null"` のみで切替）

**Alternatives considered**:
- (A) 「予約数 N 名 / 定員未設定」のようなテキスト fallback を RemainBar 位置に出す: 視覚的に StatCard と重複情報 + UI の冗長化。却下
- (B) capacity 未設定でも reserved_count を絶対数で示す bar を出す（capacity を 18 と仮定して描画）: 嘘の情報を出すリスク。却下

### D10. チェックイン UI は Switch (Toggle) + 自前実装

**Decision**: 参加者テーブルのチェックイン状態切替 UI は **Switch (Toggle) コンポーネント** を使用する。`role="switch"` + `aria-checked="true|false"` + テキストラベル「未 / 済」を併記。shadcn-vue Switch プリミティブは取り込まず、`apps/admin/src/features/reservation-checkin/ui/CheckinToggle.vue` に **約 50 行の自前実装** で済ませる。

仕様:
- 視覚: 横長の pill 内に丸が左（未 / グレー）/ 右（済 / `var(--hq-success)` 緑）にスライド
- 押下領域: Switch 本体 + 隣接テキストラベル全域
- キーボード: Tab でフォーカス可能、Space / Enter でトグル
- アニメーション: transform transition 150ms（accessibility: `prefers-reduced-motion: reduce` 時は 0ms）
- ラベル: Switch の右に「未」/「済」テキストを併記（一覧スキャン時の視認性向上）

**Rationale**:
- **セマンティクス**: WAI-ARIA で `role="switch"` は「ON/OFF の二値設定」用。`role="checkbox"` は本来「リストから複数項目を選択する」用途。チェックイン状態は前者に該当し、Switch がより正しい
- **当日運営の視認性**: 一覧 16 行を縦スキャン時に「右に滑った緑 = 済」「左の灰色 = 未」が一目でわかる。Checkbox の ✓/空 は小さく視認性が劣る
- **タップ領域**: Switch の pill 全体（横 36-40px）がクリック可能。Checkbox の 16-20px 矩形より広く、当日の連続操作で誤タップが減る
- **設定セマンティクスの直感性**: 「ON/OFF を切り替えている」という体験が手に直接伝わる（Checkbox は「選択した / 解除した」のメタファー）
- **アクセシビリティ**: `role="switch"` + `aria-checked` の組み合わせはスクリーンリーダーで「スイッチ、オン / オフ」と読み上げられる。Checkbox より状態が明示的
- **shadcn-vue Switch を取り込まない理由**: 本 change で必要なのはチェックイン用の 1 種類のみ。Tabs と同じ「使う場面で取り込む」#86 の方針を踏襲。他画面で Switch が必要になった時点で取り込み直しても遅くない（外側 API は同じため乗り換えコスト低い）

**Alternatives considered**:
- (A) Checkbox: 当初案。前述の通りセマンティクスが弱く視認性も劣る。却下
- (B) Pill ボタン（`[ チェックイン ] / [ ✓ 済 ]`）: 押下領域は広いが、未状態のボタンが「クリックすると何が起きる？」を事前に説明する必要があり、文字情報が増えて一覧スキャン時に煩雑。「アクション」のセマンティクスは状態切替には過剰。却下
- (C) Chip（クリック可能 Badge）: 「クリック可能」が直感的でない（Badge は通常 read-only）。却下
- (D) shadcn-vue Switch を取り込む: スコープ外プリミティブが増える。本 change の必要量に対して過剰。却下

### D11. ページネーションなし（MVP1）

**Decision**: 参加者一覧にページネーションを **付けない**。MVP1 のサークル定員は 14〜18 名想定で 1 画面に収まる。

**Rationale**:
- 18 行 × カラム数で 1 スクロール内に余裕で収まる
- ページネーションを付けると検索 / フィルタとの URL 同期 / state 維持の複雑度が増える
- 18 名超のイベント（合宿等）が MVP2 で出てくる可能性はあるが、その時点で events-list と同じ pagination 実装を流用すれば済む

### D12. テスト戦略 — composable 中心 + widget の状態出し分け component test + E2E 1 件

**Decision**:
- **Composable unit test**（Vitest）: `useParticipantsFilter`（URL クエリ ⇄ state 双方向）、`useReservationCheckin`（optimistic + rollback）、`useReservationCancelByAdmin`（confirm → mutation → success/error）
- **API layer test**（Vitest + MSW or Supabase mock）: `eventDetailQueries` / `reservationQueries` / `reservationMutations`
- **Component test**（Vitest + @vue/test-utils）: `EventDetailWidget` の 4 状態出し分け、`EventParticipantsTable` のチェックボックス挙動
- **E2E**（Playwright、CLAUDE.md ルールにより 1 件）: 「`/events/:id` を開く → 参加者の 1 名にチェックイン → StatCard チェックイン済が +1 反映」のハッピーパス。キャンセル代行は component test に押し下げ

**Rationale**:
- E2E の追加上限「機能あたり 1〜2 件」を厳守。詳細バリエーションは component test で吸収
- composable に純粋ロジックを切り出す FSD 設計のため、composable test の網羅性が最重要
- StatCard の「チェックイン後に +1 反映」は最も壊れやすい結合点（D3 の optimistic 反映）。E2E でガード

## Risks / Trade-offs

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | `is_first_time` の NOT EXISTS が遅い（reservations が膨らむと event_participants_view 全行で N 回スキャン） | MVP1 想定（reservations < 数百行）では index `(member_id, status)` で十分。膨らんだら view を materialized + 定期 refresh に切替（MVP2 検討） |
| 2 | Optimistic UI のロールバック忘れで「クリックしたが DB 上は更新されていない」状態 | `useReservationCheckin` の Vitest で必ず「mutation reject 時に state が元に戻る」をテスト。E2E 失敗時の Toast 表示も覆う |
| 3 | Switch 連打で多重 UPDATE がレースする | UPDATE WHERE 句に `status = 'reserved'` を含めることで 2 件目以降は 0 行更新で no-op。`useReservationCheckin` 側でも `inFlight` Set を持って同 reservation_id の二重発火を防ぐ |
| 4 | event 削除直後に詳細画面を開くと event not found Error が出る（D7 で対応済みだが UX として一瞬わかりづらい） | Error 文言を「イベントが見つかりません。削除済みの可能性があります」と具体化 |
| 5 | view を 2 本に分けたことで「ヘッダの reserved_count」と「テーブルから手で数えた行数」が一瞬ズレる（チェックイン後の集計再計算ラグ） | D3 の通り、optimistic 反映を StatCard 側にも適用。背景で view を refetch して整合性を取る |
| 6 | キャンセル代行で reservations.status を cancelled に変えると StatCard の reserved_count が減る → 残席が増える、この時 event_detail_view の値も即座に refetch が必要 | キャンセル代行 mutation 成功時に `event_detail_view` の queryKey を invalidate（StatCard 再描画）。テストでカバー |
| 7 | `event_participants_view` が SECURITY INVOKER で reservations の RLS を継承 → admin 以外（理論上）が読むと自分の予約しか見えない | 設計通り（漏洩リスクなし）。本画面は admin guard 配下のみで使う契約を migration コメントに明記 |
| 8 | shadcn-vue Tabs を自前実装（D6）したことで、後で MVP2 でアクティブ化する際に書き直しコストが発生 | a11y 属性（role="tab" / aria-selected / aria-controls）を MVP1 で正しく入れておけば、MVP2 で shadcn-vue Tabs に差し替えても外側 API は同じ。乗り換えコスト < 取り込みコスト |
| 9 | Switch を自前実装（D10）したことで、他画面で Switch が必要になった時に shadcn-vue 取り込み + 既存 CheckinToggle の置換が発生 | a11y 属性（role="switch" / aria-checked）と外側 props（`modelValue: boolean` / `disabled` / `aria-label`）を shadcn-vue Switch と同じ形に揃えておけば差し替え容易。実用上は CheckinToggle を残し新画面のみ shadcn-vue Switch を使う混在運用も可 |
| 10 | StatCard 1 番目の動的ラベル（D8）が「ラベル文言が画面ごとに変わる」UX の不安定さを生む | MVP1 では実質「予約数」固定表示（capacity NULL のため）。capacity 入力 UI を MVP2 で復活させる時点で改めて UX レビューを通す。Component test で両分岐をカバー |
| 11 | RemainBar 非表示（D9）により MVP1 の画面が「StatCard だけ」で視覚バランスが寂しい | StatCard の余白・タイポを丁寧に組めば視覚的に成立する（既存 events-list の StatCard デザインと整合）。ベータ運用で「ビジュアル弱い」FB が出たら次の change で対応 |

## Migration Plan

1. **DB Migration（先行）**: `supabase/migrations/YYYYMMDDHHMMSS_event_detail_views.sql` を追加
   - `create or replace view public.event_detail_view ...`
   - `create or replace view public.event_participants_view ...`
   - 両方 `revoke all on ... from anon` + `grant select on ... to authenticated`
   - ロールバック: `drop view event_participants_view;` `drop view event_detail_view;`
2. **Type 追加**: `apps/admin/src/entities/event-detail/model/eventDetail.types.ts` + `entities/reservation/model/reservation.types.ts`（参加者行 DTO）
3. **API layer**: `eventDetailQueries.ts`（getEventDetail / getEventParticipants）+ `reservationMutations.ts`（toggleCheckin / cancelByAdmin）
4. **Composables**: `useParticipantsFilter` / `useReservationCheckin` / `useReservationCancelByAdmin`
5. **UI components**: 各 widget / feature の Vue コンポーネント
6. **Page + Router**: `EventDetailPage.vue` + `/events/:id` ルート
7. **一覧画面の動線追加**: `EventsTable` の行に「詳細」リンク（or 行クリック）を追加し `/events/:id` へ
8. **手動確認**: ローカル Supabase で seed データを使い、Loading / Empty / Error / Success の 4 状態 + チェックイン + キャンセル代行を一通り操作
9. **PR 作成**: CI 全パス + Render プレビュー確認
10. **Sync / Archive / Merge / 後始末**

**ロールバック戦略**:
- DB view は `drop view if exists` で安全に戻せる（ベーステーブルへの破壊変更なし）
- アプリ側はルート `/events/:id` を削除すれば旧状態に戻る（一覧画面に追加した「詳細」リンクも削除）

## Open Questions

- **Q1**: `is_first_time` の判定で `start_at` 比較を view 内で展開するか、SQL 関数 `is_first_time_for_event(...)` に切り出すか
  → MVP1 ではインライン展開（D2 末尾）。view 2 本での重複は許容
- **Q2**: 「キャンセル代行」のアクション UI は **行末アイコン** か **行右クリックメニュー** か
  → 設計サンプルでは行末アイコン群（edit / more）。MVP1 では「キャンセル代行」を明示ラベルのアイコンボタン 1 つに絞る（more メニュー実装は MVP2）
- **Q3**: チェックイン取消の権限を MVP1 で admin に開放するか
  → 開放（D3）。当日の admin ミスタップ救済が必要
- **Q4**: 一覧 → 詳細の遷移は **行クリック全体** か **「詳細」リンク列** か
  → 「タイトル」列をリンク化（行全体クリックは「編集」リンクとの誤操作リスクあり）。これは spec で明示
