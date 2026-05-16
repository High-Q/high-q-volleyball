## ADDED Requirements

### Requirement: ヘッダーにハンバーガーメニューが配置される

LP のサイトヘッダーは、モバイル前提のデザインに準じて右端にハンバーガーアイコン (横線 2 本) を配置しなければならない (SHALL)。アイコンをタップするとサイト内アンカーリンクのドロップダウンメニューが開閉し、利用者はヘッダーから主要セクションへ直接到達できる (SHALL)。

#### Scenario: ハンバーガーアイコンの常設

- **WHEN** 訪問者が LP のホームページを開く
- **THEN** ヘッダー右端にハンバーガーアイコンが常設されている

#### Scenario: タップでメニューが開く

- **WHEN** 訪問者がハンバーガーアイコンをタップする
- **THEN** サイト内アンカーリンク (About / Features / 当日の流れ / Events / FAQ) を含むドロップダウンメニューが表示される

#### Scenario: メニューが閉じる条件

- **WHEN** 訪問者がメニュー外側をクリック / ESC キーを押す / メニュー項目をクリックする / 別ルートに遷移する
- **THEN** メニューが閉じる

#### Scenario: a11y 属性

- **WHEN** ハンバーガーボタンが描画される
- **THEN** `aria-label` で操作意図を伝え、`aria-expanded` で開閉状態を伝える

### Requirement: LP の内側コンテンツは PC 幅でも適切な行長を保つ

LP の各セクションは、モバイル幅で設計された行長・余白を PC 幅でも維持しなければならない (SHALL)。全幅背景は画面いっぱいに広がりつつ、内側コンテンツは `max-width` でキャップされ、左右に自動的な余白が生じる構造でなければならない (SHALL)。

#### Scenario: 大画面での内側コンテンツ幅

- **WHEN** 訪問者が幅 1280px の画面で LP を開く
- **THEN** ヒーロー写真や帯セクションの背景は画面いっぱいに広がっているが、テキスト・カード・ボタン等の内側コンテンツは中央寄せで読みやすい行長 (おおむね 640〜880px) に収まっている

#### Scenario: モバイル幅での余白

- **WHEN** 訪問者が幅 420px 前後の画面で LP を開く
- **THEN** セクションの side padding はモバイル設計値 (おおむね 28px) で維持される

### Requirement: アクセント色 (`--hq-color-accent`) は装飾の支配色にならない

LP の `--hq-color-accent` の使用箇所は、視覚アクセントとして機能する役割の要素に限定されなければならない (SHALL)。具体的には次の用途のみで使用してよい:
- 全 SectionTitle kicker
- 番号系 (Features 数字 / FirstTimeFlow ステップ番号 / FAQ index)
- 強調マーカー (Worries Q マーカー)
- 強調 border (FirstTimeFlow reassurance border-left)
- 予約導線 (NextStrip NEXT タグ + arrow)
- a11y フォーカス可視化 (`:focus-visible` outline)

主要 CTA Button の背景色には accent を使用してはならない (SHALL NOT)。`hover` 色や link 文字色など装飾用途で accent を散布してはならない (SHALL NOT)。

#### Scenario: 主要 CTA Button の背景色

- **WHEN** ヒーロー / FinalCTA の主要 CTA Button が描画される
- **THEN** 背景は `--hq-color-ink` (主要 CTA = ink primary) であり、`--hq-color-accent` ではない

#### Scenario: ホバーやリンクの装飾

- **WHEN** イベントカード hover / 各種 link 装飾要素が描画される
- **THEN** `--hq-color-accent` ではなく `hairline` 強度や `--hq-color-ink-soft` underline で表現されている

### Requirement: 宣言済みフォントを Web フォントから load する

LP は、`@high-q/design-tokens` が `--hq-font-jp-display` / `--hq-font-jp` / `--hq-font-mono` で宣言する主要フォントを Web フォントとして実際に load しなければならない (SHALL)。OS デフォルトに fallback してはならない (SHALL NOT)。

#### Scenario: フォント load

- **WHEN** LP がブラウザで起動する
- **THEN** Klee One / Shippori Mincho / Zen Kaku Gothic New / JetBrains Mono が Google Fonts 等から実際に取得され、画面に描画される

#### Scenario: preconnect 最適化

- **WHEN** LP の HTML が serve される
- **THEN** Google Fonts host 向けの `<link rel="preconnect">` がフォント取得を高速化する

## MODIFIED Requirements

### Requirement: フッターは法務・基本情報・SNS を提供する

LP のフッターには、サークル名・基本紹介・SNS リンク・法務リンク群 (プライバシーポリシー / 外部送信ポリシー / Cookie 設定) ・コピーライトが含まれなければならない (SHALL)。新デザインに合わせて視覚は HQ トークン基盤で統一される (SHALL)。フッターには加えて、LP 内の主要セクションへのアンカーリンク群 (About / Features / 当日の流れ / Events / FAQ) を内包しなければならない (SHALL)。Instagram の SNS リンクはアカウント未開設の間は削除されていてもよい (MAY)。

#### Scenario: フッター必須項目の表示
- **WHEN** 訪問者が LP のフッターを見る
- **THEN** サークル名・紹介文・サイト内アンカーリンク・SNS リンク・法務リンク群・コピーライト表記が確認できる

#### Scenario: 法務リンクは常設
- **WHEN** いずれの画面幅でもフッターが表示される
- **THEN** プライバシーポリシー・外部送信ポリシー・Cookie 設定の各リンクが押下可能な状態で常設されている

#### Scenario: サイト内アンカーリンクの存在
- **WHEN** 訪問者がフッターを見る
- **THEN** About / Features / 当日の流れ / Events / FAQ への内部アンカーリンク群がリスト表示されている

#### Scenario: 視覚は HQ トークン経由
- **WHEN** フッターの色・書体・余白が描画される
- **THEN** HQ デザイントークン経由で統制された値で表示されている

#### Scenario: 文字階調の正規化
- **WHEN** フッター内の各要素が描画される
- **THEN** ブランド名と SNS 主要リンクは `paper` フル、本文と内部アンカーは `paper` 0.72、法務リンクは `paper` 0.55、コピーライトは `paper` 0.45、divider は `paper` 0.12 の階調で表示されている
