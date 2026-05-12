## ADDED Requirements

### Requirement: LP のブランド視覚要素として OS 依存の絵文字を使わない

LP の widgets / pages / shared/ui に配置するブランド表現としての視覚要素は、OS のシステム絵文字フォントに依存する絵文字（Unicode Emoji）を使ってはならない（SHALL NOT）。アイコンは HQ デザイントークンのトーンに揃った SVG で表現しなければならない（SHALL）。

#### Scenario: ReassuranceStrip でアイコンが SVG で表現される

- **WHEN** 開発者が `apps/lp/src/widgets/reassurance-strip/ui/ReassuranceStrip.vue` を参照した場合
- **THEN** 持ち物・服装・参加費を示すアイコンは `<svg>` 要素または SVG を内包する Vue SFC として描画されており、Unicode 絵文字（👜 / 👟 / 💴 など）が含まれていない

#### Scenario: LP 全体に Unicode 絵文字がブランド要素として残っていない

- **WHEN** `apps/lp/src` 配下を `grep` で Unicode 絵文字（U+1F300〜U+1FAFF / U+2600〜U+27BF）について検索した場合
- **THEN** widgets / pages / shared/ui の Vue / TS / CSS ファイルに該当絵文字が含まれていない（外部リンクラベルなどテキスト引用を除く）

#### Scenario: ブランドアイコンが HQ トーンで着色される

- **WHEN** SVG アイコンを LP に組み込んだ場合
- **THEN** stroke / fill には `currentColor` または `var(--hq-color-*)` 系の HQ デザイントークンが使われており、ハードコードされたカラーコードが使用されていない
