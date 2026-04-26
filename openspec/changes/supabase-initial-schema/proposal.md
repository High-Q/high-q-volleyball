# Proposal: Supabase 初期セットアップとスキーマ設計

## Why

Phase 1 で着手する管理画面（apps/admin）と予約サイト（apps/reservation）の共通バックエンドとして Supabase を新規セットアップする必要がある。両アプリは Supabase Auth による認証、PostgreSQL によるデータ永続化、RLS によるアクセス制御を前提に設計されているが、現時点ではプロジェクト自体が存在せず後続の Issue (#84 管理者ログイン / #89 会員登録 / #85-90 各機能) がすべてブロックされている。

Phase 1 リリース目標 2026-05-08 に間に合わせるため、本 change で **Supabase プロジェクトの作成・初期テーブル設計・RLS の基本ポリシー・接続情報の管理方針** を確立する。

## What Changes

- **NEW** Supabase プロジェクトを `ap-northeast-1` リージョンで新規作成（無料枠）
- **NEW** 初期テーブル 3 つを定義: `events` / `members` / `reservations`
- **NEW** Row Level Security（RLS）ポリシーの基本セット（events: 公開読み取り、members: 自分の行のみ、reservations: 自分の予約 + 管理者全件）
- **NEW** Supabase Auth（Email + Password）を有効化、`auth.users` と `members` テーブルを 1:1 で紐付け
- **NEW** SQL Migration ファイルをリポジトリに格納（`supabase/migrations/` ディレクトリ）
- **NEW** Branded Types で `EventId` / `MemberId` / `ReservationId` を定義、生の string を直接使用させない
- **NEW** Supabase client を `packages/shared/src/api/` に配置するクロスアプリ shared パッケージの初期化
- **NEW** 環境変数管理方針: `SUPABASE_URL` と `SUPABASE_ANON_KEY` は Render 各サービスの env vars + ローカル `.env.local`（git 管理外）。`service_role` キーはサーバー用途でのみ使用（Phase 1 では未使用、admin 専用 server-side が必要になった時点で導入）
- **NEW** **画像・ストレージ・本人確認書類は Phase 1 では扱わない**（Issue #92 priority:medium で別途対応）
- **NEW** Phase 1 では LP 既存の AWS API Gateway + DynamoDB は触らない（移行は別 change で）

## Capabilities

### New Capabilities

- `supabase-foundation`: Supabase プロジェクトの構成・接続規約・環境変数管理・Branded Types による ID 安全性
- `data-schema`: events / members / reservations テーブルの構造とリレーション、Branded Types との対応
- `rls-policies`: RLS ポリシーの方針（公開読み取り / 自分の行のみ / 管理者全件）と実装パターン

### Modified Capabilities

なし（新規構築のみ）

## Impact

### 影響を受けるコード・ファイル

- `packages/shared/`（新規）: Supabase client、Branded Types、Result 型、共通スキーマ定義
- `apps/admin/`（未開発）: ここに着手するための前提となる
- `apps/reservation/`（未開発）: 同上
- `supabase/migrations/`（新規ディレクトリ）: SQL マイグレーションファイル
- `.gitignore`: `.env.local` の除外を追加
- Render 設定: admin / reservation サービス追加時に `SUPABASE_URL` / `SUPABASE_ANON_KEY` の env vars を設定

### 依存関係

- 後続 Issue #84 (管理者ログイン), #89 (会員登録) はこの change の完了が前提
- Phase 1 の他の Admin / Reservation Issue (#85-90) はすべて間接的にこの change に依存

### システム

- Supabase 無料枠（500MB DB / 1GB Storage / 50,000 MAU）。Phase 1 規模では十分
- Render: admin / reservation の Static Site / Web Service 設定は本 change のスコープ外（別 change で `apps/admin` 着手時に対応）

### コスト

- Supabase: 無料
- 既存 Render（LP のみ）: 影響なし

### セキュリティ

- RLS を全テーブルで有効化（`ENABLE ROW LEVEL SECURITY`）必須
- `service_role` キーをクライアントサイドで使用しない方針を明文化
- `.env*` を git にコミットしない（既存 CLAUDE.md セキュリティルールに沿う）
