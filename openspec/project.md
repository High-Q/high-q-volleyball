# High Q バレーボールサークル — OpenSpec プロジェクト定義

## プロジェクト概要

東京都江東区の社会人バレーボールサークル High Q のWebプラットフォーム。
オーナー個人が Claude Code をペアプログラマーとして開発・運営する。

詳細ドキュメント: `docs/01-ビジネス/01-プロジェクト概要.md`

## アプリケーション構成

| アプリ | ディレクトリ | 役割 | 状態 |
|--------|------------|------|------|
| LP | `apps/lp` | ランディングページ（カレンダー表示） | 稼働中（移行予定） |
| Admin | `apps/admin` | 管理画面（イベント・予約管理） | 未開発 |
| Reservation | `apps/reservation` | 予約サイト（会員・予約） | 未開発 |
| Shared | `packages/shared` | 共通型・テーマ | 未開発 |

## 技術スタック

- **言語**: TypeScript（strict）
- **FW**: Vue 3 (Composition API + `<script setup lang="ts">`)
- **UI**: Vuetify 3
- **ビルド**: Vite
- **パッケージ管理**: pnpm workspaces（モノレポ）
- **バックエンド（LP既存）**: AWS API Gateway + DynamoDB
- **バックエンド（新規）**: Supabase (Auth / PostgreSQL / Storage)
- **ホスティング**: Render（全アプリ・無料枠）
- **CI/CD**: GitHub Actions
- **Node.js**: v22.x（LTS）

詳細: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`

## アーキテクチャ

**Feature Sliced Design（FSD）** を全アプリで採用。
ADR: `docs/09-決定記録/ADR-0006-FSD採用.md`
詳細: `docs/03-アーキテクチャ/04-開発・コーディング規約.md`

```
app → pages → widgets → features → entities → shared
```

- 各スライスは `index.ts`（Public API）を持ち、外部から直接パスで import 禁止
- Supabase client は `shared/api/` のみに存在（type-only import は features 等から可）
- 機械検知（admin / reservation 対象、LP は #310 完了まで対象外）:
  - ESLint `eslint-plugin-boundaries` でレイヤー境界 + Public API 経由を強制
  - ESLint `@typescript-eslint/no-restricted-imports` で `@supabase/supabase-js` を `shared/api/` に集約
  - ESLint `no-restricted-syntax` で `service_role` のクライアント露出を禁止
  - `dependency-cruiser` でレイヤー方向を CI 側からも二重検知
  - `stylelint` で生 hex / 名前付きカラーを warning（HQ デザイントークン経由を促進）

## 開発プロセス（openspec ワークフロー）

```
/opsx:propose → Proposal + Design + Task 同時生成
  → [承認] → /opsx:apply（TDD・1タスク1コミット）
  → [ローカル確認・承認] → PR作成 → Renderプレビュー確認
  → masterマージ（本番デプロイ） → Sync & Archive
```

詳細: `docs/03-アーキテクチャ/05-開発ワークフロー.md`

## ブランチ戦略

- `master`: 本番（保護・PR必須・CI通過必須・直接push禁止）
- `feature/<番号>-<概要>`: 機能開発
- `fix/<番号>-<概要>`: バグ修正

GitHub ブランチ保護設定: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`

## テスト戦略

| 種別 | ツール | タイミング |
|------|--------|-----------|
| Unit / Component | Vitest + @vue/test-utils | TDD（実装前に書く） |
| API モック | MSW (Mock Service Worker) | テスト・開発両用 |
| E2E | Playwright | 主要フローのみ |

詳細: `docs/07-テスト/01-テスト戦略・方針.md`

## UI 設計

| アプリ | UIライブラリ |
|--------|------------|
| `apps/lp` | Vuetify 3 |
| `apps/admin` | shadcn/ui + Tailwind |
| `apps/reservation` | shadcn/ui + Tailwind |

詳細: `docs/05-インターフェース/01-UI設計方針.md`

## ドキュメント構成

```
docs/
  01-ビジネス/          プロジェクト概要・スコープ
  02-業務ドメイン/       ビジネスルール・画面仕様・状態遷移
  03-アーキテクチャ/     C4図・インフラ・開発規約
  04-システム設計/       DB設計・シーケンス図・設定
  05-インターフェース/   API仕様・外部システム連携
  06-品質・セキュリティ/ 非機能要件・アクセス制御・個人情報保護
  07-テスト/             テスト戦略・テスト仕様
  08-移行/               データ移行・カットオーバー
  09-決定記録/           ADR（アーキテクチャ決定記録）
```

## 制約

- 費用: 基本無料（Render 無料枠 / Supabase 無料枠）
- 個人情報: 本人確認書類（運転免許証等）は Supabase Storage で暗号化保管・RLS で本人と admin のみ閲覧可。マイナンバーカードは個人番号 12 桁を完全マスクした画像のみ受付（テキストとしての保管禁止は維持）。詳細は `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`
- 期限: Phase 1 は 2026-05-08 リリース目標
