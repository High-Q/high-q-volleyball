# ADR-0004: openspec による仕様駆動開発の採用

- **日付**: 2026-04-24
- **状態**: 承認済み

## 背景

Claude Code をペアプログラマーとして活用する個人開発プロジェクト。曖昧な指示でAIに実装させると仕様ずれが起きやすい。仕様を先に合意する開発プロセスが必要。

## 決定

`@fission-ai/openspec` を採用し、仕様駆動開発を行う。

ワークフロー:
1. `/opsx:propose` で proposal / design / tasks を生成
2. 仕様レビュー・合意
3. `/opsx:apply` で TDD 実装
4. `/opsx:archive` でアーカイブ・specs 更新

## 理由

- AI コーディングエージェントとの協働を前提とした設計である
- 軽量でセットアップが簡単（npm install + init のみ）
- Claude Code のスラッシュコマンドと統合されている
- 仕様・変更・アーカイブの分離により、決定の根拠が残る

## 却下した代替案

- **OpenAPI（REST API 仕様書）のみ**: API 定義には使うが、開発プロセス管理には不十分
- **Jira / Notion**: 個人開発のオーバーヘッドが大きい。GitHub Issues + openspec で十分
