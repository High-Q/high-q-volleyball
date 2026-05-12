# AWS DynamoDB → Supabase events 移行手順 (#230)

LP 旧データソース（AWS API Gateway + DynamoDB）に蓄積された既存イベントを Supabase `events` テーブルへ取り込むための、一度きり運用手順。

## 関連

- Issue: #230
- OpenSpec change: `openspec/changes/dynamodb-events-supabase-migration/`
- スクリプト: `scripts/migrate-aws-events-to-supabase.ts`
- 後続: #228 (LP の Supabase 切替)

## 前提

- 本作業は **prd Supabase に書き込みを行う** ため、Service Role Key（旧 service_role、新 secret key）を用いる
- Service Role Key は **絶対にコードや git にコミットしない**。`.env.migration` は `.gitignore` 対象（CLAUDE.md セキュリティルール）
- スクリプトは Node 22 + tsx で動かす。`pnpm install` 済であること

## 必要な環境変数（`.env.migration` を作成）

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sbs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_EVENTS_ENDPOINT=https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event
```

実行時はシェルで source する:

```bash
set -a; . .env.migration; set +a
```

## 実行モード

| モード | 書き込み | 用途 |
|---|---|---|
| `--survey` | なし | AWS データ取得 + Supabase venues 取得 → 対照表 proposed 生成 |
| `--dry-run`（既定） | なし | approved 対照表に基づく投入予定をログ + サマリー |
| `--commit` | あり | approved 対照表に基づき実際に INSERT |

## 標準オペレーション（dev → prd の順で実施）

### 1. Survey（書き込みなし）

```bash
set -a; . .env.migration; set +a
pnpm migrate:aws-events --survey
```

出力:
- `openspec/changes/dynamodb-events-supabase-migration/correspondence-venues-proposed.md`
- `openspec/changes/dynamodb-events-supabase-migration/correspondence-events-proposed.md`

### 2. 対照表のレビューと承認（人手）

`correspondence-venues-proposed.md` を開き、各行の**判定欄**を確定:

| 判定 | 意味 |
|---|---|
| `match` | 候補欄の既存 venue を再利用（`venue_id` を採用） |
| `new`   | 新規 venue を INSERT（`Supabase venue 候補` 列の文字列を venue 名として使う） |
| `fix`   | 既存 venue の `name` を本 AWS location 文字列で UPDATE（誤登録の修正） |

確定したら、ファイル名を `correspondence-venues-approved.md` に変更（または別ファイルとして保存）してブランチに commit。`correspondence-events-proposed.md` は参照用で承認ファイルは不要。

### 3. Dry-run（書き込みなし）

```bash
pnpm migrate:aws-events --dry-run
```

サマリーで以下を確認:
- AWS 取得件数（admin で見える AWS 由来データ数と一致するか）
- INSERT 予定件数 / SKIP 件数
- venue NEW / FIX 予定件数

### 4. Commit（書き込み実行）

```bash
pnpm migrate:aws-events --commit
```

行単位ログ:
- `[venue] MATCH/NEW/FIX ...` — venue 解決の判定
- `[event] INSERT/SKIP ...` — events 投入の判定

### 5. 利用料金 (fee) の一括設定（post-commit）

AWS API は `fee` を返さないため、本 migration では events.fee が NULL のまま投入される。High Q の運用ルール「有明会場 = 500 円、それ以外 = 1000 円」を反映するため、commit 後に以下のコマンドで一括設定する:

```bash
pnpm migrate:aws-events --set-default-fees
```

このコマンドは以下を実行する:
- venues.name = '有明会場' の venue_id を取得
- 本 migration で投入された events（description に Legacy ID マーカーを持つ行）について:
  - 有明会場 → fee=500
  - その他 venue → fee=1000
- 終了時に fee 分布のサマリーを表示

期待結果:
- 有明会場 → fee 500
- その他 venue → fee 1000

Idempotent（複数回実行しても結果同じ）。prd でもそのまま使える。

確認用 SQL（任意、Supabase SQL Editor で実行）:

```sql
SELECT v.name AS venue, count(*) AS event_count, COALESCE(MAX(e.fee)::text, 'NULL') AS fee
FROM events e
JOIN venues v ON v.id = e.venue_id
WHERE e.description ILIKE '%[Legacy ID:%'
GROUP BY v.name
ORDER BY v.name;
```

### 6. 目視確認

admin から dev / prd の events / venues を開き、件数とサンプル数件のフィールド値（タイムゾーン / venue 名 / 開催日時 / fee）を確認。

## prd フェーズの追加注意

- `.env.migration` を **prd の値** に差し替えてから実施
- prd 既存 venues は dev と異なる可能性があるため、**prd 用にも改めて `--survey` を実行**し、prd 用 approved を確定する
- prd `--commit` の前に必ず `--dry-run` で件数を翔太郎くんが最終確認する

## ロールバック

本スクリプトで投入された行は events.description に `[Legacy ID: <aws_id>]` マーカーを持つので、これで識別して削除する。

```sql
-- 1. 本 migration で INSERT した events を削除
DELETE FROM events
WHERE description ILIKE '%[Legacy ID:%';

-- 2. 本 migration で新規 INSERT した venues を削除
--    （events の参照がなくなった venues のうち、admin で事前作成した既存 venue を巻き込まないよう
--     migration 実行時刻以降に作成されたものに限定）
DELETE FROM venues
WHERE id NOT IN (SELECT DISTINCT venue_id FROM events)
  AND created_at >= '<migration実行のタイムスタンプ>';
```

`<migration実行のタイムスタンプ>` は commit 実行時の wall clock を控えておく（例: `2026-05-12 14:30:00+09:00`）。

## 失敗時の判断基準

| 症状 | 想定原因 | 対処 |
|---|---|---|
| `AWS に存在する location が approved にない` エラー | survey 後に AWS データが増えた | `--survey` を再実行し approved を更新 |
| 投入後 LP / admin で日時がズレて見える | AWS の `start_time` / `end_time` のタイムゾーン表現が想定と異なる | ロールバック → スクリプトに変換ロジック追加 → 再 commit |
| 投入件数が AWS の総レコード数と一致しない | AWS API レスポンスにページネーション・件数上限がある | AWS 側を再確認、スクリプトを複数ページ対応に拡張 |
| Service Role Key で 401 エラー | secret key が prd / dev で取り違え、または失効 | Supabase Dashboard → Settings → API Keys から確認 |
