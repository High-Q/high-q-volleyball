## 1. 規約ゲート & 技術 spike（GO/NO-GO — ここを通るまで実装しない）

<!-- spike 所見 (2026-07):
  1.1 robots.txt = HTTP 404（存在せず）→ 明示的なクロール禁止指定なし
  サイトは Shift-JIS のレガシー・サーバレンダリング HTML（SPA ではない）→ Edge Function 経路が技術的に成立
  トップ掲載の riyoukitei.pdf は「クライミングウォール団体利用規定」で system ToS ではない
  公開ページ・robots・PDF いずれにも「自動アクセス/プログラム収集の禁止」条項は見つからず（authoritative な system 利用規約はログイン内 or system_help.pdf の可能性）
  空き照会のログイン要否は未確定（reserve メニューが遷移フロー先）-->

- [x] 1.1 `yoyaku.koto-sports.net/robots.txt` を取得し `Disallow` / `Crawl-delay` を記録する → **404（robots.txt 無し・指定なし）**
- [x] 1.2 利用規約ページを確認し「自動アクセス / プログラムによる収集の禁止」条項の有無を記録する。明確に禁止なら本 change を中止し、判断根拠を proposal 成功基準にメモして報告 → **GO（2026-08-07 オーナー確認）**。公開 HTML（トップ / start.html / gin_menu の生 Shift-JIS）に禁止条項なし。authoritative な system_help.pdf / 利用者登録時の規約もオーナー目視で禁止条項なしを確認。robots.txt = 404。→ 決定0 の中止条件に非該当
- [x] 1.3 空き状況照会が「素の HTML / 公開 JSON」で取れるか「SPA / JS レンダリング必須」かを実地確認し、実行ランタイムを確定（素 HTML → Edge Function 経路 / SPA → GitHub Actions + Playwright 経路）→ **サーバHTML（Shift-JIS）だが CULTOS 系のステートフル遷移ガードあり（cookie `cultos.attrib.session.token` / hidden `g_sessionid`）。順序外 POST は「ブラウザの履歴を使って操作できません」で弾かれる。素 fetch リプレイは脆いため → 実行ランタイムは Playwright（GitHub Actions）経路を本命に採用。理由は「SPA だから」ではなく「ステートフルなセッション遷移の正確な追従が必要だから」（2026-08-07 spike）**
- [x] 1.4 空き照会にログインが必要かを確認する。要ログインなら区内登録アカウント要否・規約影響を報告して方針を仰ぐ → **要ログイン確定（2026-08-07）**。gin_menu に「利用するには事前に利用者登録が必要。登録用紙は区内スポーツセンター受付へ」と明記。照会は認証エリア内。→ **オーナーの会員アカウントで自動ログインする方針を承認（2026-08-07）**。20分間隔・単一施設・最小リクエストの politeness 前提
- [x] 1.5 バレーボール利用可能な体育室・種目を同定し、対象施設 / 室 / 種目の識別子リストを確定（アダプタ設定として持つ）→ **確定（2026-08-08）**。種目 = `riyosmk=2`（バレーボール、選択肢の上から2番目）。検索フロー = 予約申込 → `g_bunruicd_1_show=1`（分類）→ `riyosmk=2` → 全選択 → 検索。**監視対象 = 大体育室「半面」のみ**（全面・小体育室は対象外）。対象6施設: スポーツ会館 / 深川 / 亀戸 / 有明 / 東砂 / 深川北 スポーツセンター（各 大体育室 半面）。実データで空き O を確認済（スポーツ会館 全/半面・東砂 半面）→ パーサ判定 `class="ok"` を実証
- [x] 1.6 照会リクエスト列（必要なセッション / パラメータ / エンドポイント）とレスポンス形式のサンプルを 1 枠分取得しておく→ **大半取得（2026-08-07）**。Playwright codegen で全遷移採取（`/tmp/koto_flow.spec.ts`・秘密は伏字化済）。空きページ = `POST /koto_v2/reserve/gml_z_datetime_list`。結果 HTML 構造: 見出し `日付/時間/室場名`、セル `td<行>_<列>`、`class="ng"`＝Ｘ（埋まり）/ `class="empty"`＝空欄。サンプル `/tmp/koto_result.html`（147KB）は全枠 Ｘ だが、**描画 JS から ○ セル構造を復元済**: 空き = `td.className="ok"`（`<input type="image" src=".../timetable-o.gif" title="O" onClick="onclickbutton(...)">`）/ 埋まり = `class="ng"` / 対象外 = `class="empty"`。→ 追加採取不要。全埋まり HTML を「空きゼロ」fixture に、○ は既知構造で合成 fixture を作ってパーサ TDD 可能

## 2. DB: 通知済み空き枠テーブル

- [x] 2.1 `supabase/templates/new_table.sql` を起点に `court_availability_notifications` の migration を作成（列は data-schema spec 準拠、枠署名 UNIQUE 制約、末尾 `-- ROLLBACK:` に DROP 手順）
- [x] 2.2 RLS 有効化 + ポリシー（`anon` / `authenticated` は不可、`service_role` のみ CRUD）と 3 ロール明示 GRANT を書き切る
- [x] 2.3 dev に適用し `supabase db query --linked --file supabase/tests/verify_grants.sql` で権限状態を確認（anon/authenticated に権限が付いていないこと）

## 3. crawl コア（施設非依存・TDD）

- [x] 3.1 差分 reconcile ロジックを実装（現在空き A と通知済み B から「新規通知対象 = A−B」「記録解除対象 = B−A」を算出）+ ユニットテスト
- [x] 3.2 対象フィルタ（土日祝判定 / 過去日・最小リードタイム除外）を実装 + ユニットテスト（祝日判定は軽量な方法を選定）
- [x] 3.3 通知メッセージ整形（会場名 / 日時（曜日つき）/ 予約 URL、複数枠を 1 通に集約）を実装 + ユニットテスト
- [x] 3.4 失敗記録（到達不可 / HTTP エラー / パース 0 件継続）を Sentry に送るハンドリングを実装
- [x] 3.5 politeness 制御（Crawl-delay 順守 / 20 分間隔 / 単一施設・最小リクエスト）を組み込む

## 4. 江東区アダプタ（施設固有）

- [x] 4.1 江東区スポーツネットの照会手順を実装（1.6 のリクエスト列に基づく）→ **コード実装（2026-08-09）**。`driver.ts`（`login` / `openVolleyballGrid` / `collectAvailability`）+ `config.ts`（施設定数・`isMonitoredVenue`）+ `parseSelectDate`。ログイン〜検索到達のセレクタは codegen 準拠。`#rightbutton` 日送りで各日グリッドを読み集約。playwright 依存追加。⚠️ **日付選択/日送りナビの通し検証は live ログイン必須（オーナー・新PW）**。単体は parse/selectdate/isMonitoredVenue のみ（driver はブラウザ I/O）
- [x] 4.2 レスポンスから空き枠（会場名 / 日付 / 開始・終了 / 予約 URL）をパースする関数を実装 + サンプルレスポンスでユニットテスト → **完了（2026-08-08）**。`packages/court-crawler/src/adapters/koto-sports/parse.ts`（`parseAvailability(html, {slotDate, reserveUrl, facility?})`）。`class="ok"` セルを抽出、thead 時間帯を開始・終了 ISO8601(+09:00) に対応づけ、会場名を「施設名 室場名」に正規化、予約リスト(カート)テーブルは除外。node-html-parser 依存追加。合成 fixture（`__fixtures__/result-mixed.html` / `result-all-full.html`・PII/セッショントークンなし）で vitest 7件。**実 HTML は g_sessionid 混入のため repo 非投入**
- [x] 4.3 コアとアダプタの結線（「対象日リスト → 空き枠リスト」をアダプタが返し、コアが reconcile / 通知）→ **完了（2026-08-09）**。`src/run/crawl.ts`（`runCrawl(deps)`: collect → 監視室場/土日祝/リードタイム絞り込み → reconcile → LINE push → ストア更新、失敗は reporter に記録）+ `src/store/`（`NotifiedStore` 抽象 + `createSupabaseNotifiedStore` service_role 実装）+ `src/notify/sentry-reporter.ts`（DSN 任意）+ `src/run/koto.ts`（composition root・env から秘密取得・Playwright 起動）+ `holidays.ts`（`@holiday-jp/holiday_jp`）。⚠️ **署名 instant バグ修正**: `slotSignature` を UTC ISO 正規化（DB 往復 +09:00→Z の重複通知防止）。in-memory fake で runCrawl を vitest 7 件（新規/再通知抑止/記録解除/push失敗非記録/parse_empty/unreachable/フィルタ）

## 5. LINE Messaging API 通知

- [x] 5.1 LINE 公式アカウント（プロバイダ + チャネル）を作成し、channel access token と送信先 user ID を取得 → **オーナー完了（2026-08-09）**。Messaging API チャネル作成、channel access token (long-lived) と Basic settings の user ID を取得
- [x] 5.2 token / user ID を Secrets に登録（Playwright 経路 → GitHub Secrets）。ハードコード禁止 → **オーナー完了（2026-08-09）**。`KOTO_LINE_CHANNEL_TOKEN` / `KOTO_LINE_TO_USER_ID` / `KOTO_USER_ID` / `KOTO_PASSWORD`（新PW）/ `KOTO_SUPABASE_URL` / `KOTO_SUPABASE_SERVICE_ROLE_KEY`（dev の `sb_secret_...`）を High-Q/high-q-volleyball の Repository secrets に登録済み
- [x] 5.3 LINE push 送信処理を実装（3.3 の整形メッセージを送信、送信失敗も Sentry 記録）→ **完了（2026-08-09）**。`packages/court-crawler/src/notify/line.ts`（`pushLineMessage(config, text, fetchImpl?)`）。`POST https://api.line.me/v2/bot/message/push`、token/宛先は Secrets 注入、5000 字上限で切り詰め、HTTP エラー・ネットワーク例外は握って `ok:false` を返す。送信失敗の Sentry 記録は結線側（4.3）が `LinePushResult` を見て `reportCrawlFailure` する。fetch 注入で vitest 5 件

## 6. スケジューラ結線（1.3 の確定経路に従う）

- [x] 6.1 【Playwright 経路】GitHub Actions `schedule` workflow を作成 → **完了（2026-08-09）**。`.github/workflows/court-crawler-koto.yml`。`cron: */20 * * * *`（20分間隔・design 決定3）+ `workflow_dispatch`。concurrency で直列化（politeness）。permissions `contents: read`。pnpm store + Playwright browser キャッシュ、`playwright install --with-deps chromium` → `pnpm --filter @high-q/court-crawler crawl:koto`。**public repo のため Actions 分は無料・無制限**（費用ゼロ方針に合致）
- [x] 6.2 スケジューラの秘密情報・エンドポイント設定を確認（Playwright 経路は Secrets 参照）→ **完了（2026-08-09）**。workflow env で 6 秘密（`KOTO_USER_ID` / `KOTO_PASSWORD` / `KOTO_LINE_CHANNEL_TOKEN` / `KOTO_LINE_TO_USER_ID` / `KOTO_SUPABASE_URL` / `KOTO_SUPABASE_SERVICE_ROLE_KEY`）+ 任意 `KOTO_SENTRY_DSN` を参照。Playwright 経路なので関数 URL・認証は不要

## 7. 動作確認 & 最終チェック

- [ ] 7.1 dev で end-to-end 確認: 既知の（または擬似的に用意した）空き枠で LINE 通知が届く → ⏳ **マージ後にオーナー実行**。新規 workflow は feature branch から dispatch 不可のため merge 後に `workflow_dispatch` で実行し、実ログイン（新PW）で LINE 到達を確認
- [ ] 7.2 重複通知が出ないこと / 埋まって再度空いた枠が再通知されることを確認 → ⏳ **マージ後にオーナー実行**（reconcile はユニットテスト済・実データで最終確認）
- [ ] 7.3 到達不可・パース不能を擬似発生させ Sentry に記録されることを確認 → ⏳ **マージ後にオーナー実行**（`KOTO_SENTRY_DSN` 設定時。未設定なら Actions ログで確認）
- [x] 7.4 `pnpm exec vitest run`（コア/アダプタのユニットテスト）を通す → **完了（2026-08-09）**。`pnpm --filter @high-q/court-crawler test` = 全 55 件緑・`typecheck` OK
- [x] 7.5 robots.txt / 利用規約の確認結果を proposal 成功基準にチェックとして反映 → **完了（2026-08-09）**。proposal.md 成功基準の第1項に GO 判断（robots 404 / 禁止条項なし）を反映
