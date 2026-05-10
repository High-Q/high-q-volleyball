## 1. 着手前確認

- [x] 1.1 reservation の認証ガードと主要フロー（マジックリンク認証 / 本人確認書類アップロード / イベント一覧/詳細 / 予約 / 予約履歴 / プロフィール編集）が main に揃っていることを `apps/reservation/src/app/router.ts` と `apps/reservation/src/pages/` で再確認
- [x] 1.2 `pnpm --filter @high-q/reservation build` がローカルで成功し `apps/reservation/dist/index.html` が出力されることを確認
- [x] 1.3 `render.yaml` の admin サービスエントリから `previewValue` の dev URL / Publishable Key の実値を抽出（reservation エントリ作成時に同値を流用するため）

## 2. render.yaml: reservation サービスの services 配列追加

- [x] 2.1 `render.yaml` の services 配列末尾（admin の後）に reservation サービスブロックを追加（name=`high-q-reservation`、rootDir=`apps/reservation`、runtime=`static`、branch=`master`、staticPublishPath=`dist`、buildCommand=`corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/reservation build`）
- [x] 2.2 reservation サービスに `routes: [{ type: rewrite, source: /*, destination: /index.html }]` を設定
- [x] 2.3 reservation サービスに `autoDeployTrigger: checksPass`、`previews.generation: automatic` を設定
- [x] 2.4 reservation サービスの `envVars` に `NODE_VERSION: "22"`、`SKIP_INSTALL_DEPS: "true"` を追加
- [x] 2.5 reservation サービスの `envVars` に `VITE_SUPABASE_URL` を `sync: false` + `previewValue: <1.3 で抽出した admin と同値>` の形で追加
- [x] 2.6 reservation サービスの `envVars` に `VITE_SUPABASE_PUBLISHABLE_KEY` を `sync: false` + `previewValue: <1.3 で抽出した admin と同値>` の形で追加
- [x] 2.7 LP (`high-q-volleyball`) と admin (`high-q-admin`) の services ブロックが一切変更されていないことを diff で確認

## 3. render.yaml: 末尾雛形コメントの完全削除

- [x] 3.1 末尾コメントの「将来追加用の雛形（reservation）」見出しブロック全体（チェックリスト・dev/prd 切替方針・reservation 雛形 yaml コメント）を削除
- [x] 3.2 削除後、`render.yaml` 末尾は admin サービスブロックの直後で終わっていること（以降に「将来追加用」「reservation 雛形」等のコメントが残っていないこと）を確認
- [x] 3.3 ファイル冒頭の「reservation (apps/reservation) は公開判断完了後に services 配列へ追加する (#140 で実施予定)」という前文コメントを「3 アプリ（LP / admin / reservation）すべてを Render Static Site でデプロイ済」へ書き換え

## 4. 機密情報混入の検証

- [x] 4.1 `render.yaml` 全体を `grep -nE 'service_role|secret|sbs_'` で確認し、`previewValue` を含むあらゆる箇所に Secret Key プレフィックスが存在しないことを確認
- [x] 4.2 `render.yaml` の `previewValue` 行を全件目視確認し、含まれているのは dev プロジェクトの URL と公開 Publishable Key のみで、admin / reservation で完全一致していることを確認

## 5. ドキュメント反映

- [x] 5.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` のホスティング構成表で reservation 行を「デプロイ済」「`high-q-reservation`」へ更新
- [x] 5.2 同ファイル「Render デプロイ設定（render.yaml）」セクションに reservation サービス定義の説明（LP / admin セクションと同等粒度の表）を追記
- [x] 5.3 同ファイル「将来 reservation を追加する際の手順」セクションを「3 アプリ完了」の歴史記述へ書き換え（または手順詳細を削除し完了の旨のみ残す）
- [x] 5.4 `docs/08-移行/01-環境戦略・本番リリース計画.md` §0 現状サマリの reservation 行を「Render デプロイ済（#140 で追加）」へ更新
- [x] 5.5 同ファイル §4 事前準備の reservation 関連項目を完了状態へ整理（admin / reservation とも完了の旨に）
- [x] 5.6 同ファイル §7「Render Preview の動作条件」を更新: 表の「`apps/reservation` のみを変更」行を ✅ Preview 生成へ書き換え。「解消タイミング」セクション（admin / reservation 完了で消失する旨）を本変更で完了したため削除
- [x] 5.7 同ファイル §8 関連 Issue で #140 を Done にマーク

## 6. CLAUDE.md / メモリの整理（Render Preview 言及切替ルール撤廃）

- [x] 6.1 `CLAUDE.md`「Apply 完了報告 / 環境戦略」セクションの `feedback_render_preview_scope.md` 参照行（「(#139/#140 マージで本ルール削除予定)」と注記済の項目）を削除
- [x] 6.2 memory `~/.claude/projects/-Users-mshotaro-Desktop-high-q-volleyball/memory/feedback_render_preview_scope.md` ファイルを削除
- [x] 6.3 memory `~/.claude/projects/-Users-mshotaro-Desktop-high-q-volleyball/memory/MEMORY.md` から「Render Preview 言及ルール」のインデックス行を削除
- [x] 6.4 memory `feedback_render_preview_first_pr_caveat.md`（新規 Render サービス追加 PR は Preview 出ない）は本 PR にも該当するため残置することを確認

## 7. ローカル最終検証

- [x] 7.1 `pnpm exec vitest run` で全テストが緑（reservation 既存テストを含む） — `pnpm test` で実行: design-tokens 11 / shared 64+11todo / tailwind-preset 7 / ui 28 / lp 48 / reservation 533 / admin 706 すべて pass
- [x] 7.2 `pnpm --filter @high-q/reservation build` が成功
- [x] 7.3 `pnpm --filter @high-q/admin build` が成功（admin 設定無変更の回帰確認）
- [x] 7.4 `pnpm --filter @high-q/lp build` が成功（LP 設定無変更の回帰確認）
- [x] 7.5 `git diff render.yaml` を読み返し、変更が「reservation ブロック追加 + 末尾雛形コメント削除 + 冒頭前文の文言更新」のみであることを最終確認

## 8. PR 作成 + レビュー（翔太郎くん）

- [ ] 8.1 ブランチ `feature/140-reservation-render-deploy` で PR 作成（CI 全パス必須）
- [ ] 8.2 ~~PR Preview で reservation URL を確認~~ → **本 PR では構造的に Preview 不可**: reservation は本 PR で初めて services に追加されるため Render Blueprint Instance がマージ後の Re-sync まで認識しない（memory `feedback_render_preview_first_pr_caveat.md` 該当）。**検証は CI 緑 + コードレビューのみ**で行い、本番動作確認は §9 のマージ後 Dashboard 操作後に実施
- [ ] 8.3 PR レビュー時、翔太郎くんが「reservation を商用公開して問題ない状態か」（UI / コンテンツ / 主要フロー成立性 / 利用規約等）を明示確認

## 9. マージ後の Render Dashboard / Supabase 操作（翔太郎くん手動）

> このセクションは `/opsx-ship` の merge 直後に翔太郎くんが Dashboard で実行する。レム作業範囲外。

- [ ] 9.1 Render Dashboard で Blueprint Instance Re-sync を実行し、新規 reservation サービス（`high-q-reservation`）が作成されることを確認
- [ ] 9.2 reservation サービスの env var で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` に **prd Supabase の値**を投入
- [ ] 9.3 LP (`high-q-volleyball`) / admin (`high-q-admin`) の env var が変更されていないことを確認
- [ ] 9.4 Supabase prd プロジェクトの Auth → Redirect URLs に reservation 本番ドメイン（例: `https://high-q-reservation.onrender.com/*`）を追加
- [ ] 9.5 reservation 本番 URL が 200 を返し、未認証アクセスで `/login` にリダイレクトされること、マジックリンク受信 → コールバック → 主要画面表示まで動作することを確認
- [ ] 9.6 reservation 本番から prd データでイベント一覧読み込み・予約フローが動作することを確認
- [ ] 9.7 LP / admin 本番 URL がいずれも 200 を維持していること（無影響回帰確認）

## 10. 後始末

- [ ] 10.1 Issue #140 をクローズ（`/opsx-ship` が処理）
- [ ] 10.2 ブランチ `feature/140-reservation-render-deploy` を削除（`/opsx-ship` が処理）
