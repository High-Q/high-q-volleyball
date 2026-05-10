## Context

LP / admin が Render Static Site にデプロイ済の現状から、reservation を services 配列に追加する 3 アプリ目のインフラ変更。reservation 側はマジックリンク認証（`registerAuthGuard` 相当の Supabase Auth 連動ガード）と本人確認書類アップロード・イベント一覧/詳細・予約/キャンセル・予約履歴・プロフィール編集の主要フローが完成しており、商用公開ガバナンス（`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`「未完成アプリの商用公開禁止」）の前提条件を満たしている。

Render Blueprint mode の真実の源は `render.yaml`。#184 で末尾雛形コメントは dev/prd 切替構造（`sync:false` + `previewValue`）に整備済、#139 の admin 昇格で同じパターンが本番運用検証済となっており、本変更は reservation 雛形を `services` 配列へ「移すだけ」の最小差分が原則。dev 値の埋め込み（`previewValue` の実値置換）と、ドキュメント側のステータス更新が同梱範囲。

加えて 3 アプリすべてが Preview 対応となるため、CLAUDE.md / memory `feedback_render_preview_scope.md` の「PR 変更ファイル次第で Render Preview 言及を機械的に切り替える」運用ルールが完全に役目を終える。本変更で同ルールを撤廃する。

PR Preview の dev/prd 動作は #184 / #139 で原理・運用とも検証済。本変更で reservation に同構造を適用するため、原理的な検証は不要だが、マージ後に Render Dashboard 側の Blueprint Re-sync・本番 env 値投入・Auth Redirect URLs 更新が必要。

## Goals / Non-Goals

**Goals:**
- reservation が master マージで本番デプロイされ、PR ごとに Preview URL が自動生成される状態を作る
- PR Preview は dev Supabase に、本番 reservation は prd Supabase に向く dev/prd 切替構造を成立させる
- LP / admin の既存サービス設定を一切変更しない
- ドキュメント・spec をデプロイ済状態へ同期し、Render Preview 言及切替の機械的ルール（CLAUDE.md 注釈 + memory）を撤廃する
- `render.yaml` 末尾の雛形コメントを完全消化（admin / reservation とも services 昇格完了のため雛形そのものが不要）

**Non-Goals:**
- Supabase migrations の自動適用 CI（Phase 3 別 Issue）
- 本番 reservation URL の独自ドメイン化（Phase 3）
- Auth Redirect URLs の最終確定（独自ドメイン取得時に再調整）
- LP / admin の設定見直し（reservation 追加に必要な範囲を超えた変更はしない）

## Decisions

### 決定 1: 雛形コメントから services 配列への「移動」とし、構造は admin と完全対称

#184 で確立し #139 で admin に適用した構造（`sync:false` + `previewValue` の 2 段、`SKIP_INSTALL_DEPS=true`、`autoDeployTrigger: checksPass`、`previews.generation: automatic`、SPA リライト、Node 22）をそのまま reservation の services エントリとして転記する。3 アプリで同一規約を維持することで、運用知識・トラブルシュートの一元化、レビュー負荷最小化を達成する。

**代替案**: reservation だけ独自設定（例: PR Preview 無効化）を入れる → 採用しない。LP / admin との差異は障害分析・教育コストを増やすだけで利点がない。

### 決定 2: previewValue は dev プロジェクトの実値を埋める（admin と同一プロジェクト）

dev Supabase は admin / reservation で **同一プロジェクト**を共有する設計（`docs/08-移行/01-環境戦略・本番リリース計画.md` §3.2）のため、`previewValue` の URL / Publishable Key は admin の `render.yaml` 既存値と同一の値を埋める。

dev Supabase の URL / Publishable Key は **公開キー** であり RLS で保護されるため、git にコミットして問題ない（CLAUDE.md セキュリティルール「Secret Key は書かない」原則の対象外）。

**実値の供給元**: `render.yaml` の admin サービスエントリに既に dev 実値が記載済のため、Apply 時はそれを参照して reservation エントリにコピーする（翔太郎くんへの追加要請は不要）。Apply 最初のタスクで「admin 側の `previewValue` と完全一致しているか」をチェックする。

**代替案 A**: 実値を入れず `<dev-project-ref>` プレースホルダで services に昇格 → 採用しない。Preview ビルドで Supabase 接続が失敗し Preview 制度が機能しない。
**代替案 B**: reservation 用に別の dev プロジェクトを作る → 採用しない。dev は単一プロジェクトを共有する設計（§3.2）の前提を破壊する。

### 決定 3: 末尾雛形コメントを完全削除

`render.yaml` 末尾の reservation 雛形ブロックは services に昇格したので削除。さらに「将来追加用の雛形（reservation）」見出しコメント・「追加時のチェックリスト」・「環境変数の dev/prd 切替方針」コメントブロックも、admin / reservation とも services 昇格完了で雛形そのものが不要となるため一括削除する。

**代替案**: 「環境変数の dev/prd 切替方針」コメントだけは残す → 採用しない。同方針は `docs/08-移行/01-環境戦略・本番リリース計画.md` §3.2 に明記済で、`render.yaml` の各サービスエントリのインラインコメント（`# 本番値 (prd) は Render Dashboard で設定` 等）でも示されているため、雛形コメントとして再掲する必要がない。

### 決定 4: マージ後の Render Dashboard 操作は手動・チェックリスト化（admin と同パターン）

`render.yaml` のマージで Render Blueprint Instance が自動 Re-sync するが、新規サービス用の `sync:false` env var 値（prd Supabase の URL / Publishable Key）は Dashboard で手動投入する必要がある。さらに Supabase Auth → Redirect URLs に reservation 本番ドメイン（`https://high-q-reservation.onrender.com/*` 等）を追加する必要がある。

これらは Claude Code から実行できないため、tasks.md に「翔太郎くんが Dashboard で実行する操作チェックリスト」として明記し、Apply 内のレム作業範囲外であることを明示する。admin (#139) で確立した手順をそのまま踏襲する。

**代替案**: prd の URL / Publishable Key も `previewValue` のように `value` でコミット → 採用しない。CLAUDE.md「秘密情報をコードにハードコードしない」「`.env` を読まない」原則と #184 で確立した分離構造を破壊する。

### 決定 5: Render Preview 言及切替ルールを本変更で完全撤廃

3 アプリすべてが Preview 対応になるため、「PR の変更ファイル次第で Render Preview 言及を機械的に切り替える」運用ルール（CLAUDE.md「Apply 完了報告 / 環境戦略」注釈 + memory `feedback_render_preview_scope.md`）の存在意義が失われる。本変更で同ルールを完全撤廃する:

- CLAUDE.md「Apply 完了報告 / 環境戦略」の `feedback_render_preview_scope.md` 参照行を削除（`#139/#140` マージで本ルール削除予定の注釈どおり）
- memory `feedback_render_preview_scope.md` ファイル自体を削除
- `MEMORY.md` の該当インデックス行を削除

ただし memory `feedback_render_preview_first_pr_caveat.md`（新規 Render サービス追加 PR は Preview 出ない）は **本 PR 自身**にも当てはまるため残置する。

**代替案**: メモリは残し CLAUDE.md だけ更新 → 採用しない。CLAUDE.md からの参照を切ったメモリは孤児となり、将来の混乱の元になる。撤廃するなら同時に行う。

### 決定 6: ドキュメント更新範囲は admin (#139) と対称

更新対象は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`（reservation 行をデプロイ済へ、「将来 reservation を追加する際の手順」セクションを「3 アプリすべて完了」の歴史記述へ書き換えまたは削除）と `docs/08-移行/01-環境戦略・本番リリース計画.md`（§0 サマリ、§4 事前準備、§7 reservation 用の Preview 記述、§7「解消タイミング」セクション削除、§8 関連 Issue で #140 を Done）。

CLAUDE.md は決定 5 のとおり Render Preview 言及切替ルールの撤廃のみ実施。

**代替案**: ドキュメントは sync フェーズに後回し → 採用しない。プロジェクト規約上 sync は spec / docs を実装内容に追従させる工程で、本変更は「完了状態への切替」自体が変更主旨のためドキュメント更新は本 Apply で完結させる。

## Risks / Trade-offs

- **Risk: previewValue に dev 値を埋めた状態で誤って prd の Secret Key を入れてしまう** → Mitigation: PR レビューで `previewValue` 行を全件目視 + grep で `service_role` / `secret` / `sbs_` プレフィックスが含まれないことを確認。Apply タスクに grep 検証ステップを含める（admin で確立済の手順を踏襲）
- **Risk: Render Dashboard で本番 env 値投入を忘れたまま master マージ → reservation 本番が落ちる** → Mitigation: tasks.md にマージ後 Dashboard チェックリストを明記し、`/opsx-ship` 実行時に翔太郎くんが順番に処理する。マージ即公開ではなく、Dashboard 設定後に reservation 本番 URL を 200 確認するゲートを設ける
- **Risk: Supabase Auth Redirect URLs に reservation 本番ドメインを追加し忘れる → マジックリンク認証フローが壊れる** → Mitigation: tasks.md の Dashboard チェックリストに専用項目を立て、reservation 本番 URL の認証ジャーニー（マジックリンク受信 → コールバック）確認まで完了条件に含める
- **Risk: services への追加で LP / admin の既存設定が予期せず影響を受ける** → Mitigation: LP / admin の `services` ブロックには一切手を入れない。diff レビューで該当行が変更されていないことを確認するタスクを Apply に含める
- **Risk: PR Preview のビルドが pnpm workspace の依存解決に失敗** → Mitigation: LP / admin と同一の build コマンド (`pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/reservation build` + `SKIP_INSTALL_DEPS=true`) を使用。LP / admin で本構造が動作実証済（#84 / #125 / #139）
- **Risk: 公開判断が不十分なまま reservation を商用公開してしまう** → Mitigation: PR レビューで翔太郎くんが「公開して問題ない状態か」（UI / コンテンツ / 利用規約 / 主要フロー成立性）を明示確認するゲートを Issue 完了条件・tasks.md に明記
- **Risk: 本 PR 自身は Render Preview が出ない（services 配列への新規追加 PR の構造的制約）** → Mitigation: memory `feedback_render_preview_first_pr_caveat.md` のとおり Preview 検証ステップは tasks.md に書かない。CI 緑 + コードレビューのみで進め、本番動作確認はマージ後 Dashboard 操作完了後に実施

## Migration Plan

1. **PR 作成前ローカル確認**: `pnpm --filter @high-q/reservation build` がローカルで成功すること、`apps/reservation/dist` に静的アセットが揃うこと
2. **PR レビュー**: render.yaml の diff が「reservation services 追加 + 末尾雛形コメント完全削除」のみで LP / admin 設定無変更、`previewValue` に Secret Key が含まれないこと、reservation 主要フローが「公開して問題ない状態」であること
3. **マージ → 自動 Re-sync**: `master` マージで Render Blueprint Instance が `render.yaml` を再読込し新サービスを作成
4. **Dashboard 操作（翔太郎くん手動）**:
   - 新規 reservation サービスの env var で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` に prd 値を投入
   - Supabase Auth → Redirect URLs に reservation 本番ドメインを追加
5. **本番動作確認**: reservation 本番 URL が 200 を返し、未認証アクセスで `/login` にリダイレクトされ、マジックリンク認証後に予約フローが動作すること、LP / admin 本番が無影響であること
6. **Rollback**: 問題発生時は revert PR で render.yaml から reservation block を削除 → 自動 Re-sync で reservation サービスが Render から削除される。LP / admin は影響なし
