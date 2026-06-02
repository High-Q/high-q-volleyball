## MODIFIED Requirements

### Requirement: 一覧から詳細画面への遷移動線

`/events` 画面の DataTable は、**編集列を除く行全体**を `/events/:id`（admin-event-detail capability）への遷移トリガーとして SHALL 機能させる。各行（`<TableRow>`）内の主要セル（日付 / タイトル / 会場 / 時間 / 予約・残席バー / ステータス）のいずれをクリック / タップしても詳細画面に遷移する MUST。

「操作」列の「編集」リンクは独立した遷移先 `/events/:id/edit` を持ち、行クリック遷移の対象から MUST 除外される。編集リンクの押下時は詳細画面に遷移しない MUST NOT。

行クリック化は a11y セマンティクスを過剰に肥大化させない方式 SHALL とし、1 行あたりのリンク数は「詳細遷移 1 つ + 編集遷移 1 つ」に MUST 抑える（各セルを個別の `<router-link>` でラップする方式は採用しない）。

ソート可能列ヘッダー（日付・ステータス）のソートトグル動作は SHALL 維持される（行クリックの影響を受けない）。

行ホバー時の視覚フィードバック（背景色変化）は SHALL 提供する。キーボード操作は MUST 対応し、Tab で行の詳細遷移リンクに focus、Enter で `/events/:id` に遷移する。タイトル文字列がセル幅を超えて truncate された場合の元テキスト確認手段（`title` 属性または `aria-label`）は SHALL 維持する。

#### Scenario: 行内セル（編集列以外）クリックで詳細画面に遷移
- **WHEN** ユーザーが events 行の日付 / タイトル / 会場 / 時間 / 予約・残席バー / ステータスのいずれかのセルを押下
- **THEN** router が `/events/:id` に push され、admin-event-detail capability が実装する詳細画面が表示される

#### Scenario: 編集リンクは引き続き編集画面へ遷移
- **WHEN** ユーザーが events 行末の「編集」リンクを押下
- **THEN** router が `/events/:id/edit` に push される。詳細画面 `/events/:id` には遷移しない

#### Scenario: 行ホバー時の視覚フィードバック
- **WHEN** ユーザーが events 行に hover する
- **THEN** 行全体の背景色が `--hq-color-paper-warm` 相当に変化し、クリック可能であることが視覚的に伝わる

#### Scenario: キーボード遷移
- **WHEN** ユーザーが Tab キーで Toolbar から進める
- **THEN** 各行の詳細遷移リンク → 編集リンクの順に focus が当たり、Enter キーでそれぞれ `/events/:id` / `/events/:id/edit` へ遷移する

#### Scenario: ソート可能ヘッダー（日付・ステータス）の独立性
- **WHEN** ユーザーが「日付」または「ステータス」の列ヘッダを押下
- **THEN** ソート方向のトグルのみが発火し、`/events/:id` への遷移は起きない

#### Scenario: タイトル truncate 時の元テキスト確認手段
- **WHEN** タイトル文字列がセル幅を超えて truncate されている行に hover する
- **THEN** title 属性または aria-label でフルテキストが確認できる
