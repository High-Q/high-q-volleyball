## ADDED Requirements

### Requirement: Hero セクションに CTA ボタンが2つ表示される

Hero セクションには、訪問者を主要アクションに誘導する CTA ボタンが2つ表示されなければならない（SHALL）。1つ目は X (Twitter) でのお問い合わせ、2つ目は EVENT セクションへのアンカーリンク。

#### Scenario: Hero CTA の表示
- **WHEN** ユーザーが LP を開いて Hero セクションを見たとき
- **THEN** 「X でお問い合わせ」ボタンと「イベントを見る」ボタンの2つが Hero 内に表示される

#### Scenario: X CTA クリック時の挙動
- **WHEN** ユーザーが「X でお問い合わせ」ボタンをクリックしたとき
- **THEN** `https://twitter.com/c8w5y` が新規タブで開かれる

#### Scenario: イベント CTA クリック時の挙動
- **WHEN** ユーザーが「イベントを見る」ボタンをクリックしたとき
- **THEN** ページが EVENT セクション（`#event` アンカー）にスクロールする

### Requirement: ヘッダーにアンカーナビゲーションが表示される

ヘッダーには CONCEPT / ACTIVITIES / EVENT の3セクションへのアンカーリンクが表示されなければならない（SHALL）。

#### Scenario: md 以上でのアンカー横並び表示
- **WHEN** ユーザーが md 以上の画面幅で LP を開いたとき
- **THEN** ヘッダー内に CONCEPT / ACTIVITIES / EVENT のアンカーリンクが横並びで表示される

#### Scenario: xs/sm でのドロップダウンメニュー表示
- **WHEN** ユーザーが sm 以下の画面幅で LP を開いたとき
- **THEN** ヘッダー右にメニューアイコンが表示され、タップすると CONCEPT / ACTIVITIES / EVENT が縦リストで表示される

#### Scenario: アンカーリンク選択時のスムーズスクロール
- **WHEN** ユーザーがヘッダーのアンカーリンクをクリックしたとき
- **THEN** 対応するセクション（`#concept` / `#activities` / `#event`）にスムーズスクロールする

### Requirement: ヘッダーがスクロール量に応じて視覚的に変化する

ヘッダーは、ページ最上部にいる時は透明、スクロール後は不透明＋シャドウ付きで表示されなければならない（SHALL）。

#### Scenario: ページ最上部でのヘッダー透明
- **WHEN** ユーザーが scrollY === 0 の位置にいるとき
- **THEN** ヘッダーの背景は透明で、Hero 背景画像が透けて見える

#### Scenario: スクロール後のヘッダー不透明
- **WHEN** ユーザーが scrollY > 0 にスクロールしたとき
- **THEN** ヘッダーの背景は primary 色になり、下端に elevation シャドウが付く

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

フッターには、サークル名／アンカーナビ／SNS リンクの3要素がレスポンシブに配置されなければならない（SHALL）。

#### Scenario: lg 以上での3カラム表示
- **WHEN** ユーザーが lg 以上の画面幅で LP を開いたとき
- **THEN** フッター内に「サークル名＋紹介文」「ナビ（CONCEPT/ACTIVITIES/EVENT）」「X SNS リンク」の3カラムが横並びで表示される

#### Scenario: md での2カラム表示
- **WHEN** ユーザーが md の画面幅で LP を開いたとき
- **THEN** フッター内が2カラム構成で表示される

#### Scenario: sm 以下での1カラム表示
- **WHEN** ユーザーが sm 以下の画面幅で LP を開いたとき
- **THEN** フッター内の3要素が縦に積み上げて表示される

### Requirement: X (Twitter) アイコンは公式ロゴで統一される

LP 内の X 関連 SNS リンクは、`mdi-twitter` ではなく X 公式ロゴ（カスタム SVG）で表示されなければならない（SHALL）。

#### Scenario: ヘッダー X アイコンの表示
- **WHEN** ユーザーがヘッダーの SNS ボタンを見たとき
- **THEN** 鳥アイコン（`mdi-twitter`）ではなく X の "X" 字形ロゴが表示される

#### Scenario: フッター X アイコンの表示
- **WHEN** ユーザーがフッターの SNS ボタンを見たとき
- **THEN** X の "X" 字形ロゴが表示される

#### Scenario: Activities セクション X アイコンの表示
- **WHEN** ユーザーが Activities セクションの SNS ボタンを見たとき
- **THEN** X の "X" 字形ロゴが表示される

### Requirement: ハードコードされたカラー値が CSS 内に存在しない

LP の Vue コンポーネントには、`#F5F8FA` / `#6A96A4` / `#182F43` / `#85BBCC` 等のハードコードされたカラー値を含めてはならない（SHALL NOT）。すべての色は Vuetify テーマトークン経由で参照されなければならない（SHALL）。例外として `plugins/vuetify.js`（テーマ定義そのもの）はハードコードを許可する。

#### Scenario: ハードコード値の不在
- **WHEN** `grep -rn "#F5F8FA\|#6A96A4\|#182F43\|#85BBCC" apps/lp/src/` を実行したとき
- **THEN** `plugins/vuetify.js` 以外のファイルでマッチが0件である

#### Scenario: トークン経由での色参照
- **WHEN** コンポーネントが primary 色を必要とするとき
- **THEN** `color="primary"` または `rgb(var(--v-theme-primary))` 形式でトークン経由で参照される

## MODIFIED Requirements

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

LP の各セクション（Hero・Concept・Activities・Event）の横幅はヘッダーと同幅でなければならない（SHALL）。Hero は背景画像をフル幅で表示するが、テキスト・CTA は `v-container` 内に収める。

#### Scenario: セクション横幅の一致
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ヘッダー・コンセプト・アクティビティ・イベント各セクションのコンテンツ左右端が揃って表示される

### Requirement: フッターが表示される

LP の最下部にフッターが表示されなければならない（SHALL）。フッターには、サークル名・アンカーナビ・SNS リンク・コピーライト表記が含まれる。

#### Scenario: フッター表示
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ページ最下部にフッターコンポーネントが表示され、サークル名・ナビ・SNS・コピーライト表記が確認できる
