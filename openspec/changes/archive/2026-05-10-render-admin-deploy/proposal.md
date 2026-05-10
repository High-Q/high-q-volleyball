## Why

admin の認証ゲートと最低限の管理機能が実装済みになり、商用公開ガバナンスの前提条件を満たした。LP のみが Render Static Site にデプロイされている現状から、admin を services 配列に追加することで、master マージで本番 admin URL が立ち上がり、PR ごとに admin 用 Preview URL が自動生成される運用へ移行する。

これに付随して #184 で確立した dev / prd 切替構造（本番値は Dashboard、PR Preview は dev 値）を admin に正式適用し、PR Preview が本番 Supabase を汚さない安全構造を完成させる。

## What Changes

- `render.yaml` 末尾の admin 雛形コメントを `services` 配列へ正式に追加
- admin サービスの `envVars` で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を「sync:false（本番）+ previewValue（dev）」の 2 段構造で定義
- `render.yaml` 末尾コメントから admin 雛形ブロックを削除（reservation 雛形は #140 用に残す）
- インフラドキュメント（`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`）の admin 行をデプロイ済へ更新
- 環境戦略ドキュメント（`docs/08-移行/01-環境戦略・本番リリース計画.md`）§0 サマリと §7 Render Preview 動作条件を admin デプロイ完了状態に更新
- マージ後ガバナンス: Render Dashboard で Blueprint Re-sync → 本番 Supabase 値の手動投入 → Auth Redirect URLs に admin 本番ドメインを追加（手順は tasks.md に Dashboard 操作チェックリストとして記述）

## Capabilities

### New Capabilities

なし（既存 capability への変更のみ）。

### Modified Capabilities

- `render-deployment`: 「現状デプロイ対象は LP のみ」という前提が崩れる。admin が `services` 配列の正式メンバーとなり、admin 用 dev/prd 切替構造が雛形コメントから実定義へ昇格する。Requirement「admin / reservation 雛形コメントは dev/prd 切替構造を含む」は reservation 部分のみ残す形に縮小し、admin に対しては「admin サービスが services 配列に存在し dev/prd 切替構造を持つ」という新規 Requirement を追加する。

## Impact

- **コード**: `render.yaml`（services 配列への追加 + 雛形コメントから admin ブロック削除）
- **ドキュメント**: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` / `docs/08-移行/01-環境戦略・本番リリース計画.md`
- **仕様**: `openspec/specs/render-deployment/spec.md`（admin デプロイ済を反映する delta）
- **運用 / Dashboard**: マージ後に翔太郎くんが Render Dashboard で本番 Supabase 値（prd の URL / Publishable Key）を手動設定。Supabase Auth → Redirect URLs に admin 本番ドメインを追加
- **未影響**: LP の既存サービス設定（`high-q-volleyball`）は一切変更しない。reservation 雛形（#140 で使用）も残す
- **依存解消**: マージ後、admin の PR Preview が自動生成されるようになり、CLAUDE.md / `feedback_render_preview_scope.md` の「LP のみ言及 OK」運用ルールから admin が外れる
