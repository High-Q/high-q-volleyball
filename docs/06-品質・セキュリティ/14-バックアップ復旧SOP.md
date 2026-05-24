# バックアップ・復旧 SOP

> 本 SOP は **個人情報保護法 §23 (安全管理措置)** および同法ガイドライン (通則編) §10 が求める「合理的水準」の安全管理措置のうち、データ保全・復旧に関する平時運用と障害時対応を定義する。
> 本 SOP は **平時運用 + 障害時の復旧ランブック** であり、漏洩が確定した場合の対応は [13-漏洩時対応SOP.md](./13-漏洩時対応SOP.md) を参照する。
> 本 SOP は Solo dev (翔太郎くん 1 人) 運用を前提に、形骸化を避けて実効性のある範囲に絞っている。

---

## 0. 概要

データ保全と障害復旧を以下の柱で実施する:

| 柱 | 概要 | 平時頻度 |
|---|---|---|
| 1. GitHub Actions 週次自動 pg_dump | `backup-prd.yml` (#299) が GitHub Artifacts に dump を保存 | 週次 (自動) |
| 2. GitHub Actions 実行履歴の月次確認 | 翔太郎くんが Actions タブを目視、直近 4 週分の dump が成功取得されているか確認 | 月次 |
| 3. 重要 migration 適用前 pg_dump | カテゴリ 2 / 3 の migration 適用前に手動で pg_dump 取得 (週次の隙間補完) | 該当 PR ごと |
| 4. migration 分類運用 | 新規 migration を 3 カテゴリで分類し、カテゴリ 2 は rollback SQL 併設 | 新規 migration ごと |
| 5. 障害時復旧 | Render revert / GitHub Actions pg_dump からの restore / 手動 rollback SQL の 3 観点 | 障害発生時のみ |

復旧訓練 (dev に prd pg_dump を restore して動作確認) の定期実施は本 SOP では規定しない (§ 9 法令準拠の根拠参照)。

---

## 1. Supabase 自動バックアップ仕様

### 1.1 プラン別バックアップ仕様

| 項目 | Free プラン (現状) | Pro プラン (将来) |
|---|---|---|
| Supabase 自動バックアップ | **なし** (公式仕様: "Free Plan does not include project backups") | 日次 (Daily Backup) + Point-in-Time Recovery (PITR) |
| 保持期間 | — | 7 日 + PITR で任意時点復元 |
| Storage バケットの取扱い | DB / Storage ともに自動バックアップ対象外 | Postgres は自動対象。Storage バケット (`identity-documents`) は別バックアップ計画が必要 |
| 月額固定費 | $0 | $25/month (2026-05 時点公式価格) |

### 1.2 prd Supabase の現状と補完策

- プラン: **Free** (#269 / memory feedback_cost_zero_default 準拠、費用一切かけない方針)
- **Supabase 自動バックアップは存在しない**。商用稼働中の DB 損失リスクは Free プランの構造的弱点
- 補完策: **GitHub Actions による週次自動 pg_dump (#299 で実装済み、`.github/workflows/backup-prd.yml`) + 重要 migration 適用前の手動 pg_dump (§ 3)** の 2 段構えで合理的水準を確保
- 月次確認: 翔太郎くんが GitHub Actions の `backup-prd.yml` ワークフロー実行履歴を目視し、直近 4 週分の pg_dump が連続取得されていることを確認。失敗があれば即対応

### 1.3 Storage バケット (`identity-documents`) のバックアップに関する現状リスク

- Supabase Free プランは DB 自動バックアップも非対応であり、Storage バケット (本人確認書類画像) も当然 **自動バックアップ対象外**
- #299 で実装した GitHub Actions 自動 pg_dump (`backup-prd.yml`) も Postgres DB のみが対象で、Storage バケットは別計画が必要
- 本人確認書類画像 (`identity-documents` バケット) が損失した場合の業務影響:
  - 会員からの再提出依頼が必要 (会員体験の毀損)
  - 提出済画像の Storage path は DB の `identity_documents` テーブルに記録されているが、Storage 実体が無いため画面表示不可
  - 最悪のケース (悪意ある削除等) で漏洩時 SOP との連動が発生する
- 別ストレージへの定期エクスポート実装は MVP3 別 Issue で検討 (§ 10 参照)
- 平時の予防策: Storage バケットの設定変更時 (RLS / public 化設定変更) は Supabase Dashboard の操作前にスクリーンショットで証跡保全

---

## 2. Pro プラン昇格判断

### 2.1 昇格 trigger 条件

費用ゼロが High Q の基本方針 (memory: feedback_cost_zero_default) のため、Pro 昇格は以下 trigger 達成時にのみ別 Issue 化し検討する:

- 会員登録数が **50 名** を超えた時点
- 月次予約件数が **30 件** を超えた時点
- インシデント (漏洩 / 復旧不能なデータ破損) が **1 件でも発生** した時点
- 役所提出用一括 DL 機能 (#172) 等の MVP2 機能追加でビジネス継続性要件が上がった時点
- GitHub Actions 自動 pg_dump (#299) で障害発生時の RPO (許容データ損失時間) が業務上不足することが判明した時点

### 2.2 費用試算 (2026-05 時点)

- Pro プラン: $25/month (年額 $300、約 ¥45,000/年)
- 含まれるメリット: Daily Backup 7 日、PITR (任意時点復元)、より高い DB リソース、優先サポート

### 2.3 Free プラン継続時の運用上の補完策

- **GitHub Actions 週次自動 pg_dump (#299)** が平時の backup の柱
- 重要 migration (カテゴリ 2 / 3) 適用前は加えて **§ 3 の手動 pg_dump** で直前スナップショットを取得 (週次の隙間を埋める)
- 翔太郎くんは月次で GitHub Actions の実行履歴を Dashboard で確認

---

## 3. 重要 migration 適用前の手動 pg_dump 取得手順

カテゴリ 2 (要 rollback SQL) または カテゴリ 3 (rollback 不可) の migration を prd に適用する直前に、保険として pg_dump で DB 全体のスナップショットを取得する。Free プランは Supabase 自動バックアップが存在せず、GitHub Actions 自動 pg_dump (#299, `backup-prd.yml`) も週次のため、適用直前スナップショットでカバーする。手動取得手順の代わりに GitHub Actions UI から `backup-prd.yml` の `workflow_dispatch` (Run workflow ボタン) を起動して直前スナップショットを取得することも可能。

### 3.1 取得タイミング

- master へのマージ後、GitHub Actions `db-push-prd.yml` が承認待ち状態になった時点
- 翔太郎くんが Approve 操作する直前

### 3.2 取得コマンド (翔太郎くん手動)

```bash
# prd プロジェクトの接続情報を 1Password から取得
# 出力は端末ローカルにのみ保存し、リポジトリには絶対にコミットしない
PGPASSWORD='<prd-db-password>' pg_dump \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.<prd-project-ref> \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  -f "$HOME/Documents/high-q-backups/prd_pre_$(date +%Y%m%d_%H%M%S)_<migration-name>.sql"
```

### 3.3 保管

- 保管先: 翔太郎くんローカル `~/Documents/high-q-backups/` (Time Machine バックアップ対象であることを確認)
- 保管期間: 適用後 30 日経過 + 直近の GitHub Actions 自動 pg_dump (#299) が成功取得されていることを確認したのち削除
- ファイル名規約: `prd_pre_<YYYYMMDD_HHMMSS>_<migration-name>.sql`
- **GitHub / Slack / メール / Claude へのチャットペースト等で外部送信しない MUST**

### 3.4 復旧時の使い方

prd への migration 適用後に問題発覚した場合、本 pg_dump ファイルを使って:

1. dev プロジェクトに `psql` で適用 → 影響範囲・データ確認
2. 必要であれば prd への部分的データ復旧 SQL を組み立てる (実行は dev 検証後)

GitHub Actions 自動 pg_dump (#299) のスナップショットも同様に restore 可能 (§ 7.2 参照)。

---

## 4. Migration 単位の rollback SQL 運用ルール

新規 migration を `supabase/migrations/<timestamp>_<name>.sql` として追加する際、当該 migration を以下 3 カテゴリのいずれかに位置付ける。

### 4.1 3 カテゴリ定義

| カテゴリ | 定義 | rollback SQL | migration ファイル冒頭コメント |
|---|---|---|---|
| **カテゴリ 1: forward-only / 加算的** | CREATE TABLE / CREATE VIEW / ADD COLUMN (NOT NULL なし or DEFAULT 付き) / INSERT seed / GRANT / RLS ポリシー追加 | 不要 | 任意 (記載すれば明示性向上) |
| **カテゴリ 2: データ変換 / 構造変更** | column rename / FK 制約変更 / column 削除 / NOT NULL 化 / 既存データ書き換え | **必須**: `<元タイムスタンプ>_<元名称>_rollback.sql` を同 PR で `supabase/migrations/` に併設 | 「カテゴリ 2: 対応 rollback SQL は `<rollback ファイル名>` を参照」と記載 |
| **カテゴリ 3: rollback 不可** | DROP TABLE / TRUNCATE / 不可逆な data migration / 商用データの破壊的変換 | 不可 | 「カテゴリ 3 (rollback 不可): GitHub Actions 自動 pg_dump (#299) または手動 pg_dump (§ 3) からの restore で復旧」と記載 |

### 4.2 PR レビュー時のチェックポイント

- 新規 migration に分類カテゴリが明示されているか (冒頭コメント or PR description)
- カテゴリ 2 の場合、対応する `_rollback.sql` ファイルが同 PR に含まれているか
- カテゴリ 3 の場合、ファイル冒頭コメントに rollback 不可旨が明記されているか
- SOP § 5 分類表に新規 migration が追記されているか

分類が明示されていない PR はマージしない運用とする。

### 4.3 rollback SQL の品質基準 (カテゴリ 2 のみ)

- forward migration を完全に逆順で打ち消す SQL を記述
- dev プロジェクトで動作確認: forward 適用 → rollback 適用 → スキーマが元に戻ることを `supabase db query --linked` で確認
- 商用データ依存で安全に rollback できないケースは、ファイル冒頭コメントに警告を明記し、実質的にカテゴリ 3 扱いを検討

---

## 5. 既存 migrations の一括宣言と新規分類運用

### 5.1 既存 21 件の一括宣言

本 SOP 導入時点 (2026-05-24) でリポジトリに存在する以下 21 件の migration は **全件カテゴリ 3 (rollback 不可)** として一括宣言する。復旧手段は GitHub Actions 自動 pg_dump (#299) または手動 pg_dump (§ 3) からの restore のみ。

```
20260426000000_init_high_q.sql
20260428143738_db_schema_foundation.sql
20260429000000_table_grants.sql
20260430120000_event_list_view.sql
20260501210240_event_detail_views.sql
20260502165034_event_detail_view_v2_headcount.sql
20260502172040_event_detail_view_v3_member_breakdown.sql
20260504231456_split_identity_documents_storage_path.sql
20260505030613_relax_identity_documents_storage_path_front.sql
20260505182545_fix_ariake_venue_address.sql
20260505184227_add_venues_meeting_point.sql
20260507000000_add_members_nickname.sql
20260511000000_add_signup_pending.sql
20260511000100_grant_service_role.sql
20260515133901_add_members_admin_note_and_views.sql
20260516000000_member_withdrawal_flow.sql
20260517215530_change_reservations_event_fk_to_cascade.sql
20260519163927_add_nickname_to_event_participants_view.sql
20260520160254_split_members_name_last_first.sql
20260520164020_fix_known_split_needed_members.sql
20260523085011_add_correction_request_count_to_member_list_view.sql
```

### 5.2 一括宣言の根拠

- 商用稼働中の prd に既に適用済み・運用安定状態であり、「rollback したい」シナリオが実質発生しない
- UPDATE データ修正系 (`fix_ariake_venue_address` / `fix_known_split_needed_members`) は元に戻すと再度バグるため、機構上 rollback してはいけない
- 姓名分離 (`split_members_name_last_first`) は既存会員データを backfill 済で、元に戻すと商用データが壊れる
- FK 変更・NOT NULL 化系は商用データを失わずに戻す rollback SQL が複雑で、GitHub Actions 自動 pg_dump (#299) から restore するほうが安全
- 既存ファイル本体への冒頭コメント追記は行わない (git の実行履歴を汚さず、ファイル変更を最小化)

### 5.3 新規 migration の分類表

本 SOP 導入後に追加される新規 migration を以下の表に追記する。PR ごとに翔太郎くん/レムが本表を更新する責務を負う。

| migration ファイル | カテゴリ | rollback SQL | 備考 |
|---|---|---|---|
| (新規追加分をここに追記) |  |  |  |

---

## 6. 復旧手順 (実施タイミングは規定しない)

dev プロジェクトに prd pg_dump を restore して動作確認したい場合の手順を記載する。本 SOP では定期実施は規定せず、翔太郎くんの判断で必要時にのみ実施する。

### 6.1 手順

1. GitHub Actions の `backup-prd.yml` (#299) の最新 run を開き、Artifacts から prd pg_dump をダウンロード
2. もしくは翔太郎くんローカルの手動 pg_dump (§ 3) ファイルを使用
3. dev プロジェクトの DB を一旦リセット (`supabase db reset --linked` 等、dev データ消失を許容する場合のみ)
4. ダウンロードした SQL ダンプを dev に restore (`psql` または Supabase Dashboard の SQL Editor)
5. dev URL (PR Preview または `pnpm dev`) で会員ジャーニーを 1 周通す: 会員登録 → 本人確認書類提出 → 予約作成
6. 確認完了後、dev は元のテストデータに戻すか継続使用するか翔太郎くん判断

### 6.2 注意

- 本手順実施中の dev は prd 実データに近い状態になるため、外部公開や第三者アクセスを許可しない
- 復元した個人データは確認完了後速やかに dev を reset して消去する
- ダウンロードした pg_dump ファイルは確認後ローカルから削除する
- 復元中に「rollback SQL の動作確認」を兼ねる場合は § 4.3 参照

---

## 7. 障害時の復旧フロー

prd で障害が発生した場合の復旧手段を 3 観点で整理する。障害種別に応じて優先順位を判断する。

### 7.1 アプリケーション層の障害: Render revert

- 症状: 直近の app deploy 後にアプリが起動しない / 機能不全
- 対応:
  1. Render Dashboard → 該当サービス → Deploys で前回成功 deploy を選択
  2. "Rollback to this deploy" を実行 (1 click で前バージョンへ戻る)
  3. アプリが復旧することを本番 URL で確認
- 所要時間: 数分

### 7.2 DB 層の障害: GitHub Actions 自動 pg_dump からの restore

- 症状: migration 適用後にデータ破損 / アプリエラーが多発
- 前提: 本 SOP 公開後、`.github/workflows/backup-prd.yml` (#299) が週次自動 pg_dump を取得し GitHub Artifacts に 90 日保持している。dump は `public` + `auth` の 2 スキーマを含み、`auth.users` と `members` の FK 整合を保ったまま restore 可能。Artifact は **3 ファイル構成** (schema / data / roles) で、`supabase db dump` のデフォルトが schema-only であるため明示的に data も別ファイルで取得している
- Artifact ファイル構成 (1 つの `prd-backup-<YYYYMMDD_HHMMSS>` artifact 内に同梱):
  - `prd_<YYYYMMDD_HHMMSS>_schema.sql`: スキーマ DDL (CREATE TABLE / FUNCTION / TRIGGER / POLICY / GRANT 等)
  - `prd_<YYYYMMDD_HHMMSS>_data.sql`: COPY 形式のデータ本体 (`public` 全テーブル + `auth.users` 等)。`auth.audit_log_entries` / `flow_state` / `refresh_tokens` / `sessions` / `one_time_tokens` は除外 (session/audit ノイズで復旧目的不要)
  - `prd_<YYYYMMDD_HHMMSS>_roles.sql`: クラスタロール定義 (`auth.users` の OWNER 再現に必要)
- 対応 (Free プラン、GitHub Actions Artifacts からの restore 手順):
  1. **dump の取得**:
     - GitHub リポジトリ → "Actions" タブ → 左ペインから `backup prd Supabase (weekly pg_dump)` ワークフローを選択
     - run 一覧から障害発生直前の正常 run を開く (90 日以内のものから選択)
     - run ページ下部の "Artifacts" セクションで `prd-backup-<YYYYMMDD_HHMMSS>` を翔太郎くんローカル端末にダウンロード (zip 形式で配布、3 ファイル同梱)
     - ダウンロードした zip を展開し `_schema.sql` / `_data.sql` / `_roles.sql` の 3 ファイルを取り出す
  2. **dev で動作確認 (必須)**:
     - 取り出した dump 群を翔太郎くん dev 端末で `~/Documents/high-q-backups/restore-staging/` 等に一時配置
     - dev プロジェクトを `supabase db reset --linked` 等で初期化 (dev データ消失を許容)
     - 以下の順序で `psql` または Supabase Dashboard の SQL Editor で dev に restore:
       1. `_roles.sql` (クラスタロール、既存と重複時の `already exists` エラーは無視)
       2. `_schema.sql` (DDL)
       3. `_data.sql` (COPY でデータ流し込み)
     - dev URL (PR Preview または `pnpm dev`) でアプリ起動、会員ジャーニーが正常動作することを確認
  3. **prd 上書き前の保険スナップショット**:
     - 上書き直前の prd 状態を § 3 の手動 pg_dump 手順で別途バックアップ取得 (`prd_pre_<YYYYMMDD_HHMMSS>_emergency_restore.sql`)
     - 上書き失敗時のロールバック手段として保持
  4. **prd への restore**:
     - psql で慎重に実施。Supabase Dashboard 経由 SQL Editor は大規模 dump に不向きなため psql を推奨
     - 既存スキーマ削除 → roles → schema → data の順序、トランザクション境界に注意
  5. **復旧後のアプリ動作確認**: 管理画面・予約サイト双方で会員データ・予約データ・本人確認書類画像参照が正常動作することを確認
  6. **ダウンロードした dump の事後処理**: 復旧完了後、ローカル端末上の dump ファイル群 (取り出した `.sql` および展開元 zip) は速やかに削除。**GitHub / Slack / メール / Claude へのチャットペースト等で外部送信しない MUST** (§ 3.3 と同じアクセス制御原則)
- 対応 (Pro プラン昇格後): Supabase PITR で障害発生直前の任意時点に復旧可能 (RPO 短縮)
- 所要時間: 数十分〜数時間 (DB サイズに依存)
- **重要な制約**:
  - GitHub Actions 自動 pg_dump は週次のため、最大 7 日分の最新データが失われるリスクあり (RPO ≦ 7 日)。重要 migration 適用前は § 3 の手動 pg_dump を直前スナップショットとして取得し、RPO を短縮する
  - GitHub Artifacts の保持期間は 90 日。90 日経過した backup は GitHub によって自動削除されるため復旧不可。90 日以上前の状態への復旧が必要な障害は § 3 の翔太郎くんローカル手動 pg_dump (Time Machine バックアップ対象) からのみ復旧可能
- **アクセス権**: GitHub Artifacts は private リポジトリの Repo Read 権限以上の Collaborator のみダウンロード可能。High Q リポジトリは private で翔太郎くん 1 人 Owner のため、dump への実質アクセスは翔太郎くんのみ。Collaborator 追加時は本人確認書類画像 / 会員データ流出リスクとして再評価必須

### 7.3 手動 rollback SQL 適用 (カテゴリ 2 migration の場合のみ)

- 症状: カテゴリ 2 として運用された新規 migration の適用後に問題発覚 (pg_dump 復元前の暫定対応)
- 対応:
  1. 当該 migration に併設された `_rollback.sql` を確認
  2. dev で動作確認: forward → rollback → スキーマ正常 を再現できることを確認
  3. prd に rollback SQL を `supabase db query --linked` または Dashboard SQL Editor で適用
  4. アプリ動作確認後、forward migration を一時的に migrations ディレクトリから除外し、後続 PR で修正版を再投入
- **注意**: 商用データが書き換わっている場合は rollback SQL 適用でデータ破損のリスクあり。判断に迷う場合は pg_dump 復元 (§ 7.2) を優先

### 7.4 復旧フロー選択の判断軸

```
障害発生
  ↓
アプリ層のみ問題か?
  ├─ Yes → 7.1 Render revert
  └─ No (DB 起因) ↓
    ↓
    カテゴリ 2 の rollback SQL が用意されているか?
      ├─ Yes (dev で動作確認済) → 7.3 手動 rollback SQL 適用
      └─ No / 商用データ破損疑い → 7.2 GitHub Actions pg_dump 復元
```

---

## 8. 漏洩時対応 SOP との連携

- **本 SOP (バックアップ復旧)**: 事故予防 + 復旧手順 + 平時運用
- **[漏洩時対応 SOP](./13-漏洩時対応SOP.md)**: 事故発生後の通報 / 法的対応 / 影響評価 / 再発防止策

### 8.1 復旧作業中に漏洩疑いを検知した場合

復旧作業中に「データが想定外の状態」「不審なアクセス」を確認した場合は、即座に 13-漏洩時対応SOP § 1「検知」へ遷移する。検知時刻を記録し本 SOP の復旧作業と並行して漏洩対応プロセスを開始する。

### 8.2 漏洩確定後の復旧作業

漏洩時 SOP § 2.1 でアクセスキー rotate を実施した後、本 SOP § 7 の復旧フローに従って DB / アプリの正常状態を回復する。漏洩時 SOP § 2.4 の証跡保全と並行する場合、本 SOP § 3 の pg_dump 取得を「漏洩時点のスナップショット」として証跡フォルダに保管する。

---

## 9. 法令準拠の根拠

本 SOP の運用範囲設計が法令上どこに位置付けられるかを明示する。

### 9.1 個人情報保護法 §23 (安全管理措置)

- 法 §23 は「個人情報取扱事業者は、その取り扱う個人データの漏えい、滅失又は毀損の防止その他の個人データの安全管理のために必要かつ適切な措置を講じなければならない」と規定
- 「必要かつ適切」の解釈は個人情報保護委員会「個人情報の保護に関する法律についてのガイドライン (通則編)」§10 に基づき、組織的・人的・物理的・技術的の 4 軸で **合理的な水準** を満たすことを求める
- 「合理的な水準」は事業規模・取扱データの性質・損害発生時の影響度を加味して判断される
- High Q は Supabase Free プランで自動バックアップが提供されないが、**GitHub Actions による週次自動 pg_dump (#299) と重要 migration 適用前の手動 pg_dump (§ 3) の 2 段構え** により、技術的安全管理措置の例「外部記録媒体のバックアップ、その内容の確認」(ガイドライン §10-4) を実質的に満たす設計とする

### 9.2 本 SOP で「規定しない」項目の法令確認

| 項目 | 本 SOP 方針 | 法令上の必須性 |
|---|---|---|
| Supabase Pro 昇格による自動バックアップ取得 | 費用一切かけない方針のため見送り、GitHub Actions pg_dump (#299) で代替 | **必須ではない**。法令はバックアップ取得自体を求めるが特定サービスの利用を規定しない。GitHub Actions 自動 pg_dump で合理的水準は確保可能 |
| Storage の別ストレージへの定期エクスポート | MVP3 オフロード、本 SOP では実装しない | **必須ではない**。ガイドライン §10 はバックアップ取得自体を求めるが「別ストレージへエクスポートせよ」とは規定していない。Storage 自動バックアップ非対応のリスクは § 1.3 で認識・記録 |
| 復旧訓練の定期実施 | 頻度規定なし、手順のみ § 6 に記載 | **必須ではない**。個人情報保護法・同ガイドラインに復旧訓練の頻度規定なし。JIS Q 15001 (PMS) / ISO 27001 (ISMS) を取得する場合は事業継続管理 + テストが求められるが、High Q は未取得 |

### 9.3 取扱データの特性

- High Q が取り扱う個人データ: 氏名 / メールアドレス / 電話番号 / 本人確認書類画像 (運転免許証等、マイナンバー部分はマスク済運用)
- マイナンバーカード裏面の個人番号 (特定個人情報) はマスク済画像のみ Storage 保管。生の個人番号は保管しない ([08-本人確認書類取扱SOP.md](./08-本人確認書類取扱SOP.md) 参照)
- 要配慮個人情報 (病歴・障害・犯罪歴等) は取り扱わない
- 上記により、要配慮個人情報・特定個人情報固有の厳格義務 (より短い報告期限・より高度な安全管理措置) は発生しない

### 9.4 将来の認証取得時の見直し

- JIS Q 15001 (PMS) または ISO 27001 (ISMS) を将来取得する場合、事業継続管理 (BCP) と定期的なテスト・レビューが求められる
- その時点で本 SOP § 6 の復旧手順を「定期実施」に格上げ、訓練ログ表の追加等を別 Issue で検討する

---

## 10. 既存・別 Issue で扱う項目

### 10.1 本 SOP 公開後に Apply 完了済み

- **#299 GitHub Actions による prd Supabase 定期 pg_dump 自動化 (Free プラン補完)**: 本 SOP の柱となる週次自動 pg_dump 実装。`.github/workflows/backup-prd.yml` として運用中 (cron `0 18 * * 6` UTC = 毎週日曜 03:00 JST + workflow_dispatch 手動実行対応、Artifacts 保持 90 日)。復旧手順は § 7.2 を参照

### 10.2 MVP3 で検討する別 Issue

本 SOP のスコープ外として MVP3 以降で別 Issue 化する項目:

- **Storage バケット (`identity-documents`) の別ストレージへの定期エクスポート実装**: S3 等への暗号化エクスポート + 鍵管理。Storage 自動バックアップ非対応リスクの恒久対策。費用ゼロを維持するなら GitHub Artifacts への定期ダウンロードで検討
- **Pro プラン昇格判断**: § 2.1 trigger 条件達成時に別 Issue 化、費用承認 + 移行作業
- **復旧訓練の定期実施導入**: 会員規模成長時 (Pro 昇格 trigger と同等の閾値) に訓練習慣導入を別 Issue で再検討
- **Disaster Recovery (別リージョン構成)**: 東京リージョン Supabase 障害時の事業継続。MVP3 以降
- **CI による rollback SQL 存在検証の自動化**: カテゴリ 2 migration に対応 rollback SQL が同 PR に含まれているかを GitHub Actions でチェック。運用が回り始めてから検討

---

## 関連文書

- [12-安全管理措置.md](./12-安全管理措置.md) — 平時の安全管理体制全般
- [13-漏洩時対応SOP.md](./13-漏洩時対応SOP.md) — 漏洩発生後の通報 / 本人通知 / 再発防止
- [08-本人確認書類取扱SOP.md](./08-本人確認書類取扱SOP.md) — 本人確認書類画像のマスク・保管
- [docs/03-アーキテクチャ/03-インフラ・CICD構成.md](../03-アーキテクチャ/03-インフラ・CICD構成.md) — prd 自動 db push ワークフロー / rollback 手順
- [docs/08-移行/01-環境戦略・本番リリース計画.md](../08-移行/01-環境戦略・本番リリース計画.md) — dev / prd 分離方針 / Phase 設計

---

## 改訂履歴

| 日付 | 改訂内容 | 改訂者 |
|---|---|---|
| 2026-05-24 | 初版作成。Issue #269 対応として Supabase 自動バックアップ仕様 / Pro プラン昇格判断 / 重要 migration 適用前 pg_dump 手順 / migration 3 分類運用ルール / 既存 21 件をカテゴリ 3 一括宣言 / 復旧手順 / 障害時復旧フロー / 漏洩時 SOP 連携 / 法令準拠根拠 / MVP3 オフロード項目 を明文化 | 翔太郎くん / レム |
| 2026-05-25 | Issue #299 対応として GitHub Actions 週次自動 pg_dump ワークフロー (`backup-prd.yml`) を実装、§ 7.2 に Artifacts ダウンロードからの restore 詳細手順 (前提・90 日制約・アクセス権)・§ 10.1 を「実装済み」表現に更新、SOP 全体の「導入予定」未来形表現を「実装済み・運用中」現在形に変換 | 翔太郎くん / レム |
| 2026-05-25 | #299 動作確認で `supabase db dump` がデフォルト schema-only である仕様判明、data が含まれない不具合を発見し fix。ワークフローを schema / data / roles の 3 ダンプ構成に変更、§ 7.2 の restore 手順も roles → schema → data の 3 ステップに更新 | 翔太郎くん / レム |
