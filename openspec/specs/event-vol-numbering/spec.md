# event-vol-numbering Specification

## Purpose
TBD - created by archiving change event-vol-numbering. Update Purpose after archive.
## Requirements
### Requirement: vol の開催日時順自動採番と過去凍結

システムは `events.vol`（回号）を **開催日時（`start_at`）順** で自動採番する SHALL。採番は以下の不変条件を満たす MUST:

- **過去凍結**: `start_at <= now()` のイベントの `vol` は自動採番の対象外とし、一度確定した値を変更しない MUST NOT。開催済みの回番号は歴史的事実として永続する。
- **未開催連番**: `start_at > now()` かつ `status <> 'cancelled'` のイベントは、開催日時昇順で「過去の非中止イベントの最大 vol」に続く連番を持つ MUST。
- 採番はアプリ層の書き込み経路に依存せず DB 側で保証される MUST（特定アプリのコードパスに依存しない単一の真実）。

#### Scenario: 未開催イベントは過去最大に続く連番を持つ
- **WHEN** 過去の非中止イベントの最大 vol が 74 で、未開催の非中止イベントが開催日時順に 2 件存在する
- **THEN** 当該 2 件の vol は開催日時昇順で 75・76 となる

#### Scenario: 開催済みの回番号は再採番されない
- **WHEN** 既に vol=73 / 74 が確定した開催済みイベントがあり、その後に別のイベントが追加・変更される
- **THEN** vol=73 / 74 の開催済みイベントの vol は変化しない

### Requirement: 割り込み登録・再スケジュールによる未開催回のシフト

未開催イベントの追加・`start_at` 変更・削除のいずれが発生しても、システムは未開催の非中止イベントの `vol` を開催日時順に振り直す SHALL。これにより、既存の未開催回より早い日付で新規イベントを登録すると、割り込んだイベントが若い番号を取り、以降の未開催回が 1 つずつ後ろへシフトする MUST。過去凍結イベントには一切影響しない MUST NOT。

#### Scenario: 早い日付の割り込みで以降がシフト
- **WHEN** 未開催イベント A（vol=76）が存在し、A より早い未開催日時で新規イベント B を登録する
- **THEN** B の vol は 76、A の vol は 77 に更新される（過去の vol は不変）

#### Scenario: 再スケジュールで番号が振り直される
- **WHEN** 未開催イベントの `start_at` を他の未開催イベントより後ろの日時へ変更する
- **THEN** 未開催イベント群の vol が新しい開催日時順で振り直される

### Requirement: 中止イベントの番号解放と過去凍結

未開催（`start_at > now()`）で `status='cancelled'` のイベントは採番対象から除外し、`vol` を NULL に解放する SHALL。解放により以降の未開催回の番号は 1 つ詰まる MUST。過去（`start_at <= now()`）の中止イベントの vol は凍結し変更しない MUST NOT。

#### Scenario: 未開催の中止は番号を解放し以降が詰まる
- **WHEN** 未開催イベントが日時順に X（vol=75）・Y（vol=76）・Z（vol=77）と並び、X を `cancelled` にする
- **THEN** X の vol は NULL、Y は 75、Z は 76 に詰まる

#### Scenario: 過去の中止イベントの vol は凍結
- **WHEN** `start_at <= now()` の開催済みイベントを `cancelled` にする
- **THEN** 当該イベントの vol は変更されない

### Requirement: 採番を保証する DB 関数とトリガ

システムは未開催イベントの vol を再計算する関数 `public.resequence_future_event_vols()` を `SECURITY DEFINER` で提供し、`events` への INSERT / DELETE / `start_at`・`status` の UPDATE を契機に statement-level トリガで実行する MUST。再計算は `vol` 列のみを更新し、トリガの発火対象列に `vol` を含めないことで再帰発火しない MUST。`vol` の有効値（非 NULL かつ非 cancelled）は一意である MUST（部分一意制約）。関数には anon / authenticated / service_role への適切な GRANT を与える MUST。

#### Scenario: 書き込みで再採番関数が起動する
- **WHEN** `events` に新規行を INSERT する、または既存行の `start_at` / `status` を UPDATE する
- **THEN** `resequence_future_event_vols()` が起動し、未開催イベントの vol が振り直される

#### Scenario: vol 列のみの更新では再帰発火しない
- **WHEN** 再採番関数が `vol` 列のみを UPDATE する
- **THEN** トリガは `start_at` / `status` 変更にのみ反応するため再発火せず、無限ループしない

#### Scenario: 有効な vol は一意
- **WHEN** 2 件の非中止イベントに同一の vol を割り当てようとする
- **THEN** 部分一意制約違反となる（NULL と cancelled は重複許容）

### Requirement: 既存イベント name からの回号移行と name 分離

migration はデータ移行時に、既存 `events.name` に埋め込まれた回号（`第N回` または `vol.NN` 形式）をパースして `events.vol` へ移し、`name` から当該回号トークンを除去して**シリーズ名**へ分離する SHALL。パースできない name は `name` を据え置き `vol = NULL` とする MUST。移行の最後に未開催分の再採番を 1 回実行する MUST。

#### Scenario: 第N回をパースして vol へ移し name を分離
- **WHEN** `name = '第74回ゆる練'` の既存イベントを移行する
- **THEN** `vol = 74`、`name = 'ゆる練'` になる

#### Scenario: vol.NN 形式もパースする
- **WHEN** `name = 'ゆる練 vol.43'` の既存イベントを移行する
- **THEN** `vol = 43`、`name = 'ゆる練'` になる

#### Scenario: パース不能な name は据え置き
- **WHEN** 回号トークンを含まない `name = '特別練習会'` を移行する
- **THEN** `name` は据え置かれ `vol = NULL` になる

