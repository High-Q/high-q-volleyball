## Context

`apps/lp/src/widgets/reassurance-strip/ui/ReassuranceStrip.vue` に絵文字 `👜 / 👟 / 💴` が直接埋め込まれている。font-size で大きさを制御している（28px / 22px）。

絵文字は OS のシステム絵文字フォントに依存して描画される:
- macOS / iOS: Apple Color Emoji（カラフル・3D）
- Windows: Segoe UI Emoji（フラット・カラフル）
- Android: Noto Color Emoji（また別のスタイル）

これは HQ の「クラフト感・モノクローム寄り・線画」というブランドトーンと衝突する。`#160` (LP redesign v2) で全要素を HQ デザイントークンに揃えたが、絵文字だけ取り残された。

#238 で「accent カラーは限定使用」「Worries の Q マーカー以外は accent を出さない」というディシプリンを敷いた。アイコンも `var(--hq-color-ink-soft)` 程度の控えめなインクトーンで統一する。

## Goals / Non-Goals

**Goals:**
- 3 つの絵文字（持ち物 / 服装 / 参加費）を HQ トーン整合の SVG 線画アイコンに置換
- 将来 LP に絵文字をブランド要素として持ち込まないという規約化
- バンドルサイズへの影響をゼロまたは最小化（数百バイト程度）
- アイコンは `currentColor` を使い、親要素の `color` で着色制御できるようにする
- a11y は維持（装飾アイコンとして `aria-hidden="true"`）

**Non-Goals:**
- 既製アイコンライブラリ（`lucide-vue-next` 等）の導入。 LP では `--hq-*` トーンと相性が完璧でないこと、新規依存を増やしたくないため、本変更ではインライン SVG を採用
- 絵文字を本文中で意味的に使うケースの全面禁止（例: ユーザー投稿の絵文字、外部リンクのテキスト）。本要件はあくまで「LP のブランド要素としての絵文字」に限定
- アイコン全種類の網羅。今回は ReassuranceStrip の 3 種のみ。今後追加が必要な場合は同じディレクトリに追加する運用

## Decisions

### D1: アイコン配置場所は `apps/lp/src/shared/ui/icons/`

`@high-q/ui` パッケージ（admin/reservation/lp 共通）ではなく、`apps/lp/src/shared/ui/icons/` に配置する。

**Why:** これらは LP の Reassurance セクションでのみ必要な極めて文脈特化のアイコン。共通プリミティブとして 3 アプリで共有する必要性が無いため、`@high-q/ui` を肥大化させない。将来 admin/reservation でも同種アイコンが必要になったら、その時点で `@high-q/ui` への昇格を検討する（YAGNI）。

**Alternative:** `@high-q/ui` に最初から置く → 共通化の予定がないアイコンを共通パッケージに置くのは責務外。

### D2: 既製パッケージは使わず、インライン SVG を採用

`lucide-vue-next` などの完成度の高いアイコンセットがあるが、本変更では使わない。

**Why:**
- 3 種類のアイコンのために数十 KB の依存を追加するのは過剰
- Lucide のラインアイコンは美しいが、HQ の「クラフト感」とは線質が異なる（Lucide はテック系のシャープなライン）
- インライン SVG なら描画ニュアンスを HQ トーンに完全に合わせられる（ストローク幅 1.5px、丸い線端、軽い手書き感）
- ツリーシェイキングのオーバーヘッドもゼロ

**Alternative:** `lucide-vue-next` から `ShoppingBag` / `Footprints` / `Coins` を使う → トーン整合性で劣る、依存追加コスト

### D3: アイコンは `currentColor` で着色

SVG 内の `stroke` 属性に `currentColor` を指定し、親要素の CSS `color` で色を制御する。

**Why:** HQ の文脈では、アイコンと隣接ラベルの色を常に揃えたい（例: ラベルが ink-soft ならアイコンも ink-soft）。`currentColor` を使えば親で `color: var(--hq-color-ink-soft)` を指定するだけで両方が同期する。

**Alternative:** SVG に直接 `stroke="var(--hq-color-ink-soft)"` を書く → 単独では動くが、別箇所で muted トーンにしたい場合に props 拡張が必要になる。`currentColor` の方が柔軟。

### D4: サイズは props (`size`) で px 指定

各アイコン SFC は `size` prop（デフォルト 24px）を受け取り、`width` / `height` 属性に反映する。

**Why:** プロトタイプでは持ち物アイコン 28px / 服装・参加費アイコン 22px と微妙にサイズが異なる。CSS で外部からサイズ制御するより、props で明示する方が呼び出し側のテンプレが読みやすい。

**Alternative:** CSS `width: 28px` で外部制御 → 動くが、SVG 内部の `viewBox` と CSS サイズの責務が分散して読みにくい。

### D5: アイコン選定（線画モチーフ）

- **持ち物**: トートバッグ系のラインアイコン（取っ手付きシンプルバッグ）
- **服装**: T シャツ + 半パンツのライン（「動きやすい服」を示唆）／代替案として運動靴のライン
- **参加費**: コインスタック または 円マーク入りコイン

最終的なアイコンモチーフは tasks で実装時に微調整するが、線質は統一する:
- ストローク幅: 1.5px
- ストローク色: `currentColor`
- 線端: round
- 線結合: round
- 塗りつぶし: なし（透明）
- ViewBox: 24×24

## Risks / Trade-offs

- **[Risk]** インライン SVG パスのデザインが Lucide ほど洗練されない → **Mitigation**: HQ トーンに合わせた最小限の線画で十分。プロトタイプの線質を踏襲し、レビュー時に視覚的整合性を確認
- **[Risk]** 将来 LP で大量のアイコンが必要になった場合、インライン SVG 個別管理がスケールしない → **Mitigation**: 5 種を超えたタイミングで `@high-q/ui/icons` への集約 or Lucide 導入を再評価する。今は YAGNI
- **[Risk]** アイコンの意味が絵文字より伝わりにくい可能性（特に「参加費」のコインアイコン） → **Mitigation**: 隣接ラベル「持ち物 / 服装 / 参加費」が日本語で明示されているため、アイコンは補助的役割。意味伝達は崩れない
