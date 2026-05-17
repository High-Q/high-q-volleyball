## 1. SNS 定数の本物化

- [x] 1.1 `apps/lp/src/shared/config/sns.js` の `LINE_OPEN_CHAT_URL` を `https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default` に更新
- [x] 1.2 同ファイルに `LINE_OPEN_CHAT_NAME = '社会人バレーボールサークル High Q'` を追加
- [x] 1.3 `X_URL` を `https://x.com/HighQ_volleybal`、`X_HANDLE` を `@HighQ_volleybal` に更新

## 2. グローバルスムーススクロール

- [x] 2.1 LP のグローバル CSS（`apps/lp/src/style.css` または `apps/lp/src/main.js` で import 済みの CSS ファイル）に `html { scroll-behavior: smooth; }` を追加
- [x] 2.2 各 `id="..."` 付き見出し（`#about-heading` / `#features-heading` / `#flow-heading` / `#event-list-heading` / `#faq-heading`）に `scroll-margin-top: 80px;` 相当を付与（sticky header の高さに合わせ Apply 中に調整）

## 3. Hero CTA を event-list スクロールに変更

- [x] 3.1 `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue` の `<Button>` を `<a href="#event-list-heading">` でラップする、または `@click` でアンカー遷移する形に変更（最終形は Apply 中に決定）
- [x] 3.2 文言「体験参加してみる」を「**イベントを見る**」に変更
- [x] 3.3 `onTrialClick` 関数および `reservationTopUrl` の import を不要なら削除
- [x] 3.4 hero CTA に `data-testid="hero-event-list-cta"` を付与

## 4. Final CTA の構造刷新

- [x] 4.1 `apps/lp/src/widgets/final-cta/ui/FinalCtaSection.vue` の lead 文言を design.md D3 の新案に書き換え（Apply 中に最終微調整可）:
       > 月1〜2回、土日祝に開催しています。<br>
       > LINE オープンチャットで次回告知が届きます。<br>
       > 不安があれば、まずは質問だけでも。
- [x] 4.2 Primary CTA を「**LINE で相談・告知を受け取る**」に変更し、`href=LINE_OPEN_CHAT_URL` `target=_blank rel=noopener noreferrer` を維持。ink/paper の強いボタンスタイル、`data-testid="final-cta-line"`
- [x] 4.3 Secondary CTA を「**次回イベントを見る**」に変更し、`href="#event-list-heading"` でアンカー遷移。outline 系の控えめスタイル、`data-testid="final-cta-event-list"`
- [x] 4.4 Primary と Secondary の間に「または、まずは」相当の繋ぎ文言を入れる（小さい文字、控えめ）
- [x] 4.5 X DM ボタン（旧 `final-cta-x`）を削除し、関連 CSS を整理。`import` から `X_URL` / `X_HANDLE` を削除
- [x] 4.6 予約サイト直行ボタンを設置しない（既存にあれば削除）。`reservationTopUrl` import を不要なら削除

## 5. next-session-strip の LINE fallback 撤去

- [x] 5.1 `apps/lp/src/widgets/next-session-strip/ui/NextSessionStrip.vue` の `nextHref` computed から `|| LINE_OPEN_CHAT_URL` を撤去
- [x] 5.2 不要になった `import { LINE_OPEN_CHAT_URL }` を削除
- [x] 5.3 「次回イベントなし」表示が現状維持で問題ないことを目視確認

## 6. 環境変数 / アンカー / 法務の最終確認

- [x] 6.1 Render Dashboard 本番 service の `VITE_RESERVATION_URL` が `https://high-q-reservation.onrender.com` を指していることを翔太郎くんと確認
- [x] 6.2 PR Preview が本番 `VITE_RESERVATION_URL` を sync:false で参照していることを確認（memory `project_pr_preview_targets_prd_supabase.md` 方針と整合）
- [x] 6.3 site-header / site-footer のアンカー 5 件（`#about-heading` / `#features-heading` / `#flow-heading` / `#event-list-heading` / `#faq-heading`）が `apps/lp/src/widgets/*` 内に対応する `id="..."` を持つ要素として実在することを `grep` で検証
- [x] 6.4 `/privacy` / `/external-transmission` への遷移が正常に動作することを確認
- [x] 6.5 privacy / external-transmission ページ内の mailto contactEmail の値が実在アドレスかを翔太郎くんに確認

## 7. E2E カバレッジ追加

- [x] 7.1 `e2e/lp/cta-links.e2e.ts` を新規作成
- [x] 7.2 「Hero CTA が `#event-list-heading` を指す」テストを追加（`data-testid="hero-event-list-cta"` の `href` 属性 or アンカー遷移を assert）
- [x] 7.3 「Final CTA primary が `LINE_OPEN_CHAT_URL` を指し target=_blank である」テストを追加（`data-testid="final-cta-line"` 検証）
- [x] 7.4 「Final CTA secondary が `#event-list-heading` を指す」テストを追加（`data-testid="final-cta-event-list"` 検証）
- [x] 7.5 「Final CTA から X DM ボタンが消えている」テストを追加（`data-testid="final-cta-x"` が存在しないことを assert）
- [x] 7.6 「Final CTA から予約サイト直行ボタンが消えている」テストを追加（`reservationTopUrl()` を直接 href に持つボタンが Final 内に無いことを検証）
- [x] 7.7 「next-session 帯のリンクが `reservationEventUrl(id)` を指す」テストを追加（LINE fallback が発生しないことの確認）

## 8. 検証

- [x] 8.1 `pnpm --filter @high-q/lp build` 成功
- [x] 8.2 `pnpm --filter @high-q/lp test` 成功（既存 unit test に regression がないこと）
- [x] 8.3 `pnpm exec playwright test e2e/lp` 全 pass（既存 3 件 + 新規 6 件）
- [x] 8.4 `pnpm --filter @high-q/lp dev` を立ち上げ、420 / 768 / 1280px の 3 幅で Hero / Final CTA の見た目を目視確認
- [x] 8.5 各 CTA を実際にクリックして遷移先が想定通りであること（Hero → event-list / Final Primary → LINE / Final Secondary → event-list / next-session → 予約サイト）を確認
