## Context

`admin-events-crud` のイベントフォームは「01 基本情報」1 セクション（タイトル / 開催日 / 開始 / 終了 / 会場 / 参加費）のみで、定員を含む 5 列（capacity / description / thumbnail / cancel_deadline / 公開設定）は MVP1 で意図的にスコープオフされた。実装上も `createEvent` は `capacity: null` を固定投入し、`updateEvent` は allowlist で capacity を除外している。

一方、`admin-event-detail`（残席 StatCard / RemainBar）と `reservation-events-and-booking`（満員 CTA / 予約埋まり具合チップ）は **capacity 非 NULL を前提に既に spec / 実装済み**で、入力経路が無いだけで休眠している。本変更は定員入力のみを復活させ、これらを目覚めさせる。

## Goals / Non-Goals

**Goals:**
- 作成/編集フォームで定員を任意入力でき、空欄=NULL（上限なし）/ 数値=上限ありを永続化する。
- 編集時、現在の有効予約人数を下回る定員設定を防ぐ（残席が負にならない）。
- 下流の残席 / RemainBar / 満員 CTA が capacity 入力後に機能することを検証する。

**Non-Goals:**
- 紹介文 / サムネイル / キャンセル期限 / 公開設定の復活（引き続きスコープオフ）。
- 定員変更に伴う既存キャンセル待ちの自動繰り上げ（#154 / #344 の領域）。
- 定員を満員以下に下げる際の予約強制キャンセル（やらない。下限ガードで防ぐ）。

## Decisions

### D1: 定員フィールドは「01 基本情報」セクション内・参加費の下に配置
新規セクションを作らず既存 1 セクション構成を維持する。定員は単独で「02 募集要項」を立てるほどの粒度が無く、認知負荷を上げないため基本情報に同居させる。`FormField`（shared/ui）でラップし、生 `<label>+<input>` 直書きを避ける（グローバル UI 規約 MUST）。input type は number、placeholder は「上限なし」。

- 代替案: 専用セクション新設 → 1 フィールドのために構造を増やす過剰設計。却下。

### D2: 空欄 = NULL（上限なし）、数値 = 1 以上の整数
参加費の任意性パターンを踏襲する。空欄は `capacity = NULL` で「上限なし運用」を維持（後方互換）。値ありの場合のクライアントバリデーション:
- 整数（小数 / 非数を弾く）
- 1 以上（0 や負数を弾く。0 定員は予約不能イベントで無意味）

### D3: 編集時は現在の有効予約人数を下限とする
編集フォームのマウント時に `event_detail_view` を当該 event_id で SELECT し `reserved_count`（本人 + 同伴の active 集計、`status IN ('reserved','attended')`）を取得する。定員を `reserved_count` 未満に設定しようとした場合、定員欄直下に inline error「現在 {reserved_count} 名の予約があります。定員はこれ以上にしてください」を表示し保存をブロックする。

理由: 定員 < 予約数 になると残席が負・即時満員という不整合が起きる。応急手当てではなく入力段階で構造的に防ぐ（CLAUDE.md Pillar 5）。create mode は予約 0 のため下限 1。

- `reserved_count` 取得失敗時: 下限バリデーションをスキップ（1 以上の整数チェックのみ適用）し、フォーム全体は Error にしない（縮退）。これにより view 取得不能でも定員編集自体は継続できる。
- 代替案: 保存は許して残席を負表示 → UX 破綻。却下。代替案: 下げる際に予約を強制キャンセル → 破壊的すぎる。却下。

### D4: 永続化は createEvent / updateEvent の capacity 解禁
- `createEvent`: payload の `capacity: null` 固定を `capacity: input.capacity ?? null` に変更。
- `updateEvent`: allowlist に `if ("capacity" in p) safe.capacity = p.capacity;` を追加。
- `EventInsert` / `EventUpdate` 型に `capacity?: number | null` を追加。
- `visibility` / `description` / `cancel_deadline` の固定・除外は維持（capacity だけ解禁）。

### D5: 下流はコード変更なし・検証のみ
残席 StatCard / RemainBar / 満員 CTA は capacity 非 NULL で既に動作する設計。本変更では capacity を入れた event でこれらが正しく描画されることを E2E / 手動確認で担保し、spec は変更しない。

## Risks / Trade-offs

- [編集時の reserved_count 取得が 1 fetch 増える] → Edit マウント時のみ。event 本体取得と並行実行し体感影響を抑える。失敗時は D3 の縮退で吸収。
- [定員を予約数ぎりぎりに設定後、別 admin が同時予約して超過] → 本変更の範囲外（予約は reservation 側）。満員判定は閲覧時の集計で動的に行われ、超過時は CTA disabled になるため致命的不整合にはならない。
- [既存 capacity=NULL event との混在] → NULL は「上限なし」として一貫して扱われ、残席/RemainBar は NULL 時に非表示（既存仕様）。問題なし。

## Migration Plan

- DB migration なし（`events.capacity` 列は既存）。
- ロールバック: フロントのフィールド削除 + createEvent/updateEvent を元に戻すだけ。入力済み capacity 値は NULL に戻さず残しても無害（下流は NULL/非 NULL 両対応）。

## Open Questions

- 定員欄の補助テキスト（hint）文言の最終確定（specs で明文化）。
- 編集時の inline error 文言の最終確定（specs で明文化）。
