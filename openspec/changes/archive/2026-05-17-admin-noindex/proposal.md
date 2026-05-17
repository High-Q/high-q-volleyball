## Why

admin（管理画面）は会員情報・本人確認書類・予約データなど機微情報を扱う非公開アプリだが、現状は検索エンジンのクロール対象から除外する明示的な指示がない。Google / Bing 等にインデックスされると、ログイン画面の存在やルーティング構造が外部から発見可能となり、攻撃面を広げる。Supabase Auth ゲートで実データは保護されているが、admin の URL 自体を検索結果に露出させないことが追加の防御層として必要。reservation / LP（公開サイト）には影響させず、admin のみを対象とする。

## What Changes

- admin の本番および PR Preview の HTTP レスポンスに `X-Robots-Tag: noindex, nofollow` ヘッダーを付与する（Render Static Site の `headers` 設定）
- admin の `apps/admin/index.html` に `<meta name="robots" content="noindex, nofollow" />` を追加する（クライアントレンダリング後も指示が残る防御層）
- admin の公開パスに `robots.txt`（全 User-Agent に対し全パス Disallow）を配備する
- 3 層（HTTP ヘッダー / meta タグ / robots.txt）を併用することで、各クローラ実装の差異・ロボットがメタを読まないケース・ヘッダーをサポートしないケースに対する多層防御を構成する
- LP / reservation には変更を加えない（公開サイトとして検索流入が必要）

## Capabilities

### New Capabilities
（なし）

### Modified Capabilities
- `render-deployment`: admin サービスに対して検索エンジンインデックス拒否を要求する Requirement を追加（HTTP ヘッダー / meta / robots.txt の 3 層、LP / reservation に対称要件は適用しない）

## Impact

- `render.yaml`: admin サービスへ `headers` セクション追加
- `apps/admin/index.html`: robots meta タグ追加
- `apps/admin/public/robots.txt`: 新規追加（現状 `apps/admin/public/` 自体が存在しないので併せて作成）
- 公開サイト（LP / reservation）には一切影響しない
- 既存 Supabase Auth ゲートや RLS には変更なし（追加の防御層）
