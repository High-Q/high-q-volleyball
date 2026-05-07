# Design: 予約履歴画面 `/history` の独立化

> **承認ゲート**: Proposal と同時生成。3 ファイルがすべて承認された後に Apply へ進む。

---

## Context

PR #210 で会員サイトに Bottom Tab Bar（ホーム / 履歴 / プロフィール）が導入された。当時、デザインサンプル `ScreenRHistory` を見落としたため、履歴タブは `/profile` を暫定的に指し、予約履歴一覧 + 個別キャンセル動線はプロフィール画面 STATS セクションに同居している。Issue #211 はこの暫定状態を正規 IA に揃える。

履歴画面 (`ScreenRHistory`) は以下の独自構成を持つ:

- 「履歴」見出し + `{count} ENTRIES` のモノスペース注記
- Stats Strip（TOTAL / NEXT / STREAK の 3 列グリッド）
- 「予約中」グループ（`status='reserved'` AND 未来）
- 「過去」グループ（`attended` / `cancelled` / `no_show`）
- 各行は日付セル + イベント名/会場/時間/予約番号 + 状態バッジ

プロフィール画面の STATS は本 change 後、累計参加 / 最終参加 / 次回予定 の 3 行集計のみに整理する。

## Goals / Non-Goals

**Goals:**

- `/history` ルート新設 + 既存 guard チェーン統合
- Stats Strip（TOTAL / NEXT / STREAK）+ 予約中 + 過去の 3 セクション構成
- 個別キャンセル動線をプロフィール画面から履歴画面へ移管
- Bottom Tab Bar 履歴タブのリンク + active 判定の正規化
- プロフィール画面 STATS の整理（集計 3 行のみ残す）
- 4 状態（Loading / Empty / Error / Success）対応
- E2E 1 件（auth guard 統合）

**Non-Goals:**

- 予約詳細画面 (`ScreenRReservation` 相当) の実装は Issue #213 に分離（同 MVP1）
- 予約番号 (`#HQ-...`) の発番ロジック新設は対象外（既存値があればそれを表示・なければ非表示で済ませる）
- DB スキーマ変更・新規 RLS ポリシー
- 過去予約への「再予約」「リピート」等のアクション
- admin / LP への波及

## Decisions

### Decision 1: ルート `/history` を新設し、`/profile` と同じ guard チェーンに合流

**選択**: `path: '/history'` / `name: 'history'` を `apps/reservation/src/app/router.ts` に追加。`meta.public` は持たない。auth guard の段階チェック（未認証 → `/login` / 未完成 → `/signup/profile` / 書類未提出 → `/signup/identity`）にそのまま通す。

**代替案**: `/me/history` / `/reservations` 等も検討したが、Bottom Tab Bar のラベルが「履歴」であり、デザインサンプル名も `ScreenRHistory` で統一しているため `/history` に揃える。

### Decision 2: 既存 `fetchMyReservations` を再利用

履歴画面とプロフィール画面の双方が同一クエリ（`reservations × events × venues` JOIN・自分の行のみ・`events.start_at DESC`）を必要とするため、`apps/reservation/src/entities/reservation/api/myReservations.ts` を共有する。新規 API は追加しない。

### Decision 3: Stats Strip の集計ロジック（TOTAL / NEXT / STREAK）

| メトリクス | 計算方法 | 0 件時の表示 |
|---|---|---|
| **TOTAL** | `reservations.filter(r => r.status === 'attended').length` | `0` 回 参加 |
| **NEXT** | 次回予定 (`status='reserved'` AND 未来) までの**カレンダー日数差**（時刻成分を 0 時に丸めた日付同士の差）。同日中は 0 日 / 翌日 0 時以降は 1 日 / 5 日後 19 時は 5 日。次回予定がなければ `—` | `—` 日後 |
| **STREAK** | `attended` の予約を月単位（YYYY-MM）でユニーク化し、最新の参加月から逆順に**隣接月で連続している月数**をカウント。0 件 / 直近 1 ヶ月以内に参加なしの場合は `0` ヶ月連続 | `0` ヶ月連続 |

集計はクライアント側 pure function `computeHistoryStats(reservations, now)` として `features/history-stats-strip/lib/` に新設する。既存 `computeStats` (プロフィール用) とは別関数として併存させる（プロフィールは「最終参加日 / 次回予定」を返し、履歴は「日数 / 連続月数」を返す。返り値の型が異なる）。

### Decision 4: 予約中 / 過去のグループ分割

`reservations` を 1 回だけ走査し、以下に分割する:

- **予約中**: `status === 'reserved'` AND `Date.parse(event.startAt) > now`
- **過去**: 上記以外（`'attended'` / `'cancelled'` / `'no_show'` / `'waitlist'` / および `reserved` で開始済の不整合行）

並び順は予約中が `start_at ASC`（直近予定が先頭）、過去が `start_at DESC`（最新が先頭）。これは「予約中は近い順に確認したい」「過去は最近の参加を先に見せたい」というユーザー視点に合わせた選択（デザインサンプルでも upcoming は最寄り日付が先頭、過去は新しい順に並んでいる）。

### Decision 5: 履歴行押下時の遷移は本 change では「無効化（押せない・見出し表示のみ）」

予約詳細画面 (`ScreenRReservation` 相当) は **Issue #213** で別途実装する（同じ MVP1・Epic #170 / 着手順 92.0）。本 change の段階では、行を `<a>` ではなく非リンクの `<article>` として描画し、押下不可とする。クリック領域に hover / active のフィードバックも与えない。Issue #213 の実装で `<router-link :to="{ name: 'reservation-detail', params: { reservationId: row.id } }">` への単純な置換のみで詳細遷移を有効化できる構造にしておく。

**代替案**: placeholder ページに遷移（押せはするが「準備中」を表示）も考えたが、押せて何も起きない状態のほうが誤解が少ないとの判断。

### Decision 6: キャンセル動線は予約中グループ内の各行に配置

既存 `features/booking` の `useCancelBooking` + `CancelBookingDialog` をそのまま再利用する。プロフィール画面で動いていた同じロジックを呼び出す形になるため、新規実装は最小（履歴画面の各行から呼ぶグルー部分のみ）。キャンセル成功時はローカルで対象行を `status='cancelled'` に書き換え、再 fetch を発行しない（既存の reservation-profile-page spec の方針と整合）。書き換え後、対象行は予約中グループから過去グループへ移動して再描画される MUST。

### Decision 7: Bottom Tab Bar の active 判定の正規化

既存 `BottomTabBar.vue` の `activeTab` computed を以下に変更:

```ts
if (path.startsWith("/events")) return "home";
if (path.startsWith("/history")) return "history";
if (path.startsWith("/profile")) return "profile";
return null;
```

履歴タブの `to` は `{ name: 'history' }` に切り替える。`/history` 上にいるとき履歴タブのみが点灯し、`/profile` 上では履歴タブは点灯しない（暫定状態の解消）。

### Decision 8: プロフィール画面 STATS の整理範囲

`apps/reservation/src/features/profile-stats/StatsSection.vue` の以下を削除:

- `Kicker — HISTORY · 予約履歴` 以下のリスト全体
- 各履歴行の `<button>` キャンセルボタン
- `isCancellableNow` ヘルパ
- `request-cancel` emit

残すのは集計 3 行（累計参加 / 最終参加 / 次回予定）と Empty 表現のみ。

`ProfilePage.vue` 側は以下を削除:

- `cancelTarget` / `cancelDialogOpen` / `useCancelBooking` 呼び出し
- `CancelBookingDialog` の組み込み
- `onRequestCancel` / `onConfirmCancel`
- `cancelErrorMessage`

ただし `fetchMyReservations` 呼び出しと `reservations` ref は **維持**する（プロフィール側の集計 3 行は引き続き予約配列から計算する必要があるため）。

### Decision 9: 4 状態の実装方針

- **Loading**: `member` 未確定または `loading=true` の間、ヘッダ + Stats Strip + 2 グループ枠をスケルトン表示（既存 ProfilePage のスケルトンと同じトーンで揃える）
- **Empty**: 予約 0 件のとき、Stats Strip は計算結果（TOTAL=0 / NEXT=`—` / STREAK=0）をそのまま表示し、グループ領域は「まだ予約がありません。`/events` から最初の予約を取りましょう。」を kicker 風 + イベント一覧への CTA で表示
- **Error**: `fetchMyReservations` 失敗時、画面上部に Error バナー（赤系）+ 「再試行」ボタン
- **Success**: 通常表示

### Decision 10: E2E スコープ

reservation-profile-page spec と同じスケーラビリティ運用に倣い、E2E は **1 件のみ**:

> 未認証ユーザーが `/history` に直接アクセスすると `/login` にリダイレクトされる（auth guard 統合）

集計ロジック / グループ分割 / キャンセル動線 / バッジ表示 / Bottom Tab Bar の active 判定は component test + unit test に押し下げる。

## ビジネス異常系

| # | 異常ケース | エラーコード相当 | ユーザーへのフィードバック |
|---|---|---|---|
| 1 | 自分の予約取得失敗（ネットワーク） | `NETWORK_ERROR` | 画面上部 Error バナー「履歴を取得できませんでした。再試行してください」+ 再試行ボタン |
| 2 | 自分の予約取得失敗（5xx） | `SERVER_ERROR` | 同上 |
| 3 | 予約 0 件 | （正常 Empty） | Stats Strip は 0 表示・グループ領域は誘導文言 + `/events` CTA |
| 4 | キャンセル UPDATE 失敗（RLS） | `rls` | Dialog 内に「この予約はキャンセルできません」 |
| 5 | キャンセル UPDATE 失敗（network） | `network` | Dialog 内に「通信エラーが発生しました。再試行してください」 |
| 6 | 開始済イベントへの誤キャンセル試行 | アプリ層で防止 | キャンセルボタンを表示しない（DOM 不在） |
| 7 | guard チェーン不通過 | （リダイレクト） | `/login` / `/signup/profile` / `/signup/identity` へ自動遷移 |

## FSD 影響レイヤー

- [ ] `app/` — `router.ts` に `/history` 追加 + ルートガードテスト追加
- [x] `pages/HistoryPage.vue` — 新規ページ
- [x] `widgets/history-stats-strip/` — 新規 widget（Stats Strip 表示）
- [x] `features/history-list/` — 新規 features（予約中 + 過去のグループ + 状態バッジ + キャンセル呼び出し）
- [x] `features/profile-stats/` — 既存 feature を縮小（履歴一覧 + キャンセルボタンを削除）
- [x] `widgets/bottom-tab-bar/` — 履歴タブのリンク + active 判定の正規化
- [x] `entities/reservation/` — 既存 `fetchMyReservations` を再利用（変更なし）
- [x] `features/booking/` — 既存 `useCancelBooking` + `CancelBookingDialog` を再利用（変更なし）

依存方向: `pages/HistoryPage → widgets/history-stats-strip + features/history-list → entities/reservation + features/booking → shared/api`

## デザイントークン使用確認

- 色は `var(--hq-*)` または Tailwind preset utility（`bg-paper` / `border-hairline` / `text-ink` / `text-muted` / `text-accent` 等）のみ
- 数値は `p-hq-*` / `gap-hq-*` / `rounded-hq-lg` 等のトークン経由
- マジックナンバー (`#fbf8f1` / `16px` 等) を直書きしない（既存 ProfilePage / StatsSection と整合）

## レスポンシブ

390px first（mobile）。`apps/reservation` は管理画面以外モバイル前提なので breakpoint 分岐は不要だが、横長表示でも崩れない最小限のチェックは行う。

## アクセシビリティ

- ヘッダの「履歴」見出しは `<h1>`、グループ見出しは `<h2>`
- Stats Strip は `<dl>` / `<dt>` / `<dd>` でセマンティック化
- 状態バッジは `aria-label` で日本語ラベル（「予約中」「参加済」など）を併記
- キャンセル Dialog はフォーカストラップ + `role="alertdialog"`（既存 `CancelBookingDialog` 継承）
- カラーコントラスト AA（既存トークンが満たす）

## DB / Supabase

DB マイグレーション・RLS 変更なし。既存テーブル `reservations` / `events` / `venues` のみ参照。

## 互換性 / Migration

破壊的変更なし。Bottom Tab Bar の履歴タブ遷移先が `/profile` → `/history` に切り替わる以外、ユーザー体験の後退はない。プロフィール画面 STATS の縮小は機能削減に見えるが、削除した機能は履歴画面に等価以上の形で移管されている。

## Risks / Trade-offs

- **STREAK 計算の意味付け**: MVP1 段階では `attended` の総数自体が少ないため、STREAK が常に 0〜1 ヶ月になりがち。Empty に近い表示で違和感を与える可能性がある → デザインサンプル準拠で表示する方針を維持し、運用で違和感が大きければ MVP2 で再考する
- **履歴行の押下無効**: 詳細画面 (Issue #213) が実装されるまでクリック不可とすることで、ユーザーが「押せそうで押せない」体験になる懸念 → 行のスタイル（hover なし / cursor: default）で「押せない」ことを視覚的に明示する。#213 マージ後すぐ `<router-link>` 化する想定
- **集計関数の重複**: `computeStats` (プロフィール) と `computeHistoryStats` (履歴) が併存し、`attended` の集計部分が重複する → 共通化のために本 change で抽象化レイヤーを増やすより、関数を 2 本に保ち重複を許容する（プロフィール側がいずれ削除/変更される可能性も見据えて）

## Migration Plan

PR マージで完了。デプロイ後、既存ユーザーの Bottom Tab Bar 履歴タブが `/history` を指し、プロフィール画面 STATS は集計 3 行のみに整理される。データ移行・スクリプト実行は不要。
