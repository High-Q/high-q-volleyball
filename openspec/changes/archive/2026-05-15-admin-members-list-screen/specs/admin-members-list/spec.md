## ADDED Requirements

### Requirement: `/members` 画面の DataTable 列構成

`apps/admin` の `/members` 画面は、以下の列を持つ DataTable で会員を一覧表示しなければならない（SHALL）:

1. **名前** — `members.display_name`。先頭文字のアバター丸 + 氏名を横並び表示
2. **メール** — `members.email`。等幅フォント・muted トーン
3. **経験** — `members.experience_level` を `初回`（beginner）/ `中級`（intermediate）/ `経験者`（experienced）に翻訳した Badge。tone は `experienced = success` / `intermediate = accent` / `beginner = neutral`
4. **初回参加** — `member_list_view.first_attended_at` を `YYYY/MM/DD` 形式で表示。NULL（未参加）の場合は `—`
5. **累計** — `member_list_view.attended_count` を「N 回」形式で右寄せ表示。10 回以上は accent カラー + 太字で強調
6. **最終参加** — `member_list_view.last_attended_at` を `YYYY/MM/DD` 形式で表示。NULL の場合は `—`
7. **メモ** — `members.admin_note` を 1 行プレビュー（最大 40 文字、超過は ellipsis）。NULL / 空文字は `—`

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は `<Table>` の `overflow-auto` で横スクロールに自動対応する SHALL。

#### Scenario: 列順序が仕様どおり
- **WHEN** `/members` を Success 状態で描画
- **THEN** 上記 1〜7 の列が左から順に表示される

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

### Requirement: フィルタ・検索・ソート

`/members` 画面は、以下のフィルタ・検索・ソートを SHALL 提供する:

- **経験フィルタ**: 「すべて」/「初回」（beginner）/「中級」（intermediate）/「経験者」（experienced）。デフォルトは「すべて」
- **累計レンジフィルタ**: 「すべて」/「初回のみ」（attended_count = 1）/「2-5 回」/「6-10 回」/「11 回以上」。デフォルトは「すべて」。未参加（attended_count = 0）はいずれのレンジにも該当しない（除外）
- **最終参加期間フィルタ**: 「すべて」/「今月」（last_attended_at が当月）/「3 ヶ月以内」（now() - 3 months 〜 now()）/「半年以上前」（last_attended_at < now() - 6 months）。デフォルトは「すべて」。`last_attended_at IS NULL`（未参加）は「すべて」以外のフィルタには該当しない
- **検索**: `display_name` / `email` / `admin_note` のいずれかに部分一致（ILIKE）。デフォルトは空文字列（無効）
- **ソート**: 列ヘッダクリックで「初回参加」「累計」「最終参加」「名前」を asc/desc トグル。デフォルトは「最終参加 desc」（NULL は最後）

各フィルタ・検索・ソート状態は URL クエリ（`?exp=` / `?attended=` / `?last=` / `?q=` / `?sort=` / `?dir=`）で同期 SHALL し、ブラウザのリロード・戻る/進む操作で復元できる。

#### Scenario: 経験フィルタの適用
- **WHEN** ユーザーが経験「経験者」を選択
- **THEN** URL に `?exp=experienced` が追加され、`experience_level = 'experienced'` の会員のみ表示される

#### Scenario: 累計レンジフィルタの境界
- **WHEN** ユーザーが累計「2-5 回」を選択
- **THEN** `attended_count BETWEEN 2 AND 5` の会員のみ表示される。`attended_count = 1` や `attended_count = 6` は含まれない

#### Scenario: 未参加会員と最終参加フィルタ
- **WHEN** ユーザーが最終参加「半年以上前」を選択
- **THEN** `last_attended_at IS NOT NULL AND last_attended_at < now() - interval '6 months'` の会員のみ表示される。`last_attended_at IS NULL` の会員は含まれない

#### Scenario: 検索とフィルタの組み合わせ
- **WHEN** 経験「中級」+ 検索文字列「メール届かず」を入力
- **THEN** 経験中級 かつ `display_name` / `email` / `admin_note` のいずれかに「メール届かず」を含む会員のみ表示される

#### Scenario: ソート方向の切替
- **WHEN** 「累計」ヘッダを 2 回クリック
- **THEN** 1 回目で desc、2 回目で asc に切り替わり、URL クエリ `sort=attended_count&dir=desc` → `dir=asc` で同期する

#### Scenario: URL クエリからの復元
- **WHEN** `/members?exp=experienced&attended=11%2B&q=送迎` を直接開く
- **THEN** フィルタ UI が当該値で初期化され、対応する一覧が表示される

### Requirement: ページネーション

`/members` 画面は、サーバサイドの offset / limit ページネーションを SHALL 提供する。1 ページあたりの件数は **25 件**固定とし、`?page=N` を URL クエリで同期する。

#### Scenario: ページ送り
- **WHEN** ページ 2 のリンクをクリック
- **THEN** URL が `?page=2` になり、26 〜 50 番目の会員が表示される

#### Scenario: ページ範囲外
- **WHEN** `?page=999` を直接開く（実データが少ない）
- **THEN** 一覧は Empty 状態を表示し、`?page=1` への補正を提案する UI（または自動 `?page=1` リダイレクト）が動く

### Requirement: 4 状態の描画

`/members` 画面は、データ取得状態に応じて以下の 4 状態を SHALL 描画する:

- **Loading**: skeleton 行を 5 行表示（DataTable の現行スタイル踏襲）
- **Empty**: 「条件に合う会員はいません」のメッセージ + フィルタクリア CTA
- **Error**: 「データ取得に失敗しました」のメッセージ + 再試行 CTA。ボタン押下で `?` クエリは保ったまま再取得
- **Success**: DataTable + Pagination

#### Scenario: 初期描画の Loading
- **WHEN** `/members` を初回マウント
- **THEN** Loading 状態が描画され、データ取得完了後 Success 状態に遷移する

#### Scenario: フィルタで Empty
- **WHEN** 累計「11 回以上」を選択し該当者が 0 件
- **THEN** Empty メッセージとフィルタクリア CTA が表示される

#### Scenario: 取得エラー
- **WHEN** Supabase 取得が失敗（PostgreSQL エラーまたはネットワーク失敗）
- **THEN** Error メッセージと再試行 CTA が表示される

### Requirement: PageHeader のサマリ表示

`/members` 画面は PageHeader（既存 `EventsListPage` ヘッダー相当）に以下のサマリを SHALL 表示する:

- タイトル: 「会員」
- breadcrumb: `Workspace > 会員`
- サブタイトル: `累計 N 名 · 今月初参加 M 名`（N = 全会員数、M = `first_attended_at` が当月の会員数）

サブタイトルの取得はメイン一覧クエリと独立した別クエリで取得 SHALL し、フィルタ・検索・ページネーション変更時には再取得しない（PageHeader 値は画面ライフサイクルで 1 回のみ取得）。

#### Scenario: サマリの表示
- **WHEN** `/members` を Success 状態で描画
- **THEN** サブタイトル「累計 N 名 · 今月初参加 M 名」が表示される

#### Scenario: フィルタ変更でサマリ不変
- **WHEN** ユーザーが経験フィルタを変更
- **THEN** 一覧は再取得されるが、サブタイトルの N / M は同じ値のまま

### Requirement: 詳細 sheet の表示

`/members` 画面は、行クリックまたは行の「詳細」アクションで、画面右側に slide-in する詳細 sheet を SHALL 表示する。sheet は以下を含む:

- 会員基本情報（氏名 / メール / 経験レベル / 生年月日 / 電話 / 初回参加日 / 累計参加回数 / 最終参加日）
- 参加履歴テーブル（`member_history_view` から member_id でフィルタ取得）
- 運営メモ編集フォーム（textarea、最大 500 文字、改行可、保存ボタン）

sheet の開閉状態は URL クエリ `?detail=:id` で同期 SHALL し、ブラウザ戻る/進む/リロードで復元される。Esc キー / 背景クリック / 閉じるボタンで `?detail=` がクリアされ sheet が閉じる。

#### Scenario: 行クリックで sheet が開く
- **WHEN** 一覧の行をクリック
- **THEN** URL に `?detail=:id` が追加され、当該会員の詳細 sheet が右側に slide-in する

#### Scenario: URL から直接 sheet を開く
- **WHEN** `/members?detail=<uuid>` を直接開く
- **THEN** 一覧が描画され、当該会員の sheet が初期表示で開いている

#### Scenario: 存在しない member id
- **WHEN** `/members?detail=<missing-uuid>` を開く
- **THEN** sheet は描画されるが内容は Empty / Error 状態（「会員が見つかりません」）

#### Scenario: Esc キーで閉じる
- **WHEN** sheet 開いた状態で Esc キーを押下
- **THEN** `?detail=` がクリアされ sheet が閉じる

#### Scenario: 背景クリックで閉じる
- **WHEN** sheet 開いた状態で背景の overlay 領域をクリック
- **THEN** `?detail=` がクリアされ sheet が閉じる

#### Scenario: ブラウザ戻るで閉じる
- **WHEN** sheet 開いた状態でブラウザの戻るボタン
- **THEN** sheet が閉じ、一覧画面に戻る（フィルタ・ページネーション状態は保持）

### Requirement: 詳細 sheet の参加履歴表示

詳細 sheet 内の参加履歴は、`member_history_view` から `member_id = :id` でフィルタ取得した行を時系列降順（`start_at desc`）で表示 SHALL する。表示列:

- 日付（`start_at` を `YYYY/MM/DD (曜) HH:mm` 形式）
- イベント名（`event_name`）
- 会場（`venue_name`）
- 状態（`status` を翻訳: `reserved = 予約中` / `attended = 参加済` / `no_show = 不参加` / `waitlist = キャンセル待ち`、Badge で表示）
- 同伴（`guest_count` が 0 のときは `—`、それ以外は `+N` 形式）
- 初回バッジ（`is_first_time = true` の行に「初回」Badge を追加表示）

`status = 'cancelled'` の予約は表示しない MUST。

#### Scenario: 参加履歴の表示順序
- **WHEN** 会員の参加履歴が attended 3 件 + reserved 2 件
- **THEN** start_at 降順で 5 行が表示される（cancelled は除外）

#### Scenario: 初参加履歴の Badge
- **WHEN** 会員の最も古い attended 行を描画
- **THEN** `is_first_time = true` のため「初回」Badge が表示される

#### Scenario: 同伴ありの予約
- **WHEN** `guest_count = 2` の reservation
- **THEN** 同伴列は `+2` と表示される

#### Scenario: 参加履歴 0 件
- **WHEN** 当該会員に `status IN ('reserved', 'attended', 'no_show', 'waitlist')` の予約が 0 件
- **THEN** Empty メッセージ「参加履歴がありません」を表示する

### Requirement: 運営メモ編集

詳細 sheet 内の運営メモ編集は、`members.admin_note` を直接 UPDATE する。textarea で編集し、保存ボタン押下で UPDATE を SHALL 発行する。バリデーション:

- 最大 500 文字（アプリ層）
- 改行可、HTML エスケープは表示時
- 空文字は NULL として保存（DB 上の `admin_note` を NULL に戻す）
- 楽観的更新: 保存ボタン押下で即座に UI 反映し、API 失敗時は元の値にロールバック + Toast でエラー表示

#### Scenario: メモの保存
- **WHEN** textarea に「左利き / 体験申込」と入力し保存ボタン押下
- **THEN** `UPDATE members SET admin_note = '左利き / 体験申込' WHERE id = :id` が発行され、UI 上のメモプレビューも更新される

#### Scenario: 空文字の保存（メモ削除）
- **WHEN** textarea を空にして保存ボタン押下
- **THEN** `UPDATE members SET admin_note = NULL WHERE id = :id` が発行され、一覧のメモセルが `—` に戻る

#### Scenario: 500 文字超過
- **WHEN** textarea に 501 文字以上を入力
- **THEN** 文字数カウンタが赤くなり、保存ボタンが disabled になる

#### Scenario: 楽観的更新の失敗時ロールバック
- **WHEN** 保存中に Supabase エラーが返る
- **THEN** UI のメモ値は元に戻り、Toast「保存に失敗しました」が表示される

#### Scenario: 非 admin が API 直叩きしても拒否
- **WHEN** 非 admin ユーザーが直接 `UPDATE members SET admin_note = '...' WHERE id = ?` を発行
- **THEN** RLS の UPDATE WITH CHECK 句により拒否される（`rls-policies` capability の Requirement に従う）

### Requirement: PageHeader のヘッダーリンク

`/members` 画面の PageHeader と `/events` 画面の PageHeader は SHALL 相互ナビゲーションリンクを提供する:

- `/events` から `/members` への「会員」リンク（既存「本人確認書類」リンクと並列、Badge なし）
- `/members` から `/events` への「イベント」リンク

リンクは既存 PageHeader のスタイル（border + hover + focus-visible）を踏襲する。

#### Scenario: events から members へ
- **WHEN** `/events` の PageHeader にある「会員」リンクをクリック
- **THEN** `/members` に遷移する

#### Scenario: members から events へ
- **WHEN** `/members` の PageHeader にある「イベント」リンクをクリック
- **THEN** `/events` に遷移する

### Requirement: FSD レイヤー配置

`/members` 画面の実装は、FSD 規約に従い以下のレイヤーに配置 SHALL する:

- `apps/admin/src/pages/MembersListPage.vue` — ルートエントリ、PageHeader + 一覧 widget + 詳細 sheet widget の組み合わせ
- `apps/admin/src/widgets/members-list/` — DataTable + Toolbar + Pagination + 4 状態管理
- `apps/admin/src/widgets/member-detail-sheet/` — slide-in sheet + 参加履歴テーブル + メモ編集フォーム
- `apps/admin/src/features/members-filter/` — 経験 / 累計レンジ / 最終参加期間 / 検索の入力 UI と URL 同期
- `apps/admin/src/features/member-admin-note-edit/` — メモ保存 + 楽観的更新
- `apps/admin/src/entities/member/` — 型（`Member` / `MemberListRow` / `MemberHistoryRow`）+ view 取得 composable

各スライスは `index.ts`（Public API）経由で外部 import される SHALL。Supabase client は `apps/admin/src/shared/api/` 経由でのみ使用される SHALL。

#### Scenario: 依存方向の検証
- **WHEN** `pnpm --filter @high-q/admin lint` を実行
- **THEN** `members-list` widget から `member-detail-sheet` widget への直接 import が検出された場合エラーになる（widget 間の横並び import は FSD で禁止、page で組み合わせる）

#### Scenario: Public API 経由の import
- **WHEN** `MembersListPage.vue` が `@/widgets/members-list` からインポート
- **THEN** widget の `index.ts` 経由で公開されたシンボルのみ import 可能

### Requirement: アクセシビリティ

`/members` 画面は WCAG 2.1 AA レベルを SHALL 満たす:

- 詳細 sheet は `role="dialog"` + `aria-modal="true"` + フォーカストラップ（shadcn-vue Dialog プリミティブ採用）
- DataTable の列ヘッダはソート可能列に `aria-sort` 属性
- フィルタは `<label>` + `<select>` または `FormField` ラップで関連付け
- 文字色のコントラスト比 4.5:1 以上（`@high-q/tailwind-preset` のトークン使用で担保）
- キーボード操作のみで一覧操作 → 詳細 sheet 開閉 → メモ編集 → 保存 → sheet 閉 → 一覧操作 まで完結可能

#### Scenario: フォーカストラップ
- **WHEN** sheet が開いた状態で Tab キーを連続押下
- **THEN** フォーカスが sheet 内の要素を循環し、sheet 外（一覧）には移動しない

#### Scenario: Esc で sheet 閉
- **WHEN** sheet 内の textarea にフォーカスがある状態で Esc キー
- **THEN** sheet が閉じ、フォーカスは sheet を開いた行に戻る
