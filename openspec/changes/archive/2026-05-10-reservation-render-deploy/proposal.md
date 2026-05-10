## Why

reservation アプリは予約フロー一式（マジックリンク認証・本人確認書類アップロード・イベント一覧/詳細・予約/キャンセル・予約履歴・プロフィール）が実装済みになり、商用公開ガバナンスの前提条件を満たした。LP / admin が Render Static Site にデプロイ済の現状から reservation を services 配列に追加することで、master マージで本番 reservation URL が立ち上がり、PR ごとに reservation 用 Preview URL が自動生成される運用へ移行する。

これに付随して #184 で確立し #139 で admin に適用済の dev / prd 切替構造（本番値は Dashboard、PR Preview は dev 値）を reservation にも正式適用し、3 アプリすべてで PR Preview が本番 Supabase を汚さない安全構造を完成させる。本変更で `render.yaml` 末尾の雛形コメントは完全に消化され、CLAUDE.md と memory `feedback_render_preview_scope.md` の Render Preview 言及切替ルールも撤廃可能になる。

## What Changes

- `render.yaml` 末尾の reservation 雛形コメントを `services` 配列へ正式に追加
- reservation サービスの `envVars` で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` を「sync:false（本番）+ previewValue（dev）」の 2 段構造で定義
- `render.yaml` 末尾の「将来追加用の雛形（reservation）」コメントブロックを削除（admin / reservation とも services 昇格完了のため雛形そのものが不要）
- インフラドキュメント（`docs/03-アーキテクチャ/03-インフラ・CICD構成.md`）の reservation 行をデプロイ済へ更新、「将来 reservation を追加する際の手順」を削除
- 環境戦略ドキュメント（`docs/08-移行/01-環境戦略・本番リリース計画.md`）§0 サマリ・§4 事前準備・§7 Render Preview 動作条件・§8 関連 Issue を reservation デプロイ完了状態に更新（reservation 行を ✅ Preview 生成へ、解消タイミングセクションを削除）
- CLAUDE.md「Apply 完了報告 / 環境戦略」の Render Preview 言及切替ルール（`feedback_render_preview_scope.md` 参照行）を撤廃
- memory `feedback_render_preview_scope.md` を削除（3 アプリすべてが Preview 対応になり機械的切替が不要）
- マージ後ガバナンス: Render Dashboard で Blueprint Re-sync → 本番 Supabase 値の手動投入 → Auth Redirect URLs に reservation 本番ドメインを追加（手順は tasks.md に Dashboard 操作チェックリストとして記述）

## Capabilities

### New Capabilities

なし（既存 capability への変更のみ）。

### Modified Capabilities

- `render-deployment`: 「reservation 雛形コメントは dev/prd 切替構造を含む」という Requirement が役目を終える。reservation が `services` 配列の正式メンバーとなり、reservation 用 dev/prd 切替構造が雛形コメントから実定義へ昇格する。雛形コメント関連 Requirement は削除し、「reservation サービスが services 配列に存在し dev/prd 切替構造を持つ」という新規 Requirement を追加する。

## Impact

- **コード**: `render.yaml`（services 配列への追加 + 末尾雛形コメント削除）
- **ドキュメント**: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` / `docs/08-移行/01-環境戦略・本番リリース計画.md` / `CLAUDE.md`
- **仕様**: `openspec/specs/render-deployment/spec.md`（reservation デプロイ済を反映する delta、雛形 Requirement 削除）
- **メモリ**: `feedback_render_preview_scope.md` 削除 + `MEMORY.md` の該当行削除
- **運用 / Dashboard**: マージ後に翔太郎くんが Render Dashboard で本番 Supabase 値（prd の URL / Publishable Key）を手動設定。Supabase Auth → Redirect URLs に reservation 本番ドメインを追加
- **未影響**: LP の既存サービス設定（`high-q-volleyball`）と admin の既存サービス設定（`high-q-admin`）は一切変更しない
- **依存解消**: マージ後、3 アプリすべての PR Preview が自動生成される状態が完成し、Render Preview 言及の機械的切替ルールが完全撤廃される
