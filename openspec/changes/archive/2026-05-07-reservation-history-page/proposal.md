# Proposal: 予約履歴画面 `/history` の独立化

> **承認ゲート**: Proposal + Design + Task の 3 ファイルをレビューし、合意してから `/opsx:apply` で実装に進むこと。

## Why（なぜやるか）

PR #210 (#91 reservation プロフィール画面) の実装時、デザインサンプル `ScreenRHistory` を見落としたため、以下 2 点の歪みが残っている。

- Bottom Tab Bar の「履歴」タブが暫定的に `/profile` を指している（プロフィールタブと同じ遷移先で、active state が両方ともプロフィールに点灯する）
- プロフィール画面の STATS セクションに「集計 3 行 + 予約履歴一覧 + 個別キャンセルボタン」が同居し、画面が縦に重い + 役割分担が不明瞭

正規 IA に揃え、履歴は独立画面で独自の Stats Strip + 予約中/過去のグループ表示とし、プロフィール画面は会員自身の属性管理に専念する形に整える。

## What Changes（何が変わるか）

| 観点 | 変更前 | 変更後 |
|------|--------|--------|
| URL | 履歴は `/profile` の STATS 内に同居 | `/history` 独立ルート |
| Bottom Tab Bar 履歴タブ | `to: { name: 'profile' }`（暫定） | `to: { name: 'history' }`（正規） |
| Bottom Tab Bar active state | `/profile` 配下で「プロフィール」と「履歴」が両方点灯 | パス毎に排他点灯（`/history` で履歴のみ点灯） |
| 履歴の表示形式 | 単一リスト（`start_at DESC` 1 列） | Stats Strip（TOTAL / NEXT / STREAK）+ 予約中グループ + 過去グループ（2 セクション分割） |
| 個別キャンセル動線 | プロフィール STATS 内の各行 | 履歴画面の予約中グループ内の各行 |
| プロフィール画面 STATS | 集計 3 行 + 履歴一覧 + キャンセルボタン | 集計 3 行のみ（累計参加 / 最終参加 / 次回予定） |

## Capabilities（実現できること）

### 新規 capability
- **`reservation-history-page`**: 認証済み正規会員 (`/profile` と同じ guard チェーン) のみアクセス可能な履歴専用画面。Stats Strip + 予約中グループ + 過去グループの 3 セクション構成 + 個別キャンセル動線

### 既存 capability の変更
- **`reservation-profile-page`**: STATS セクションを集計 3 行のみに整理し、履歴一覧 + 個別キャンセル動線を撤去。当該動線を新画面に移管する

## Impact（影響範囲）

### 影響するコンポーネント・ファイル

- 新規 page / route / widgets / features（`pages/HistoryPage.vue` / `widgets/history-stats-strip` / `features/history-list` 系）
- `apps/reservation/src/widgets/bottom-tab-bar/ui/BottomTabBar.vue`（履歴タブのリンク先 + active 判定の正規化）
- `apps/reservation/src/pages/ProfilePage.vue` および `features/profile-stats/`（履歴一覧 + キャンセル UI を撤去、集計 3 行 + Empty/Error は維持）
- 既存 `entities/reservation/api/myReservations.ts` を再利用（プロフィール画面と履歴画面の双方から呼ぶ）
- 既存 `features/booking` のキャンセル UI / Dialog を再利用

### 影響しない範囲（Non-Goals）

- 予約詳細画面（履歴行押下後の遷移先・`ScreenRReservation` 相当）の実装は本 change の対象外。未実装期間中は遷移しない（行押下無効）または placeholder ページに留める（design.md で決定）
- DB スキーマ変更・新規 RLS ポリシーは発生しない（既存 `reservations × events × venues` クエリの再利用のみ）
- admin 画面・LP の挙動は変更しない
- メール通知・カレンダー連携・再予約等は MVP2 据え置き

## 制約・前提条件

- 既存 `useAuthSession` の guard チェーン（auth + profile-complete + identity-document）にそのまま乗せる
- HQ デザイントークン (`var(--hq-*)`) のみ使用、マジックナンバー禁止
- 既存のキャンセル可否判定（`events.start_at > now()`）と reservation-booking-flow spec の整合を維持
- `event_participants_view` 等の DB view には依存しない（クライアント reduce で集計）
- E2E は機能あたり 1〜2 件のスケーラビリティ運用ルールに従い、本 change では 1 件のみ追加（auth guard 統合）

## 成功基準

- [ ] `/history` ルートが正規会員のみアクセス可能（既存 guard チェーンで通る・未認証は `/login` へ）
- [ ] 履歴画面に Stats Strip（TOTAL / NEXT / STREAK）+ 予約中グループ + 過去グループの 3 セクションが描画される
- [ ] 各履歴行の状態バッジ（予約中 / 参加済 / キャンセル / 未参加 / キャンセル待ち）が仕様通り
- [ ] 予約中グループの各行で `events.start_at > now()` ならキャンセル動線が機能（プロフィール画面で動作していたのと同じ挙動が継承されている）
- [ ] プロフィール画面 STATS から履歴一覧 + 個別キャンセルボタンが除去され、集計 3 行のみが残る
- [ ] Bottom Tab Bar 履歴タブが `/history` を指し、active state が `/history` 配下で履歴のみ点灯する
- [ ] 4 状態（Loading / Empty / Error / Success）を網羅
- [ ] RLS により自分の予約のみ取得される（既存挙動の継承確認）
- [ ] mobile 390px first / a11y AA を満たす
