# 引き継ぎメモ — #286 江東区スポーツセンター空き枠 crawl

> `/clear` 後の再開用。まず `openspec/changes/koto-court-availability-crawler/tasks.md` を読めば spike 所見の詳細が全部ある。本ファイルは要点のみ。

## 基本
- **Issue**: #286「江東区スポーツセンターの土日祝空き枠を定期 crawl してオーナーへ通知」/ Epic #285
- **change**: `openspec/changes/koto-court-availability-crawler`（active）
- **ブランチ**: `feature/286-koto-court-availability-crawler`（master 未マージ）
- **進捗**: 14/27。第1〜3節 完了・コミット済（`e3b36d6` DB / `d18990a` crawlコア）

## 確定した設計事実（spike）
- **規約ゲート = GO**（禁止条項なし・オーナー目視確認済）。robots.txt=404
- **実行ランタイム = Playwright（GitHub Actions cron）**。理由: CULTOS 系のステートフル遷移ガード（cookie `cultos.attrib.session.token` / hidden `g_sessionid`、順序外POSTは「履歴で操作不可」で弾かれる）。素 fetch リプレイ不可 → design 一次案(Edge Function)は棄却、sync時に design.md 反映要
- **要会員ログイン**（オーナーの会員アカウントで自動ログイン方針を承認）
- **監視対象 = 大体育室「半面」のみ**（全面・小体育室は対象外）。種目 `riyosmk=2`（バレー）。6施設: スポーツ会館 / 深川 / 亀戸 / 有明 / 東砂 / 深川北 スポーツセンター
- **検索フロー**: 予約申込 → `g_bunruicd_1_show=1` → `riyosmk=2` → 全選択 → 検索。空きページ = `POST /koto_v2/reserve/gml_z_datetime_list`
- **結果HTML構造**: 見出し `日付/時間/室場名`、セル `td<行>_<列>`。**空き = `td.className="ok"`**（`<input type="image" src=".../timetable-o.gif" title="O">`）/ 埋まり = `class="ng"`（Ｘ）/ 対象外 = `class="empty"`

## 完了済（第1〜3節）
- 第2節 DB: `supabase/migrations/20260808000000_court_availability_notifications.sql`。dev 適用済・verify_grants OK（anon/authenticated=全false, service_role=CRUD）。**dev の migration ドリフト2件(20260623/20260726)は `migration repair --status applied` で解消済**
- 第3節 コア: `packages/court-crawler/`（@high-q/court-crawler）。`src/core/` に reconcile / filter(土日祝・Sakamoto) / format(JST・複数枠集約) / failure / politeness。vitest 27件緑・typecheck OK

## 次にやること（第4〜7節）
- **4.2 パーサ（先にやる・TDD可）**: 結果HTML → `AvailabilitySlot[]`。⚠️ `/tmp/koto_result.html` は**オーナーのPII・セッショントークン混入の恐れ**→ repo fixture にはそのまま入れず、**構造だけ写した合成HTML fixture**を作る。HTML パーサ依存（node-html-parser 等）を court-crawler に追加
- **4.1 Playwright 遷移**: login→検索→結果取得。通し検証は live ログイン必須（オーナーが新PWで実行）
- **4.3 コア×アダプタ結線**（対象日→空き枠→reconcile→通知）
- **5.1 ⚠️ 外部依存**: オーナーが LINE 公式アカウント（プロバイダ+チャネル）作成 → channel access token / 送信先 user ID 取得。**秘密は GitHub Secrets にオーナーが直接登録**（コード/会話に出さない）
- **5.3** LINE push 実装 / **6** GitHub Actions schedule(20分) / **7** dev e2e + `pnpm --filter @high-q/court-crawler test`

## セキュリティ備考
- codegen で採った資格情報が一度平文露出 → **オーナーは既にスポーツネットのPW変更済**
- 実パスワード/token はレムに渡さない。GitHub Secrets にオーナーが直接投入

## 有用コマンド
- テスト: `pnpm --filter @high-q/court-crawler test` / 型: `pnpm --filter @high-q/court-crawler typecheck`
- dev SQL: `pnpm exec supabase db query --linked --file <path>`（link先=dev ydkejnlivlzypizrmhwh を必ず確認）
