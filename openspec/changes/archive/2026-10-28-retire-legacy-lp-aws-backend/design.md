# Design: レガシー LP AWS バックエンド退役

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Task の3ファイルをすべて承認後に Apply へ進む。

---

## 0. コンテキスト確認（Apply 開始前に必ず実施）

> Apply 開始時に Claude が宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: リポジトリ外 AWS 操作 / SSO ログインは翔太郎くんが本物のターミナルで実施 / 退役は不可逆・バックアップ済 / アクセスログ保持 7 日・期限 2026-10-31」

本変更は FSD レイヤー・UI・Supabase・テストを伴わない **リポジトリ外インフラ退役 + docs 記録**である。よって以下のセクション 1〜6 のうち、コード/UI/DB/テストに関わる節は「該当なし（理由付き）」とし、インフラ退役固有の設計（セクション 7 以降）を実質設計とする。

---

## 1. FSD アーキテクチャ設計

**該当なし。** 本変更はアプリケーションコードを変更しない。削除対象はリポジトリ外の AWS リソースであり、リポジトリ側の成果物は `docs/08-移行/` の退役記録ドキュメントと `openspec/specs/lp-calendar` のスペック強化のみ。FSD レイヤー・Branded Types・エラーコードの追加はない。

---

## 2. ビジネス異常系の洗い出し（→ 退役オペレーションの異常系に読み替え）

> UI のビジネス異常系は該当なし。代わりに、退役オペレーションで起こりうる異常系と対応方針を列挙する。

| # | 異常ケース | 検知方法 | 対応方針 |
|---|-----------|---------|---------|
| 1 | アクセスログに**本質的な現役利用**（High Q 運用・会員動線由来の継続アクセス）が見つかる | アクセスログの sourceIp / userAgent / path を確認 | **退役を中断**。本 change をクローズし、ランタイム更新（Python 最新化 or Supabase Edge Function 移行）として別途再提案する |
| 2 | 呼び出し元の素性が判別できない（UA/IP だけでは断定不能） | ログ確認で灰色判定 | 翔太郎くんに判定を仰ぐ。即断で削除しない（不可逆のため） |
| 3 | 削除途中で一部リソースだけ消えて残りが失敗 | 各削除コマンドの戻り値・`describe` 系の後続確認 | 削除は依存の末端から順に実施（§8 の順序）。失敗したら停止し、現状を記録してから再開。中途半端な orphan を残さない |
| 4 | 観測用に一時作成した IAM role / アカウント設定が他で共用されている | 削除前に用途・作成日を確認 | 2026-10-24 に本件専用で作成したものに限定して撤去。共用が疑われるものは残す |
| 5 | 退役後に「やはり必要だった」と判明 | 退役後の運用で発覚 | ローカルバックアップ（DynamoDB 全スキャン / スキーマ / Lambda コード zip + config）から再構築。ただしデータは 2026-05 以降更新停止済み（§10 ロールバック） |

**判断方針**: 削除は不可逆。異常系 1・2 のいずれかに該当する間は削除フェーズに進まない。

---

## 3. UI/UX 設計

**該当なし。** ユーザー向け UI の変更はない。4 状態・レスポンシブ・a11y・デザイントークンは対象外。

---

## 4. DB / Supabase 設計

**該当なし。** Supabase のテーブル・RLS・GRANT は一切変更しない。削除対象の DynamoDB `Events` は AWS 側のレガシーデータソースであり、現行 Supabase `events` / `venues` とは独立している（移行は 2026-05 に完了済み）。退役により Supabase 側のデータが変わることはない。

---

## 5. テスト設計

**自動テストは該当なし**（コード変更がないため Vitest / E2E の追加なし）。検証は AWS CLI による**実体確認**で行う。

| 検証 | 方法 |
|------|------|
| 退役前: 呼び出し元が非本質 | アクセスログ（sourceIp / userAgent / path / status）を目視確認 |
| 退役後: 対象 Lambda の消滅 | `aws lambda list-functions --query "Functions[?Runtime=='python3.10']"` が空 |
| 退役後: スタック各リソースの不在 | API Gateway / DynamoDB / IAM role を各 `get`/`describe` で NotFound 確認 |
| 退役後: 観測用リソースの撤去 | アクセスログ用ロググループ / 一時 IAM role / account 設定の不在確認 |
| リポジトリ: AWS 参照ゼロの継続 | `apps/lp/` を `ptfomh71x9.execute-api` / `/api/event` で grep し 0 件（lp-calendar spec の既存要件） |

---

## 6. ロギング設計

**該当なし**（アプリログの追加はない）。退役作業そのものの記録は、Issue #371 コメント + `docs/08-移行/` の退役記録ドキュメントに残す。

---

## 7. 退役対象リソース（2026-10-24 調査で確定）

| 区分 | リソース | 役割 |
|---|---|---|
| 中核 | API Gateway `Event API`（stage `beta` / `GET /event` 非プロキシ AWS 統合） | 公開エンドポイント |
| 中核 | Lambda `event_getEvent`（python3.10） | DynamoDB `Events` を scan し JSON 返却 |
| 中核 | DynamoDB `Events`（44 items / 2023-05 作成、2026-05 以降更新なし） | レガシーイベントデータ |
| 中核 | IAM role `circle-calendar-lambda-dynamodb-read-only-role` | Lambda 実行ロール |
| 観測（一時） | CloudWatch Logs グループ `/aws/apigateway/event-api-access`（保持 7 日） | 2026-10-24 に呼び出し元確認のため作成 |
| 観測（一時） | IAM role `apigateway-cloudwatch-logs-role` + API GW account `cloudwatchRoleArn` 設定 | アクセスログ有効化の付随物 |

> 具体的な ARN / リソース ID は `tasks.md` に記す（本 design は PO レビュー粒度に留める）。

---

## 8. 削除順序（orphan を残さない末端→根の順）

1. **アクセスログ確認（判断ゲート）** — 非本質と確認できるまで以降に進まない
2. API Gateway stage `beta` / `GET /event` / `Event API` 本体を削除（公開口を最初に塞ぐ）
3. Lambda `event_getEvent` を削除
4. DynamoDB `Events` を削除
5. Lambda 実行 IAM role `circle-calendar-lambda-dynamodb-read-only-role` を削除（参照元の Lambda が消えた後）
6. 観測用の撤去: アクセスログ用ロググループ → API GW account `cloudwatchRoleArn` 設定解除 → `apigateway-cloudwatch-logs-role` 削除

各ステップ後に対応する `describe`/`get` で不在を確認してから次へ進む。

---

## 9. 認証・実行分担

- SSO ログイン（AdministratorAccess, アカウント `865540634998` / `ap-northeast-1`）は **翔太郎くんが本物のターミナルで実施**（`!` 経由ではブラウザ認証不可）。
- region は設定済み。ログイン成立後の `list` / `describe` / `delete` 系 CLI は**レムが直接実行**する（慣性で翔太郎くんに振らない）。
- 削除コマンドは実行前に対象 ARN を読み上げ、不可逆であることを確認してから流す。

---

## 10. ロールバック

退役前バックアップ（ローカル `~/high-q-371-legacy-backup/20261024/`）に以下を保全済み:

- `dynamodb-Events-scan.json`（全 44 items のデータ）
- `describe.json`（テーブルスキーマ）
- `event_getEvent-code.zip` + `config.json`（Lambda コードと設定）

万一復旧が必要になった場合は、DynamoDB テーブル再作成 → scan JSON の再投入 → Lambda 再作成（zip + config）→ API Gateway / IAM role 再構成、の順で再構築できる。ただし **データは 2026-05 以降更新停止済み**であり、現行の真実の源は Supabase `events` であることに留意する（復旧は緊急避難用途のみ）。

---

## 11. リポジトリ成果物

- `docs/08-移行/` に退役記録ドキュメントを新規追加（退役の経緯・対象リソース・バックアップ所在・ロールバック手順・実施日）。既存 `docs/08-移行/03-AWS-Supabase-events-移行手順.md` と対になる「退役」編として位置づける。
- `openspec/specs/lp-calendar` の「AWS API Gateway 経路が残らない」要件を、インフラ実体の退役まで含むよう強化（specs delta 済み）。
