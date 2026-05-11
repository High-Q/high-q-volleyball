## 1. 依存追加

- [x] 1.1 root `package.json` の `devDependencies` に `@supabase/supabase-js` と `tsx` を追加し、`pnpm install` で lockfile を更新（`migrate:aws-events` 実行 script も追加）
- [x] 1.2 `.gitignore` に `.env.migration` を追加（Service Role Key を含む env file の誤コミット防止）

## 2. 移行スクリプトの実装

- [x] 2.1 `scripts/migrate-aws-events-to-supabase.ts` を新設。先頭にスクリプトの責務（一度きり移行・対照表ベースの venue 解決・冪等性・survey / dry-run / commit の 3 モード）と必要環境変数（`SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `AWS_EVENTS_ENDPOINT`）の JSDoc を書く
- [x] 2.2 引数パース: `--survey` / `--dry-run`（既定）/ `--commit` の 3 モードと、`--correspondence-dir <path>`（既定 `openspec/changes/dynamodb-events-supabase-migration/`）
- [x] 2.3 AWS 取得層: `fetch(AWS_EVENTS_ENDPOINT)` でレスポンスを取得し `{ body: <JSON string> }` を JSON.parse、配列を返す関数
- [x] 2.4 正規化関数: trim / NFKC / 全角半角統一 / lowercase / 中黒・空白除去のチェーンを 1 関数にまとめる
- [x] 2.5 候補スコアリング関数: AWS location と Supabase venue.name を受け取り、`{ kind: 'exact' | 'normalized' | 'substring' | 'levenshtein' | 'none', score, candidate }` を返す。Levenshtein は短文字列で動く実装を自前で書く（外部依存追加しない）
- [x] 2.6 Survey モード: AWS 全件 + Supabase venues 全件を取得し、ユニーク location ごとに最良候補を算出、`correspondence-venues-proposed.md` を生成（Markdown table）。同時に AWS 全イベントを Supabase events 行プレビュー化した `correspondence-events-proposed.md` も生成（status / visibility / venue ペンディング含む）
- [x] 2.7 Approved ファイル読込層: `correspondence-venues-approved.md` を読んで `Map<aws_location, { action: 'match'|'new'|'fix', venueId?: uuid, newVenueName?: string }>` を返す。形式違反は fail-fast
- [x] 2.8 マッピング層: AWS イベント → Supabase events 行（`name` / `start_at` / `end_at` / `visibility='published'` / `status` を end_at で機械判定 / `description = "[Legacy ID: <aws_id>]"`）+ approved 対照表からの `venue_id`
- [x] 2.9 冪等性層: 各 AWS イベントについて Supabase events を `description ILIKE '%[Legacy ID: <aws_id>]%'` で検索しヒットすれば SKIP
- [x] 2.10 Dry-run モード: approved を読む → マッピング実行 → 「INSERT 予定 events 件数 / 新規 INSERT 予定 venues 件数 / SKIP 件数」をログとサマリーで出す（書き込みなし）
- [x] 2.11 Commit モード: approved を読む → 新規 venues を先に INSERT → events を INSERT。各操作を行単位で stdout に「[INSERT] / [SKIP] / [NEW VENUE]」ログ。サマリーは末尾
- [x] 2.12 Approved ファイルが存在しない / 不完全 / AWS にない location が記載されている / AWS にある location が approved にない場合は fail-fast

## 3. dev フェーズ：Survey と対照表合意

- [ ] 3.1 翔太郎くんが `.env.migration` に dev の `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `AWS_EVENTS_ENDPOINT` を記入（**Claude は .env 系を読まない**）
- [ ] 3.2 dev に対し `pnpm exec tsx scripts/migrate-aws-events-to-supabase.ts --survey` を実行
- [ ] 3.3 生成された `correspondence-venues-proposed.md` と `correspondence-events-proposed.md` をレムが翔太郎くんに提示
- [ ] 3.4 翔太郎くんと一緒に proposed をレビューし、各行の判定を確定（match / new / fix）。AWS のフィールド一覧 / タイムゾーン / location 揺れ / 件数の妥当性も同時確認
- [ ] 3.5 確定内容を `correspondence-venues-approved.md` / `correspondence-events-approved.md` として書き出し、ブランチに commit
- [ ] 3.6 タイムゾーン変換等のロジック修正が必要なら 2.8 のマッピング層を修正

## 4. dev フェーズ：Dry-run と Commit

- [ ] 4.1 dev に対し `--dry-run` 実行、件数最終確認
- [ ] 4.2 dev に対し `--commit` 実行
- [ ] 4.3 admin で dev に投入された events / venues を目視確認（先頭 5 件のフィールド値、件数、venue 紐づけが対照表通りか）

## 5. ドキュメント化

- [x] 5.1 `docs/08-移行/03-AWS-Supabase-events-移行手順.md` を新設し、以下を記載
  - 前提（必要な env、Service Role Key の取扱い注意、対照表合意プロセス）
  - 実行手順（survey → 対照表レビュー → dry-run → commit）
  - サンプル出力ログ
  - ロールバック SQL（events / venues 両方）
  - 失敗時の判断基準（タイムゾーンずれ / 件数不一致 / approved 不整合）

## 6. prd フェーズ

- [ ] 6.1 翔太郎くんが `.env.migration` を **prd** の値に差し替える
- [ ] 6.2 prd に対し `--survey` 実行 → prd 用 proposed が生成される
- [ ] 6.3 翔太郎くんと一緒に prd 用 proposed をレビュー → prd 用 approved を確定（dev 用と内容が異なる可能性があるため別途）
- [ ] 6.4 prd に対し `--dry-run` 実行、件数最終確認
- [ ] 6.5 prd に対し `--commit` 実行
- [ ] 6.6 admin で prd に投入された events / venues を目視確認
- [ ] 6.7 結果を #228 PR #231 にコメントで報告し、Ready for Review へ戻す合図とする

## 7. spec / 後処理

- [x] 7.1 PR を作成（#232。**Render Preview / 本番デプロイへの影響なし** — アプリコード無変更）
- [ ] 7.2 PR レビュー後、`/opsx-ship` で sync → archive → push → merge → ブランチ削除 + Issue クローズ
- [ ] 7.3 マージ後、#228 PR #231 のブロッカー解除コメント
