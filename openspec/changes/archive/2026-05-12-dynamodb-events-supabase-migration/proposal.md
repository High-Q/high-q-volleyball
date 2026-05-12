## Why

LP のイベント取得を Supabase に切替える #228 PR (#231) は、商用 LP の表示が空になるリスクのため**現状ブロック中**である。AWS DynamoDB に蓄積された既存イベント（過去・未来）を Supabase `events` テーブルへ一度きりで取り込めば、LP 切替後も**既存デザインのまま履歴と未来予定が連続して見える**状態にできる。本 change はその「データだけ」の移行を、アプリコード変更ゼロで完結させる。

## What Changes

- AWS API Gateway (`/beta/event`) から全イベントを取得し、Supabase `events` テーブルへ upsert する一度きりの移行スクリプトを追加する（`scripts/migrate-aws-events-to-supabase.ts`）
- **3 段階実行モード**を採用:
  1. `--survey`: AWS データ取得 → Supabase 現行 venues との対照表（正規化 / 部分一致 / 編集距離で候補算出）を `correspondence-venues-proposed.md` / `correspondence-events-proposed.md` として生成（書き込みなし）
  2. **対照表レビュー（人手）**: 翔太郎くんが proposed をレビューし `correspondence-venues-approved.md` / `correspondence-events-approved.md` として承認・コミット
  3. `--dry-run` → `--commit`: スクリプトは approved ファイルだけを真実の源にして書き込み
- AWS `location` の表記揺れに対しては、機械的な「ゆるい一致」（正規化・編集距離）を**候補提示として算出**するが、最終決定は対照表レビューで翔太郎くんが行う（誤マージ防止）
- 冪等性は events.description の末尾に埋める `[Legacy ID: <aws_id>]` マーカーで担保し、再実行時は同じ Legacy ID を含む行を SKIP する
- root `devDependencies` に `@supabase/supabase-js` と `tsx` を追加する
- 実行手順とロールバック手順を `docs/08-移行/03-AWS-Supabase-events-移行手順.md` に追記する
- 本 change は**アプリコード（apps/lp / apps/admin / apps/reservation）を一切変更しない**。スクリプトと docs と root deps のみ
- **BREAKING**: なし

### スコープ外

- LP のデータ取得経路切替（#228 PR #231 で扱う、本 change のマージ後に解禁）
- AWS DynamoDB / Lambda / API Gateway リソースの停止判断
- 継続同期（一度きり）
- venues NOT NULL 列の正式値整備（プレースホルダーで埋め、admin から後追い整備）

## Capabilities

### New Capabilities

- なし（一度きり移行スクリプトは継続提供するシステム能力ではなく、運用イベントとして扱う）

### Modified Capabilities

- `data-schema`: AWS Legacy 由来 events に対する `description` 列 Legacy ID マーカー埋め込み規約を追記（既存列定義・型・制約は無変更。移行スクリプトの冪等性担保のための運用規約を ADDED Requirement として明文化）
- `rls-policies` は改変しない（スクリプトは Service Role Key で実行し RLS をバイパスする）

## Impact

- **コード**: `scripts/migrate-aws-events-to-supabase.ts`（新設）。アプリコードは無変更
- **DB**: 既存 dev / prd Supabase に対し `events` への INSERT、`venues` への INSERT が発生（中身は安全側のプレースホルダーで、後で admin から編集可能）
- **依存**: root `devDependencies` に `@supabase/supabase-js` と `tsx` を追加
- **環境変数**: スクリプト実行時のみ `SUPABASE_URL` / `SUPABASE_SECRET_KEY`（旧 service_role）と `AWS_EVENTS_ENDPOINT` を環境変数で受け取る。Service Role Key はサーバーサイドのみで扱い、コード・コミットに含めない（CLAUDE.md セキュリティルール）
- **ドキュメント**: `docs/08-移行/03-AWS-Supabase-events-移行手順.md`（新設）に dev / prd 実行手順とロールバック手順
- **後続**: 本 change マージ + prd 実行 + 翔太郎くん目視確認のあと、#228 PR #231 を Ready に戻して merge する運用
