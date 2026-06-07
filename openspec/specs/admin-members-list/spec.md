# admin-members-list Specification

## Purpose
TBD - created by archiving change admin-members-list-screen. Update Purpose after archive.
## Requirements
### Requirement: `/members` 画面の DataTable 列構成

`apps/admin` の `/members` 画面は、以下の列を持つ DataTable で会員を一覧表示しなければならない（SHALL）:

1. **名前** — `members.display_name`。先頭文字のアバター丸 + 氏名を横並び表示。修正依頼が 1 件以上ある会員は **氏名の横に「修正依頼 N」バッジ**（N は `correction_request_count`）を MUST 表示する（warning tone の小さい chip）。また `has_identity_document = false` の会員は **氏名の横に「書類未提出」バッジ**を MUST 表示する（neutral tone の小さい chip、固定文言）。修正依頼バッジと「書類未提出」バッジが両方該当する場合は両方並べて表示する SHALL（左から「修正依頼 N」「書類未提出」の順）
2. **メール** — `members.email`。等幅フォント・muted トーン
3. **経験** — `members.experience_level` を `初回`（beginner）/ `中級`（intermediate）/ `経験者`（experienced）に翻訳した Badge。tone は `experienced = success` / `intermediate = accent` / `beginner = neutral`
4. **初回参加** — `member_list_view.first_attended_at` を `YYYY/MM/DD` 形式で表示。NULL（未参加）の場合は `—`
5. **累計** — `member_list_view.attended_count` を「N 回」形式で右寄せ表示。10 回以上は accent カラー + 太字で強調
6. **最終参加** — `member_list_view.last_attended_at` を `YYYY/MM/DD` 形式で表示。NULL の場合は `—`
7. **メモ** — `members.admin_note` を 1 行プレビュー（最大 40 文字、超過は ellipsis）。NULL / 空文字は `—`

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は `<Table>` の `overflow-auto` で横スクロールに自動対応する SHALL。

「書類未提出」バッジは neutral tone（薄いグレー背景 + muted テキスト）の小 chip で、HQ デザイントークン（`@high-q/tailwind-preset` の utility または `var(--hq-*)` CSS 変数）経由でのみ着色 SHALL する。マジックナンバー（リテラル色）禁止。バッジは tooltip / クリック動線を MUST 持たない（MVP1 では表示のみ）。スクリーンリーダー対応のため、バッジ要素には `aria-label="本人確認書類が未提出"` を SHALL 付与する。

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
- **修正依頼セクション** — 当該会員の未対応 `correction_requests` 一覧を表示し、新規作成 / 取り下げ操作を行う。詳細は `member-correction-requests` capability「admin 詳細 sheet の修正依頼セクション」を参照

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

#### Scenario: 修正依頼セクションの表示
- **WHEN** 修正依頼 2 件を持つ会員の詳細 sheet を開く
- **THEN** 運営メモ編集フォームの下（または横）に修正依頼セクションが描画され、2 件の未対応エントリと「修正依頼を作成」ボタンが見える

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

### Requirement: 詳細 sheet の「危険な操作」セクション

`/members` 画面の詳細 sheet は、参加履歴・運営メモ編集に続く最下部に「危険な操作」セクションを MUST 表示する。本セクションは danger tone（赤系トークン）でスタイリングし、「この会員を削除」ボタン（danger variant）を含む。

セクションは admin（`role = 'admin'`）のみが利用可能な動線であり、非 admin はそもそも `/members` 画面に到達できない（admin-auth capability に従う）。

#### Scenario: セクションの表示
- **WHEN** admin が `/members` の任意の会員詳細 sheet を開く
- **THEN** sheet 最下部に「危険な操作」セクションと「この会員を削除」ボタンが表示される

#### Scenario: 視覚的な分離
- **WHEN** セクションが描画される
- **THEN** 上部の参加履歴・運営メモ編集と明確に視覚分離（divider または十分な余白）され、danger tone のラベル（「危険な操作」など）で誤操作リスクを伝える

### Requirement: 削除確認 AlertDialog

「この会員を削除」ボタン押下時は、AlertDialog 形式の確認 dialog を MUST 表示する。dialog は以下の要素を含む:

- 警告文: 削除によって失われるデータの内容を明示（基本情報 / 過去予約 N 件 / 本人確認書類 M 件 / Storage オブジェクト）
- 「未来予約 K 件は退会前に自動キャンセルされます」の明示（K > 0 のときのみ）
- **対象会員のメールアドレス再入力フィールド**（type=email）と、入力値が対象 member の email と完全一致した場合のみ「削除する」ボタンが enabled になる
- 「キャンセル」ボタン
- 「削除する」ボタン（danger variant、初期状態 disabled）

dialog はフォーカストラップ・Esc キー・背景クリックで閉じる動作を MUST 提供する（既存 AlertDialog プリミティブの挙動を踏襲）。

#### Scenario: 確認 dialog の構成
- **WHEN** admin が「この会員を削除」ボタンを押下
- **THEN** 上記要素を含む AlertDialog が表示される

#### Scenario: メール再入力で削除有効化
- **WHEN** admin が対象会員のメールアドレスを正確に再入力
- **THEN** 「削除する」ボタンが enabled になる

#### Scenario: メール不一致で削除不可
- **WHEN** admin が対象会員のメールアドレスとは異なる値を入力
- **THEN** 「削除する」ボタンは disabled のまま

#### Scenario: 未来予約件数の表示
- **WHEN** 対象会員が未来予約を 2 件持つ
- **THEN** dialog に「未来予約 2 件は退会前に自動キャンセルされます」が表示される

#### Scenario: 未来予約ゼロ件
- **WHEN** 対象会員に未来予約がない
- **THEN** 未来予約に関する文言は dialog に表示されない

#### Scenario: Esc で閉じる
- **WHEN** dialog 表示中に Esc キー押下
- **THEN** dialog が閉じ、削除は実行されない

### Requirement: 削除実行と一覧更新

「削除する」ボタン押下時は、admin アプリは MUST `withdraw-member` Edge Function を `target_member_id = <対象 id>` で呼び出す。成功時（200 / 204）には次の挙動を MUST 提供する:

- dialog と詳細 sheet を閉じる
- 一覧から当該会員行を即座に消す（楽観的更新 もしくは refetch）
- Toast「会員を削除しました」を表示

失敗時（403 / 500 / ネットワークエラー）には次の挙動を MUST 提供する:

- dialog 内に error メッセージを表示（「削除に失敗しました。時間をおいて再試行してください」相当）
- 「削除する」ボタンを再 enabled にし、再試行可能にする
- 一覧と詳細 sheet の状態は変更しない

#### Scenario: 削除成功
- **WHEN** admin が確認 dialog で「削除する」を押し、Function が 200 を返す
- **THEN** dialog / 詳細 sheet が閉じ、一覧から当該行が消え、Toast が表示される

#### Scenario: 既に削除済み
- **WHEN** admin が「削除する」を押した時点で対象会員が既に削除されている（別経路で先に削除された）
- **THEN** Function は 204 を返し、UI は成功扱い（一覧から行を消す）

#### Scenario: Function 失敗
- **WHEN** Function が 500 を返す
- **THEN** dialog 内に error メッセージが表示され、ボタンが再 enabled になる。一覧の当該行は残ったまま

#### Scenario: ネットワーク失敗
- **WHEN** Function 呼び出しがタイムアウトする
- **THEN** dialog 内に「ネットワークエラー。再試行してください」が表示され、ボタンが再 enabled になる

### Requirement: 削除済み会員の予約は一覧から消える

`/members` 画面の一覧は `members` テーブルから派生するため、退会済み会員は MUST 表示されない。`event_participants_view` 経由で参加者一覧に「退会済み会員」として現れる経路（`/events/:id` 画面）は admin-members-list capability の範囲外であり、本 capability では一覧と詳細 sheet からの完全な消失のみを保証する。

#### Scenario: 削除後の一覧から消失
- **WHEN** ある会員が削除された後に `/members` をリロード
- **THEN** 一覧に当該会員の行は存在しない（フィルタ・ソート問わず）

#### Scenario: 削除後の直接 URL アクセス
- **WHEN** 削除済み会員の id で `/members?detail=<deleted-uuid>` を直接開く
- **THEN** 一覧は正常描画され、sheet は Empty / Error 状態（「会員が見つかりません」）で開く（既存「存在しない member id」シナリオに準拠）

### Requirement: `MemberDetailSheet` の他ページからの再利用

`widgets/member-detail-sheet` は MUST `/members` 以外のページ（例: `/events/:id`）からも同一の `MemberDetailSheet` コンポーネントをマウントして開閉できる SHALL。再利用ページは MUST URL クエリ `?detail=<memberId>` を「`/members` と同じセマンティクス」で扱う（クエリ出現でシート表示、クエリ削除で非表示）。

これを実現するため、`useMemberDetailSheet` composable は MUST 「詳細クエリ source」を optional 引数として受け取れる SHALL:
- 引数省略時は `/members` 既存挙動（`useMembersFilter` を内部使用）を保持 SHALL
- 引数指定時は注入された source の `detail` ref / `closeDetail` 関数を使用 SHALL

`/members` 画面の既存挙動・URL スキーマ（`?exp=` `?attended=` `?last=` `?q=` `?sort=` `?dir=` `?page=` `?detail=`）と既存テストは MUST 全て不変であり、refactor によって `/members` の動作が変わってはならない SHALL。

#### Scenario: `useMemberDetailSheet` 引数なし呼び出しの後方互換
- **WHEN** `/members` の `MemberDetailSheet` が引数なしで `useMemberDetailSheet()` を呼ぶ
- **THEN** 内部で `useMembersFilter()` が呼ばれ、`?detail=<id>` の出現でシートが開く既存動作が保たれる

#### Scenario: `useMemberDetailSheet` source 注入呼び出し
- **WHEN** `/events/:id` のページが `useRouteDetailQuery()` を生成し、その `{ detail, closeDetail }` を `useMemberDetailSheet({ detail, closeDetail })` に渡す
- **THEN** シートは渡された `detail` を購読し、`closeDetail` 呼び出しでクエリを削除する

#### Scenario: `/members` 既存テストが緑のまま
- **WHEN** refactor 後に `useMemberDetailSheet.spec.ts` および `MembersListPage` 関連 spec を実行
- **THEN** すべてのテストが既存と同じ assertion で緑になる

