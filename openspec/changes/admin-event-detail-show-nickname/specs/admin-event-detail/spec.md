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

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は横スクロールにフォールバック SHALL。氏名 + ニックネーム併記でも同様に `whitespace-nowrap` を維持し、画面幅を超える場合は table 全体の横スクロールに乗せる MUST（行内での折返しはしない）。

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

#### Scenario: モバイル幅でのレイアウト破綻なし
- **WHEN** 画面幅 375px で `display_name + nickname` の合計文字数が表示領域を超える参加者行を描画
- **THEN** 名前列のセルは `whitespace-nowrap` のまま維持され、table 全体の横スクロールで参照できる。行内での折返しや、ニックネーム単独の省略表示は発生しない

### Requirement: 検索・フィルタ・URL クエリ同期

`EventParticipantsToolbar` は MUST 以下のコントロールを提供する:

- **検索**: `members.display_name`、`members.nickname`、または `members.email` への部分一致（クライアント側 `String.includes` ベース、大小英字は lowercase 揃え）
- **経験フィルタ**: 「初回」「中級」「経験者」「すべて」（デフォルト「すべて」）
- **状態フィルタ**: 「未チェックイン」「チェックイン済」「すべて」（デフォルト「すべて」）

各値は MUST URL クエリ（`?q=` `?exp=beginner|intermediate|experienced` `?ck=checked|unchecked`）と双方向同期する。値「すべて」は URL クエリから当該キーを削除する SHALL。ブラウザのリロードと戻る/進むで状態が復元される SHALL。

検索の `nickname` 部分一致は MUST `nickname IS NULL` の行を巻き込まない（NULL は常に検索対象外）。

#### Scenario: 検索文字列の URL 同期
- **WHEN** ユーザーが検索ボックスに「田中」と入力
- **THEN** URL が `/events/<id>?q=%E7%94%B0%E4%B8%AD` になり、display_name / nickname / email のいずれかに「田中」を含む行のみ表示される

#### Scenario: 経験フィルタの組み合わせ
- **WHEN** 経験「経験者」を選択（既に `?q=` がある状態で）
- **THEN** URL が `?q=...&exp=experienced` になり、experience_level=experienced の行に絞られる

#### Scenario: フィルタ「すべて」で URL クエリから削除
- **WHEN** 経験フィルタを「経験者」から「すべて」に戻す
- **THEN** URL から `exp=` が削除される

#### Scenario: リロードでの状態復元
- **WHEN** `/events/<id>?q=tanaka&ck=unchecked` で画面リロード
- **THEN** 検索ボックスに「tanaka」、状態フィルタに「未チェックイン」が復元され、絞り込み結果が表示される

#### Scenario: ニックネーム部分一致での絞り込み
- **WHEN** `display_name = '山田 太郎' / nickname = 'たろちゃん'` の会員と、ニックネーム未登録の他会員が存在する状態で、検索ボックスに `たろ` と入力
- **THEN** ニックネームに `たろ` を含む `山田 太郎` の行が結果に含まれる。ニックネーム未登録の他会員は含まれない

#### Scenario: ニックネーム NULL は検索対象外
- **WHEN** `nickname = null` の会員のみが参加している event で、検索ボックスに任意の文字列を入力
- **THEN** display_name / email のみで部分一致判定が行われ、nickname 列が NULL であることによる誤マッチ（空文字一致等）は発生しない
