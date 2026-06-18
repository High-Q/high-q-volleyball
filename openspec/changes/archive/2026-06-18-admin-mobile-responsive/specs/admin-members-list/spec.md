## MODIFIED Requirements

### Requirement: `/members` 画面の DataTable 列構成

`apps/admin` の `/members` 画面は、以下の列を持つ DataTable で会員を一覧表示しなければならない（SHALL）:

1. **名前** — `members.display_name`。先頭文字のアバター丸 + 氏名を横並び表示。修正依頼が 1 件以上ある会員は **氏名の横に「修正依頼 N」バッジ**（N は `correction_request_count`）を MUST 表示する（warning tone の小さい chip）。また `has_identity_document = false` の会員は **氏名の横に「書類未提出」バッジ**を MUST 表示する（neutral tone の小さい chip、固定文言）。修正依頼バッジと「書類未提出」バッジが両方該当する場合は両方並べて表示する SHALL（左から「修正依頼 N」「書類未提出」の順）
2. **メール** — `members.email`。等幅フォント・muted トーン
3. **経験** — `members.experience_level` を `初回`（beginner）/ `中級`（intermediate）/ `経験者`（experienced）に翻訳した Badge。tone は `experienced = success` / `intermediate = accent` / `beginner = neutral`
4. **初回参加** — `member_list_view.first_attended_at` を `YYYY/MM/DD` 形式で表示。NULL（未参加）の場合は `—`
5. **累計** — `member_list_view.attended_count` を「N 回」形式で右寄せ表示。10 回以上は accent カラー + 太字で強調
6. **最終参加** — `member_list_view.last_attended_at` を `YYYY/MM/DD` 形式で表示。NULL の場合は `—`
7. **メモ** — `members.admin_note` を 1 行プレビュー（最大 40 文字、超過は ellipsis）。NULL / 空文字は `—`

デスクトップ（≥ `md`）は DataTable で表示し、各セルは `whitespace-nowrap` で改行抑止する。**モバイル（< `md`）は MUST 横スクロールではなくカード縦積みで表示し、上記 1〜7 の全項目をカード内に保持する**（名前 + 各バッジを上段、メール / 経験 / 初回参加 / 累計 / 最終参加 / メモを下段に「ラベル: 値」相当で配置）。横スクロールは使わない（`admin-responsive-shell` capability のレスポンシブ表示規約に従う）。

「書類未提出」バッジは neutral tone（薄いグレー背景 + muted テキスト）の小 chip で、HQ デザイントークン（`@high-q/tailwind-preset` の utility または `var(--hq-*)` CSS 変数）経由でのみ着色 SHALL する。マジックナンバー（リテラル色）禁止。バッジは tooltip / クリック動線を MUST 持たない（MVP1 では表示のみ）。スクリーンリーダー対応のため、バッジ要素には `aria-label="本人確認書類が未提出"` を SHALL 付与する。

#### Scenario: 列順序が仕様どおり
- **WHEN** `/members` を Success 状態で描画
- **THEN** 上記 1〜7 の列が左から順に表示される

#### Scenario: モバイル幅ではカード縦積みで表示される
- **WHEN** 画面幅 375px で `/members` を Success 状態で描画
- **THEN** DataTable ではなくカード縦積みで表示され、横スクロールは発生せず、名前（各バッジ含む）/ メール / 経験 / 初回参加 / 累計 / 最終参加 / メモの全項目が各カード内で確認できる

#### Scenario: 累計 10 回以上の強調表示
- **WHEN** ある会員の `attended_count = 11` の行を描画
- **THEN** 累計セルが accent カラー + 太字で表示される

#### Scenario: 初参加待ちの会員
- **WHEN** `attended_count = 0` かつ `first_attended_at IS NULL` / `last_attended_at IS NULL` の会員を描画
- **THEN** 累計セルは `0 回`、初回・最終参加セルは `—` が表示される

#### Scenario: メモ未設定
- **WHEN** `admin_note IS NULL` または空文字の会員を描画
- **THEN** メモセルは `—` が表示される

#### Scenario: メモ長文のプレビュー
- **WHEN** `admin_note` が 100 文字の値の会員を描画
- **THEN** メモセルは先頭 40 文字 + `…` で表示される（行を超えた省略）

#### Scenario: 修正依頼バッジの表示
- **WHEN** `correction_request_count = 2` の会員行を描画
- **THEN** 氏名セル内に「修正依頼 2」の warning tone バッジが表示される

#### Scenario: 修正依頼ゼロでバッジなし
- **WHEN** `correction_request_count = 0` の会員行を描画
- **THEN** 氏名セルに修正依頼バッジは表示されない

#### Scenario: 書類未提出バッジの表示
- **WHEN** `has_identity_document = false` の会員行を描画
- **THEN** 氏名セル内に「書類未提出」の neutral tone バッジが表示され、`aria-label="本人確認書類が未提出"` が付与される

#### Scenario: 書類提出済でバッジなし
- **WHEN** `has_identity_document = true` の会員行を描画
- **THEN** 氏名セルに「書類未提出」バッジは表示されない

#### Scenario: 修正依頼と書類未提出の両方を持つ会員
- **WHEN** `correction_request_count = 1` かつ `has_identity_document = false` の会員行を描画
- **THEN** 氏名セル内に「修正依頼 1」（warning tone）と「書類未提出」（neutral tone）のバッジが左から順に並んで表示される

#### Scenario: 書類未提出バッジのデザイントークン準拠
- **WHEN** `/members` の DataTable を `apps/admin/src/{pages,widgets,features}/**/*.vue` 範囲で `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep
- **THEN** 「書類未提出」バッジに関するリテラル色 / リテラル spacing のマッチが 0 件である
