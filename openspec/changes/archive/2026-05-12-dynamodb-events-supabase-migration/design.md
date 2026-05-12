## Context

現状 LP は本番運用中で、AWS API Gateway 経由で DynamoDB に蓄積された既存イベントを表示している。admin はイベント作成時に Supabase へ書き込むようになっているため、**DynamoDB と Supabase のデータは独立して並走**しており、両者の同期は取れていない（admin で作った新イベントは現状 LP に表示されていない可能性がある）。

#228（LP 経路切替）の PR #231 は実装完了済みだが、prd Supabase に既存イベントが入っていないため単独 merge すると LP カレンダーが Empty に縮退する。本 change で「データだけ」を先行して Supabase に取り込めば、PR #231 を商用無影響でマージできる。

マッピング表は #160 分割時に下書き済み（`openspec/changes/lp-redesign-v2/notes/aws-mapping.md`）。本 change で正式版に格上げする。

## Goals / Non-Goals

**Goals:**
- AWS DynamoDB に蓄積された全イベント（過去・未来）を Supabase `events` テーブルへ一度きりで取り込む
- 冪等性を担保し、複数回実行しても重複行を生まない
- アプリコード（apps/lp / apps/admin / apps/reservation）を一切変更せず、スクリプトと docs だけで完結させる
- 移行スクリプトを `--dry-run` で安全に予行できる構造にする
- prd 実行時のロールバック手順を明文化する

**Non-Goals:**
- 継続同期（AWS と Supabase の双方向同期）
- AWS リソースの停止判断
- venues NOT NULL 列の正式値整備（プレースホルダー → 後追い admin 編集）
- #228 の LP 経路切替（別 PR で扱う、本 change の後）

## Decisions

### D1. 一度きり Node.js / TypeScript スクリプトを `scripts/` 配下に置く（パッケージ化しない）

`scripts/migrate-aws-events-to-supabase.ts` を独立ファイルとして配置し、`pnpm exec tsx scripts/migrate-aws-events-to-supabase.ts <flags>` で実行する。専用 package を作らない。

**Why**:
- 一度きりの運用イベント。継続メンテナンスや CI 統合は不要
- `tsx` は dev dependency として root に置けば、TS のままワンショット実行可能
- `@high-q/shared` の env validation を使うと clientside 想定のキー名（`VITE_*`）に縛られるため、本スクリプトは独自に `SUPABASE_URL` / `SUPABASE_SECRET_KEY` を読む

**Alternative considered**:
- supabase の Edge Function 化 → デプロイ管理が増える、一度しか実行しないため過剰
- 別 package を切る → 一度きりの作業に対するオーバーエンジニアリング
- SQL only での INSERT スクリプト → AWS からの取得とマッピング（venue 解決）をシェルで書くのは保守性が悪い

### D2. 冪等性は events.description の Legacy ID マーカーで担保

スクリプトは各 AWS イベントを INSERT する前に、Supabase events から `description ILIKE '%[Legacy ID: <aws_id>]%'` で既存行を検索し、ヒットすれば SKIP。なければ INSERT。

```
description = "[Legacy ID: <aws_id>]"   (description が空の場合)
description = "<本文>\n\n[Legacy ID: <aws_id>]"  (本文がある場合)
```

**Why**:
- 専用カラム（`legacy_id`）追加は data-schema spec を modify する必要があり、スコープが膨らむ
- description は admin UI で編集可能なので、Legacy ID の追記が見えても問題ない（運用上の注記として扱う）
- ILIKE での照合は数百件オーダーなら index なしでも問題ない（一度きりの運用）

**Alternative considered**:
- events に `legacy_aws_id` 列を追加 → スコープ拡大。今後 AWS 由来 ID を参照する用途がない（DynamoDB 停止予定）ためコストに見合わない
- 名前 + start_at の組合せ key で同定 → 同名イベントが将来別日程で再開催される可能性があり脆い

### D3. venue 解決は「事前 survey → 人手承認の対照表 → 移行スクリプトが対照表を読む」の 3 段階

AWS `location` はフリーテキストで表記揺れがあり得るため、機械的な完全一致だけで突き合わせるとデータ事故（同じ実在会場が別 venue として二重登録される、等）の元になる。本 change では**人手の承認を間に挟む**運用を採る:

**Step 1: Survey（`--survey` モード、書き込みなし）**
- AWS イベント全件を取得し、`location` 文字列のユニーク集合を抽出
- Supabase 現行 `venues` 全件を取得
- 各 AWS location について「もっともそれらしい Supabase venue 候補」を以下の優先順で算出:
  1. 完全一致（normalize 後）
  2. 正規化照合: trim / 全角半角統一 / NFKC / lowercase / 中黒・スペース除去後の一致
  3. 部分一致（AWS location が Supabase venue.name を含む、あるいは逆）
  4. Levenshtein 距離 ≤ 2（短文字列向け、長さに対して 20% 以下の編集距離）
  5. 候補なし
- 結果を Markdown 対照表ファイルに書き出す: `openspec/changes/dynamodb-events-supabase-migration/correspondence-venues-proposed.md`
- 同時に「AWS イベント → Supabase events 行の preview」も書き出す: `correspondence-events-proposed.md`

**Step 2: 人手レビューと承認**
- 翔太郎くんが proposed ファイルを開き、各行の判定（match / new / fix）を確定して `correspondence-venues-approved.md` / `correspondence-events-approved.md` として保存
- approved ファイルのフォーマットは proposed と同じだが、各行に `status: approved` を持たせる
- 承認時に「この AWS location は実は既存 venue X と同じ」「この location は新規 venue として作成」のいずれかを明示

**Step 3: 移行（`--commit` モード、approved ファイルを唯一の真実の源にする）**
- スクリプトは `correspondence-venues-approved.md` だけを参照し、対応関係を自前で再計算しない
- approved ファイルに記載のない AWS location が AWS イベント側に出現した場合は **fail-fast でエラー**（survey と migration の間に AWS データが増えたケース。再度 survey からやり直す）

**対照表フォーマット**（proposed / approved 共通、Markdown table）:

```markdown
# AWS location → Supabase venue 対照表

| # | AWS location | 候補種別 | Supabase venue | venue_id | 判定 |
|---|---|---|---|---|---|
| 1 | "サンスポーツ三鷹" | 完全一致 | "サンスポーツ三鷹" | <uuid> | match |
| 2 | "Sun Sports 三鷹" | 正規化一致 (NFKC + lowercase) | "サンスポーツ三鷹" | <uuid> | (要確認) |
| 3 | "三鷹総合体育館 ｱﾘｰﾅ" | Levenshtein=2 | "三鷹総合体育館アリーナ" | <uuid> | (要確認) |
| 4 | "市民センター 第二会議室" | 候補なし | — | — | new |
```

判定値:
- `match`: 既存 venue を再利用
- `new`: 新規 venues 行として INSERT
- `fix`: 既存 venue の name を承認時に修正（例: AWS 側が正しい表記の場合）

**Why**:
- フリーテキストの表記揺れを機械判定だけで通すのは事故の元（翔太郎くんの懸念）
- 一方で「全部手作業」も非現実的。proposed の自動算出で 90% は機械的に決まり、残り 10% を人手で判断するハイブリッドが現実解
- 対照表を git にコミットすることで、判断根拠が監査可能になる（後日「なぜこの venue にマージしたか」が追える）
- 「事前合意してから commit」という翔太郎くんの要求を運用フローとして明文化

**Alternative considered**:
- 機械判定のみ + 完全一致のみ採用、表記揺れは全部新規 venue: シンプルだが二重 venue 問題が残る。却下
- 全件手作業: スケールしない。却下
- ChatGPT 等の LLM で寄せ作業: 自動化メリットはあるが監査性が下がる。本 change では人手承認を残す方針

### D3.1. 対照表ファイルの配置場所

proposed / approved 両ファイルは `openspec/changes/dynamodb-events-supabase-migration/` 配下に置き、archive 時に通常の change と一緒にアーカイブ移動する。`docs/08-移行/` には移行手順書だけ置き、生データの対照表は openspec 配下に閉じる。

**Why**: 対照表は「この change の判断記録」であり恒常的な docs ではない。change の証跡として閉じておく方が情報設計上きれい。

### D4. 過去 / 未来イベントの status と visibility を end_at で機械判定

| AWS の `end_time` | Supabase `status` | Supabase `visibility` |
|---|---|---|
| `< now()`（過去） | `closed` | `published` |
| `>= now()`（未来） | `scheduled` | `published` |

**Why**:
- 過去イベントは LP の履歴表示に出さない方針（#228 で `start_at >= now()` フィルタを入れた）なので、visibility は何でも実害ないが、admin での履歴閲覧を考えて `published` で残す
- status の `closed` は「終了済み」の意。`scheduled` は「予定通り開催予定」。AWS には status 相当のフィールドがないため end_at で機械判定
- 移行後、admin から個別に `private` / `cancelled` などへの更新は自由

### D5. Service Role Key で実行、`.env.migration` を gitignore

スクリプトは Service Role Key（旧 service_role、新 secret key）で実行し、RLS をバイパスする。Key は環境変数で渡し、ファイル化する場合は `.env.migration` を `.gitignore` で除外する。

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sbs_xxx
AWS_EVENTS_ENDPOINT=https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event
```

**Why**:
- venues / events への INSERT は `is_admin()` が required で anon / publishable key では通らない
- スクリプトはサーバーサイド（翔太郎くんのローカル or CI runner）でのみ実行され、クライアントには出さない
- CLAUDE.md セキュリティルール「Supabase `service_role` キーをクライアントサイドで使わない」に従う

### D6. 2 段階実行（`--dry-run` → `--commit`）

- `--dry-run`（デフォルト）: AWS 取得・venue 解決・冪等性チェックまで実行し、「INSERT 予定 events 件数」「新規 INSERT 予定 venues 件数」「SKIP（既存）件数」をレポート
- `--commit`: 実際に Supabase へ書き込む
- 両モードとも実行ログを stdout に詳細に出す（イベント単位の判定理由）

**Why**:
- prd への書き込みは慎重に行う。dry-run で件数とサンプルを翔太郎くんに確認してもらってから commit

### D7. ロールバック手順

prd で `--commit` 実行後に問題が判明した場合:
- 本 change で INSERT した events は description に `[Legacy ID: ...]` を持つので、
  ```sql
  DELETE FROM events WHERE description ILIKE '%[Legacy ID:%';
  ```
- 本 change で INSERT した venues は admin が事前に作っていない（完全一致しなかった）ものなので、events 削除後に
  ```sql
  DELETE FROM venues WHERE id NOT IN (SELECT DISTINCT venue_id FROM events) AND created_at >= '<migration timestamp>';
  ```
- 詳細手順は `docs/08-移行/03-AWS-Supabase-events-移行手順.md` に記載

**Why**:
- INSERT のみで UPDATE / DELETE をしない設計なので、ロールバックは「INSERT した行の削除」に閉じる
- Legacy ID マーカーで識別可能

## Risks / Trade-offs

- **[リスク]** AWS のタイムゾーン表現が UTC か JST か不明（aws-mapping.md でも未確認とされている）
  → **緩和**: dev 移行時に代表サンプル 3 件を取得し、Supabase 取り込み後の `start_at` / `end_at` を admin で確認。ズレていればスクリプトに変換ロジック追加して再 dry-run

- **[リスク]** AWS 既存データに想定外フィールド（fee / capacity 等）が含まれていて、移行で取りこぼす
  → **緩和**: dev 移行のドライランログで全フィールドのキー一覧を出力。aws-mapping.md にない field が見つかったら本 change の design 修正 → 再 propose

- **[リスク]** venues の完全一致解決で、既存 venue（admin が登録済）の表記揺れにより重複 venue が生まれる
  → **緩和**: dry-run で「新規 INSERT 予定 venues」のリストを翔太郎くんに見せ、既存 venue と寄せるべきものがあれば事前に venues.name を更新してから commit。寄せ作業の確認時間を運用手順に含める

- **[トレードオフ]** Legacy ID を description に埋める方式は admin UI で目視できる文字列が増える
  → 運用上の注記として許容。admin が手動で消すことも可能（次回 migration 再実行で SKIP できなくなるが、本 change は一度きりの想定なので問題なし）

- **[リスク]** AWS API Gateway がレスポンス上限を持ち、件数が多いと取りこぼす
  → **緩和**: 現実的に LP の過去イベント件数は 100 件以下と推定。dry-run のログで全件数を確認し、AWS 上のレコード総数と一致するかを翔太郎くんに目視確認してもらう

## Migration Plan

### dev フェーズ

1. **Survey**: dev に対し `--survey` 実行 → `correspondence-venues-proposed.md` / `correspondence-events-proposed.md` が生成される
2. **対照表レビュー**: 翔太郎くんが proposed ファイルを開き、各行の判定（match / new / fix）を確定 → approved ファイルとして commit。**ここで翔太郎くんの合意ゲートが入る**
3. **Dry-run**: dev に対し `--dry-run` 実行（approved ファイルを読む）。venue / events の INSERT 予定件数を最終レポート
4. **Commit**: dev に対し `--commit` 実行
5. **目視確認**: 翔太郎くんが admin から dev の events / venues を確認（タイムゾーン・venue 紐づけ・件数）
6. **タイムゾーン補正等が必要なら**: スクリプト修正 → approved ファイルが affected なら再合意 → dev で再実行

### prd フェーズ

7. **Survey（prd）**: prd に対し `--survey` 実行 → prd 用 proposed ファイル
   - dev の approved 内容を **prd で再利用するのが基本だが、prd 環境特有の既存 venues に対する match が変わる可能性があるので、prd 用にも一度 survey して確認する**
8. **対照表レビュー（prd）**: 翔太郎くんが prd 用 proposed を確認 → prd 用 approved を確定
9. **Dry-run（prd）**: prd に対し `--dry-run`
10. **Commit（prd）**: prd に対し `--commit`
11. **目視確認（prd）**: 翔太郎くんが admin から prd を確認
12. 確認 OK 後、#228 PR #231 を Ready に戻して merge → LP が Supabase 経路に切替

**ロールバック**: D7 の SQL を `docs/08-移行/03-AWS-Supabase-events-移行手順.md` に記載した手順で実行

## Open Questions

- AWS イベントの実件数（数十〜数百のオーダーで合っているか） → dry-run で確認
- 過去イベントを取り込む必要性の最終確認: LP では `start_at >= now()` で過去は出さないが、admin の履歴閲覧では参照したい想定で取り込む方針。翔太郎くんに「過去は捨てる」選択肢もあり得るか確認したい（取り込む派でいけば D4 の機械判定で `closed` 化）
- prd の Service Role Key の取扱い: 翔太郎くんのローカルから実行する想定で OK か（CI runner で実行する場合は別途設計）
