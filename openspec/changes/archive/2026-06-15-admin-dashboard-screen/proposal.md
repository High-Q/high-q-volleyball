## Why

サークルオーナーが毎朝開く admin の最初の画面が `/events` 一覧テーブルになっており、運営状況の「概況」が一目で掴めない。MVP1 で events / reservations / members / identity_documents の運用ループが回り始めた今、「累計の数字」「直近の動き」を集約した着地画面が無いと「先月比でどうか」「次の会で席が足りそうか」を毎回クエリで掘る必要がある。MVP2 第一弾として、ログイン直後の動線をサマリ画面に置き換え、運営の概況把握コストを下げる。

## What Changes

- admin の `/` を「ダッシュボード」画面に置き換える (現状の `/events` への redirect を廃止 **BREAKING**)
- ダッシュボードに以下の 4 ブロックを配置:
  1. 主要 4 指標の StatCard (今後のイベント / 累計参加者 / 今月の参加費合計 / 平均充足率)
  2. 直近イベント 3 件 (残席バー付き、行クリックで `/events/:id` へ遷移)
  3. 通知パネル: 既存データから算出する「満員直前イベント」「最近のキャンセル」のみ (メール送信失敗は Sentry 運用に委譲、本 change で notifications / email_logs 等の新規テーブルは追加しない)
  4. 最近の予約 4 件 (頭文字円 + 名前 + イベント + 経過時間。members に avatar 列を持たないため画像アバターは扱わない)
- 主 CTA「新しいイベントを作る」をヘッダ右側に配置 (押下で `/events/new` へ)
- サイドバーの active item を `dashboard` に切り替える

## Capabilities

### New Capabilities
- `admin-dashboard`: admin `/` の dashboard 画面の責務 (4 StatCard 指標の意味 / 直近イベント / 通知パネル / 最近の予約 / 4 状態網羅 / FSD 配置 / デザイントークン / a11y / テスト)

### Modified Capabilities
- `app-routing`: admin の `/` の到達先を「events 一覧へ redirect」から「dashboard 画面のマウント」に変更
- `data-schema`: dashboard が単一クエリで概況数値を取得するための集計 view (仮称 `admin_dashboard_view`) を新規追加。view の具体的列定義 / SECURITY モード / 集計ロジックは design.md で確定する

## Impact

- `apps/admin/src/app/router.ts`: `/` ルートのコンポーネント差し替え (redirect 廃止) + サイドバー active 連動
- `apps/admin/src/pages/`: 新規 `DashboardPage.vue`
- `apps/admin/src/widgets/`: 新規 dashboard 系 widget (StatCard 群 / 直近イベントリスト / 通知パネル / 最近の予約リスト)
- `apps/admin/src/features/`: dashboard 集計取得 / 通知集計の composable
- `apps/admin/src/entities/`: dashboard 集計 queryOptions
- `supabase/migrations/`: 集計 view 追加 migration (RLS 継承 / SECURITY モードは design 確定)
- 既存 `HomePlaceholder.vue`: 本 change の Sync で削除候補
- E2E: admin プロジェクトに dashboard happy path を 1 件追加 (CLAUDE.md の E2E 上限ルールに準拠)
- ドキュメント: `docs/05-インターフェース/01-UI設計方針.md` の admin ナビ動線記述を更新
