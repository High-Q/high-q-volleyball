# High Q バレーボールサークル — OpenSpec プロジェクト定義

## プロジェクト概要

東京都江東区の社会人バレーボールサークル High Q のWebプラットフォーム。
オーナー個人が Claude Code をペアプログラマーとして開発・運営する。

詳細ドキュメント: `docs/000-ビジネス/010-プロジェクト概要.md`

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

詳細: `docs/020-アーキテクチャ/040-インフラ・CICD構成.md`

## 開発プロセス（openspec ワークフロー）

```
/opsx:propose "<変更内容>"
  → proposal.md / design.md / tasks.md を生成
  → 内容を確認・合意
  → /opsx:apply で TDD 実装
  → PR → CI 通過 → マージ
  → /opsx:archive でアーカイブ・specs/ 更新
```

## ブランチ戦略

- `main`: 本番（保護・PR必須・CI通過必須）
- `feature/<番号>-<概要>`: 機能開発
- `fix/<番号>-<概要>`: バグ修正

## テスト戦略

| 種別 | ツール | タイミング |
|------|--------|-----------|
| Unit / Component | Vitest + @vue/test-utils | TDD（実装前に書く） |
| API モック | MSW (Mock Service Worker) | テスト・開発両用 |
| E2E | Playwright | 主要フローのみ |

詳細: `docs/060-テスト/010-テスト戦略・方針.md`

## ドキュメント構成

```
docs/
  000-ビジネス/          プロジェクト概要・スコープ
  010-業務ドメイン/       ビジネスルール・画面仕様・状態遷移
  020-アーキテクチャ/     C4図・インフラ・開発規約
  030-システム設計/       DB設計・シーケンス図・設定
  040-インターフェース/   API仕様・外部システム連携
  050-品質・セキュリティ/ 非機能要件・アクセス制御・個人情報保護
  060-テスト/             テスト戦略・テスト仕様
  070-移行/               データ移行・カットオーバー
  080-決定記録/           ADR（アーキテクチャ決定記録）
```

## 制約

- 費用: 基本無料（Render 無料枠 / Supabase 無料枠）
- 個人情報: 本人確認書類（運転免許証等）は暗号化保管。マイナンバーカードは受け付けない
- 期限: Phase 1 は 2026-05-08 リリース目標
