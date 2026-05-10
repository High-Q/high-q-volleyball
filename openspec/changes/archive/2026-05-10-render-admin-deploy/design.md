## Context

LP のみが Render Static Site にデプロイ済の現状から、admin を services 配列に追加するインフラ変更。admin 側は #84-87 系で Supabase Auth ゲート（`registerAuthGuard`）と最低限の管理機能が完成しており、商用公開ガバナンス（`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`「未完成アプリの商用公開禁止」）の前提条件は満たしている。

Render Blueprint mode の真実の源は `render.yaml`。#184 で末尾雛形コメントは dev/prd 切替構造（`sync:false` + `previewValue`）に整備済で、本変更は雛形を `services` 配列へ「移すだけ」の最小差分が原則。dev 値の埋め込み（`previewValue`）と、ドキュメント側のステータス更新（`Phase 1 移行中` → `Phase 1 完了`の admin 行）が同梱範囲。

PR Preview の dev/prd 動作は #184 のテストケースで原理的に検証済（reservation 雛形を services に移しただけで Preview が dev に向く）。本変更で admin に同じ構造を適用するため、原理的な検証は不要だが、マージ後に Render Dashboard 側の Blueprint Re-sync・本番 env 値投入・Auth Redirect URLs 更新が必要。

## Goals / Non-Goals

**Goals:**
- admin が master マージで本番デプロイされ、PR ごとに Preview URL が自動生成される状態を作る
- PR Preview は dev Supabase に、本番 admin は prd Supabase に向く dev/prd 切替構造を成立させる
- LP の既存サービス設定を一切変更しない
- ドキュメント・spec をデプロイ済状態へ同期し、`feedback_render_preview_scope.md` の「LP のみ言及 OK」運用ルールから admin を外せる土台を作る（メモリ削除は #140 マージ時にまとめて実施）

**Non-Goals:**
- reservation のデプロイ（#140 で別途）
- Supabase migrations の自動適用 CI（Phase 3 別 Issue）
- 本番 admin URL の独自ドメイン化（Phase 3）
- Auth Redirect URLs の最終確定（独自ドメイン取得時に再調整）

## Decisions

### 決定 1: 雛形コメントから services 配列への「移動」とし、構造変更しない

#184 で確立した雛形（`sync:false` + `previewValue` の 2 段構造、`SKIP_INSTALL_DEPS=true`、`autoDeployTrigger: checksPass`、`previews.generation: automatic`、SPA リライト）をそのまま services 配列に移す。LP と完全に同じインフラ規約を踏襲することで、運用知識が一元化され、レビュー負荷も最小化する。

**代替案**: admin だけ独自設定（例: `autoDeployTrigger: commit`）を入れる → 採用しない。LP との差異は障害分析・教育コストを増やすだけで利点がない。

### 決定 2: previewValue は dev プロジェクトの実値を埋める

#184 の雛形では `https://<dev-project-ref>.supabase.co` / `sb_publishable_<dev-publishable-key>` をプレースホルダとして残し、「#139/#140 着手時に実値に置換」と明記してある。本変更で admin 分の実値を埋める。

dev Supabase の URL / Publishable Key は **公開キー** であり RLS で保護されるため、git にコミットして問題ない（`docs/08-移行/01-環境戦略・本番リリース計画.md` §3.2、CLAUDE.md セキュリティルールの「Secret Key は書かない」原則の対象外）。

実値の供給元: 翔太郎くんが Apply 着手時に Supabase Dashboard から取得して提示する（レムは `.env.local` を読まない）。Apply の最初のタスクで「dev プロジェクトの URL / Publishable Key を提示してください」と必ず要請する。

**代替案 A**: 実値を入れず `<dev-project-ref>` プレースホルダのまま services に昇格 → 採用しない。Preview ビルドが失敗するか、Supabase 接続がエラーになり、Preview 制度が機能しない。
**代替案 B**: 全部 `sync:false` で Dashboard 設定にし、`previewValue` は使わない → 採用しない。PR Preview が dev に向かない構造になり、本番 DB を Preview から汚染するリスクが残る。

### 決定 3: 末尾雛形コメントから admin 部分のみ削除し、reservation 部分は残す

`render.yaml` 末尾の admin 雛形ブロックは services に昇格したので削除。reservation 雛形は #140 で同じ手順を踏むため残置。`「将来追加用の雛形」`の見出しコメントは reservation のみ残る形で維持する。

**代替案**: 末尾コメントを完全削除し、#140 で書き戻す → 採用しない。reservation 用の手順書（チェックリスト + dev/prd 切替メモ）が消え、#140 着手時に毎回参照を要する。

### 決定 4: マージ後の Render Dashboard 操作は手動・チェックリスト化

`render.yaml` のマージで Render Blueprint Instance が自動 Re-sync するが、新規サービス用の `sync:false` env var 値（prd Supabase の URL / Publishable Key）は Dashboard で手動投入する必要がある。さらに Supabase Auth → Redirect URLs に admin 本番ドメイン（`https://high-q-admin.onrender.com/*` 等）を追加する必要がある。

これらは Claude Code から実行できないため、tasks.md に「翔太郎くんが Dashboard で実行する操作チェックリスト」として明記し、Apply 内のレム作業範囲外であることを明示する。

**代替案**: prd の URL / Publishable Key も `previewValue` のように `value` でコミット → 採用しない。CLAUDE.md「秘密情報をコードにハードコードしない」「`.env` を読まない」原則と #184 で確立した分離構造を破壊する。

### 決定 5: ドキュメント更新範囲は最小に絞る

更新対象は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`（admin 行をデプロイ済へ）と `docs/08-移行/01-環境戦略・本番リリース計画.md`（§0 サマリ、§7 admin 用の Preview 記述、§8 関連 Issue）。

`feedback_render_preview_scope.md` メモリは admin **と** reservation 両方完了後に削除する運用なので、本変更ではメモリは削除しない（#140 マージ時に削除）。

**代替案**: メモリも今回削除 → 採用しない。reservation のみ変更時の Preview 言及ルールがまだ生きるため、削除すると `feedback_render_preview_scope.md` が指示する自然な切替が失われる。

## Risks / Trade-offs

- **Risk: previewValue に dev 値を埋めた状態で誤って prd の Secret Key を入れてしまう** → Mitigation: PR レビューで `previewValue` 行を全件目視 + grep で `service_role` / `secret` / `sbs_` プレフィックスが含まれないことを確認。Apply タスクに grep 検証ステップを含める
- **Risk: Render Dashboard で本番 env 値投入を忘れたまま master マージ → admin 本番が落ちる** → Mitigation: tasks.md にマージ後 Dashboard チェックリストを明記し、`/opsx-ship` 実行時に翔太郎くんが順番に処理する。マージ即公開ではなく、Dashboard 設定後に admin 本番 URL を 200 確認するゲートを設ける
- **Risk: Supabase Auth Redirect URLs に admin 本番ドメインを追加し忘れる → 認証フローが壊れる** → Mitigation: tasks.md の Dashboard チェックリストに専用項目を立て、admin 本番 URL の認証ジャーニー確認まで完了条件に含める
- **Risk: services への追加で LP の既存設定が予期せず影響を受ける** → Mitigation: LP の `services` ブロックには一切手を入れない。diff レビューで LP 行が変更されていないことを確認するタスクを Apply に含める
- **Risk: PR Preview のビルドが pnpm workspace の依存解決に失敗** → Mitigation: LP と同一の build コマンド (`pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/admin build` + `SKIP_INSTALL_DEPS=true`) を使用。LP で本構造が動作実証済（#84 / #125）

## Migration Plan

1. **PR 作成前ローカル確認**: `pnpm --filter @high-q/admin build` がローカルで成功すること、`apps/admin/dist` に静的アセットが揃うこと
2. **PR レビュー**: render.yaml の diff が「services 追加 + 末尾コメント admin 部分削除」のみで LP 設定無変更、`previewValue` に Secret Key が含まれないこと
3. **マージ → 自動 Re-sync**: `master` マージで Render Blueprint Instance が `render.yaml` を再読込し新サービスを作成
4. **Dashboard 操作（翔太郎くん手動）**:
   - 新規 admin サービスの env var で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` に prd 値を投入
   - Supabase Auth → Redirect URLs に admin 本番ドメインを追加
5. **本番動作確認**: admin 本番 URL が 200 を返し、未認証アクセスで `/login` にリダイレクトされ、認証後に管理画面が表示されること
6. **Rollback**: 問題発生時は revert PR で render.yaml から admin block を削除 → 自動 Re-sync で admin サービスが Render から削除される。LP / reservation 雛形は影響なし
