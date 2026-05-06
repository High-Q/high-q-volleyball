## Why

会員サイト (`apps/reservation`) のイベント詳細画面まで実装が進んでいるが、肝心の予約導線 (確認 → 確定 → 完了 → キャンセル) は「準備中」状態のまま機能停止している。Epic #170「メンバーが High Q に参加し、繰り返す」のユーザージャーニー後半 (予約 → 参加) を成立させるため、予約 1 件の作成・確認・キャンセルまでを一気通貫で動かせる状態にする必要がある。

## What Changes

- 会員サイトに予約確認画面を新設し、イベント詳細の「予約に進む」ボタンから遷移させる。本画面は入力 UI と最終確認を統合する (独立した入力画面は持たない)
- 確認画面で同伴者数・連絡事項・(members.phone 未登録時のみ) 電話番号を入力できるようにし、入力内容のローカル保持で再訪復元を提供する
- 予約確定時に reservations 行が作成され、完了画面に予約番号と次アクションが表示される
- 完了画面からキャンセル可能にする。**キャンセル可否はイベント開催前 (`events.start_at > now()`) のみ可能** とする。開催開始以降はキャンセル不可表示と admin への問い合わせ案内を提示する
- フォーム入力項目を MVP1 範囲に削減: 同伴者数 / 連絡事項 / (members.phone 未登録時のみ) 電話番号。氏名・メールは members プロフィールから自動引き継ぎし読み取り専用表示

### スコープアウト (MVP1 で実装しない)

- 独立した予約フォーム入力画面 — 確認画面に統合 (Issue #159 で 3 画面化 + StepIndicator を MVP2 として扱う)
- メール通知 (確認メール送信、その旨の文言表示すべて含む) — MVP2 で別 Issue 化
- カレンダー追加 (.ics ダウンロード) — MVP2 で別 Issue 化
- `events.cancel_deadline` を使ったキャンセル期限運用 — MVP1 ではキャンセル可否は開催時刻のみで判定し、cancel_deadline 列自体は予約サイト側で参照しない (admin 側の運用整備は別 Issue)
- プロフィール画面 (#91) からのキャンセル動線 — MVP1 はキャンセル UI を完了画面に集約
- キャンセルポリシー / 利用規約 同意チェックボックス — 規約未整備のため MVP1 ではフォームから外す
- キャンセル待ち (`waitlist`) — Issue #154
- 予約フォーム送信時の同時実行制御 (定員超過の楽観ロック) — MVP1 では capacity を UI に出さないため不要

## Capabilities

### New Capabilities

- `reservation-booking-flow`: 会員サイトの予約確認 (入力統合) / 完了 / キャンセル画面の責務、reservations への INSERT / UPDATE 経路、入力内容のローカル保持、4 状態 (Loading / Empty / Error / Success) 網羅、デザイントークン徹底使用、アクセシビリティ AA を規定する

### Modified Capabilities

- `reservation-events-and-booking`: イベント詳細の「予約に進む」ボタンが「準備中」案内ではなく予約確認画面へ遷移する挙動に変更する。詳細画面の責務本体 (情報表示・パンくず) は不変

## Impact

### コード

- `apps/reservation/src/pages/`: 予約確認 / 完了 の各 Page 新設。CancelPage は持たず完了画面内のキャンセルダイアログで完結
- `apps/reservation/src/features/event-detail/`: StickyCta の遷移先を「準備中」から予約確認画面へ変更
- `apps/reservation/src/features/`: 新規 feature `booking` (フォーム / API / composable / ローカル保持 store) を追加
- `apps/reservation/src/entities/`: 新規 entity `reservation` (型定義 / Branded Types / 予約番号フォーマッタ)
- `apps/reservation/src/widgets/`: パンくず構造の拡張のみ (既存 widget 流用)
- `apps/reservation/src/shared/ui/`: shadcn-vue Dialog の取り込み

### DB / RLS

- 既存テーブル `reservations` を使用 (新規列追加なし)
- 既存 RLS ポリシー (member 自身の INSERT / UPDATE / SELECT) を流用 (新規ポリシーなし)

### ナビゲーション

- イベント詳細 → 確認 → 完了 の前進方向と、各画面からの戻り経路 (パンくず + 「修正する」CTA) を双方向で提供
- キャンセル後はイベント一覧へ遷移 (#91 プロフィール画面接続は MVP2)

### テスト

- 機能あたり 1〜2 件の component test 中心 (E2E 環境は #201 待ち)。MVP1 では Vitest + @vue/test-utils で予約作成 happy path とキャンセル成功 / 開催開始後の拒否を検証

### 後続 Issue (本 change で別出ししたい項目)

- メール通知 (Edge Function or サーバーサイド) — MVP2
- .ics カレンダー追加 — MVP2
- 独立した予約フォーム入力画面 + StepIndicator (進捗バー) — Issue #159 (既存)
- プロフィール画面の予約履歴 + キャンセル動線 — Issue #91 (既存)
- `events.cancel_deadline` の admin 運用 + 予約サイト側での参照 — 別 Issue (MVP2)
