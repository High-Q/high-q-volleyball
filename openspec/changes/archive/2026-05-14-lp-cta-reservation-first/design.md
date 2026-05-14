## Context

LP の現状 CTA は「予約サイト準備中」前提で、final-cta では LINE が Primary、X DM が Secondary、hero CTA は予約サイトトップに直行する設計。予約サイト・admin が MVP1 完了し商用稼働した今、これらは前提が崩れている。

ただし「予約サイト直行 → イベント 0 件 → 会員登録だけで離脱 → 不満」は CVR と満足度の両方を下げるワーストパターン。LP 内に `EventList` widget があり、ここでイベント有無を必ず確認できる構造になっているため、**全 CTA は event-list を経由する** 設計に統一する。予約サイトへの遷移は各イベントカード（=具体イベント決定後）のみ。

確定値:
- 予約サイト本番 URL: `https://high-q-reservation.onrender.com`（PR Preview も同じ本番値を参照）
- LINE オープンチャット URL: `https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default`
- LINE オープンチャット名: `社会人バレーボールサークル High Q`
- X URL: `https://x.com/HighQ_volleybal`
- X ハンドル: `@HighQ_volleybal`

## Goals / Non-Goals

**Goals:**
- Hero / Final 両 CTA が event-list 経由になり、「予約サイト直行 → イベント 0 件」を構造的に避ける
- Hero と Final が上下対称の役割（入口で見せる / 終端で繋がる）になる
- 予約サイトへの遷移は EventList カードまたは next-session-strip（=具体イベント決定後）のみ
- LINE / X の URL がプレースホルダではなく本物に置き換わる
- アンカー・法務リンクが切れていないことを確認する
- E2E で CTA の遷移先が守られる

**Non-Goals:**
- 予約サイトのデザイン変更
- LP 全体のリデザイン（既に #160 系で完了）
- 予約サイト URL を環境変数経由から脱却すること（PR Preview と本番が同じ env を共有する設計は維持）
- LINE オープンチャット側のオンボーディング文言の整備

## Decisions

### D1: Hero CTA を「イベントを見る」アンカースクロールに変更

**変更内容:**
- 文言: 「体験参加してみる」→ 「イベントを見る」
- リンク先: `reservationTopUrl()` → `#event-list-heading` へのスムーススクロール
- 実装: Button を `<a>` で囲む or `@click` でアンカーへ `scrollIntoView({ behavior: 'smooth' })`

**Why:** Hero でユーザーが押した時点では具体イベントの有無を知らないため、予約サイト直行は危険。LP 内 event-list に送ることで:
- イベントあり → 「これに行こう」と決めてからイベントカード経由で予約サイトへ（会員登録の動機が明確）
- イベントなし → event-list の Empty 文言で「次回開催待ち」を理解 + final-cta の LINE 経路に自然に流れる

**Alternative:** 予約サイト直行（本提案前の方針） → イベント 0 件で離脱が発生する構造リスクを残すため不採用。

### D2: Final CTA を「LINE Primary + event-list Secondary」の 2 階層に再構成

**最終形:**
```
[ LINE で相談・告知を受け取る ]      ← Primary: ink/paper の強いボタン
                                       href = LINE_OPEN_CHAT_URL
                                       target=_blank rel=noopener noreferrer
                                       data-testid = final-cta-line

  または、まずは                       ← 繋ぎ文言（小さく/控えめ）
[ 次回イベントを見る ]               ← Secondary: outline 控えめ
                                       href = #event-list-heading
                                       data-testid = final-cta-event-list
```

予約サイト直行ボタン・X DM ボタンは撤去。

**Why:**
- LP 終端まで読み切ったユーザーは関心が高い。ここで一番価値があるのは「**継続接点を作る**」= LINE オープンチャットでイベント告知を受け取れる関係を作る
- 予約サイト直行を Final に置くと、event-list で 0 件を見たユーザーの再離脱を招く
- 「または、まずは次回イベントを見る」は、まだ event-list を見ていない / 改めて確認したいユーザー向けの上スクロール経路。Hero と Final の両端に event-list 動線があることで、どの位置からでも event-list に戻れる
- X DM 撤去理由: X DM は重複（footer SNS に既出）+ CTA の選択肢を絞ることで CVR を上げる

**Alternative:**
- A. 予約サイト直行 Primary を維持 → イベント 0 件問題が残る
- B. event-list へのスクロール Primary + LINE Secondary → LP 終端まで来た高関心層が継続接点（LINE）を持たずに離脱するリスク
- C. 単一 CTA（LINE のみ） → event-list に戻りたい人を取りこぼす（少数派だが）
- D（採用）: LINE Primary + event-list Secondary → 高関心層を LINE で捕まえ、未確認層は event-list へ送れる

### D3: Final CTA の lead 文言

現状（撤去）:
> 予約サイトは現在準備中です。
> まずは LINE オープンチャットから
> お気軽にご連絡ください。

新案（採用予定。Apply 中に微調整可）:
> 月1〜2回、土日祝に開催しています。<br>
> LINE オープンチャットで次回告知が届きます。<br>
> 不安があれば、まずは質問だけでも。

ポイント:
- 「準備中」の旧前提を完全削除
- LINE オープンチャットの「告知を受け取れる」価値を明示（Primary CTA の動機付け）
- 「質問だけでも」で初心者ウェルカム感を維持

### D4: next-session-strip の LINE fallback 撤去

現状:
```js
const nextHref = computed(() => {
  if (!nextEvent.value) return null
  const url = reservationEventUrl(nextEvent.value.id)
  return url || LINE_OPEN_CHAT_URL
})
```

変更後:
```js
const nextHref = computed(() => {
  if (!nextEvent.value) return null
  return reservationEventUrl(nextEvent.value.id)
})
```

**Why:** next-session-strip は「具体的な次回イベント」がある時のみ描画され、そのイベントの予約 URL に飛ぶ役割。ユーザーは具体イベントを認知した上でクリックするため、予約サイト直行で不満は出ない。`VITE_RESERVATION_URL` は本番稼働で常に値を持つため `|| LINE_OPEN_CHAT_URL` fallback は不要。

### D5: SNS 定数の本物化

`apps/lp/src/shared/config/sns.js`:
```js
export const LINE_OPEN_CHAT_URL = 'https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
export const LINE_OPEN_CHAT_NAME = '社会人バレーボールサークル High Q'
export const X_URL = 'https://x.com/HighQ_volleybal'
export const X_HANDLE = '@HighQ_volleybal'
```

UTM パラメータは LINE オープンチャット招待リンク仕様としてそのまま保持。

### D6: 環境戦略は「ローカル / PR Preview / 本番」の 3 環境のみ

`VITE_RESERVATION_URL` の管理:
- ローカル: `.env` または `.env.local` で設定（開発者が自分の Render PR Preview 等を指す）
- PR Preview: Render Dashboard の env var で本番値（`https://high-q-reservation.onrender.com`）を上書き設定。これは memory `project_pr_preview_targets_prd_supabase.md` の方針と整合
- 本番: 同上の本番値
- E2E: `playwright.config.ts` 内のモック値（`http://localhost:4175`）を維持

**Why:** dev 専用環境は持たない。PR Preview が本番値を共有することで、リハーサル環境として機能する。コードに URL をハードコードしないことで Phase 移行（独自ドメインへの移行など）への耐性も維持。

### D7: アンカー実在性とスクロールオフセットの検証

site-header / site-footer の 5 アンカー（`#about-heading` / `#features-heading` / `#flow-heading` / `#event-list-heading` / `#faq-heading`）+ 今回追加する Hero CTA / Final CTA Secondary の `#event-list-heading` 参照、すべて該当 widget 内に `id="..."` を持つ要素が実在することを確認する。

検証方法:
1. grep で各 `id="..."` の存在を確認
2. ブラウザで実際にクリックしてジャンプ先が見出し直下に来ることを確認
3. sticky header が見出しを隠していないか目視

sticky header オフセットが必要なら各 `id` 付き見出しに CSS `scroll-margin-top: 80px;`（具体値は header 高さ依存）を付与する（Apply 時の状況次第）。

### D8: スムーススクロールの実装方法

候補:
- A. CSS `html { scroll-behavior: smooth; }` をグローバルに有効化 → 全アンカーリンクが自動でスムースになる、最小実装
- B. JS で `document.querySelector('#event-list-heading')?.scrollIntoView({ behavior: 'smooth' })` を click ハンドラ内で実行 → アンカー以外への適用も可能だが、アンカー URL が history に残らない

**採用: A**。global `scroll-behavior: smooth` で十分。既に他のアンカー（site-header メニュー、footer リンク）も滑らかになるメリットあり。global CSS の場所は `apps/lp/src/style.css` or 同等のグローバル CSS に追加。

### D9: E2E カバレッジ

`e2e/lp/cta-links.e2e.ts` に以下を追加:

- Hero CTA が `#event-list-heading` を指す（`href` または `data-target` 検証）
- Final CTA Primary が `LINE_OPEN_CHAT_URL` 相当を指し、`target=_blank rel=noopener noreferrer` を持つ
- Final CTA Secondary が `#event-list-heading` を指す
- Final CTA から X DM ボタン（`data-testid="final-cta-x"`）が存在しない
- Final CTA から「予約サイトでイベントを見る」相当の予約サイト直行ボタンが存在しない
- next-session 帯のリンクが `reservationEventUrl(id)` を指す（LINE fallback がないこと）

## Risks / Trade-offs

- **[Risk]** Render 本番 env の `VITE_RESERVATION_URL` が想定と異なる可能性 → **Mitigation**: Apply 時に Render Dashboard を確認するタスクを入れる
- **[Risk]** LINE / X URL が将来変わると `sns.js` の修正で追従する必要 → **Mitigation**: 環境変数化も検討余地はあるが、SNS URL は頻繁に変わらない前提で当面ハードコード
- **[Risk]** Final から「予約サイト直行」CTA が消えることで、高関心層が予約サイトに辿り着く動線が遅くなる可能性 → **Mitigation**: event-list の各イベントカードで予約サイトに直行できるため、event-list を経由する 1 ステップ追加に留まる。むしろこの 1 ステップが「具体イベント決定後の会員登録」という健全な動機付けになる
- **[Trade-off]** `scroll-behavior: smooth` をグローバルに有効化することで、すべてのアンカーリンクがスムースになる。意図しない箇所でスムース挙動を入れたくないケースはないため許容

### D10: EventList カード / next-session-strip は明示「予約する」ボタンを描画する（Apply 中追加）

**背景:** 当初の実装ではカード/帯全体を `<a>` でラップし「カード全体クリッカブル + 小さな矢印」のスタイルだった。翔太郎くんから「予約ボタンが見えない」「特定イベント予約のリンクが分かりにくい」との指摘。

**変更:**
- EventList カード: 全体ラップの `<a>` を `<article>` に変更し、カード内右側に **明示的な「予約する」ボタン**（ink + pill 形）を配置。`data-testid="event-card-cta-<id>"`
- next-session-strip: 行全体ラップの `<component :is>` を `<div>` に固定し、行内右側に「予約する」ボタン（accent + pill 形）を配置。`data-testid="next-session-cta"`
- 「予約 URL が空のカードは予約準備中表示」分岐は撤去。予約サイト商用稼働で `reservationEventUrl(id)` は常に有効 URL を返す前提

**Why:** 視認性の高い明示 CTA が「予約する」という行動を直接表現できる。カード全体クリッカブルは便利だが「予約する」というアクションが視覚化されないため初心者ユーザーには伝わりにくい。

### D11: ローカル dev ポートを LP=5173 / reservation=5174 で固定（Apply 中追加）

**背景:** ローカルで LP の予約ボタンをクリックすると LP 自身にリダイレクトする現象。`VITE_RESERVATION_URL` 未設定が原因だが、ローカル動作確認には reservation の固定 URL が必要。

**変更:**
- `apps/lp/vite.config.js` に `server: { port: 5173, strictPort: true }` を追加
- `apps/reservation/vite.config.ts` に `server: { port: 5174, strictPort: true }` を追加
- ローカル `.env.local`（翔太郎くん管理）に `VITE_RESERVATION_URL=http://localhost:5174` を設定して使う

**Why:** strictPort によりポートが暗黙にズレることがなくなり、`.env.local` の URL 指定が常に安定する。

## Open Questions

- Final CTA lead 文言の最終案は D3 のドラフトをベースに Apply 中の見た目で微調整
- sticky header の高さに応じた `scroll-margin-top` の具体値は Apply 中の目視で確定
