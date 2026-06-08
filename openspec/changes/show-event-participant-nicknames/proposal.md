## Why

予約サイト (`apps/reservation`) の予約詳細画面では現状「自分の予約しているイベントに他に誰が来るか」が分からず、初参加者は不安を抱えたまま当日を迎える / 常連は「次回会える顔ぶれ」を把握できずに参加意欲を失う、という体験のロスがある。Epic #170「メンバーが High Q に参加し、繰り返す」のユーザージャーニーで掲げた「参加 → 継続」の継続率を後押しするには、同じ回に予約している他参加者のニックネームを安全に可視化する必要がある。

会員のニックネーム機能 (#200) は既に整備されており、admin 側の予約者一覧表示 (#271) も完了している。残るのは会員サイト側の参加者一覧表示のみ。

## What Changes

- 予約詳細画面 (`/reservations/:reservationId`) に「参加者」セクションを追加し、同じイベントに有効な予約を持つ会員のニックネームを一覧表示する
- ニックネーム未設定の会員は汎用表記でマスクし、本名・メール・電話番号など個人特定可能情報は一切露出させない
- 会員本人は一覧内で「あなた」と明示し、自分が含まれていることを伝える
- 同伴者は個別 nickname を持たないため、末尾サマリで「同伴者 +N 名」と集約表示する
- 取得は Supabase RPC (SECURITY DEFINER) 1 本で抑え、`reservations.member_id` を直接 SELECT 可能にする RLS 開放はしない
- プライバシーポリシーに「予約イベント内で nickname を他参加者に表示する」旨を追記し、プロフィール画面ニックネーム行に「同じイベントの参加者に表示されます」相当の補足を加える
- イベント詳細画面 (`/events/:id`) での全員公開は MVP1 スコープアウト (MVP2 で再評価)

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `reservation-detail-page`: 予約詳細画面に「参加者」セクション要件を ADDED。配置順は `Meta テーブル → 予約状況セクション → 参加者セクション → Cancel Policy ボックス`
- `reservation-profile-page`: ニックネーム編集モーダルおよび ACCOUNT セクションのニックネーム行に「同じイベントの参加者に表示されます」相当の補足表示を ADDED
- `privacy-policy-page`: 「予約イベント内で nickname を他参加者に表示する」運用を本文に明記する記述を ADDED
- `rls-policies`: 参加者ニックネーム取得 RPC (SECURITY DEFINER) の前提条件と権限境界を ADDED
- `data-schema`: 参加者ニックネーム取得 RPC の関数定義および GRANT を ADDED

## Impact

- 影響コード:
  - `apps/reservation/src/widgets/reservation-detail-card/` (参加者セクションの組み込み) または専用 widget 新設
  - `apps/reservation/src/entities/event/` (参加者取得クライアント API 追加)
  - `apps/reservation/src/pages/profile/` (ニックネーム編集モーダルの補足文言追加)
  - `apps/reservation/src/pages/privacy/` (privacy-policy-page 本文の補足追加)
- DB / Migration:
  - `supabase/migrations/` に SECURITY DEFINER の RPC 関数追加 + authenticated への明示 GRANT (#247 の方針に沿う)
  - 既存テーブルのスキーマ変更・RLS ポリシー変更は行わない
- 依存 / 連動:
  - #200 ニックネーム機能 (完了) を前提
  - #247 GRANT テンプレ整備 (並列進行中・本 change の RPC GRANT 記述に影響しない範囲で整合させる)
- セキュリティ:
  - メール / 本名 / 電話番号 / 生年月日 / 経験レベルは絶対に返却しない
  - 自分が有効 reservations (`status IN ('reserved','attended')`) を持たないイベントに対しては関数が 0 行を返す
  - `service_role` 経由の SELECT は本機能の範囲外
- テスト:
  - component test (Loading / Empty / Error / Success の 4 状態 + 自分マーカー + 未設定マスク + 同伴者サマリ)
  - SQL レベルで RLS 越境試験 (他イベントの participants が取れないこと)
  - E2E は `reservation-detail-page` capability の既存 auth guard E2E を継続流用し、新規追加 SHALL NOT
