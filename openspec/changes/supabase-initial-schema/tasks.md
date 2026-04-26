# Tasks: Supabase 初期セットアップとスキーマ設計

> **承認ゲート**: Proposal + Design + 本 Tasks + 3 つの specs（supabase-foundation / data-schema / rls-policies）が揃って承認されてから Apply に入る。

## 進捗

- 完了: 4 / 31 タスク（7.1 論理設計を propose 段階で先行作成 / Task 1.4 追加で 31 件に）

---

## 1. セットアップ

- [x] 1.1 Issue + ブランチ作成（`feature/82-supabase-initial-schema`）
- [ ] 1.2 `.env.example` を `apps/admin/`, `apps/reservation/` に用意（LP は Supabase 接続なしのためスキップ。Vite 規約に従い `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` の 2 変数）
- [x] 1.3 `.gitignore` の env 除外を確認（`.env.local` と `.env.*.local` が root に既に存在、サブディレクトリにも再帰適用される）
- [x] 1.4 **【追加】** `.claude/settings.json` の deny ルールを精緻化（旧: `.env.*` で全テンプレートをブロック、新: `.env.local` / `.env.production` 等の秘密情報ファイルのみ deny。`.env.example` / `.env.template` 等のテンプレートは規制外）

## 2. Supabase プロジェクト作成（手動・1 度きり）

- [ ] 2.1 Supabase Dashboard で `high-q` プロジェクトを ap-northeast-1 で新規作成
- [ ] 2.2 プロジェクト URL / anon key を取得し、ローカル `.env.local` と Render env vars に設定（後者は admin / reservation 着手時に再確認）
- [ ] 2.3 Supabase Auth → Providers で Email + Password を有効化

## 3. SQL Migration ファイル作成

- [ ] 3.1 `supabase/migrations/` ディレクトリを新規作成
- [ ] 3.2 `supabase/migrations/<YYYYMMDDHHMMSS>_init_high_q.sql` を作成
- [ ] 3.3 `set_updated_at()` トリガー関数を SQL に記述
- [ ] 3.4 `is_admin()` 関数（SECURITY DEFINER）を SQL に記述
- [ ] 3.5 events テーブル定義（列・CHECK 制約・インデックス）
- [ ] 3.6 members テーブル定義（auth.users と 1:1 紐付け、`on_auth_user_created` トリガー）
- [ ] 3.7 reservations テーブル定義（FK / UNIQUE / インデックス）
- [ ] 3.8 各テーブルに `ENABLE ROW LEVEL SECURITY`
- [ ] 3.9 events の RLS ポリシー（公開 SELECT / admin のみ書き込み）
- [ ] 3.10 members の RLS ポリシー（自分の行のみ SELECT/UPDATE、role 自己昇格禁止）
- [ ] 3.11 reservations の RLS ポリシー（自分の予約のみ + admin 全件）
- [ ] 3.12 各テーブルの `BEFORE UPDATE` トリガーを `set_updated_at()` で適用

## 4. Migration 適用（Phase 1 は手動）

- [ ] 4.1 Supabase Dashboard SQL Editor に migration の中身を貼り付けて RUN
- [ ] 4.2 `pg_class.relrowsecurity` を SELECT で全テーブル true 確認
- [ ] 4.3 各 RLS ポリシーが想定通り適用されているか `pg_policies` を SELECT で確認

## 5. packages/shared/ パッケージ初期化

- [ ] 5.1 pnpm workspace で `packages/shared` を作成（`package.json` / `tsconfig.json`）
- [ ] 5.2 `packages/shared/src/types/ids.ts` で Branded Types（EventId / MemberId / ReservationId）と Smart constructor 実装
- [ ] 5.3 `packages/shared/src/types/result.ts` で `Result<T>` 型と `ok()` / `err()` ヘルパー実装
- [ ] 5.4 `packages/shared/src/types/entities.ts` で events / members / reservations の TypeScript 型定義
- [ ] 5.5 `packages/shared/src/api/supabase.ts` で `createClient` のラッパー（環境変数バリデーション込み）
- [ ] 5.6 `packages/shared/src/index.ts` で Public API export

## 6. テスト

- [ ] 6.1 `packages/shared/src/types/ids.spec.ts` で Branded Types のスマートコンストラクタテスト（UUID バリデーション、誤入力で err）
- [ ] 6.2 `packages/shared/src/types/result.spec.ts` で `Result` 型のヘルパーテスト
- [ ] 6.3 Supabase client のスモークテスト（`supabase.from('events').select('count')` で接続確認、CI では skip 可）

## 7. ドキュメント更新

- [x] 7.1 `docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md` に events / members / reservations のリレーション図と列定義を記載 **（propose 段階で先行作成・レビュー対象）**
- [ ] 7.2 `docs/04-システム設計/01-DB設計/02-物理設計/物理設計.md` に PostgreSQL 固有の決定（型・インデックス・トリガー・RLS）を記載（Apply 中、SQL Migration と並行で更新）
- [ ] 7.3 `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` に RLS ポリシー詳細を記載
- [ ] 7.4 リポジトリ root の `README.md`（または該当 docs）に「管理者ユーザー作成手順（SQL 直書き）」を Phase 1 暫定運用として記載

## 8. 動作確認・PR

- [ ] 8.1 `pnpm install` で workspace 依存解決成功
- [ ] 8.2 `pnpm -r build` 全パッケージビルド成功
- [ ] 8.3 `pnpm -r exec vitest run` で全テスト GREEN
- [ ] 8.4 `pnpm exec eslint` で boundary 違反なし
- [ ] 8.5 PR 作成（base: master、Closes #82）
- [ ] 8.6 CI（lint / typecheck / test / build）全パス確認
- [ ] 8.7 Render PR プレビューでビルド成功（apps/lp は影響を受けないが念のため）

---

## 備考・ブロッカー

- Supabase プロジェクト作成は **オーナー手動**（Apply 中に依頼するか、事前に作成済みであれば 2 をスキップ）
- 管理者ユーザーの初回作成は Phase 1 暫定で SQL 直書き運用。手順を docs に記載するのみ（UI は Phase 2 以降）
- LP の AWS API Gateway + DynamoDB 移行は本 change のスコープ外。別 Issue で計画
