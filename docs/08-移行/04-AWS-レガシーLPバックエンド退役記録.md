# AWS レガシー LP バックエンド退役記録 (#371)

LP 旧データソース（AWS API Gateway + Lambda + DynamoDB）の退役を記録する。本作業は AWS Lambda Python 3.10 ランタイムの EOL（2026-10-31）対応として実施した、一度きりのインフラ退役オペレーション。

## 関連

- Issue: #371
- OpenSpec change: `openspec/changes/retire-legacy-lp-aws-backend/`（archive 後は `openspec/changes/archive/` 配下）
- 対になる移行編: `docs/08-移行/03-AWS-Supabase-events-移行手順.md`（#230 / #228 でこのバックエンドから Supabase へ移行済み）
- AWS アカウント: `865540634998` / `ap-northeast-1`

## 背景（なぜ退役したか）

- AWS Lambda の Python 3.10 ランタイムが **2026-10-31 に EOL**。対象アカウントに該当ランタイムの Lambda が 1 つ存在した（AWS Health 通知を 2026-08-01 受信）。
- その Lambda はレガシー LP のイベント取得バックエンドの中核だった。LP のイベント取得は 2026-05 に Supabase へ移行済み（archive: `2026-05-12-dynamodb-events-supabase-migration` / `2026-05-12-lp-events-supabase-migration`）で、現行リポジトリは AWS エンドポイントを一切参照していない。
- DynamoDB のデータは 2026-05 以降更新が止まっており、残していても「死んだデータソースを未パッチ・サポート外ランタイムで延命する」構造が残るだけ。費用ゼロ運用方針とも相容れない。
- ランタイム延命（Python 更新）ではなく **退役**を選択した。

## 退役前の呼び出し元確認（判断ゲート）

削除は不可逆のため、2026-10-24 に API Gateway `beta` ステージへアクセスログを有効化し（ロググループ `/aws/apigateway/event-api-access`, 保持 7 日）、呼び出し元を観測した。

2026-10-29 にログを確認した結果、記録された全 8 件（2026-10-25 に 6 件 / 2026-10-27 に 2 件）がすべて次の 1 種類だった:

- User-Agent: `facebookexternalhit/1.1`（Meta のリンクプレビュー用クローラ）
- sourceIp: `57.141.x.x`（Meta / Facebook の IP 帯, AS32934）
- path / status: `GET /beta/event` → `200`（生 JSON を返すのみ）

ブラウザ・会員動線・High Q 運用由来のアクセスはゼロ。どこかに残る古いリンク URL を Facebook が定期再スクレイプしているだけの残留 bot アクセスと判断し、**本質的な現役利用なし**＝退役続行と確定した。

## 退役対象リソース

| 区分 | リソース | 識別子 |
|---|---|---|
| 中核 | API Gateway `Event API`（stage `beta` / `GET /event` 非プロキシ AWS 統合, 2023-05-08 作成） | `ptfomh71x9` |
| 中核 | Lambda `event_getEvent`（python3.10, 453B, timeout 3s） | `arn:aws:lambda:ap-northeast-1:865540634998:function:event_getEvent` |
| 中核 | DynamoDB `Events`（44 items / 2023-05 作成, 2026-05 以降更新なし） | `arn:aws:dynamodb:ap-northeast-1:865540634998:table/Events` |
| 中核 | IAM role（Lambda 実行ロール, 管理ポリシー `AmazonDynamoDBReadOnlyAccess`） | `circle-calendar-lambda-dynamodb-read-only-role` |
| 観測（一時） | CloudWatch Logs グループ（2026-10-24 作成, 保持 7 日） | `/aws/apigateway/event-api-access` |
| 観測（一時） | IAM role（2026-10-24 作成, 管理ポリシー `AmazonAPIGatewayPushToCloudWatchLogs`）+ API GW account `cloudwatchRoleArn` 設定 | `apigateway-cloudwatch-logs-role` |

## 削除手順（2026-10-29 実施, 末端→根の順）

公開口を最初に塞ぎ、参照の末端から順に削除した。各ステップ後に `describe`/`get` で不在を確認している。

1. **API Gateway** `ptfomh71x9` 削除 → `get-rest-api` が `NotFoundException`
2. **Lambda** `event_getEvent` 削除（StatusCode 204）→ `get-function` が `ResourceNotFoundException`
3. **DynamoDB** `Events` 削除（バックアップ再確認後）→ `describe-table` が `ResourceNotFoundException`
4. **Lambda 実行 IAM role** 削除（管理ポリシー detach 後）→ `get-role` が `NoSuchEntity`
5. **観測用の撤去**:
   - CloudWatch Logs グループ `/aws/apigateway/event-api-access` 削除
   - API GW account の `cloudwatchRoleArn` 解除（アカウントに他 API がないため共用なしを事前確認）
   - IAM role `apigateway-cloudwatch-logs-role` 削除（detach 後）→ `NoSuchEntity`

### 退役完了の実体確認

- `aws lambda list-functions --region ap-northeast-1 --query "Functions[?Runtime=='python3.10'].FunctionArn"` → `[]`（EOL 対象の Lambda が消滅）
- 中核 4 リソース + 観測用リソースすべて不在を再確認
- `apps/lp/src` に `ptfomh71x9` / `execute-api` / `/api/event` proxy の参照が 0 件（`lp-calendar` spec 要件の継続担保）

## バックアップ（ロールバック元）

退役前に以下をローカル `~/high-q-371-legacy-backup/20261024/` へ保全済み:

- `dynamodb-Events-scan.json` — DynamoDB `Events` 全 44 items のデータ（31KB）
- `dynamodb-Events-describe.json` — テーブルスキーマ
- `event_getEvent-code.zip` + `code_unzip/` — Lambda コード
- `event_getEvent-config.json` — Lambda 設定

## ロールバック手順

万一復旧が必要になった場合、以下の順で再構築できる:

1. DynamoDB テーブル `Events` を `dynamodb-Events-describe.json` のスキーマで再作成
2. `dynamodb-Events-scan.json` のアイテムを `batch-write-item` で再投入
3. Lambda 実行 IAM role を再作成し `AmazonDynamoDBReadOnlyAccess` を attach
4. Lambda `event_getEvent` を `event_getEvent-code.zip` + `config.json` で再作成
5. API Gateway REST API（`GET /event` 非プロキシ統合）を再構成

> **注意**: バックアップのデータは 2026-05 以降更新が止まっている。現行の真実の源は Supabase `events` であり、ロールバックは緊急避難用途に限る。通常は Supabase 側を参照すること。

## 教訓・運用メモ

- リポジトリ外の AWS リソースは、コードを grep しても検知できない。退役判断の前に、アクセスログで**実際の呼び出し元**を観測してから消す（不可逆操作の鉄則）。
- アクセスログは保持期間（本件は 7 日）内に確認する。観測用に作ったリソースは退役と同時に必ず撤去する（残すと次の棚卸しでまた悩む）。
