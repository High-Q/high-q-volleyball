## Why

現行 LP（Vue + Vuetify）は、admin / reservation で確立した HQ ブランド体験から視覚・体験ともに乖離している。Issue #160 では「初めての訪問者の心理的ハードルを下げ、迷わず一歩を踏み出してもらうこと」と「リピーターが次の予定に最短で辿り着けること」を両立し、これを HQ デザイントークン基盤の上で実現することが求められている。
本変更では LP の見た目と動線を刷新し、最終 CTA とイベントカードを reservation サイトに接続するところまでを担う。

## What Changes

- LP の主要セクションを全面刷新する（ヒーロー / 安心ストリップ / 開催メタ / About / 特長 / 当日の流れ / 不安への回答 / イベント一覧 / FAQ / 合わない方への注記 / ギャラリー＆SNS / 最終 CTA / フッター）
- 書体・配色・余白を HQ デザイントークン経由に統一し、Vuetify のテーマ依存を解消する
- ヒーロー直下に「次回開催」帯を常設し、リピーターが最短で予約導線に到達できるようにする
- 最終 CTA の主動線を reservation サイト（会員登録／ログイン）に変更し、LINE オープンチャットは補助動線として残す
- 各イベントカードに reservation サイトへの「特定イベント指定の遷移」CTA を追加し、URL クエリ等でイベント識別子を渡す（reservation 側の入口受け取りは別 Issue 担当）
- 写真素材は本 Issue では用意せず、差し替え容易なプレースホルダー枠（`@high-q/ui` の `Photo`）で実装する。差し替えは別 Issue
- Vuetify は段階的撤去とし、本変更では「テーマ依存からの脱却」までを完遂する（レイアウト系コンポーネントの残置は許容）

## Capabilities

### Modified Capabilities
- `lp-layout`: LP の主要セクション構成・ヘッダー・フッター・ナビゲーション要件を新デザインへ更新する

## Impact

- 影響アプリ: `apps/lp` を全面的に改修
- 共通基盤: `@high-q/design-tokens` を LP から本格利用開始。`@high-q/ui` 由来の意匠系プリミティブ（Button / Kicker / Badge / Photo 等）を LP でも採用
- 環境変数: LP に reservation サイトの URL を渡す経路（`VITE_RESERVATION_URL`）が必要
- 検索 / 解析: 既存 SEO・OGP・アナリティクスの設定は維持する
- 依存 Issue: #146（design-tokens / shared-ui パッケージ抽出）に依存。Issue #160（本件）所属 Epic は #170
- 切り出し済み別 Issue:
  - LP のイベント取得を Supabase に切替（Issue B として別建て）
  - reservation 側ディープリンク入口の実装（Issue C として別建て）
  - AWS → Supabase イベントデータ移行（Issue D として別建て）
- 画像素材差し替えは別 Issue に切り出すため、本変更内では完了条件としない
- LP のイベントデータ源は本変更内では AWS API のまま維持（Issue B 完了後に Supabase に切替予定）。本変更着手時に Issue B が完了していれば、新カード UI は Supabase 由来のデータで動作する
