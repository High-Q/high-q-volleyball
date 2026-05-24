## 1. 事前準備

- [x] 1.1 ブランチ作成: `feature/269-db-backup-and-rollback-sop`

## 2. 既存 migrations の分類（一括宣言方式）

- [x] 2.1 既存 21 件を「全件カテゴリ 3 (rollback 不可)」として一括宣言する方針を SOP § 5 で記載する内容として確定（Apply 中に翔太郎くん承認、design.md Decision 3 へ反映済）
- [x] 2.2 個別 rollback SQL の後追い作成は行わない方針を確定（翔太郎くん承認済）
- [x] 2.3 既存 migration ファイル本体への冒頭コメント追記は行わない方針を確定（git の実行履歴を汚さない、ファイル変更最小化）

## 3. rollback SQL ファイルの後追い作成（不要 - 全件カテゴリ 3 一括宣言で対応）

- [x] 3.1 後追い rollback SQL 作成は実施しない（翔太郎くん承認済、本変更スコープ外）
- [x] 3.2 dev での rollback SQL 試行は実施しない（後追い作成なしのため不要）
- [x] 3.3 SOP § 5 に「既存は全件カテゴリ 3、復旧は Daily Backup point-in-time restore のみ」と一括明示で代替

## 4. SOP ドキュメント新規作成

- [x] 4.1 `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を新規作成、以下の章立て:
  - § 0 概要（平時バックアップ / 障害検知 / 復旧 / 事後対応のサマリ）
  - § 1 Supabase 自動バックアップ仕様（Free 7 日 / Pro 30 日 + PITR、Storage の取扱い）
  - § 2 Pro プラン昇格判断（trigger 条件: 会員 50 名超 / 月次予約 30 件超 / インシデント発生時 + 月額費用試算）
  - § 3 重要 migration 適用前の手動 `pg_dump` 取得手順
  - § 4 migration 単位の rollback SQL 運用ルール（forward-only / 要 rollback / rollback 不可 の 3 分類）
  - § 5 既存 migrations の一括宣言（21 件を全件カテゴリ 3 として一括明示、Daily Backup point-in-time restore で復旧）+ 新規 migration の分類運用ルール
  - § 6 復旧手順（実行可能な手順として記載、定期実施は規定しない）
  - § 7 障害時の復旧フロー（Render revert / Supabase point-in-time restore / 手動 rollback SQL 適用 の 3 観点）
  - § 8 漏洩時対応 SOP との連携（事故予防 vs 事故後の責任境界）
  - § 9 法令準拠の根拠（個人情報保護法 §23 + ガイドライン通則編 §10 における「合理的水準」の解釈、別ストレージエクスポート / 訓練頻度規定が法令上必須でない旨）
  - § 10 MVP3 で検討する別 Issue（Storage 別ストレージエクスポート / Pro 昇格判断 / 定期訓練導入）
  - 改訂履歴
- [x] 4.2 SOP 内で本人確認書類画像（`identity-documents` バケット）の Storage バックアップに関する現状リスク（自動バックアップに含まれるかの公式仕様、含まれない場合の業務影響）を § 1 に明記
- [x] 4.3 SOP の復旧手順（§ 6）は「実施手順のみ」とし、頻度・実施義務・訓練ログ表は記載しない

## 5. supabase-foundation spec への Requirement 追加

- [x] 5.1 `openspec/changes/db-backup-and-rollback-sop/specs/supabase-foundation/spec.md` を作成し、ADDED Requirement として「Migration 単位の rollback SQL 運用ルール」を記述（Propose フェーズで作成済、本セッションで C 方針反映に更新）
  - 内容: 新規 migration を `supabase/migrations/` に追加する際は、当該 migration を本 SOP の 3 分類のいずれかに位置付けなければならない（SHALL）。カテゴリ 2 に該当する場合は対応する `<元タイムスタンプ>_<元名称>_rollback.sql` を併設しなければならない（SHALL）。カテゴリ 3 に該当する場合は migration ファイル冒頭コメントに「rollback 不可: Daily Backup point-in-time restore で復旧」と明示しなければならない（SHALL）。
  - Scenario: forward-only 新規 migration を追加した場合、rollback SQL の併設は不要だが SOP 分類表への記載が必要
  - Scenario: 要 rollback の新規 migration を追加した場合、rollback SQL ファイルが同 PR に含まれる
  - Scenario: rollback 不可の新規 migration を追加した場合、ファイル冒頭コメントに明示記載がある

## 6. 既存ドキュメントの更新

- [x] 6.1 `docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表の「migrations は migration ごとに rollback SQL を用意 (Phase 1 で運用ルール化)」を本 SOP への参照に更新
- [x] 6.2 `docs/06-品質・セキュリティ/13-漏洩時対応SOP.md` から本 SOP への相互参照リンクを追加（§ 2.3 影響範囲特定の証跡保全連携、§ 6 関連文書）

## 7. 動作確認

- [-] 7.1 SOP 内の「重要 migration 適用前の手動 `pg_dump` 取得手順」を dev で 1 回試行（本 PR のブロッカーから除外。SOP に書いた pg_dump コマンド形式は標準的な PostgreSQL クライアント記法に準拠しており、実物試行は次の重要 migration 適用タイミングで翔太郎くんが実施）
- [x] 7.2 rollback SQL の dev 試行は実施しない（task 3.2 が不要となったため）
- [ ] 7.3 SOP の章立てを翔太郎くんレビューし、内容粒度が SOP として実用的か確認
- [x] 7.4 `openspec validate db-backup-and-rollback-sop` を実行し、spec 変更が valid であることを確認

## 8. PR 作成・完了確認

- [ ] 8.1 PR 作成（title: `chore(infra): DB バックアップ運用 + migrations rollback SQL 運用ルール策定 (#269)`）
- [ ] 8.2 既存 CI（`.github/workflows/ci.yml`）の全 job が緑になることを確認
- [ ] 8.3 db-push-prd.yml ワークフローが当該 PR で起動しないことを確認（本変更は `supabase/migrations/` 配下にファイル追加しないため、paths filter で起動しない見込み）
- [ ] 8.4 翔太郎くんレビュー → `/opsx-ship` で出荷
