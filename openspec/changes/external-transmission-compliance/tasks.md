## 1. packages/shared に consent 基盤を実装

- [x] 1.1 `packages/shared/src/consent/` に型定義（`ConsentCategory` / `ConsentDecision`）を新設し vitest で型ガード仕様を書く
- [x] 1.2 `getConsent()` / `setConsent()` / `onConsentChange()` を実装し localStorage `hq.consent.v1` で読み書きする（localStorage 無効環境のフォールバック含む）
- [x] 1.3 `packages/shared` の Public API (`index.ts`) から consent モジュールを export する
- [x] 1.4 vitest で `getConsent` / `setConsent` / `onConsentChange` のラウンドトリップ・無効値拒否・onChange 配信を検証する
- [x] 1.5 `pnpm --filter @high-q/shared build` が通ることを確認する

## 2. `/external-transmission` ページを LP に新設

- [x] 2.1 `apps/lp/src/pages/external-transmission/` に Vue ページを新設しルート登録する（path-based switch + render.yaml SPA rewrite で対応）
- [x] 2.2 ページ本文に外部送信先テーブル（5 カラム × 全件）を Vuetify で組み立てる
- [x] 2.3 ページ末尾に「Cookie 同意設定を変更する」アクションと最終更新日 / 問い合わせ先 mailto を表示する
- [x] 2.4 vitest で「テーブル全件描画」「同意設定再展開ボタン押下で `setConsent` UI が起動」のコンポーネントテストを書く

## 3. LP に Cookie 同意バナーを実装し GTM を consent gate 化する

- [x] 3.1 `apps/lp/src/widgets/consent-banner/` に Vuetify 製バナーを実装（「すべて受け入れる」「必須のみ」「設定」3 ボタン + 詳細パネルで analytics トグル）
- [x] 3.2 `App.vue` 配下にバナーを常設し、`getConsent()` 結果が null のときのみ表示する
- [x] 3.3 `apps/lp/index.html` から GTM の inline `<script>` と `<noscript>` を削除する
- [x] 3.4 `apps/lp/src/shared/lib/loadGtm.ts` を新設し、analytics 同意取得を契機に動的 script tag を挿入する
- [x] 3.5 `App.vue` の onMounted / onConsentChange で GTM ローダーを呼ぶ（既同意ユーザーは初期化時にロード、新規同意ユーザーはイベント受信時にロード）
- [x] 3.6 vitest で「未決定で gtm.js が `document.head` に挿入されない」「analytics ON で挿入される」を検証する
- [x] 3.7 LP のフッター (`apps/lp/src/shared/ui/FooterLine.vue`) に「外部送信ポリシー」「Cookie 設定」リンクを追加する

## 4. admin に Cookie 同意バナーとフッターリンクを実装

- [x] 4.1 `apps/admin/src/widgets/consent-banner/` に shadcn-vue 製バナーを実装（同 3 ボタン構成 + 詳細パネル）
- [x] 4.2 admin のレイアウトに常設し、未決定時のみ表示する
- [x] 4.3 admin のフッター（未存在なら新設）に「外部送信ポリシー」「Cookie 設定」リンクを設置し、外部送信ポリシーは新規タブで lp の URL を開く
- [x] 4.4 vitest で「初回表示」「すべて受け入れる」「必須のみ」「設定パネル展開」のシナリオを検証する

## 5. reservation に Cookie 同意バナー・フッター widget・PolicyFooter 共通化を実装

- [x] 5.1 `apps/reservation/src/widgets/app-footer/` を新設し、フッターレイアウトと「外部送信ポリシー」「Cookie 設定」リンクを置く
- [x] 5.2 `apps/reservation/src/widgets/consent-banner/` に shadcn-vue 製バナーを実装する
- [x] 5.3 reservation の App / レイアウトにバナーとフッターを常設する
- [x] 5.4 既存 `apps/reservation/src/pages/SignupIdentityPage/components/PolicyFooter.vue` を `apps/reservation/src/shared/ui/PolicyFooter.vue` に移設し Public API 化する（外部送信ポリシーは lp の URL を新規タブで開く形式に揃える）
- [x] 5.5 SignupIdentityPage / SignupProfilePage の両方で `shared/ui/PolicyFooter` を import し描画する
- [x] 5.6 vitest で「PolicyFooter 共通描画」「両ページからのリンク到達」「consent banner の各ボタン挙動」を検証する

## 6. ドキュメント更新と最終確認

- [x] 6.1 `docs/06-品質・セキュリティ/` 配下に「外部送信規律対応方針」のメモを追加（外部送信先テーブル、consent カテゴリ運用、GTM gate 方式）
- [x] 6.2 `pnpm exec vitest run` を全アプリで通す（shared 64 / lp 28 / admin 705 / reservation 323 / 他 全 pass）
- [x] 6.3 `pnpm build:lp` / `pnpm --filter @high-q/admin build` / `pnpm --filter @high-q/reservation build` を通す
- [ ] 6.4 ローカルで lp / admin / reservation を起動し、3 アプリのバナー初回表示・同意保存・フッターリンク動作・GTM consent gate（DevTools Network タブで `googletagmanager.com` リクエスト有無）を手動確認する
