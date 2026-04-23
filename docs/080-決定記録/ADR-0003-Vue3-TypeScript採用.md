# ADR-0003: Vue 3 + TypeScript をスタックとして維持・強化

- **日付**: 2026-04-24
- **状態**: 承認済み

## 背景

既存 LP は Vue 3 + Vuetify 3 + JavaScript で構築されている。新規アプリ（admin・reservation）の技術選定と、JavaScript から TypeScript への移行を判断する必要があった。

## 決定

全アプリで Vue 3 + TypeScript + Vuetify 3 を採用する。React への移行は行わない。

## 理由

- Vue 3 は TypeScript サポートが優秀（`<script setup lang="ts">` で自然に書ける）
- 既存 LP との一貫性を維持でき、コンポーネント・テーマを共有できる
- 2週間の開発期間内に React 移行を行うと本来機能の実装時間が削られる
- TypeScript の導入が品質向上・TDD・OpenAPI 型生成において最も重要であり、フレームワーク変更より優先度が高い

## 却下した代替案

- **React + TypeScript への移行**: 技術的には良い選択だが、2週間のタイムラインでは非現実的。Phase 2 の選択肢として残す。
