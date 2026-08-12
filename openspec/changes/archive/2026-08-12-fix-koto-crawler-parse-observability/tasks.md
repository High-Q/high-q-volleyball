## 1. 実 HTML の診断（原因の一次データ採取）

- [x] 1.1 `packages/court-crawler` に副作用のない診断モードを一時追加する（環境変数フラグで起動。LINE 送信・ストア更新をせず、対象日のグリッド構造だけを出力する）。出力は sanitize し、会場名・時刻・各セルのタグ名/class/空きシグナル（予約ボタン画像 `timetable-o.gif` / `onclick` の有無）だけを構造として出す。HTML 全文・認証情報・`g_sessionid`・PII は出力しない
- [x] 1.2 診断モードを fix ブランチに push し、既存 workflow `court-crawler-koto.yml` を `workflow_dispatch`（feature branch から実行）で起動。空き枠が実在すると分かる直近の土日祝（例: 山の日・東砂スポーツセンター 大体育室 半面）を含む複数日をダンプする
- [x] 1.3 ダンプ結果から根本原因を特定・記録した（design 診断結果に反映）。**原因 A**: 空き class（`ok`）が消滅し、空きは予約導線（予約ボタン画像 / `onclick`）だけで表現される。**原因 B**: 結果グリッドに監視対象（6 施設 × 大体育室 半面）が現れず、既定の 1 施設・1 室場（全面）しか検索できていない。読み取りタイミング説は棄却
- [x] 1.4 原因 B 用の追加診断を実施: 選択状態スナップショット / 結果ナビ / グリッドタグ骨格 / tbody 全行の生構造ダンプへ診断モードを拡張し、複数回 dispatch で特定。結果「全選択」は正常で、真因はグリッドが室場ごとの複数 tbody 構造（パーサが最初の 1 tbody しか読んでいない）と判明

## 2. 根本修正（原因 A: パース）

- [x] 2.1 空き判定を class 依存（`ok`）から予約導線シグナル主軸へ切り替えた（`parse.ts` `isAvailableCell`）: 空き = 予約ボタン画像（`timetable-o.gif`）あり、埋まり(`ng`)・対象外(`empty`)は除外。旧 `ok` も後方互換で許容。driver のグリッド確定待ちにも予約画像を追加
- [x] 2.2 修正は `parse.ts` の純粋関数内に閉じ、crawl コア（施設非依存）は無改変。江東区固有値（`timetable-o.gif`）は koto アダプタ内に限定し、コアへ漏らさない

## 2b. 根本修正（原因 B: 全 tbody 走査）

- [x] 2b.1 診断で原因 B の真相を特定: 「全選択が効かない」ではなく、グリッドが「1 テーブル × 室場ごとの複数 tbody」構造で、パーサが最初の tbody だけ読んでいた。`parseAvailability` / `hasAvailabilityGrid` を全 tbody 走査に修正（driver の選択・検索は正常のため無改変）
- [x] 2b.2 ground truth（8/11 東砂スポーツセンター 大体育室 半面 18:00-21:30 の空き）が検出され `isMonitoredVenue`（大体育室 && 半面）を通過することを回帰テストで固定（実 run 確認は 5.3）

## 3. 回帰テスト（再発防止）

- [x] 3.1 実 HTML 構造を PII・セッション情報除去済みの新 fixture に落とした（`__fixtures__/result-koto-real.html`: 複数 tbody・class なし空きセル + 予約画像・hidden input 挟み込み・ground truth 東砂 半面 18:00）
- [x] 3.2 新 fixture で「複数 tbody 全走査」「class なし + 予約画像を空きと判定」「ng/empty 除外」「hidden input で列ずれしない」を固定する回帰テストを `parse.spec.ts` に追加（計 21 件緑）

## 4. 観測性（空き検知 funnel と静かな 0 の異常化）

- [x] 4.1 crawl 結果サマリ（`CrawlSummary`）に funnel を追加した: 読めたグリッド日数 / 生の空き枠数 / 監視室場フィルタ後 / 通知候補 / 新規通知 / 記録解除
- [x] 4.2 funnel を GitHub Actions ログ（`[court-crawler] summary`）と job summary（`writeJobSummary` → `$GITHUB_STEP_SUMMARY`）に出力。DSN 未設定でも run 一覧で段階別件数と「生 0 件」警告が見える
- [x] 4.3 「グリッド > 0 かつ 生の空き枠 = 0」を parse_empty 異常として reporter に送る（既存のグリッド 0 件とは文言・context `scannedDays` で区別）。回帰テスト（静かな 0 検知 / funnel 件数）を追加（crawl.spec 9 件緑）
- [x] 4.4 workflow に DSN 設定推奨と funnel/job-summary フォールバックを明記。DSN 実設定の要否は最終確認で翔太郎くんに確認（5.3）

## 5. 診断足場の撤去と最終確認

- [x] 5.1 診断モード（KOTO_DIAGNOSE / snapshot 群 / onDay フック / workflow diagnose 入力）を全撤去し、恒久観測（funnel + 静かな 0 異常化）だけを残した。生 HTML をログに残す経路が本番に無いこと（`page.content()` は正規クロール読取のみ）を grep で確認
- [x] 5.2 `pnpm --filter @high-q/court-crawler exec vitest run` で全 63 件緑 / typecheck 緑
- [x] 5.3 修正ブランチを通常モードで dispatch し実機検証（JST 10:03・営業時間内）: funnel = scannedDays 38 / rawSlots 20 / monitoredSlots 14 / targetSlots 14 / notified 14 / released 0、異常ゼロ・`ok:true` で監視室場（大体育室 半面）の空き 14 枠が実 LINE 配信された（原因 A/B 解消をエンドツーエンドで確認）。DSN 実設定は翔太郎くんが後続で実施予定
