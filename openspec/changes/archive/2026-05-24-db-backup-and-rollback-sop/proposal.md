## Why

prd Supabase は商用稼働中で、会員データ・予約データ・本人確認書類画像（Storage）の損失は個人情報保護法上も致命的だが、バックアップ運用ルールと migration 単位の rollback SQL 運用ルールが未策定のまま本番投入されている。`docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表で「Phase 1 で運用ルール化」と先延ばしされていた懸案を、商用稼働中の今こそ言語化し、再発防止と障害復旧の足場を整える。

## What Changes

- **追加**: バックアップ・復旧 SOP ドキュメント (`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md`) を新規作成し、Supabase 自動バックアップの保持期間 / Pro プラン昇格判断の trigger 条件 / Storage の取り扱い / 復旧訓練手順 / 漏洩時 SOP との連携を明文化する
- **追加**: 新規 migration 作成時に rollback SQL を併設するか、もしくは「rollback 不可」を明示するかの運用ルールを `openspec/specs/supabase-foundation/spec.md` に Requirement として追加
- **追加**: 既存 21 件の migrations を SOP § 5 分類表で「全件カテゴリ 3 (rollback 不可・Daily Backup point-in-time restore で復旧)」として一括宣言する。後追い rollback SQL の作成は行わない
- **修正**: `docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表の「Phase 1 で運用ルール化」記述を本変更で導入された SOP への参照に更新
- **修正**: `docs/06-品質・セキュリティ/13-漏洩時対応SOP.md` から新規 SOP への相互参照を追加

## Capabilities

### Modified Capabilities

- `supabase-foundation`: 新規 migration 作成時の rollback SQL 併設ルールを Requirement として追加（既存 spec への拡張）

### New Capabilities

なし（バックアップ・復旧運用は docs 整備のみで完結し、新たな spec capability は不要）

## Impact

- **新規ファイル**:
  - `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md`
- **既存ドキュメント更新**:
  - `docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表
  - `docs/06-品質・セキュリティ/13-漏洩時対応SOP.md` 参照リンク
- **spec 更新**: `openspec/specs/supabase-foundation/spec.md` に Requirement 追加
- **コードへの影響なし**: アプリケーションコード（`apps/*` / `packages/*`）への変更は無し
- **CI への影響なし**: 既存 `.github/workflows/db-push-prd.yml` には触れない（rollback SQL の存在検証等の自動化は今回スコープ外）

## スコープ確定方針（翔太郎くん承認済み）

Issue #269 完了条件に含まれるコスト・工数判断項目について、翔太郎くんと合意した方針:

1. **Pro プラン昇格判断**: **Free 継続、費用一切かけない方針**（memory: feedback_cost_zero_default）。SOP に「昇格 trigger 条件」（会員 50 名超 / 月次予約 30 件超 / インシデント発生時等）と費用試算を明記し、条件達成時にのみ別 Issue 化
2. **Storage 別エクスポート**: **MVP3 へオフロード**（別 Issue 化）、本変更ではリスク認識のみ SOP に明記。法令確認: 個人情報保護法 §23（安全管理措置）+ ガイドライン通則編 §10 が求めるのは「合理的水準」の安全管理措置であり、「別ストレージへエクスポートせよ」とは規定していない
3. **復旧訓練の頻度**: **頻度は規定しない**。SOP に「実行可能な復旧手順」のみを記載。法令確認: 個人情報保護法・同ガイドラインに復旧訓練の頻度規定なし。JIS Q 15001 (PMS) / ISO 27001 (ISMS) 未取得のため業種固有の訓練義務もない
4. **既存 21 件への rollback SQL 後追い**: **既存は全件カテゴリ 3（rollback 不可）として SOP § 5 分類表に一括記載**。GitHub Actions 自動 pg_dump (#299) または手動 pg_dump からの restore で復旧する旨を明示。既存ファイル本体への冒頭コメント追記は行わない（商用稼働中で実行履歴に触れない）。**新規 migration から 3 分類運用を開始**し、新規追加時のみ rollback SQL 併設・冒頭コメント明示等のルールを適用する
5. **Supabase Free プランの backup 補完策**: Supabase Free プランは **自動バックアップが提供されない** ことが判明（"Free Plan does not include project backups"）。費用ゼロ方針のため、**GitHub Actions 週次自動 pg_dump + 重要 migration 適用前の手動 pg_dump** の 2 段構えで合理的水準を確保。GitHub Actions 実装は #299 で本 PR と並行・直後に Apply（本 SOP からは #299 を参照）

## 制約・前提条件

- prd Supabase は商用稼働中であり、本変更による operational 変更（バックアップ取得 / 復旧訓練）は dev プロジェクトを対象とする。prd 実データを直接いじる作業は本変更スコープ外
- 漏洩時対応 SOP（`docs/06-品質・セキュリティ/13-漏洩時対応SOP.md`）との整合を保ち、SOP 間の責任境界を明確にする（漏洩時 SOP は「事故発生後」、本 SOP は「事故予防 + 平時運用」）
- `supabase-foundation` spec の既存 Requirement「SQL Migration のリポジトリ管理」「dev / prd 間のスキーマドリフト禁止」と矛盾しない形で rollback SQL ルールを追加

## 成功基準

- [ ] `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` が新規作成され、判断仰ぎ 4 項目への合意済み方針が記載されている
- [ ] `supabase-foundation` spec に rollback SQL 運用ルールが Requirement として追加されている
- [ ] 既存 migrations が SOP § 5 で「全件カテゴリ 3」として一括宣言され、Daily Backup point-in-time restore で復旧する旨が明記されている
- [ ] `docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表が本 SOP への参照に更新されている
- [ ] `docs/06-品質・セキュリティ/13-漏洩時対応SOP.md` から本 SOP への相互参照が追加されている
