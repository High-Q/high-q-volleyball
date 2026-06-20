## ADDED Requirements

### Requirement: キャンセル済みグループ

HistoryPage は「予約中」グループの下、「過去」グループの上に「キャンセル済み」グループを SHALL 表示する。本グループには **`status === 'cancelled'` の予約すべて**（受付可否を問わず）を集約し、過去グループから分離する MUST。

並び順は **受付可能（再予約可）な行を先頭に `events.start_at ASC`、続いて受付不可な行を `events.start_at DESC`** とし、再予約できる予約を上に前面化する MUST。受付可能の判定は以下をすべて満たすこととする MUST:

- `Date.parse(event.startAt) > now()`（イベント未開催）
- 満席でない（`formatAvailability(event.availability).isFull === false`）

受付可否の判定述語はクライアント側の純関数として実装し、グループ分割（`splitReservations`）の中で「キャンセル済み」グループの分離と並び替えに用いる MUST。同一予約を「キャンセル済み」と「過去」の双方に二重掲載しない MUST NOT。

グループ見出しは「— キャンセル済み · {N}」のモノスペース kicker（`N` は本グループの件数）。0 件のときグループ自体を非表示にする MUST。

各行のバッジは「キャンセル」（neutral）を表示し、イベント名は取消線（`line-through`）+ muted 色で描画する MUST。

各行のうち **受付可能（未開催かつ非満席）な行にのみ** 「再予約する」CTA を SHALL 配置する。受付終了（開催済）または満席の行には「再予約する」CTA を描画しない MUST NOT。「再予約する」CTA 押下で対象イベント詳細画面（`event-detail`）へ遷移し、予約 Sheet（create モード）を自動オープンするディープリンク経路を起動する MUST（経路の詳細は `reservation-booking-flow` capability の「予約 Sheet のディープリンク起動」要件に従う）。CTA 押下時は親 router-link への伝播を `event.stopPropagation()` 相当で抑制する MUST。

#### Scenario: キャンセル済みグループの集約
- **WHEN** `status='cancelled'` の予約が複数（受付可能・受付終了が混在）ある状態で `/history` を開く
- **THEN** すべてのキャンセル済予約が「キャンセル済み」グループに表示され、「過去」グループには 1 件も表示されない

#### Scenario: キャンセル済みグループの並び順
- **WHEN** キャンセル済みグループに受付可能な行（`2026-06-25` / `2026-06-20`・未開催非満席）と受付終了の行（`2026-05-10` / `2026-05-01`・開催済）がある
- **THEN** 受付可能を先頭に `2026-06-20` / `2026-06-25`（ASC）、続いて受付終了を `2026-05-10` / `2026-05-01`（DESC）の順に並ぶ

#### Scenario: 受付可能な行に「再予約する」CTA を表示
- **WHEN** `status='cancelled'` かつ `event.startAt > now()` かつ非満席の行を確認する
- **THEN** 当該行に「再予約する」CTA が描画される

#### Scenario: 受付終了・満席の行に「再予約する」CTA を出さない
- **WHEN** `status='cancelled'` かつ（`event.startAt <= now()`（開催済）または満席（`isFull === true`））の行を確認する
- **THEN** 当該行に「再予約する」CTA は描画されない（DOM に存在しない）

#### Scenario: キャンセル済み 0 件の表示
- **WHEN** `status='cancelled'` の予約が 0 件
- **THEN** 「キャンセル済み」見出しと枠ごと描画されない

#### Scenario: 「再予約する」CTA でイベント詳細へディープリンク
- **WHEN** キャンセル済みグループの受付可能な行の「再予約する」CTA を押下する
- **THEN** 対象イベント詳細画面へ遷移し、予約 Sheet（create モード）自動オープンのディープリンクが起動され、予約詳細画面への遷移は発生しない

#### Scenario: 「再予約する」CTA の伝播抑制
- **WHEN** キャンセル済みグループの受付可能な行の「再予約する」CTA を押下する
- **THEN** 親 router-link（予約詳細画面への遷移）は発火しない

## MODIFIED Requirements

### Requirement: 過去グループ

HistoryPage は「キャンセル済み」グループの下に「過去」グループを SHALL 表示する。`status` が `'attended'` / `'no_show'` / `'waitlist'`、または `status='reserved'` だが `event.startAt <= now()`（不整合）の予約を `events.start_at DESC`（最新が先頭）で並べる MUST。

`status === 'cancelled'` の予約は受付可否を問わず「キャンセル済み」グループに集約するため、過去グループには **含めない** MUST NOT。

グループ見出しは「— 過去 · {N}」のモノスペース kicker。

行のバッジは状態によって以下を表示する MUST:

- `'attended'` → 「参加済」（success + dot）
- `'no_show'` → 「未参加」（neutral）
- `'waitlist'` → 「キャンセル待ち」（neutral）
- `'reserved'`（過去・不整合）→ 「予約中」（accent + dot）+ 注記不要（描画はするが数は少ない想定）

#### Scenario: 過去グループの並び順
- **WHEN** 過去グループに該当する予約が複数ある
- **THEN** `events.start_at` の降順に並ぶ

#### Scenario: 状態バッジ
- **WHEN** 各 status の行を確認する
- **THEN** `attended`→「参加済」, `no_show`→「未参加」, `waitlist`→「キャンセル待ち」 のバッジが表示される

#### Scenario: キャンセル済は過去グループに含まれない
- **WHEN** `status='cancelled'` の予約（受付可能・受付終了いずれも）がある
- **THEN** 当該行は過去グループには描画されず、「キャンセル済み」グループに描画される
