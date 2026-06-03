# lp-layout Specification

## Purpose
LP (apps/lp) の主要セクション・ヘッダー・フッター・ナビゲーション・デザイントークン参照のレイアウト要件を定義する。
## Requirements
### Requirement: Hero セクションに CTA ボタンが2つ表示される

Hero セクションには、訪問者を **LP 内のイベント一覧** に誘導する主要 CTA ボタンが 1 つ表示されなければならない（SHALL）。CTA をクリックすると `#event-list-heading` へスムーススクロールし、現在開催予定のイベントを確認できる。予約サイト (`reservationTopUrl()`) への直接遷移は Hero CTA からは行わず、event-list の各イベントカードまたは next-session-strip 経由でのみ可能とする。

#### Scenario: Hero CTA の表示

- **WHEN** ユーザーが LP を開いて Hero セクションを見たとき
- **THEN** 「イベントを見る」ボタン（Primary variant）が 1 つ Hero 内に表示される

#### Scenario: Hero CTA クリック時の挙動

- **WHEN** ユーザーが「イベントを見る」ボタンをクリックしたとき
- **THEN** ページが `#event-list-heading` へスムーススクロールする。`window.location.href` による外部サイト遷移は発生しない

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

### Requirement: ヘッダーにアンカーナビゲーションが表示される

ヘッダーにはハンバーガートリガーが常設され、押下するとフルスクリーン Drawer 形式のサイト内ナビゲーションが表示されなければならない（SHALL）。Drawer は LP 全体の和紙トーンに揃ったエディトリアル意匠（番号インデックス・大型タイポ・末尾矢印）を持ち、開放中は body スクロールを抑止する。Drawer 末尾には sticky な CTA フッタを配置し、Primary は LINE オープンチャットへの新規タブ遷移、Secondary は `#event-list-heading` へのスムーズスクロールを提供する。

#### Scenario: ハンバーガートリガーの常設

- **WHEN** ユーザーが LP を開いてヘッダーを見たとき
- **THEN** ヘッダー右端に 2 本線のハンバーガートリガーが表示され、`aria-label="メニューを開く"` `aria-expanded="false"` `aria-controls="<drawer-id>"` が付与されている

#### Scenario: ハンバーガー押下で Drawer が開く

- **WHEN** ユーザーがハンバーガートリガーを押下したとき
- **THEN** フルスクリーンの Drawer が `opacity 0 → 1` / `translateY(8px) → 0` のアニメーションで表示され、ハンバーガーアイコンが 2 本線 → ✕ に滑らかに変形する。`aria-expanded="true"` / `aria-label="メニューを閉じる"` に切り替わり、Drawer 内の最初のリンクへフォーカスが移る

#### Scenario: Drawer 内ナビゲーションのエディトリアル表示

- **WHEN** Drawer が開かれたとき
- **THEN** 各ナビ項目が「番号 (01–05) + 日本語ラベル + 末尾矢印 (›)」の 3 カラム構造で縦に並び、項目間は hairline で区切られる。ラベルには `var(--hq-font-jp-display)` が適用される

#### Scenario: Drawer 開放中の body スクロールロック

- **WHEN** Drawer が開かれている間
- **THEN** `<body>` に `is-locked` クラスが付与され、背景ページのスクロールが抑止される。Drawer インナーは縦スクロール可能で、`overscroll-behavior: contain` によりスクロール伝播が背面に漏れない

#### Scenario: Drawer 末尾の CTA フッタ

- **WHEN** Drawer が開かれたとき
- **THEN** Drawer 末尾に sticky な CTA フッタが表示される。Primary ボタンは LINE オープンチャット URL へ `target="_blank" rel="noopener noreferrer"` で遷移し、Secondary ボタンは `#event-list-heading` へスムーズスクロールする

#### Scenario: Esc キーで Drawer が閉じる

- **WHEN** Drawer が開かれている状態で Esc キーが押下されたとき
- **THEN** Drawer が閉じ、フォーカスがハンバーガートリガーに戻る

#### Scenario: ナビリンク押下で Drawer が閉じる

- **WHEN** ユーザーが Drawer 内のいずれかのナビリンクを押下したとき
- **THEN** 対応するアンカー (`#about-heading` / `#features-heading` / `#flow-heading` / `#event-list-heading` / `#faq-heading`) へスムーズスクロールしながら Drawer が閉じる

#### Scenario: prefers-reduced-motion でアニメーションが抑制される

- **WHEN** OS で「視差効果を減らす」設定が有効なユーザーが Drawer を開閉したとき
- **THEN** Drawer の opacity / transform トランジションとハンバーガーアイコンの形状トランジションが無効化され、即時の表示・非表示に切り替わる

#### Scenario: Drawer は body 直下にレンダリングされる

- **WHEN** 開発者が DOM ツリーを検査したとき
- **THEN** Drawer 要素は `<Teleport to="body">` 経由で body 直下に配置され、ヘッダーの stacking context に依存しない

### Requirement: ヘッダーがスクロール量に応じて視覚的に変化する

ヘッダーは、ページ最上部にいる時は透明、スクロール後は不透明＋シャドウ付きで表示されなければならない（SHALL）。Drawer 開放中もヘッダーは不透明状態を維持し、Drawer の paper 背景とヘッダーが視覚的に連続する。

#### Scenario: ページ最上部でのヘッダー透明

- **WHEN** ユーザーが scrollY === 0 の位置にいるとき
- **THEN** ヘッダーの背景は透明で、Hero 背景画像が透けて見える

#### Scenario: スクロール後のヘッダー不透明

- **WHEN** ユーザーが scrollY > 0 にスクロールしたとき
- **THEN** ヘッダーの背景は paper 色になり、下端に hairline ボーダーが付く

#### Scenario: Drawer 開放中のヘッダー不透明維持

- **WHEN** Drawer が開かれているとき
- **THEN** スクロール位置に関わらずヘッダーは paper 背景・ink 文字色を維持し、Drawer 上部と視覚的に連続する

### Requirement: ActivitiesSection が HomePage に表示される

`ActivitiesSection` は HomePage 内の Concept と Event の間に表示されなければならない（SHALL）。

#### Scenario: ActivitiesSection の表示
- **WHEN** ユーザーが LP を開いたとき
- **THEN** Hero / Concept / Activities / Event の4セクションがこの順番で表示される

### Requirement: 各セクションがスクロール到達時にフェードインする

LP の各セクション（Hero を除く）は、ビューポートに 15% 以上入ったタイミングでフェードインアニメーションを行わなければならない（SHALL）。ただし `prefers-reduced-motion: reduce` のユーザーには即時表示する。

#### Scenario: 通常ユーザーのフェードイン
- **WHEN** ユーザーが Concept セクションへスクロールし、ビューポートに 15% 以上入ったとき
- **THEN** Concept セクションが opacity 0 → 1 ／ translateY(24px) → 0 のアニメーションで表示される

#### Scenario: reduced-motion ユーザー
- **WHEN** OS で「視差効果を減らす」設定の有効なユーザーが LP を開いたとき
- **THEN** すべてのセクションが初期状態から即時表示され、アニメーションは発生しない

#### Scenario: IntersectionObserver 非対応ブラウザ
- **WHEN** `IntersectionObserver` が undefined のブラウザで LP を開いたとき
- **THEN** すべてのセクションが初期状態から即時表示される（フォールバック）

### Requirement: フッターが3カラム構成でリッチに表示される

フッターには、サークル名／アンカーナビ／SNS リンク／**法務リンク**の4要素がレスポンシブに配置されなければならない（SHALL）。法務リンクには「プライバシーポリシー」「外部送信ポリシー」「Cookie 設定」を最低限含む MUST。

#### Scenario: lg 以上での3カラム表示
- **WHEN** ユーザーが lg 以上の画面幅で LP を開いたとき
- **THEN** フッター内に「サークル名＋紹介文」「ナビ（CONCEPT/ACTIVITIES/EVENT）」「X SNS リンク」の3カラムが横並びで表示され、法務リンク群がカラム下部または独立行に表示される

#### Scenario: md での2カラム表示
- **WHEN** ユーザーが md の画面幅で LP を開いたとき
- **THEN** フッター内が2カラム構成で表示される

#### Scenario: sm 以下での1カラム表示
- **WHEN** ユーザーが sm 以下の画面幅で LP を開いたとき
- **THEN** フッター内の要素が縦に積み上げて表示される

#### Scenario: 法務リンクの常設
- **WHEN** いずれの画面幅でも LP のフッターが表示される
- **THEN** 「プライバシーポリシー」「外部送信ポリシー」「Cookie 設定」リンクが押下可能な状態で常設されている

### Requirement: X (Twitter) アイコンは公式ロゴで統一される

LP 内の X 関連 SNS リンクは、X 公式ロゴ（"X" 字形のカスタム inline SVG）で表示されなければならない（SHALL）。鳥アイコン（旧 Twitter ロゴ）や、Vuetify / Material Design Icons 系の `mdi-twitter` 等の外部アイコンフォントに依存する表現を含めてはならない（SHALL NOT）。

#### Scenario: ヘッダー X アイコンの表示
- **WHEN** ユーザーがヘッダーの SNS ボタンを見たとき
- **THEN** 鳥アイコンや MDI 由来のアイコンではなく、X の "X" 字形 inline SVG が表示される

#### Scenario: フッター X アイコンの表示
- **WHEN** ユーザーがフッターの SNS ボタンを見たとき
- **THEN** X の "X" 字形 inline SVG が表示される

#### Scenario: Activities セクション X アイコンの表示
- **WHEN** ユーザーが Activities セクションの SNS ボタンを見たとき
- **THEN** X の "X" 字形 inline SVG が表示される

#### Scenario: 外部アイコンフォント非依存
- **WHEN** LP の widgets / pages / shared/ui を `grep -rn "mdi-\|@mdi/\|fa-\|@fortawesome/" apps/lp/src/` で検索する
- **THEN** マッチ件数が 0 件である（X 含む全アイコンが inline SVG で実装されている）

### Requirement: ハードコードされたカラー値が CSS 内に存在しない

LP の Vue コンポーネント・スタイルブロック・SCSS には、ハードコードされたカラー値（hex / rgb / hsl / 名前指定の色）を含めてはならない（SHALL NOT）。すべての色は **HQ デザイントークン経由**（CSS 変数 `var(--hq-color-*)` または `@high-q/tailwind-preset` 由来の Tailwind utility）で参照されなければならない（SHALL）。例外として `@high-q/design-tokens` パッケージ自体（トークン定義の真実の源）は値定義のためのハードコードを許可する。

#### Scenario: LP の widgets / pages / shared/ui にハードコード色が存在しない
- **WHEN** `grep -rnE "#[0-9a-fA-F]{3,8}\\b" apps/lp/src/widgets apps/lp/src/pages apps/lp/src/shared apps/lp/src/App.vue` を実行する
- **THEN** マッチ件数が 0 件である（HQ デザイントークンの CSS 変数経由のみが許可される）

#### Scenario: トークン経由での色参照
- **WHEN** コンポーネントが任意の色を必要とするとき
- **THEN** `var(--hq-color-paper)` / `var(--hq-color-ink)` 等の CSS 変数、または `bg-paper` / `text-ink` 等の `@high-q/tailwind-preset` 由来 utility 経由で参照される

### Requirement: コンセプトカードが3列横並びで表示される

md ブレークポイント以上の画面幅において、コンセプトカードは1行に3列横並びで表示されなければならない（SHALL）。カード幅は親カラムに追従し固定値を持たない。各カードはモダンなデザイン（角丸 16px・全周シャドウ・ホバー時の浮き上がりアニメーション）を持つ。中央カードは視覚的に強調する（primary 色を反転して背景に使用、両サイドより高い elevation）。

#### Scenario: md 以上でのカード3列表示
- **WHEN** ユーザーが md 以上の画面幅（960px+）で LP を開いた場合
- **THEN** コンセプトセクションのカード3枚が1行に横並びで表示される

#### Scenario: sm 以下でのカード縦積み
- **WHEN** ユーザーが sm 以下の画面幅でLP を開いた場合
- **THEN** コンセプトカードは縦に1列ずつ積み上げて表示される

#### Scenario: カードホバー時の浮き上がり
- **WHEN** ユーザーがマウスでカードをホバーしたとき
- **THEN** カードが上方向に 4px 浮き上がり、シャドウが強化される（200ms transition）

#### Scenario: 中央カードの primary 反転強調
- **WHEN** ユーザーが Concept セクションを見たとき
- **THEN** 真ん中（2枚目）のカードは primary 色を背景に持ち、文字色は白で表示される

### Requirement: 全セクションの横幅がヘッダーと揃う

LP の各セクション（Hero・Concept・Activities・Event）の横幅はヘッダーと同幅でなければならない（SHALL）。Hero は背景画像をフル幅で表示するが、テキスト・CTA は中央寄せの最大幅コンテナ内に収める（実装は Tailwind utility の `max-w-screen-*` + `mx-auto` または同等のレイアウト構造）。

#### Scenario: セクション横幅の一致
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ヘッダー・コンセプト・アクティビティ・イベント各セクションのコンテンツ左右端が揃って表示される

#### Scenario: コンテナ層の実装方式
- **WHEN** LP の各セクションの実装を確認する
- **THEN** 中央寄せ最大幅コンテナは Tailwind utility または同等の CSS で実装されており、`v-container` を含む Vuetify 由来のコンポーネントには依存しない

### Requirement: フッターが表示される

LP の最下部にフッターが表示されなければならない（SHALL）。フッターには、サークル名・アンカーナビ・SNS リンク・コピーライト表記・**法務リンク群（プライバシーポリシー / 外部送信ポリシー / Cookie 設定）**が含まれる。

#### Scenario: フッター表示
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ページ最下部にフッターコンポーネントが表示され、サークル名・ナビ・SNS・コピーライト表記・法務リンク群が確認できる

### Requirement: GTM は Cookie 同意取得後にのみロードされる

LP は Google Tag Manager (`GTM-WNNF9RP` 系) を、ユーザーが analytics 同意を与えた後にのみ動的にロードする MUST。`apps/lp/index.html` の `<head>` に GTM の inline script を直書きしてはならない MUST NOT。

#### Scenario: 同意前は未ロード
- **WHEN** consent 未決定または analytics 拒否のユーザーが LP を開く
- **THEN** ページからは `googletagmanager.com` へのネットワークリクエストが一切発生しない

#### Scenario: 同意後にロード
- **WHEN** ユーザーが「すべて受け入れる」または analytics トグル ON で同意を保存する
- **THEN** 同イベントを契機に動的 script tag が挿入され `googletagmanager.com/gtm.js` がロードされる

#### Scenario: 同意済再訪
- **WHEN** analytics 同意済のユーザーが再訪する
- **THEN** ページ初期化シーケンスの中で動的 script tag 経由で GTM がロードされる（inline 直書きではない）

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

### Requirement: LP の hero / about / final-cta は実画像で描画される

LP の hero (hero-first widget) / about (about-section widget) / final-cta (final-cta widget) の `<Photo>` 要素は、placeholder ではなく `apps/lp/public/images/` 配下に配置された実画像を `src` prop 経由で表示しなければならない（SHALL）。各画像には日本語の `alt` テキストを必須で付与する。

#### Scenario: hero 画像が実画像で描画される

- **WHEN** LP のトップページを開く
- **THEN** hero-first widget の `<Photo>` が `src="/images/hero.jpg"` の実画像を `object-fit: cover` で描画し、placeholder の縞模様や `[ hero · 体育館 ]` ラベルは表示されない

#### Scenario: about 画像が実画像で描画される

- **WHEN** LP の about セクションを開く
- **THEN** about-section widget の `<Photo>` が `src="/images/about.jpg"` の実画像を描画し、日本語 alt テキストが付与されている

#### Scenario: final-cta 画像が実画像で描画される

- **WHEN** LP の最下部の final-cta セクションを表示する
- **THEN** final-cta widget の `<Photo>` が `src="/images/final-cta.jpg"` の実画像を全画面背景的に描画する

### Requirement: Why High Q セクションは画像を含まない

LP の features-section widget（heading: `— Why High Q`）は、`<Photo>` プレースホルダーを一切含まず、番号（01/02/03）+ Kicker + 日本語タイトル + 本文のみで構成された 3 カードでなければならない（SHALL）。

#### Scenario: features-section に Photo 要素が存在しない

- **WHEN** `apps/lp/src/widgets/features-section/ui/FeaturesSection.vue` を参照する
- **THEN** template に `<Photo>` が含まれず、`@high-q/ui` からの `Photo` import も削除されている

#### Scenario: 3 カードが視覚的に区切られて描画される

- **WHEN** LP の Why High Q セクションを開く
- **THEN** 3 件のカードが上下のマージン or hairline で視覚的に区切られ、画像なしでも独立したブロックとして認識できる

### Requirement: Gallery & Social セクションは画像 grid を持たない

LP の gallery-sns widget（heading 領域）は、Instagram 連携実装前のため `<Photo>` を含む `.gallery__grid` 領域をテンプレートから削除しなければならない（SHALL）。heading 文言は写真ナシでも違和感のない SNS 文脈に変更し、SNS リンク (X 等) は残置する。

#### Scenario: gallery-sns に Photo 要素が存在しない

- **WHEN** `apps/lp/src/widgets/gallery-sns/ui/GallerySnsSection.vue` を参照する
- **THEN** template に `<Photo>` が含まれず、`@high-q/ui` からの `Photo` import も削除されている

#### Scenario: heading 文言が SNS 文脈に変更される

- **WHEN** LP の Gallery & Social セクションを開く
- **THEN** 元の heading 「ある日の、High Q。」は写真前提のため SNS 文脈の別文言「フォローして、繋がる。」に置き換わっており、写真がない状態でも自然に読める

#### Scenario: SNS リンクは残置される

- **WHEN** LP の Gallery & Social セクションを開く
- **THEN** X など既存の SNS リンクボタンは引き続き描画され、`target="_blank" rel="noopener noreferrer"` 属性を維持する

### Requirement: Final CTA セクションは LINE 主・event-list 副の 2 階層構造を持つ

LP 最下部の final-cta widget は、Primary（LINE オープンチャットでの継続接点）と Secondary（event-list へのスクロール）の 2 つの CTA を視覚的階層を明確に分けた状態で表示しなければならない（SHALL）。予約サイト直行ボタン・X DM ボタンは含めない（予約サイトへの遷移は event-list 経由のみ、X フォローは footer SNS リンクに集約）。lead 文言は「予約サイトは現在準備中」前提の旧文言を含まず、LINE オープンチャットでイベント告知を受け取れる継続接点としての価値が伝わる文言でなければならない。

#### Scenario: Primary CTA が LINE オープンチャットを指す

- **WHEN** ユーザーが final-cta セクションの Primary ボタンをクリックする
- **THEN** `LINE_OPEN_CHAT_URL` に `target="_blank" rel="noopener noreferrer"` で新規タブ遷移する。ボタンには `data-testid="final-cta-line"` が付与され、ink/paper の強いボタンスタイルで表示される

#### Scenario: Secondary CTA が event-list へスクロールする

- **WHEN** ユーザーが final-cta セクションの Secondary ボタンをクリックする
- **THEN** ページが `#event-list-heading` へスムーススクロールする。ボタンには `data-testid="final-cta-event-list"` が付与され、outline 系の控えめなスタイルで Primary より視覚的に弱い

#### Scenario: 予約サイト直行ボタンが final-cta に存在しない

- **WHEN** ユーザーが final-cta セクションを表示する
- **THEN** `reservationTopUrl()` を直接 href に持つボタン（予約サイト直行）は描画されない（予約サイトへの遷移は event-list の各イベントカード経由のみ）

#### Scenario: X DM ボタンが final-cta に存在しない

- **WHEN** ユーザーが final-cta セクションを表示する
- **THEN** X ハンドルを直接示す DM 用ボタンは描画されない（footer の SNS リンクで X フォロー導線は別途維持）

#### Scenario: lead 文言が LINE 継続接点を示唆する

- **WHEN** ユーザーが final-cta セクションを表示する
- **THEN** lead テキストに「予約サイトは現在準備中」「準備中です」等の旧フェーズ前提の文言が含まれず、LINE オープンチャットで告知を受け取れる旨が含まれる

### Requirement: next-session-strip は予約 URL に直接遷移する

LP の next-session-strip widget は、次回イベントの予約 URL (`reservationEventUrl(id)`) に直接遷移しなければならない（SHALL）。予約 URL が空文字の場合に LINE オープンチャットへフォールバックする旧挙動は持たない。

#### Scenario: 次回イベントが存在する場合

- **WHEN** API から次回イベントが取得され、`nextEvent.value` に値が入っている
- **THEN** strip 全体が `reservationEventUrl(nextEvent.value.id)` を指すリンクとして描画される

#### Scenario: 予約 URL fallback の LINE 遷移が発生しない

- **WHEN** next-session-strip がレンダリングされる
- **THEN** `reservationEventUrl()` が空文字を返すケースを `LINE_OPEN_CHAT_URL` で補う `||` 演算子の fallback は存在しない（コードレベルで撤去されている）

### Requirement: LP の SNS 定数は本物の URL を保持する

LP の `apps/lp/src/shared/config/sns.js` で定義される SNS 定数は、ダミーまたはプレースホルダではなく、HQ の本物の SNS アカウントに繋がる URL を保持しなければならない（SHALL）。

#### Scenario: LINE オープンチャット URL が本物を指す

- **WHEN** 開発者が `apps/lp/src/shared/config/sns.js` の `LINE_OPEN_CHAT_URL` を参照する
- **THEN** その値は `https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A` で始まる本物のオープンチャット招待 URL である（UTM パラメータは保持）

#### Scenario: X アカウント URL とハンドルが本物を指す

- **WHEN** 開発者が `apps/lp/src/shared/config/sns.js` の `X_URL` / `X_HANDLE` を参照する
- **THEN** `X_URL` は `https://x.com/HighQ_volleybal` であり、`X_HANDLE` は `@HighQ_volleybal` である

### Requirement: LP は全アンカー遷移でスムーススクロールを提供する

LP は、Hero CTA / Final CTA Secondary / site-header メニュー / site-footer アンカーなど、全アンカーリンクのクリックでスムーススクロールを提供しなければならない（SHALL）。実装はグローバル CSS `html { scroll-behavior: smooth; }` で行い、個別 JS ハンドラには依存しない。

#### Scenario: グローバル CSS にスムーススクロールが定義されている

- **WHEN** 開発者が LP のグローバル CSS を参照する
- **THEN** `html { scroll-behavior: smooth; }` が定義されている

#### Scenario: アンカーリンククリックでスムーススクロールする

- **WHEN** ユーザーが LP 内のアンカーリンク（例: `#event-list-heading`）をクリックする
- **THEN** ページが即座にジャンプせず、滑らかにスクロールしてアンカー先に到達する

