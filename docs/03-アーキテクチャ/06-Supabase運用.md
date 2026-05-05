# Supabase 運用ガイド

## 概要

本プロジェクトは Supabase (Auth / PostgreSQL / Storage) を共通バックエンドとして利用する。Phase 1 は dev プロジェクト 1 つの運用、Phase 2 で dev / prd を分離する計画。

DB スキーマは `supabase/migrations/` に SQL ファイルとして管理し、Supabase CLI 経由で dev DB に適用する。

## 前提

- Node.js 22 系 / pnpm 10 系がインストール済み
- 翔太郎くん (PO 兼開発者) のみが dev Supabase へのアクセス権を持つ

## CLI セットアップ (初回のみ)

CLI 本体はリポジトリの devDependency として固定済み。初回セットアップは以下:

```bash
# 1. 依存インストール (リポジトリ初回 clone 後)
pnpm install

# 2. Supabase アカウントにログイン (ブラウザで access token 発行)
pnpm exec supabase login

# 3. 既存 dev プロジェクトと紐付け
#    project-ref は Supabase 管理画面 URL の <project-ref>.supabase.co から取得
pnpm exec supabase link --project-ref <dev-project-ref>
```

`supabase login` の access token はローカルの `~/.supabase/` に保存される。リポジトリに含まれない (秘匿情報なのでコミット禁止)。

`supabase link` 完了後、`supabase/.temp/` 配下にプロジェクト固有ファイルが生成されるが、`supabase/.gitignore` で除外済み。

### 既存 migration の取り込み (本プロジェクト固有・初回のみ)

本プロジェクトは CLI 整備 (Issue #203) 以前の期間、`supabase/migrations/` の SQL を Supabase 管理画面の SQL Editor で直接実行する運用だった。そのため `supabase_migrations.schema_migrations` テーブルに **CLI 管理の適用履歴が記録されていない** 状態でスタートする。

このまま `supabase db push` を実行すると CLI が「全 migration 未適用」と誤認識し、既に適用済の SQL を二重実行しようとしてエラーになる (例: `event_detail_view` の v1 を v3 が動いている DB に `CREATE OR REPLACE` しようとして `cannot drop columns from view` エラー)。

対策として、CLI 整備直後に以下を 1 度だけ実行し、CLI 整備時点で既に適用済だった全 migration を `repair` で「適用済」マークする:

```bash
# CLI 整備時点 (2026-05-06) で既に dev 適用済だった migration 群
pnpm exec supabase migration repair --status applied 20260426000000
pnpm exec supabase migration repair --status applied 20260428143738
pnpm exec supabase migration repair --status applied 20260429000000
pnpm exec supabase migration repair --status applied 20260430120000
pnpm exec supabase migration repair --status applied 20260501210240
pnpm exec supabase migration repair --status applied 20260502165034
pnpm exec supabase migration repair --status applied 20260502172040
pnpm exec supabase migration repair --status applied 20260504231456
pnpm exec supabase migration repair --status applied 20260505030613
```

その後 `pnpm exec supabase migration list` で「Local + Remote 両方」表示になっていれば成功。以降は `pnpm db:push` で新規 migration のみが流れる正常運用に入れる。

> ⚠️ 本手順は 1 つの Supabase プロジェクトに対して 1 度だけ実行する。CI / 別開発者の手元では `git pull` 後に `supabase link` するだけで `schema_migrations` テーブルが共有されるため、再 repair は不要。

## 日常運用

### 新規 migration の追加

新規 SQL ファイルを `supabase/migrations/<YYYYMMDDHHMMSS>_<description>.sql` の命名で追加する。タイムスタンプは UTC で生成:

```bash
date -u +"%Y%m%d%H%M%S"
```

### dev DB への適用

未適用 migration を dev に push:

```bash
pnpm db:push
# = pnpm exec supabase db push
```

CLI が `supabase_migrations.schema_migrations` を見て差分のみ適用するため、同じ migration が二重実行される心配はない。

### 差分確認

ローカルの migration と dev DB のスキーマ差分:

```bash
pnpm db:diff
# = pnpm exec supabase db diff
```

### 適用済 migration 一覧

```bash
pnpm exec supabase migration list
```

## 注意事項

- **`.env` は読まない・コミットしない**。CLI の認証は `supabase login` 経由のみ使用する
- **本番 (prd) DB への適用は本ガイドの対象外**。Phase 2 で本番プロジェクト作成後、`docs/08-移行/01-環境戦略・本番リリース計画.md` を参照のうえ別ガイドで運用する
- **Migration は append-only**。既に適用済みの migration ファイルは編集せず、新規 migration で UPDATE / ALTER する形で修正する (再適用時の整合性のため)
  - 例外: 既適用内容と「結果として同じ」修正 (typo / 末尾整形 等) は元ファイル編集も許容する。今回 dev に適用する分は新規 migration が真の更新源
- **Migration 適用時のロック影響**: dev は実運用ユーザーがいないため気にしないが、Phase 2 以降の本番では深夜帯運用 / メンテ告知が必要

## 関連 Issue / PR

- Issue #203 / PR #202 — 本ガイド初版整備
- Issue #166 — 共通基盤を整える Epic
