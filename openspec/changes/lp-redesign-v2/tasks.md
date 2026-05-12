## 1. 準備 / 環境変数とトークン基盤

- [x] 1.1 `apps/lp` 側に reservation サイト URL 用環境変数 `VITE_RESERVATION_URL` を導入する（手動追記分は `notes/manual-env-changes.md` に集約。PR 前に翔太郎くんが追記）
- [x] 1.2 LP の `main.js` で `@high-q/design-tokens/tokens.css` を import する（`apps/lp/src/main.js:1` で既に import 済み）
- [x] 1.3 LP の `package.json` に `@high-q/ui` を workspace 依存として追加する（`@high-q/ui` の `Photo` / `Button` / `Kicker` / `Badge` / `RemainBar` を採用）

## 2. LP 新セクション実装（HQ トークン基盤）

- [x] 2.1 `apps/lp/src/widgets/site-header/`（仮称）を新設し、新デザインの薄いヘッダー（モバイル幅前提）を HQ トークン経由で実装する。旧アンカーナビ・スクロール連動演出は削除
- [x] 2.2 `widgets/hero-first/HeroFirst.vue` を新設：背景写真プレースホルダー + 縦グラデーション + ヘッドコピー + 「体験参加してみる」一次 CTA。CTA は reservation サイトに繋ぐ
- [x] 2.3 `widgets/next-session-strip/NextSessionStrip.vue` を新設：直近の未来イベント 1 件を取得し、日付・名称・会場・時間帯と予約導線を帯表示。未来イベント 0 件時は別文言または非表示
- [x] 2.4 `widgets/reassurance-strip/ReassuranceStrip.vue` を新設：持ち物・服装・参加費を要点化したカード
- [x] 2.5 `widgets/meta-strip/MetaStrip.vue` を新設：エリア・開催曜日・頻度の 3 カラム表示
- [x] 2.6 `widgets/about-section/AboutSection.vue` を新設：紹介テキスト + 写真プレースホルダー
- [x] 2.7 `widgets/features-section/FeaturesSection.vue` を新設：3 つの「ちょうどよさ」を縦並びカード型で表示
- [x] 2.8 `widgets/first-time-flow/FirstTimeFlow.vue` を新設：当日の流れ（6 ステップ）を縦のタイムライン形式で表示
- [x] 2.9 `widgets/worries-section/WorriesSection.vue` を新設：不安への Q&A を 4 件、ダークテーマで表示
- [x] 2.10 `widgets/event-list/EventList.vue` を新設：イベント一覧をカード形式で表示し、満員間近の視覚強調と予約導線（reservation サイトへ `event` クエリ付きで遷移）を備える。データ取得は Issue #228 で Supabase 経路に切替済みの `entities/event/api/eventQueries.js` をそのまま利用する
- [x] 2.11 `widgets/faq-section/FaqSection.vue` を新設：6 件の FAQ を折りたたみ式で表示
- [x] 2.12 `widgets/not-for-you/NotForYouSection.vue` を新設：合わない方への注記 3 件
- [x] 2.13 `widgets/gallery-sns/GallerySnsSection.vue` を新設：4 枚の写真プレースホルダー + Instagram / X リンクボタン
- [x] 2.14 `widgets/final-cta/FinalCtaSection.vue` を新設：背景写真プレースホルダー + reservation サイトへの一次 CTA + LINE オープンチャット補助 CTA
- [x] 2.15 `widgets/site-footer/SiteFooter.vue` を新設または既存フッターを刷新：サークル名・紹介・SNS リンク・法務リンク群（プライバシーポリシー／外部送信ポリシー／Cookie 設定）・コピーライトを HQ トークンで実装
- [x] 2.16 `apps/lp/src/pages/home/ui/HomePage.vue` を新セクション群に置き換え、表示順（ヒーロー → 次回開催帯 → 安心ストリップ → 開催メタ → 紹介 → 特長 → 当日の流れ → 不安への回答 → イベント一覧 → FAQ → 合わない方への注記 → ギャラリー＆SNS → 最終 CTA → フッター）で構成する
- [x] 2.17 旧 widget（`hero-section` / `concept-section` / `activities-section` / `event-calendar`）の参照を全て解除し、不要になったコードを削除（残置がないか grep で確認）

## 3. 既存仕様の維持と回帰確認

- [x] 3.1 IntersectionObserver ベースのフェードイン演出を新セクション群にも適用し、`prefers-reduced-motion` ユーザーに対する即時表示フォールバックが効くことを確認
- [x] 3.2 ConsentBanner / Cookie 設定 / プライバシーポリシー / 外部送信ポリシー画面が新フッター経由で到達できることを確認
- [x] 3.3 GTM の「同意後ロード」挙動が新ヘッダー・新 main.js 経路でも維持されていることを確認
- [x] 3.4 LP 内の色値ハードコードが残っていないか grep（HQ トークンに無い色値・旧 Vuetify 4 色）で検査し、検出ゼロにする

## 4. テストと検証（最終確認タスクで一括）

- [x] 4.1 `pnpm --filter @high-q/lp test` を実行し、全 widget の unit/component テストが緑で通ることを確認
- [x] 4.2 `pnpm build:lp` を実行し、ビルドが成功することを確認
- [x] 4.3 Playwright E2E（happy path：トップ表示 → 次回開催帯確認 → イベントカード CTA / 最終 CTA で reservation サイトへの遷移 URL とクエリパラメータが正しいことを確認、を 1〜2 件）を追加・実行
- [ ] 4.4 `pnpm dev:lp` または Render PR Preview でモバイル幅（420px）・タブレット幅・デスクトップ幅の各表示と主要動線（ヒーロー CTA / 次回開催帯 CTA / イベントカード CTA / 最終 CTA / フッター法務リンク）を翔太郎くんと一緒に視認確認

## 5. PR 作成と sync / archive 前準備

- [ ] 5.1 ブランチ名 `feature/160-lp-redesign-v2` で PR を作成し、Issue #160 をリンク
- [ ] 5.2 Render PR Preview の URL を翔太郎くんに案内し、確認結果を待つ（OK 後に `/opsx-ship` フローへ）

---

## 本 change から切り出した別 Issue（いずれも完了済み）

本 change の Propose 時点では一体で扱っていたが、スコープ過大のため以下を別 Issue として切り出し済み。本変更着手時点ですべて master に merge 済みであり、本 change は完了状態の上に乗る前提で実装する。

- **Issue #228（旧 Issue B）**: LP のイベント取得を AWS API Gateway から Supabase に切替（PR #231 で完了）
- **Issue #229（旧 Issue C）**: reservation 側で LP からのイベント指定遷移を受ける入口を実装（PR #236 で完了）
- **Issue #230（旧 Issue D）**: AWS DynamoDB → Supabase events 一度きり移行スクリプト（PR #232 で完了）

`notes/aws-mapping.md` は Issue #230 の作業に流用済み。
