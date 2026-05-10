## 1. 着手前確認（Apply 開始時に翔太郎くんへ要請）

- [x] 1.1 翔太郎くんから dev Supabase プロジェクトの実値（`VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY`）の提示を受ける（レムは `.env.local` を読まないため必須）
- [x] 1.2 admin の Auth ゲート (`registerAuthGuard`) と最低限の管理機能が main に入っていることを `apps/admin/src/main.ts` / `apps/admin/src/app/router.ts` で再確認
- [x] 1.3 `pnpm --filter @high-q/admin build` がローカル成功し `apps/admin/dist/index.html` が出力されることを確認

## 2. render.yaml: admin サービスの services 配列追加

- [x] 2.1 `render.yaml` の services 配列末尾に admin サービスブロックを追加（name=`high-q-admin`、rootDir=`apps/admin`、runtime=`static`、branch=`master`、staticPublishPath=`dist`、buildCommand=`corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/admin build`）
- [x] 2.2 admin サービスに `routes: [{ type: rewrite, source: /*, destination: /index.html }]` を設定
- [x] 2.3 admin サービスに `autoDeployTrigger: checksPass`、`previews.generation: automatic` を設定
- [x] 2.4 admin サービスの `envVars` に `NODE_VERSION: "22"`、`SKIP_INSTALL_DEPS: "true"` を追加
- [x] 2.5 admin サービスの `envVars` に `VITE_SUPABASE_URL` を `sync: false` + `previewValue: <1.1 で受領した dev URL>` の形で追加
- [x] 2.6 admin サービスの `envVars` に `VITE_SUPABASE_PUBLISHABLE_KEY` を `sync: false` + `previewValue: <1.1 で受領した dev Publishable Key>` の形で追加
- [x] 2.7 LP の services ブロック（`high-q-volleyball`）が一切変更されていないことを diff で確認

## 3. render.yaml: 末尾雛形コメントから admin ブロックを削除

- [x] 3.1 末尾コメントの「admin 雛形」ブロックを削除（`# admin 雛形:` から `# previewValue: sb_publishable_<dev-publishable-key>` の最終行まで）
- [x] 3.2 末尾コメントの「reservation 雛形:」見出しと参照行は残置されていることを確認
- [x] 3.3 末尾コメントの「将来追加用の雛形（admin / reservation）」見出しと「追加時のチェックリスト」「環境変数の dev/prd 切替方針」のコメントブロックを `将来追加用の雛形（reservation）` に書き換え、admin への言及を削除

## 4. 機密情報混入の検証

- [x] 4.1 `render.yaml` 全体を `grep -nE 'service_role|secret|sbs_'` で確認し、`previewValue` を含むあらゆる箇所に Secret Key プレフィックスが存在しないことを確認
- [x] 4.2 `render.yaml` の `previewValue` 行を全件目視確認し、含まれているのは dev プロジェクトの URL と公開 Publishable Key のみであることを確認

## 5. ドキュメント反映

- [x] 5.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` のホスティング構成表で admin 行を「デプロイ済」「`high-q-admin`」へ更新
- [x] 5.2 同ファイル「Render デプロイ設定（render.yaml）」セクションに admin サービス定義の説明（LP セクションと同等粒度の表）を追記
- [x] 5.3 同ファイル「将来 admin / reservation を追加する際の手順」を「将来 reservation を追加する際の手順」に書き換え、admin への言及を本変更で完了した旨に整理
- [x] 5.4 `docs/08-移行/01-環境戦略・本番リリース計画.md` §0 現状サマリの admin 行を「Render デプロイ済（#139 で追加）」へ更新
- [x] 5.5 同ファイル §4 事前準備の admin 関連項目を完了状態に整理（reservation のみ残)
- [x] 5.6 同ファイル §7「Render Preview の動作条件」を更新: admin の Preview が動くようになった旨を反映し、表の「`apps/admin` のみを変更」行を ✅ Preview 生成に書き換え。「解消タイミング」セクションは reservation のみ残す
- [x] 5.7 同ファイル §8 関連 Issue で #139 を Done にマーク

## 6. ローカル最終検証

- [x] 6.1 `pnpm exec vitest run` で全テストが緑（admin 既存テストを含む）
- [x] 6.2 `pnpm --filter @high-q/admin build` が成功
- [x] 6.3 `pnpm --filter @high-q/lp build` が成功（LP 設定無変更の回帰確認）
- [x] 6.4 `git diff render.yaml` を読み返し、変更が「admin ブロック追加 + 末尾 admin 雛形削除」のみであることを最終確認

## 7. PR 作成 + レビュー（翔太郎くん）

- [x] 7.1 ブランチ `feature/139-render-admin-deploy` で PR 作成（CI 全パス必須） — PR #221
- [x] 7.2 ~~PR Preview で admin URL を確認~~ → **本 PR では構造的に Preview 不可**: (a) LP は `rootDir: apps/lp` フィルタで LP 配下無変更の本 PR は LP Preview も生成されない、(b) admin は本 PR で初めて services に追加されるため Render Blueprint Instance がマージ後の Re-sync まで認識しない。**検証は CI 緑 + コードレビューのみ**で行い、本番動作確認は §8 のマージ後 Dashboard 操作後に実施する

## 8. マージ後の Render Dashboard / Supabase 操作（翔太郎くん手動）

> このセクションは `/opsx-ship` の merge 直後に翔太郎くんが Dashboard で実行する。レム作業範囲外。

- [ ] 8.1 Render Dashboard で Blueprint Instance Re-sync を実行し、新規 admin サービスが作成されることを確認
- [ ] 8.2 admin サービスの env var で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` に **prd Supabase の値**を投入
- [ ] 8.3 LP (`high-q-volleyball`) の env var が変更されていないことを確認
- [ ] 8.4 Supabase prd プロジェクトの Auth → Redirect URLs に admin 本番ドメイン（例: `https://high-q-admin.onrender.com/*`）を追加
- [ ] 8.5 admin 本番 URL が 200 を返し、未認証アクセスで `/login` にリダイレクトされること、認証後に管理画面が表示されることを確認
- [ ] 8.6 admin 本番から会員一覧などの読み込みが prd データで動作することを確認

## 9. 後始末

- [ ] 9.1 Issue #139 をクローズ（`/opsx-ship` が処理）
- [x] 9.2 メモリ `feedback_render_preview_scope.md` の削除は **#140 マージ時にまとめて実施**するため本変更では削除しない（メモには「admin は完了、reservation 残」と注記を更新する程度に留める）
