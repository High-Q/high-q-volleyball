## Context

イベントの回号は現状 `events.name` に手書きで埋め込まれ（prod は `第73回ゆる練` 形式、admin は `ゆる練 vol.NN` を `useVolumeSuggest` でプレースホルダ提案）、機械可読な単一の真実がない。Issue #158 はイベント詳細の editorial 見出し（回号を accent 強調）を求めたが、調査の結果 (1) 設計サンプルの `vol.43` は実データと一致せず（prod は `第N回`、dev 52 件中 vol=0）、(2) 回号を name パースで拾う方式は脆い、と判明した。そこで回号を `events.vol` カラムへ格上げし、開催日時順で自動採番する基盤を作る。本 design は DB スキーマ・採番ロジック・本番データ移行・admin / reservation の表示までを横断する。

商用 prd は稼働中（admin / reservation）であり、本 migration は本番 events（約 74 件）の `name` 書き換え + `vol` backfill を伴う破壊的変更である点を全体の制約とする。

## Goals / Non-Goals

**Goals:**
- `events.vol` を回号の単一の真実とし、開催日時順で自動採番する
- 開催済みの回番号は永久固定、未開催のみ割り込み/再スケジュールでシフトする
- 既存 name の回号をパースして vol へ移行し、name をシリーズ名へ分離する
- admin はシリーズ名のみ入力 → vol 自動採番・読み取り専用表示
- 予約サイト詳細で `vol.NN` を editorial 強調（mono / accent / 改行）

**Non-Goals:**
- 紹介文・写真・会場住所・キャンセル欄の表示（既存 UX 廃止判断を維持）
- 予約サイトの背景色 / facts / about 本文の変更（見出しと vol 表示のみ）
- 回号を会員が編集する機能（vol は admin の運用結果として自動決定）
- LP / 他画面での vol 表示（必要になれば後続）

## Decisions

### D1: vol は実カラム（保存）。ライブ計算 view は採らない

`events.vol smallint NULL` を保存する。理由: 「告知済みの未来回番号が、別画面の閲覧タイミングで黙って変わる」ことを避けるには、書き込み時点で確定した値を保存する必要がある。`row_number()` のライブ計算 view は、DB が全歴史を保持していない限り**過去の絶対番号がズレる**（dev 52 件・最古が第1回とは限らない）ため不可。NULL は未採番（パース不能 / 対象外）。

### D2: 採番は DB の statement-level トリガで保証する

`events` に `AFTER INSERT OR DELETE OR UPDATE OF start_at, status` の **statement-level** トリガを張り、`public.resequence_future_event_vols()`（`SECURITY DEFINER`）を実行する。関数は **未開催（`start_at > now()`）かつ非 cancelled** のイベントのみを開催日時順に並べ、`vol = (過去 non-cancelled の最大 vol) + 行番号` で一括 UPDATE する。

- **過去凍結**: `start_at <= now()` の行は UPDATE 対象に含めない。
- **未来シフト**: 割り込み登録・再スケジュール・削除のいずれでも未来分を全再計算するため、+1 シフト/詰めが自然に成立する。
- **中止解放**: 未開催の `status='cancelled'` は採番対象から除外し vol を NULL にする。過去の中止は凍結。
- **再帰回避**: 再計算は `vol` 列のみを UPDATE する。トリガは `UPDATE OF start_at, status` に限定しているため、vol-only の UPDATE では再発火しない。statement-level なので 1 文あたり 1 回。
- **採用理由**: 書き込み経路（admin / 将来の別経路）に依存せず単一の真実を DB 側で保証できる。app 層採番は経路漏れのリスクがある。
- **代替案**: app 層（admin）で保存後に RPC 呼び出し → 経路依存で漏れる。BEFORE トリガで増分シフト → 再帰・順序制御が複雑。全再計算の方が単純で正しい。

擬似コード:
```sql
-- 1) 未開催の中止は番号解放
update events set vol = null
  where start_at > now() and status = 'cancelled' and vol is not null;
-- 2) 未開催の非中止を日付順に過去最大 vol からの連番で再計算
with frozen as (
  select coalesce(max(vol), 0) as maxv
  from events where start_at <= now() and status <> 'cancelled' and vol is not null
), ordered as (
  select id, row_number() over (order by start_at, created_at) as rn
  from events where start_at > now() and status <> 'cancelled'
)
update events e set vol = frozen.maxv + ordered.rn
  from ordered, frozen where e.id = ordered.id
    and e.vol is distinct from frozen.maxv + ordered.rn;  -- 無変更行は触らない
```
（`is distinct from` ガードで実際に変わる行だけ UPDATE し、トリガ波及と監査ノイズを抑える）

### D3: 一意制約は部分 unique index

`create unique index events_vol_unique on events (vol) where vol is not null and status <> 'cancelled';`。NULL（未採番）と cancelled（解放済み）は重複を許し、有効な回号のみ一意を強制する。再計算 UPDATE は単一文内で行うため、`is distinct from` ガードと相まって一意制約に抵触しない（最終状態が一意なら文末で評価される）。万一に備え index は `deferrable initially deferred` ではなく通常 index とし、関数内で「解放 → 連番」の順序で衝突を避ける。

### D4: マイグレ — name パース + 回号分離 + アンカー

backfill 手順（migration 内）:
1. `第(\d+)回` または `vol\.?\s*(\d+)` を `name` 末尾/先頭から検出し、数値を `vol` に格納、`name` から当該トークンを除去・trim（`第74回ゆる練` → name=`ゆる練`, vol=74 / `ゆる練 vol.43` → name=`ゆる練`, vol=43）。
2. パース不能な name（dev のテスト名等）は `name` 据え置き・`vol = NULL`。
3. backfill 後に `resequence_future_event_vols()` を 1 回実行し、未開催分を過去最大 vol からの連番に整える（アンカーは prod 実データの第73 / 第74が過去最大 vol となるため自動的に未来=75…が続く）。

- **採用理由**: 回号の出所は既存 name しかない。prod は `第N回` が大半なのでパースで移行できる。
- **リスク対応**: 破壊的 name 書き換えのため Risks 節のバックアップ/ロールバック手順を必須とする。

### D5: admin フォーム — 手入力補完を撤去し vol 自動 + 読み取り専用表示

`useVolumeSuggest`（name に `ゆる練 vol.NN` を提案）を撤去する。`EventForm` のタイトル欄は**シリーズ名**（`ゆる練` 等）のみ入力。vol は保存後にトリガで自動採番されるため、フォームには「vol は保存時に自動採番される」旨の hint と、編集時の**読み取り専用 vol 表示**を置く。`admin-events-crud` spec の「ゆる練 vol.XX テンプレ補完」シナリオは撤廃する。

### D6: 表示形式は `vol.NN`（mono / accent / 改行）。reservation は vol カラム直読み

予約サイト詳細の見出しは `event.vol !== null` のとき、シリーズ名（`event.name`）を大見出し（`font-jp-display text-4xl`）、その下に改行して `vol.{vol}` を `font-mono text-accent` で表示する。vol が NULL なら名前のみ大見出し（fallback）。name パース版 `splitEventTitle` は廃止し、`EventDetail` 型 + 取得クエリ + `event_detail_view` に `vol` を追加して直読みする。色・サイズは HQ トークン utility のみ。

## Risks / Trade-offs

- [**商用 prd の本番データ破壊的書き換え**（name + vol）] → merge 前に prd フルバックアップを取得（`supabase db dump` の schema / `--data-only --use-copy` / `--role-only` の 3 ファイル）。migration 先頭に `-- ROLLBACK:` で「name 復元 = バックアップ data から events を restore、vol/トリガ/関数/ index は drop」を明記。`db-push-prd` の承認ゲートで apply を見届ける。
- [name パースの取りこぼし（想定外フォーマット）] → パース不能は `vol=NULL` で安全側に倒し name を据え置く。移行後に admin で個別に開催日順を確認できるよう、移行レポート（パース結果の件数）を migration コメント or 検証クエリで残す。dev で `第111回` 等のテスト名は number=111 等になるが dev は実害なし。
- [`now()` 境界に依存した凍結] → 「開始済み=凍結」は `start_at <= now()` で判定。日跨ぎ等で凍結境界が動くが、保存値は last write 時点で確定済みのため表示は安定。次回書き込み時に過去入りした回が maxv に含まれて連番が継続する（整合）。
- [トリガ全再計算のコスト] → events は規模が小さい（〜数百件）。statement-level + `is distinct from` ガードで実 UPDATE 行のみ。性能問題は想定しない。
- [PR が大きい（DB + admin + reservation + テスト）] → ユーザー合意済み（#158 拡張）。tasks をレイヤ順（DB → 型/取得 → admin → reservation → 確認）に分割しレビュー可能性を確保。
- [既存 `useVolumeSuggest` 撤去の影響] → 参照は admin `event-form` のみ（grep 済み）。関連テスト（`useVolumeSuggest.spec.ts` / EventForm の vol シナリオ）を削除/更新する。

## Migration Plan

1. 新規 migration: `vol` カラム + 部分 unique index + `resequence_future_event_vols()`（SECURITY DEFINER + 明示 GRANT）+ トリガ + 既存データ backfill/name 分離 + 末尾で resequence 実行。
2. dev へ `supabase db push`（レム実行）→ 採番結果を `db query --linked` で検証（凍結 / 連番 / name 分離）。
3. admin / reservation のアプリ変更を実装、ローカル動作確認。
4. PR レビュー OK 後、**prd バックアップ 3 ファイル取得** → merge → `db-push-prd` 承認ゲートで prd apply を承認・見届け。
5. ロールバック: migration の `-- ROLLBACK:` 手順（トリガ/関数/index/列 drop、events を data バックアップから restore）。

## Open Questions

- prd の実 name フォーマットが全件 `第N回` か（`vol.NN` 混在や非定型がどれだけあるか）は、移行前に prd の `select name from events` をバックアップ取得時に確認する。非定型が多ければ backfill の正規表現を調整する（dev では確認済み、prd は apply 前に最終確認）。
