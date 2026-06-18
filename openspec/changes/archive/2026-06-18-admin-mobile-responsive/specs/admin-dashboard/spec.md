## MODIFIED Requirements

### Requirement: `/` ダッシュボード画面の構成

`apps/admin` の `/` 画面 (Dashboard) は、admin 認証 (AAL2 + admin ロール) 下で MUST 以下の 4 ブロックを縦方向に配置し、サークル運営の概況を一目で把握可能にする:

1. **StatCard 4 枚** — 「今後のイベント」「累計参加者 (今月)」「今月の参加費合計」「平均充足率 (直近 6 ヶ月)」を横並び (PC) / 縦並び (モバイル) のグリッドで表示
2. **直近イベント 3 件** — 開催予定の published イベントを start_at 昇順で 3 件、残席バー付きで表示
3. **通知パネル** — 「満員直前イベント」「最近のキャンセル」の 2 種類のみを表示 (メール送信失敗は本画面の対象外)
4. **最近の予約 4 件** — 直近の reservation 4 件を頭文字円 + 氏名 + イベント名 + 経過時間で表示

直近イベント (メイン) と 通知 / 最近の予約 (サイド) の 2 カラムは MUST デスクトップで横並び、モバイル (< `md`) で縦積み (メイン → サイドの順) になる。

ページ header 右側に主 CTA「新しいイベントを作る」を SHALL 配置し、押下で `/events/new` へ遷移する (モバイルではシェルのアプリバー右へ Teleport 表示する)。**会員一覧 / 本人確認書類 (pending Badge 付き) / ログアウト 等のグローバルナビはページ header に持たず、`admin-responsive-shell` capability のサイドバー / ドロワーから提供される。**

#### Scenario: 認証済み admin で `/` を開く
- **WHEN** AAL2 + admin ユーザーが `/` にアクセス
- **THEN** Dashboard 画面が描画され、4 ブロックすべてが表示される (Loading 完了後)

#### Scenario: 未認証アクセス
- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: 非 admin アクセス
- **WHEN** AAL2 だが `role != 'admin'` のユーザーが `/` にアクセス
- **THEN** 自動サインアウトされ `/login?reason=not-admin` にリダイレクトされる

#### Scenario: 主 CTA からの遷移
- **WHEN** ユーザーが「新しいイベントを作る」を押下
- **THEN** `/events/new` に遷移する

### Requirement: 4 状態の網羅

Dashboard 上の各 widget は MUST 以下 4 状態を出し分ける:

- **Loading** — 初回マウントまたはリフェッチ中。`Skeleton` プリミティブで各 widget に対応する形状を描画
- **Empty** — クエリ結果が要件を満たさない (件数 0 等)。widget 固有のメッセージと、必要に応じて CTA を表示
- **Error** — クエリ失敗。`role="alert"` 付きのコンテナにエラーコード (例: `ERR · supabase / admin_dashboard_view · 503`) と「再試行」CTA を表示。再試行は widget 単位で発火し、ページ全体を再ロードしない
- **Success** — 通常表示

ページ header の主 CTA、およびシェル (`admin-responsive-shell`) が提供するナビ + ログアウトは MUST widget の Error 状態の影響を受けず常に機能する。

#### Scenario: Error の局所化
- **WHEN** StatCard の集計クエリが失敗、他 widget は成功
- **THEN** StatCard ブロックのみ Error 表示になり、直近イベント / 通知 / 最近の予約 / ページ header / シェルのナビ (ログアウト含む) は通常表示される

#### Scenario: 再試行 CTA
- **WHEN** ユーザーが Error 状態の widget で「再試行」を押下
- **THEN** 当該 widget のクエリのみが refetch され、Loading → Success / Error に遷移する
