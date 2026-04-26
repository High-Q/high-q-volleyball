# Design: Supabase 初期セットアップとスキーマ設計

## Context

High Q プロジェクトは LP（稼働中・AWS API Gateway + DynamoDB）に加え、Phase 1 で管理画面（apps/admin）と予約サイト（apps/reservation）を新規開発する。両アプリの共通バックエンドとして Supabase を採用済み（ADR-0002）。Phase 1 リリース 2026-05-08 までに Auth・DB・RLS の初期構成を確立する必要がある。

現在 Supabase プロジェクトは未作成、テーブル設計も未実施で、後続の Issue (#84 Auth, #85-87 Admin 機能, #89-90 Reservation 機能) はすべて本 change に依存する。スキーマ docs（`docs/04-システム設計/01-DB設計/`）は空のテンプレートのみで詳細は未定義のため、本 change で初期決定を行う。

## Goals / Non-Goals

**Goals**:
- Supabase プロジェクトを ap-northeast-1 で稼働させる（無料枠）
- events / members / reservations の最小スキーマで Phase 1 機能をすべて支える
- RLS で「公開閲覧 / 自分の行のみ / 管理者全件」の 3 層ポリシーを確立
- Branded Types + Result 型で型安全な ID とエラー扱いを `packages/shared/` に集約
- SQL Migration をリポジトリ管理し、CI で再現可能にする
- ローカル開発と Render の両環境で同じ仕組みで動く接続情報管理

**Non-Goals**:
- LP の DynamoDB → Supabase 移行（別 change）
- 本人確認書類（運転免許証等）の Storage 設計（Issue #92 priority:medium、Phase 1.5 へ）
- Stripe 等の決済連携
- 通知（メール / プッシュ）
- 監査ログテーブル（Phase 2 で）
- 管理者アカウントの作成 UI（Phase 1 では SQL で直接 admin を立てる運用）

## Decisions

### D1. リージョンは ap-northeast-1（東京）
**選択**: ap-northeast-1
**代替**: ap-southeast-1（シンガポール）, us-west-1
**理由**: ユーザー（江東区サークル参加者）はほぼ国内。Render 東京（ap-northeast-1）と同リージョンでネットワーク遅延を最小化。Supabase 無料枠は 1 リージョン制限なし。

### D2. 認証は Email + Password（Supabase Auth）
**選択**: Email + Password
**代替**: Magic Link、OAuth (Google / X)
**理由**: 最低限の摩擦で会員登録できる。X (Twitter) はアカウント凍結中で除外。Google OAuth は将来の拡張で追加可能（既存 members 行への紐付けはトリガー側で吸収）。

### D3. members は auth.users と 1:1（id 共有）
**選択**: `members.id = auth.users.id`（同一 UUID）+ 自動作成トリガー
**代替**: members.user_id に FK、別 PK
**理由**: JOIN を不要にし、RLS 内の `auth.uid() = id` 比較が単純になる。`profile` 等の追加属性は jsonb で柔軟に。

### D4. role は members 表の text 列（enum 不採用）
**選択**: `role text CHECK in ('member','admin')`
**代替**: PostgreSQL enum 型、別 roles テーブル
**理由**: Phase 1 は 2 値のみ。enum はマイグレーションが面倒（値追加時に ALTER TYPE）。テキスト + CHECK で十分。将来増えたら別テーブル化を検討。

### D5. 予約のキャンセル後再予約は status 更新で表現
**選択**: UNIQUE(event_id, member_id) + status を更新
**代替**: 履歴テーブル別出し、論理削除フラグ
**理由**: キャンセル → 再予約は同じ予約とみなす（履歴は created_at / updated_at で十分）。Phase 1 では複雑な履歴は不要。Phase 2 で reservations_history を別出しする選択肢を残す。

### D6. updated_at はトリガーで自動更新
**選択**: `BEFORE UPDATE` トリガー `set_updated_at()` を全テーブルに適用
**代替**: アプリ側で都度セット
**理由**: アプリ側のセットし忘れを防ぐ。トリガーは 1 回定義で全テーブル流用可能（`CREATE TRIGGER ... EXECUTE FUNCTION set_updated_at()`）。

### D7. is_admin() 関数を SECURITY DEFINER で定義
**選択**: `is_admin()` を SECURITY DEFINER で定義し members 表を読む
**代替**: 各ポリシーで members への副問い合わせを直書き
**理由**: ポリシーの可読性向上。SECURITY DEFINER により呼び出し元の RLS を経由せず members を読めるため、`SELECT role FROM members WHERE id = auth.uid()` が members への RLS と循環しない。

### D8. Branded Types は packages/shared/src/types に集約
**選択**: `packages/shared/src/types/ids.ts` で `EventId` / `MemberId` / `ReservationId` を定義
**代替**: 各アプリ内に重複定義
**理由**: クロスアプリで型を共有することで、admin → reservation の API（直接共有はないが将来の event 連携）で型が一致する。pnpm workspace で `@high-q/shared` として参照。

### D9. SQL Migration は supabase/migrations/ に時刻 prefix
**選択**: `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`
**代替**: 単一 schema.sql、Supabase Dashboard で SQL 直書き
**理由**: Supabase CLI の規約に準拠。CI で `supabase db reset` を再現可能にする。Dashboard での直書きは re-create 時に消えるため避ける。

### D10. Supabase CLI はローカル開発で使うが Phase 1 では「マイグレーション適用は Dashboard SQL Editor で手動」
**選択**: SQL ファイルをリポジトリ管理 + Dashboard で手動 RUN
**代替**: GitHub Actions で `supabase db push` を自動実行
**理由**: 自動化は CI セットアップ Issue #80 でまとめて整備する方が筋が良い。Phase 1 の Hello World 段階では手動 RUN で十分（マイグレーション 1 ファイルのみ）。Issue #80 完了後に自動化。

### D11. 環境変数は apps/<app>/.env.local（git 管理外）+ Render env vars
**選択**: ローカルは `.env.local`、本番は Render Dashboard の env vars
**代替**: 1Password / dotenv vault 等の secret manager
**理由**: 個人開発・無料枠縛り。secret manager 導入は Phase 2 以降。`.env.example` をリポジトリに置き、必要な変数名のみ共有（値は空）。

### D12. anon key の Web 公開を許容
**選択**: anon key は HTML / JS バンドルに含めて配布
**代替**: サーバー経由の proxy 化
**理由**: anon key は RLS 通過のみを許可するキー。RLS が正しく設定されていれば公開しても安全（Supabase 公式推奨パターン）。proxy は Phase 1 規模では over-engineering。

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| RLS ポリシーの抜けで個人情報漏洩 | (1) Phase 1 完了時に SQL 直接 attack による検証テストを実施 (2) members の RLS は SELECT も自分の行のみで設計、admin 判定は別関数 |
| マイナンバーカードの誤受け取り | members.profile の任意 jsonb で受け取らないよう、入力 UI 側でも別 capability で制限。スキーマレベルでも `my_number` 系列名を禁止する Design レビュー |
| `is_admin()` の SECURITY DEFINER による権限昇格バグ | 関数内で `members.id = auth.uid()` の条件のみで判定し、引数を取らない。引数あり関数は SQL injection 経路になり得るため避ける |
| 無料枠超過（DB 500MB / MAU 50,000） | Phase 1 規模（数百人会員想定）では十分。超過時アラートを Supabase Dashboard で設定 |
| Render の env vars 設定漏れ | `.env.example` で必須変数を明記。Render PR プレビュー初回起動時に env vars 不足が判明する |
| `supabase` CLI 依存（ローカル開発時） | CLI 必須化は Phase 1 ではしない。Dashboard SQL Editor で実行可能な SQL のみで構成。CLI 派は migrations を手元で `supabase db push` できる |
| auth.users と members の 1:1 トリガーがコケた場合に整合性が崩れる | (1) トリガーを `BEFORE INSERT` ではなく `AFTER INSERT` でリトライ可能に (2) 整合性チェック SQL を README に記載し週次手動チェックする運用を Phase 1 の暫定で回す |
| キャンセル → 再予約の status 履歴が消える | Phase 1 は updated_at で「最後にキャンセルした日時」のみ保持。Phase 2 で履歴別表化（D5 参照） |

## Migration Plan

本 change はゼロから作るため「Migration」というより「初期構築」になる。ロールバックは Supabase プロジェクトを削除すれば完全リセット可能。

### 適用順序

1. ローカルで SQL Migration ファイル作成・レビュー（Apply フェーズ）
2. Supabase プロジェクトを Dashboard で作成（手動・1 度きり）
3. Dashboard の SQL Editor で migration ファイルの中身を貼り付け実行
4. `pg_class.relrowsecurity` を SELECT で全テーブル true 確認
5. `packages/shared/` の Supabase client 初期化と Branded Types を実装
6. 簡単な smoke test（INSERT → SELECT）を Vitest で書いて GREEN 確認
7. Render env vars に `SUPABASE_URL` / `SUPABASE_ANON_KEY` を設定（admin / reservation 着手時に再度確認）

### ロールバック

- Supabase プロジェクト削除 → Dashboard から 1 クリック
- リポジトリの変更（migrations / shared パッケージ）は git revert
- 本番影響: 現時点で admin / reservation は未開発のため利用ユーザーゼロ。LP は別系統で影響なし

## Open Questions

- 管理者アカウントの初回作成は SQL 直書きで OK か → **Phase 1 暫定: SQL で UPDATE members SET role='admin' WHERE id=...; これを README に手順記載**
- members.email の同期はどう実現するか（auth.users から） → **トリガー `on_auth_user_created` で INSERT、UPDATE 同期は Phase 1 では実装せずユーザーが UI から表示名のみ編集可能とする**
- Phase 1 で予約定員（capacity）超過チェックは DB 側で行うか → **DB 側にトリガー実装せず、アプリ層で予約前に `SELECT count(*) FROM reservations WHERE event_id=? AND status='reserved'` をチェック。レースコンディションは Phase 1 規模では許容（同時申込 2 件競合は手動運用で吸収）。Phase 2 で advisory lock 等の検討**
- E2E テスト用のシードデータは必要か → **Phase 1 では vitest の単体テスト + apps/admin での手動テストのみ。Playwright は Issue #79 で別途。シードは Phase 1 では SQL ファイルを手元に保持するのみ**
