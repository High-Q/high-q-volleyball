## ADDED Requirements

### Requirement: Hero セクション内の全テキストが常に視認できる

Hero セクション (`apps/lp/src/widgets/hero-first/`) 内に表示されるすべてのテキスト要素（kicker / heading / lead / CTA ラベル / meta）は、サポート対象ビューポート（375px 幅以上）において、セクションの `overflow: hidden` 等で物理的に切り捨てられず、全文が画面内に表示されなければならない（SHALL）。

セクション高さは内容の自然な高さに追従し、コピー量・フォントメトリクスの違いによってテキストが見切れない構造を保たなければならない（SHALL）。

#### Scenario: モバイル幅で meta テキストが全文表示される

- **WHEN** ユーザーが mobile viewport (375px 幅) で LP を開き、Hero セクションを表示したとき
- **THEN** 「イベントを見る」ボタン直下の meta テキスト（"所要 1分 ・ 月1〜2回開催 ・ 参加費 500円〜"）の全文字が画面内に表示され、テキストの上半分・下半分が `overflow: hidden` で切り捨てられない

#### Scenario: タブレット・デスクトップ幅でも全テキストが表示される

- **WHEN** ユーザーが tablet (720px) または desktop (1280px) viewport で LP を開いたとき
- **THEN** Hero セクション内の kicker / heading / lead / CTA / meta すべてが完全に表示され、いずれの要素も視覚的に切れない

#### Scenario: Hero セクション高さがコンテンツに追従する

- **WHEN** Hero セクションが描画されるとき
- **THEN** セクションの高さはコンテンツの自然な高さ以上を確保し、固定高さ + `overflow: hidden` の組み合わせでテキストを物理的に切り捨てない
