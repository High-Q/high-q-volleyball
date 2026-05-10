> 凡例: 🧑 = 翔太郎くん作業 (Dashboard / 本人メール受信) / 🌸 = レム作業 (CLI / ファイル編集)

## 1. Apply 開始前の事前確認

- [x] 1.1 🧑 既存 Supabase プロジェクトの URL / Publishable Key が `.env.local` で動作していることを確認（dev として継続使用するため）
- [x] 1.2 🧑 Supabase Dashboard で **Free プラン枠の空き** が 1 つあることを確認（2 active project まで作成可能）
- [x] 1.3 🧑 Gmail SMTP の認証情報（`docs/06-品質・セキュリティ/10-メール送信設定SOP.md` Phase 1 で使用したもの）を所有していることを確認
- [x] 1.4 🌸 ローカルの `supabase` CLI が dev プロジェクトに `link` 済であることを確認（`pnpm exec supabase projects list` で確認 → `high-q-dev` (ref: `ydkejnlivlzypizrmhwh`) に LINKED）

## 2. dev プロジェクトのリネーム（Dashboard）

- [x] 2.1 🧑 Supabase Dashboard で既存プロジェクトを `high-q-dev` にリネーム（URL / API Key には影響なし）
- [x] 2.2 🌸 リネーム後、`pnpm exec supabase projects list` で `high-q-dev` 表示を確認（接続情報は不変、ref も同一）

## 3. prd プロジェクト作成（Dashboard）

- [x] 3.1 🧑 Supabase Dashboard で新規プロジェクト `high-q-prd` を ap-northeast-1（東京）リージョンで作成（**実体名は `high-q-prd`**、当初 spec の `high-q-prod` から変更）
- [x] 3.2 🧑 prd プロジェクトのデータベースパスワードを 1Password 等で安全に管理（レムには共有しない）
- [x] 3.3 🧑 prd プロジェクトの **URL**（`https://kexjtqntbcetpqxpjysj.supabase.co`）と **Publishable Key**（`sb_publishable_xxx` 形式）をレムに共有
- [x] 3.4 🧑 prd プロジェクトの **Secret Key**（`sbs_xxx`）は 1Password 等で本人のみ所有（レムには共有しない）

## 4. prd プロジェクトへの migration 適用（CLI）

- [x] 4.1 🌸 `pnpm exec supabase projects list` で確認 → dev (`high-q-dev`) に LINKED 済
- [x] 4.2 🧑 `pnpm exec supabase link --project-ref kexjtqntbcetpqxpjysj` を翔太郎くんが実行（DB password プロンプト入力）→ prd へ切替完了
- [x] 4.3 🌸 `echo "y" | pnpm exec supabase db push` を実行 → 12 migration 全件適用完了（NOTICE はすべて冪等な DROP IF EXISTS スキップ）
- [x] 4.4 🌸 REST API で venues 5 行を確認:
   - 亀戸 / 東砂 / 深川 / 深川北 (default_fee=1000) + 有明会場 (is_primary=true, default_fee=500)
   - RLS: `venues_select_public` ポリシーが効いて Publishable Key で SELECT 成功
   - Storage バケット / 他テーブルの空確認は **🧑 翔太郎くんが Dashboard で確認** (Table Editor / Storage タブ)
- [x] 4.5 🌸 `pnpm exec supabase link --project-ref ydkejnlivlzypizrmhwh` で dev に戻し完了（DB password はキャッシュ済で非対話的に成功）
- [x] 4.6 🌸 `pnpm exec supabase projects list` で dev に LINKED 戻し確認

## 5. prd プロジェクトの Auth 設定（Dashboard）

- [x] 5.1 🧑 prd プロジェクトの Auth → SMTP に Gmail SMTP credential を入力（**prd 専用 App Password を新規発行して設定**。dev とは別 credential で運用）
- [x] 5.2 🧑 Auth → URL Configuration → Redirect URLs に `http://localhost:5173/*` / `http://localhost:5174/*` 登録（本番ドメインは #139/#140 で再設定）
- [x] 5.3 🧑 Auth → Email Templates 確認、テストユーザー削除で auth.users を空に戻し済

## 6. render.yaml の admin / reservation 雛形コメント更新（編集）

- [x] 6.1 🌸 `render.yaml` 末尾の admin 雛形コメントを更新し、`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を `sync: false` + `previewValue` の 2 段構造で記載
- [x] 6.2 🌸 reservation 雛形は admin と同形式と明記（#140 で reservation 用に name/rootDir/--filter 置換のみ）
- [x] 6.3 🌸 `previewValue` 行は `<dev-project-ref>` / `<dev-publishable-key>` プレースホルダで記述、#139/#140 着手時に実値に置換する旨を併記
- [x] 6.4 🌸 雛形コメント先頭のチェックリスト 6 番目に「dev/prd 切替の envVars 構造は #184 で確立済」を追記、加えて切替方針の説明ブロックを追加

## 7. docs 更新（編集）

- [x] 7.1 🌸 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` の「環境変数管理」セクションを dev/prd 2 プロジェクト前提に全面書き換え（`VITE_SUPABASE_PUBLISHABLE_KEY` 表記に統一）
- [x] 7.2 🌸 同 docs に「migration の dev / prd 同期運用ルール」を追記（dev push 後に必ず prd push、ドリフト禁止 + 手順例）
- [x] 7.3 🌸 `docs/08-移行/01-環境戦略・本番リリース計画.md` の §0 現状サマリ表を 2026-05-10 時点の dev/prd 2 個運用状態に更新
- [x] 7.4 🌸 同 docs §3.1 / §3.2 / §3.3 の `VITE_SUPABASE_ANON_KEY` 旧表記を `VITE_SUPABASE_PUBLISHABLE_KEY` に一括置換（注意ブロックも更新）
- [x] 7.5 🌸 同 docs §4.1 「事前準備 (Phase 1)」を #184 完了部分 ✅ + #139/#140 残部分 ⏳ で書き換え
- [x] 7.6 🌸 同 docs §8 の「(未番) Phase 1 prd Supabase プロジェクト作成」を「**#184** … ✅ Done」に置換 + 改訂履歴に 2026-05-10 行追加

## 8. 表記揺れの一括チェック（編集）

- [x] 8.1 🌸 docs / 設定ファイルからの旧表記 `VITE_SUPABASE_ANON_KEY` 一括置換完了（残存ヒットは本 change 自身の説明文引用のみ）
- [x] 8.2 🌸 archive 配下のヒットは履歴保全のため変更しない
- [x] 8.3 🌸 grep で確認: docs / コード / render.yaml からは消滅、本 change 内の引用文脈のみ残存（spec 違反ではない、旧名解説のため）
- [ ] 8.4 🧑 `.env.example`（root）に `VITE_SUPABASE_ANON_KEY` が残っていないか確認、あれば `VITE_SUPABASE_PUBLISHABLE_KEY` に置換（CLAUDE.md セキュリティルールでレム触れないため翔太郎くん作業）

## 9. 検証（最終確認）

- [x] 9.1 🧑 prd プロジェクトの Send invite で Gmail SMTP 経由でメール受信成功（535 BadCredentials エラーは prd 専用 App Password 新規発行で解消）
- [x] 9.2 🧑 dev / prd 隔離確認: dev でのマジックリンク送信が prd auth.users に影響しないことを Dashboard で確認
- [x] 9.3 🧑 ローカル `.env.local` が dev プロジェクト (`ydkejnlivlzypizrmhwh`) を指していることを最終確認
- [x] 9.4 🧑 prd URL / Publishable Key / Secret Key / DB password / Gmail App Password を 1Password で所有確認

## 10. PR 作成・最終確認（出荷準備）

- [x] 10.1 🌸 変更ファイル: `render.yaml` / `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` / `docs/08-移行/01-環境戦略・本番リリース計画.md` / `openspec/changes/dev-prod-supabase-separation/*`（アプリコード変更なし）
- [x] 10.2 🌸 `apps/lp` 変更なし → Render Preview 生成なし（memory `feedback_render_preview_scope.md` 準拠）
- [x] 10.3 🌸 PR description で「prd 構築は Dashboard/CLI で完了済、Render Service 切替は #139/#140 で実施」を明記
- [x] 10.4 🌸 PR description に **太字で**「マージ後の運用ルール: 新規 migration は dev push と同セッションで prd push 必須」を明記
