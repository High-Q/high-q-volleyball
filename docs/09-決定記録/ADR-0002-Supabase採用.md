# ADR-0002: バックエンドに Supabase を採用

- **日付**: 2026-04-24
- **状態**: 承認済み

## 背景

管理画面・予約サイトのバックエンドとして、Auth・DB・ファイルストレージ（本人確認書類）が必要。費用は基本無料の制約がある。

## 決定

新規アプリ（admin・reservation）のバックエンドに Supabase を採用する。
既存 LP の AWS API Gateway + DynamoDB は変更しない。

## 理由

- 無料枠（500MB DB・1GB Storage）でPhase 1は十分
- Auth・DB・Storage が一体化しており、2週間の開発期間に適している
- Row Level Security (RLS) で本人データを安全に保護できる
- Render との CI/CD 連携が容易

## 却下した代替案

- **AWS 全面移行（Cognito + RDS + S3）**: 設定複雑度が高くタイムラインに合わない
- **Firebase**: リアルタイム機能は不要。PostgreSQL の方がリレーション表現に適している
