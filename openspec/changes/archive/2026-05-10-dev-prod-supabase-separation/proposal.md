## Why

商用ローンチに向けて、Supabase プロジェクトを **dev 1 個運用** から **dev / prd 2 個運用** に分離する。現状は dev も prd も同一プロジェクトを共用しており、商用公開後に試験データを投入すると本番データを汚し、逆に本番リリース時にオールクリーンアップすれば以後の開発で試験データが入れられなくなるという二律背反が生じる。MVP1 機能が完成した今、admin/reservation の Render Service 追加 (#139 / #140) よりも前に prd プロジェクトを準備しておくことで、Render env の `previewValue` 構造が初回設定から正しく整い、本番=dev に書き込む過渡期を発生させない。

## What Changes

- Supabase の **prd プロジェクトを新規作成**し、既存プロジェクトを dev として継続運用する 2 プロジェクト体制に移行する
- prd プロジェクトに対して **既存 migration を全件適用**し、dev とスキーマ同等の空 DB を構築する
- prd プロジェクトに **Storage バケット / RLS / 認証メール SMTP / 5 会場 seed データ** を再現する
- **Render env var の dev/prd 切替設計**（`value: 本番値 / previewValue: dev 値` の `envVars` 構造）を render.yaml の admin / reservation 雛形コメントに反映する
- **#184 マージ以降の運用ルール**（新規 migration は dev push と同セッションで prd にも push、スキーマドリフト禁止）を docs / spec に明文化する
- spec / docs の **環境変数キー名表記揺れ**（旧 `VITE_SUPABASE_ANON_KEY` ↔ 新 `VITE_SUPABASE_PUBLISHABLE_KEY`）を新形式に統一する
- 翔太郎くんが prd の URL/Key を所有・管理し、Claude には共有しないセキュリティ前提を spec に明記する

## Capabilities

### New Capabilities
（新規 capability なし）

### Modified Capabilities
- `supabase-foundation`: 単一プロジェクト前提から dev / prd 2 プロジェクト前提に変更し、prd プロジェクト作成・migration 同期・Storage / 認証メール / seed の再現要件を追加する
- `env-management`: dev / prd で `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` の値が異なる前提を追加し、Render `envVars.value` / `envVars.previewValue` による切替を要件化する。表記揺れも新形式 Publishable Key に統一する
- `render-deployment`: admin / reservation サービス雛形（render.yaml 末尾コメント）に dev/prd 切替の `envVars` 構造を反映し、#139 / #140 着手時に `previewValue` 設定が漏れない構造にする

## Impact

- **Supabase**: prd プロジェクトが新規作成される（Free プラン 2 個目、追加コスト 0）。dev プロジェクトは継続使用
- **migration 運用**: 以後、新規 migration は dev / prd 両方に手動 push する運用ルールが追加される。スキーマドリフト時の検出方法も併せて整備
- **render.yaml**: admin / reservation の雛形コメントブロックを更新（#139 / #140 着手時にコメント解除するだけで正しい envVars 構造が立ち上がる状態にする）
- **docs/03-アーキテクチャ/03-インフラ・CICD構成.md**: 環境変数管理セクションに dev/prd 分離前提を追記、表記揺れ修正
- **docs/08-移行/01-環境戦略・本番リリース計画.md**: 表記揺れ修正、現状サマリ表の Phase 進行を最新化、prd 作成完了後の状態を反映
- **コードへの影響なし**: アプリ側 `shared/api/supabase.ts` は環境変数を読むだけで dev/prd を判別しない（透過的に切替わる）
- **#139 / #140 への前提整備**: 本 change マージ後、admin / reservation の Render Service 追加時に prd 値を即設定可能となる
- **セキュリティ**: 翔太郎くんが prd URL / Publishable Key / Secret Key を Supabase Dashboard で所有・管理。Claude には共有しない。コード / Issue / コメントへの値ペースト禁止
