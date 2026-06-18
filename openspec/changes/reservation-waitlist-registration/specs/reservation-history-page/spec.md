## ADDED Requirements

### Requirement: キャンセル待ちグループ

HistoryPage は予約中グループの下、過去グループの上に「キャンセル待ち」グループを SHALL 表示する。`status === 'waitlist'` AND `Date.parse(event.startAt) > now()` を満たす予約を `events.start_at ASC`（直近予定が先頭）で並べる MUST。

グループ見出しは「— キャンセル待ち · {N}」のモノスペース kicker（`N` はキャンセル待ちグループの件数）。0 件のときグループ自体を非表示にする MUST。

各行には「キャンセル待ち」バッジを配置する MUST。未来のキャンセル待ちは「過去」ではないため、過去グループに混入させては SHALL NOT ならない。

#### Scenario: 未来のキャンセル待ちはキャンセル待ちグループに入る
- **WHEN** `status='waitlist'` AND 未来の予約が存在する状態で `/history` を開く
- **THEN** 当該予約はキャンセル待ちグループに `events.start_at ASC` で描画され、過去グループには現れない

#### Scenario: キャンセル待ち 0 件の表示
- **WHEN** 未来のキャンセル待ちが 0 件
- **THEN** 「キャンセル待ち」見出しと枠ごと描画されない

### Requirement: キャンセル待ちグループからの取り消し動線

キャンセル待ちグループの各行には「キャンセル待ちを取り消す」ボタンが SHALL 配置される。押下で確認ダイアログを経由し、確定操作で `reservations.status` を `'waitlist' → 'cancelled'` に UPDATE する MUST。

通常予約のキャンセルと異なり、開催日基準の期限ゲートは適用 SHALL NOT する（いつでも取り消せる）。取り消し時にメール通知は送信 SHALL NOT する。

取り消し成功時は対象行を UI 上で `status='cancelled'` に書き換え、再 fetch を発行しない SHALL。書き換えにより当該行はキャンセル待ちグループから過去グループへ移動し、「キャンセル」バッジ + 取消線で再描画される MUST。完了フィードバックを表示する MUST。

#### Scenario: キャンセル待ち行の取り消し成功
- **WHEN** キャンセル待ちグループの「キャンセル待ちを取り消す」を押し、ダイアログで確定する
- **THEN** `reservations.status` が `'cancelled'` に UPDATE され、当該行はキャンセル待ちグループから消え、過去グループに「キャンセル」バッジ + 取消線で表示される

#### Scenario: 過去グループにキャンセル待ち取り消しボタンが存在しない
- **WHEN** 過去グループの任意の行を確認する
- **THEN** 「キャンセル待ちを取り消す」ボタンは描画されない

## MODIFIED Requirements

### Requirement: 過去グループ

HistoryPage は予約中グループ・キャンセル待ちグループの下に「過去」グループを SHALL 表示する。`status` が `'attended'` / `'cancelled'` / `'no_show'`、または `status='waitlist'` だが `event.startAt <= now()`（開催済みの待機）、または `status='reserved'` だが `event.startAt <= now()`（不整合）の予約を `events.start_at DESC`（最新が先頭）で並べる MUST。**未来の `status='waitlist'`（`event.startAt > now()`）は過去グループに含めず、キャンセル待ちグループへ振り分ける** MUST。

グループ見出しは「— 過去 · {N}」のモノスペース kicker。

行のバッジは状態によって以下を表示する MUST:

- `'attended'` → 「参加済」（success + dot）
- `'cancelled'` → 「キャンセル」（neutral）
- `'no_show'` → 「未参加」（neutral）
- `'waitlist'`（過去・開催済み）→ 「キャンセル待ち」（neutral）
- `'reserved'`（過去・不整合）→ 「予約中」（accent + dot）+ 注記不要（描画はするが数は少ない想定）

`'cancelled'` の行はイベント名を取消線（`line-through`）+ muted 色で描画する MUST。

#### Scenario: 過去グループの並び順
- **WHEN** 過去グループに該当する予約が複数ある
- **THEN** `events.start_at` の降順に並ぶ

#### Scenario: キャンセル済の取消線表示
- **WHEN** `status='cancelled'` の行を確認する
- **THEN** イベント名が `line-through` + muted 色で描画される

#### Scenario: 状態バッジ
- **WHEN** 各 status の行を確認する
- **THEN** `attended`→「参加済」, `cancelled`→「キャンセル」, `no_show`→「未参加」, 過去 `waitlist`→「キャンセル待ち」のバッジが表示される

#### Scenario: 未来のキャンセル待ちは過去グループに含まれない
- **WHEN** `status='waitlist'` AND `event.startAt > now()` の予約が存在する
- **THEN** 当該予約は過去グループには描画されず、キャンセル待ちグループに振り分けられる
