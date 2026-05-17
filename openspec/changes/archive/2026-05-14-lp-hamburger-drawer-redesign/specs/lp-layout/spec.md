## MODIFIED Requirements

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
