## Why

会場確保はイベント開催の最大ボトルネックで、江東区スポーツネット（`yoyaku.koto-sports.net`）の人気枠は土日祝のキャンセルが頻発するが、手動チェックでは取り逃す。予約システムを定期的に自動照会し、土日祝のバレーボール可能枠に空きが出たら**キャンセルが埋まる前に**オーナーへ即通知することで、会場確保＝イベント開催機会を増やす。

> 前提の訂正: Issue #286 は通知手段として「LINE Notify」を挙げているが、LINE Notify は **2025-03-31 に終了済み**。本変更では後継の **LINE Messaging API（公式アカウントのプッシュ）** を採用する。

## What Changes

| 観点 | 変更前 | 変更後 |
|------|--------|--------|
| 空き枠の把握 | オーナーが手動でサイトを巡回 | 定期 crawl が土日祝のバレー可能枠を自動照会 |
| 気づくタイミング | たまたま見たとき | 空きが出た直後にオーナーの LINE へプッシュ通知 |
| 通知内容 | なし | 会場名 / 日時 / 予約 URL |
| 重複 | なし | 同一空き枠は一度だけ通知（再検知でも鳴らさない） |
| 失敗検知 | なし | crawl 失敗は Sentry に記録し気付ける |
| 規約順守 | 未確認 | 実装前に robots.txt / 利用規約を確認し、自動アクセス禁止なら着手しない |

- 江東区スポーツネットを定期照会し、土日祝・バレーボール利用可能な体育室の空き枠を検知する
- 検知した空き枠（会場名 / 日時 / 予約 URL）をオーナーの LINE へ Messaging API でプッシュ通知する
- 一度通知した空き枠を記録し、再検知しても重複通知しない
- crawl 失敗（到達不可・レイアウト変化・パース失敗）を Sentry に記録する
- **実装前ゲート**: robots.txt / 利用規約で自動アクセスの可否を確認し、禁止なら本変更を中止して報告する
- 将来の Bumb（東京スポーツ文化館）用 Issue で再利用できるよう、crawl コアと施設固有アダプタを分離する

## Capabilities

### New Capabilities
- `court-availability-crawl`: 公的施設予約サイトを定期 crawl し、対象条件（施設・曜日）に合う空き枠を検知して、重複を排除しつつオーナーへ通知する。crawl コア（スケジュール・取得・差分検知・通知・失敗記録）と施設固有アダプタ（江東区スポーツネットの照会・パース）を分離する。

### Modified Capabilities
- `data-schema`: 通知済み空き枠を記録するテーブルを追加する（重複通知防止のための状態。RLS 付き）。

## Impact

### 影響するコンポーネント・ファイル
- `supabase/functions/`: crawl + 通知を行う新規 Edge Function（施設アダプタ + 共通コアを `_shared/` に配置）
- `supabase/migrations/`: 通知済み空き枠テーブル + RLS + 3 ロール GRANT。スケジューラに pg_cron を使う場合は cron 登録も
- スケジューラ基盤: pg_cron（Supabase ネイティブ）または GitHub Actions scheduled workflow のいずれか（技術 spike の結果で design 確定）
- LINE Messaging API: 新規 LINE 公式アカウント + チャネル。channel access token / 送信先 user ID は Supabase Secrets 管理
- `error-monitoring`（既存）: crawl 失敗を Sentry へ送出

### 影響しない範囲（Non-Goals）
- 自動予約（通知のみ。予約は人手で行う）
- 平日枠 / 江東区以外の施設（Bumb は別 Issue で本コアを再利用）
- 会員向けの空き枠表示（本変更はオーナー個人への通知に限定）
- LINE 以外の通知チャネル（メール併用は今回入れない）

## 制約・前提条件
- **費用ゼロ方針**: Supabase / GitHub Actions / LINE Messaging API いずれも無料枠内で完結させる（LINE 無料枠は月 200 通程度、空き枠通知は少量のため収まる見込み）
- **規約ゲート**: robots.txt / 利用規約が自動アクセスを禁止していないことが着手の絶対条件。禁止なら本変更は中止する
- **技術未確定点（spike で確定）**: 対象サイトが素の HTML か SPA か、空き照会がログイン要否か。素 HTML かつログイン不要なら Edge Function（Deno fetch）で完結、SPA なら GitHub Actions + Playwright へ切替
- `service_role` はクライアント露出禁止（Edge Function 内のみ）。新規テーブルは RLS 必須・3 ロール明示 GRANT
- Secrets（LINE token 等）はコードにハードコードせず Supabase Secrets / GitHub Secrets で管理

## 成功基準
- [x] robots.txt / 利用規約を確認し、自動アクセスが許容されることを記録した（禁止なら中止判断を記録）→ **GO（2026-08-07 確認）**。robots.txt = HTTP 404（クロール禁止指定なし）。公開 HTML（トップ / start.html / gin_menu）・system_help.pdf・利用者登録時の規約いずれにも「自動アクセス / プログラム収集の禁止」条項なし（オーナー目視確認済）。低頻度（20分間隔）・単一施設・最小リクエストの politeness 前提で着手
- [ ] 土日祝・バレー可能枠に空きが出ると、会場名 / 日時 / 予約 URL がオーナーの LINE に届く
- [ ] 同一空き枠は初回のみ通知され、以降の crawl で重複通知が出ない
- [ ] crawl 失敗時に Sentry へ記録され、通知は止まっても静かに落ちない
- [ ] crawl コアと江東区アダプタが分離され、Bumb 用に再利用できる構造になっている
