# Tasks: レガシー LP AWS バックエンド退役

> **承認ゲート**: Design が承認済みであること。退役は不可逆。削除フェーズは判断ゲート（T-02）を通過してからのみ進む。

## 進捗

- 完了: 9 / 10 タスク（残: T-10 PR 作成）

---

## タスク一覧

### Setup

- [x] **T-01**: ブランチを作成する
  - `git checkout -b chore/371-retire-legacy-lp-aws-backend`
  - 翔太郎くんが本物のターミナルで AWS SSO ログイン（AdministratorAccess / アカウント `865540634998` / `ap-northeast-1`）。ログイン成立をレムが `aws sts get-caller-identity` で確認 ✓（2026-10-28）

---

### 判断ゲート（削除前に必ず通過）

- [x] **T-02**: アクセスログで呼び出し元を確認する（**ゲート**）✓（2026-10-28）
  - ロググループ `/aws/apigateway/event-api-access`（2026-10-24 設定、保持 7 日 → ~2026-10-31 失効）を取得し、`sourceIp` / `userAgent` / `path` / `status` を一覧化
  - **結果**: 全 8 件（10-25 に 6 件 / 10-27 に 2 件）がすべて `facebookexternalhit/1.1`（Meta のリンクプレビュー bot, sourceIp 57.141.x.x = AS32934）。ブラウザ・会員動線由来はゼロ
  - **判定**: 本質的な現役利用なし → 退役続行（design §2 異常系 1・2 に非該当）
  - バックアップ `~/high-q-371-legacy-backup/20261024/` の存在を T-05 直前に再確認（ロールバック元）

---

### 退役（末端→根の順・各ステップ後に不在確認）

- [x] **T-03**: API Gateway を削除する（公開口を最初に塞ぐ）✓（2026-10-29）
  - `Event API`（`ptfomh71x9`）stage `beta` / `GET /event` / REST API 本体
  - 確認: `get-rest-api` が NotFoundException ✓

- [x] **T-04**: Lambda `event_getEvent`（python3.10）を削除する ✓（2026-10-29）
  - 確認: `get-function` が ResourceNotFoundException ✓（delete StatusCode 204）

- [x] **T-05**: DynamoDB テーブル `Events` を削除する ✓（2026-10-29）
  - 事前: バックアップ `dynamodb-Events-scan.json`（44 items / 31KB）取得済みを再確認 ✓
  - 確認: `describe-table` が ResourceNotFoundException ✓（delete 時 DELETING → 消滅）

- [x] **T-06**: Lambda 実行 IAM role `circle-calendar-lambda-dynamodb-read-only-role` を削除する ✓（2026-10-29）
  - 管理ポリシー `AmazonDynamoDBReadOnlyAccess`（AWS 管理）1 本を detach（inline/instance profile なし）→ role 削除
  - 確認: `get-role` が NoSuchEntity ✓

- [x] **T-07**: 観測用リソース（2026-10-24 に本件専用で作成）を撤去する ✓（2026-10-29）
  - CloudWatch Logs グループ `/aws/apigateway/event-api-access` を削除 ✓（describe 空）
  - API GW account の `cloudwatchRoleArn` 設定を解除 ✓（get-account → None。アカウントに他 API なし＝共用なしを事前確認）
  - IAM role `apigateway-cloudwatch-logs-role`（2026-10-24 作成）を detach → 削除 ✓（NoSuchEntity）

- [x] **T-08**: 退役完了を実体確認する ✓（2026-10-29）
  - `list-functions ... Runtime=='python3.10'` が `[]`（EOL 対象の消滅）✓
  - 中核 4 リソース + 観測用リソースすべての不在を再確認 ✓
  - `apps/lp/src` を `ptfomh71x9` / `execute-api` / `/api/event` proxy で grep し 0 件（lp-calendar spec 要件の継続担保）✓

---

### リポジトリ成果物

- [x] **T-09**: 退役記録を docs に追記する ✓（2026-10-29）
  - `docs/08-移行/04-AWS-レガシーLPバックエンド退役記録.md` を新規追加（退役の経緯・呼び出し元確認結果・対象リソース一覧・削除手順・バックアップ所在・ロールバック手順）
  - 既存 `03-AWS-Supabase-events-移行手順.md` と対になる「退役」編として位置づけ
  - コミット（`chore(infra): ...`）

- [ ] **T-10**: PR 作成・Issue 連携
  - PR 作成（本文に退役実施ログと実体確認結果を添付）
  - CI 全パス確認（コード変更なしだが lint / 静的チェックが緑であること）
  - ship フロー（sync / archive / push / merge / ブランチ削除 / #371 クローズ）は `/opsx-ship`

---

## 備考・ブロッカー

- 本 change は**リポジトリ外 AWS 操作**が主体。PR の diff は docs 追記 + specs delta のみで、AWS 側の実作業は Issue #371 コメント + 退役記録ドキュメントに証跡を残す。
- Render Preview 検証は該当なし（UI 変更なし）。
- アクセスログの 7 日保持により、T-02 は 2026-10-31 失効前に実施する時間的制約がある。
