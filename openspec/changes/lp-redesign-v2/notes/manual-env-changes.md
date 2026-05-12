# 手動 env 追記依頼（翔太郎くん向け）

レムは `.env*` ファイルを編集できないため、本変更で必要な環境変数追記はここに集約します。
PR 提出前に翔太郎くんが手動で追記してください。

## ファイル: `.env.example`（リポジトリルート）

以下を追記してください（既にある場合は確認のみ）：

```
# LP → reservation サイトの遷移先（dev / prd で値を分ける）
VITE_RESERVATION_URL=https://reservation-dev.high-q.tokyo

# LP から Supabase events テーブルを参照するために必要
# admin / reservation で既に運用中の値を流用
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## ファイル: `.env.local`（リポジトリルート）

ローカル開発用に上の 3 つを実値で設定してください。
- `VITE_RESERVATION_URL` … dev 環境の reservation URL（Render の dev サービス URL でも可）
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` … dev Supabase の値（admin / reservation の .env と同じ値を流用）

## Render 環境変数

LP の Render サービス（dev / prd）にも同じ 3 変数を設定してください。
- dev サービス: `VITE_RESERVATION_URL` に dev reservation URL を指定
- prd サービス: `VITE_RESERVATION_URL` に本番 reservation URL を指定

## 参考: AWS 系（撤去予定）

本変更で LP のイベント取得は AWS API Gateway から Supabase に切替えます。
旧 AWS 系の環境変数（あれば）は本 PR では撤去せず、移行完了後の運用判断で別途整理します。
