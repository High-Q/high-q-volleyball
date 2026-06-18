## MODIFIED Requirements

### Requirement: 参加者 DataTable の列構成

参加者一覧タブの本体は MUST `EventParticipantsTable` を表示し、以下の列を持つ DataTable で表示する:

1. **名前**: アバター（先頭文字の丸チップ）+ `members.display_name` + ニックネーム併記 + 初回バッジ（`is_first_time === true` の場合のみ）
   - `members.nickname` が NULL でなければ、氏名の直後に `（{nickname}）` を全角括弧で併記する SHALL（例: `山田 太郎（たろちゃん）`）
   - `members.nickname` が NULL の行では氏名のみ表示し、空の括弧やプレースホルダーは出さない MUST
   - ニックネーム部分は氏名と同サイズ・同ウェイトで描画し、視覚的に同等の情報として扱う SHALL（小さく薄く落とすことはしない）
   - アバターのイニシャル算出は `display_name.charAt(0)` のままで、nickname の影響を受けない MUST
2. **経験**: `experience_level` を翻訳した Badge — 初回（neutral）/ 中級（accent）/ 経験者（success）
3. **同伴**: `guest_count > 0` なら `+{n}`、それ以外は `–`。mono フォント右寄せ
4. **予約日時**: `reservations.created_at` を `MM/DD HH:mm` で表示。mono + muted 色
5. **メール**: `members.email`。mono + muted 色
6. **チェックイン**: Switch (Toggle) UI（`role="switch"` + `aria-checked="true|false"` + 隣接テキストラベル「済」「未」併記）。`checked_in_at IS NOT NULL` なら ON 状態（slider が右、`var(--hq-success)` 緑、テキスト「済」）、NULL なら OFF 状態（slider が左、グレー、テキスト「未」）
7. **操作**: キャンセル代行アイコンボタン（押下で AlertDialog）

デスクトップ（≥ `md`）は DataTable で表示し、各セルは `whitespace-nowrap` で改行抑止する。**モバイル（< `md`）は MUST 横スクロールではなくカード縦積みで表示し、上記 1〜7 の全項目をカード内に保持する**。チェックイン済の参加者カードは MUST 背景色（`var(--hq-success)` 系のソフト背景）でハイライトし、状態を色で表現する。氏名 + ニックネーム併記はカード内でも全角括弧併記を維持する MUST（行内での折返しによる意味の崩れはしない）。チェックイン Switch / キャンセル代行ボタン等の操作要素は MUST 44px 以上のタップ領域を確保する。横スクロールは使わない（`admin-responsive-shell` capability のレスポンシブ表示規約に従う）。

#### Scenario: 列順序が仕様どおり
- **WHEN** Success 状態で参加者 1 名以上ある event を描画
- **THEN** 上記 1〜7 の列が左から順に表示される

#### Scenario: 初回バッジの条件
- **WHEN** `is_first_time === true` の参加者行
- **THEN** 名前列の右隣に「初回」Badge が表示される。`is_first_time === false` の場合は表示されない

#### Scenario: 同伴ゼロ表示
- **WHEN** `guest_count === 0` の参加者行
- **THEN** 同伴列に `–` が表示される。`guest_count === 1` なら `+1`

#### Scenario: チェックイン状態の表示（済）
- **WHEN** `checked_in_at` が `2026-04-28T10:30:00Z`
- **THEN** チェックイン列に Switch が ON 状態（slider 右・緑）+ テキスト「済」が表示され、`aria-checked="true"` を持つ

#### Scenario: チェックイン状態の表示（未）
- **WHEN** `checked_in_at` が NULL
- **THEN** チェックイン列に Switch が OFF 状態（slider 左・グレー）+ テキスト「未」が表示され、`aria-checked="false"` を持つ

#### Scenario: ニックネーム併記（あり）
- **WHEN** `display_name = '山田 太郎'` / `nickname = 'たろちゃん'` の参加者行を描画
- **THEN** 名前列に `山田 太郎（たろちゃん）` の形で氏名とニックネームが全角括弧で併記される。括弧は描画される

#### Scenario: ニックネーム併記（なし）
- **WHEN** `display_name = '佐藤 健太'` / `nickname = null` の参加者行を描画
- **THEN** 名前列に `佐藤 健太` のみが表示される。括弧やプレースホルダー（`（）` / `（未設定）` 等）は描画されない

#### Scenario: 退会済み会員の表示は不変
- **WHEN** 退会済み会員の予約行（`member_id IS NULL`、`display_name = '退会済み会員'`）
- **THEN** 名前列は `退会済み会員` のみが表示され、ニックネーム併記は行われない（`nickname` は常に NULL として扱う）

#### Scenario: モバイル幅ではカード縦積みで表示される
- **WHEN** 画面幅 375px で参加者一覧を Success 状態で描画
- **THEN** DataTable ではなくカード縦積みで表示され、横スクロールは発生せず、名前（ニックネーム併記含む）/ 経験 / 同伴 / 予約日時 / メール / チェックイン / 操作の全項目が各カード内で確認できる
- **AND** チェックイン済の参加者カードは背景色でハイライトされる

### Requirement: 参加者一覧の内側スクロール

イベント詳細画面（`/events/:id`）は、参加者数が画面高を超えた場合に、**参加者一覧領域（デスクトップは DataTable / モバイルはカードリスト）の内側のみ**で縦スクロールを発生させること SHALL。ページ全体（ブラウザの外側スクロールバー）でのスクロール解決は禁止する。

TopBar / StatCards / RemainBar / Tabs / 参加者一覧 Toolbar は MUST 画面上部に固定され、参加者一覧のスクロール操作によって位置が変化してはならない。

#### Scenario: 参加者多数イベントで一覧領域のみがスクロールする

- **WHEN** 参加者が縦スクロールを必要とする数（例: viewport 高に対し行数 / カード数が超過する状態）だけ存在するイベントの詳細画面を開く
- **THEN** 参加者一覧領域の内側にのみスクロールバーが表示される
- **AND** ページ全体のスクロールバーは発生しない
- **AND** TopBar / StatCards / RemainBar / Tabs / Toolbar は固定位置に留まる

#### Scenario: 参加者 0 件 / Loading / Error 状態でレイアウトが崩れない

- **WHEN** 参加者一覧が Empty（0 件）/ Loading（pending）/ Error のいずれかの状態で描画される
- **THEN** Toolbar および状態メッセージが参加者一覧領域に収まり、外側へはみ出さない
- **AND** TopBar / StatCards / RemainBar / Tabs は通常通り固定表示される

#### Scenario: モバイル幅でも内側スクロールが機能する

- **WHEN** 画面幅 375px で参加者多数イベントの詳細画面を開く
- **THEN** 参加者一覧（カードリスト）領域の内側のみで縦スクロールが機能する
- **AND** 上部の固定要素群（TopBar / StatCards / RemainBar / Tabs / Toolbar）は画面外にスクロールしない
