## Why

予約サイト・admin が MVP1 完了し商用稼働した一方、LP の CTA は「予約サイトは現在準備中」前提のまま LINE を主動線にしている。`release/lp-redesign-v2` を master に出して LP 商用公開する前に CTA 動線を刷新する。

ただし「予約サイトに直行 → イベント 0 件 → 会員登録だけして終わる」体験は最悪なので、**LP 内の event-list を必ず経由する** 設計とする。Hero は「イベントを見る → event-list へスクロール」、Final CTA は「LINE で継続接点を作る + 副でイベント一覧へ」の **上下対称** な構成にし、予約サイトへの直接遷移は event-list の各イベントカード経由のみとする。

## What Changes

- **Hero CTA**: 「体験参加してみる」を「**イベントを見る**」に文言変更し、リンク先を `reservationTopUrl()` から **`#event-list-heading` へのスムーススクロール** に変更
- **Final CTA**: Primary を「**LINE で相談・告知を受け取る**」（LINE オープンチャット）、Secondary を「**次回イベントを見る**」（`#event-list-heading` スクロール）の 2 層構造に再構成。予約サイト直行ボタンと X DM ボタンは撤去
- **Final CTA lead 文言**: 「予約サイトは現在準備中…」を撤去し、event-list で具体イベントを見つけてから予約・継続接点として LINE を使う流れを示唆する文言に書き換え
- **next-session-strip**: 個別イベント決定後の遷移なので予約サイト直行 (`reservationEventUrl(id)`) のままで OK。`|| LINE_OPEN_CHAT_URL` の fallback は撤去
- **SNS 定数の本物化**: `apps/lp/src/shared/config/sns.js` の LINE / X URL を翔太郎くん共有の本物値に更新
- **`VITE_RESERVATION_URL` の本番値検証**: Render 本番 env が `https://high-q-reservation.onrender.com` を指していることを確認（PR Preview も同じ本番値を共有）
- **アンカー実在性と法務リンクの最終確認**: site-header / site-footer の 5 アンカー、`/privacy`、`/external-transmission`、mailto contactEmail を点検
- **E2E に CTA リンク検証を追加**: Hero と Final の Primary/Secondary が想定先を指すこと

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `lp-layout`: Hero CTA / Final CTA / next-session-strip の遷移先と階層構造を、event-list を経由する設計に変更

## Impact

- 修正: `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue`（文言変更 + アンカースクロール化）
- 修正: `apps/lp/src/widgets/final-cta/ui/FinalCtaSection.vue`（lead 文言・CTA 構造の全面刷新）
- 修正: `apps/lp/src/widgets/next-session-strip/ui/NextSessionStrip.vue`（LINE fallback 撤去）
- 修正: `apps/lp/src/shared/config/sns.js`（LINE / X URL を本物化）
- 検証: Render 本番 env の `VITE_RESERVATION_URL` 値
- 検証: site-header / site-footer のアンカー実在性、`/privacy`・`/external-transmission`・mailto の動作
- E2E 追加: `e2e/lp/cta-links.e2e.ts`
- 環境: ローカル / PR Preview / 本番 の 3 環境のみ存在（dev 専用環境は持たない）
