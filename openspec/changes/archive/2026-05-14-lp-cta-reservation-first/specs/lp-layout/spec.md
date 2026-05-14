## MODIFIED Requirements

### Requirement: Hero セクションに CTA ボタンが2つ表示される

Hero セクションには、訪問者を **LP 内のイベント一覧** に誘導する主要 CTA ボタンが 1 つ表示されなければならない（SHALL）。CTA をクリックすると `#event-list-heading` へスムーススクロールし、現在開催予定のイベントを確認できる。予約サイト (`reservationTopUrl()`) への直接遷移は Hero CTA からは行わず、event-list の各イベントカードまたは next-session-strip 経由でのみ可能とする。

#### Scenario: Hero CTA の表示

- **WHEN** ユーザーが LP を開いて Hero セクションを見たとき
- **THEN** 「イベントを見る」ボタン（Primary variant）が 1 つ Hero 内に表示される

#### Scenario: Hero CTA クリック時の挙動

- **WHEN** ユーザーが「イベントを見る」ボタンをクリックしたとき
- **THEN** ページが `#event-list-heading` へスムーススクロールする。`window.location.href` による外部サイト遷移は発生しない

## ADDED Requirements

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
