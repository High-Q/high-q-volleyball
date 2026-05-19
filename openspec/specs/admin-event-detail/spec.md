# admin-event-detail Specification

## Purpose
TBD - created by archiving change admin-event-detail-screen. Update Purpose after archive.
## Requirements
### Requirement: `/events/:id` 画面のルートと配置

`apps/admin` は MUST `/events/:id` ルートを公開し、`EventDetailPage` をマウント SHALL する。本ルートは admin 認証 (AAL2 + role=admin) 配下で、未認証 / AAL1 / 非 admin はそれぞれ既存 auth guard により `/login` / `/mfa` / `/login?reason=not-admin` にリダイレクトされる。

`:id` パラメータは UUID として扱い、形式不正の場合は `event not found` Error 状態と同等の画面を表示 SHALL する（後述「event not found 時の表示」）。

#### Scenario: 認証済み admin が直接 URL を踏む
- **WHEN** AAL2 + admin の状態で `/events/<existing-uuid>` を開く
- **THEN** `EventDetailPage` が描画される

#### Scenario: 未認証で URL を踏む
- **WHEN** 未認証で `/events/<any-uuid>` を開く
- **THEN** `/login` にリダイレクトされる

#### Scenario: 一般会員が URL を踏む
- **WHEN** AAL2 + role=member で `/events/<any-uuid>` を開く
- **THEN** `/login?reason=not-admin` にリダイレクトされ、admin 画面に侵入できない

### Requirement: ヘッダ TopBar の構成

`EventDetailPage` の最上段は MUST 以下を表示する `EventDetailTopBar` を持つ:

- **タイトル**: `events.name`
- **パンくず**: 「イベント」/ 開催日（`MM/DD (曜)` フォーマット）
- **サブタイトル**: `YYYY/MM/DD (曜) · HH:mm – HH:mm · 会場名`
- **アクション**: 「編集」CTA（押下で `/events/:id/edit` へ遷移）

CSV エクスポート / 一括メールの CTA は MVP1 では **表示しない**（MVP2）。

#### Scenario: TopBar の表示内容
- **WHEN** event_detail_view が成功取得できた
- **THEN** TopBar にイベント名 / パンくず / サブタイトル / 「編集」CTA が表示される

#### Scenario: 編集 CTA の遷移先
- **WHEN** ユーザーが TopBar の「編集」を押下
- **THEN** router が `/events/:id/edit` に push される

### Requirement: StatCard 4 枚のサマリ表示

`EventDetailPage` は MUST `EventStatCards` を TopBar 直下に表示し、4 つの統計を横並びで表示する。**人数ベースの集計** (本人 + 同伴) を母集団とする (data-schema spec の `reserved_count` / `checked_in_count` / `waitlist_count` 仕様参照)。

1. **予約数 / 残席**（`capacity` 有無で動的切替）:
   - `capacity === null` の時（MVP1 デフォルト、#86 で capacity 入力 UI 未提供）: ラベル「予約数」、主値 `reserved_count` (本人+同伴の総人数)、補助単位「名」
   - `capacity` ありの時: ラベル「残席」、主値 `capacity - reserved_count`、補助単位 `/ capacity 名`
2. **チェックイン**: 主値 `checked_in_count` (本人+同伴のチェックイン済人数) + 補助 `/ {reserved_count}` (active 予約人数) + RemainBar と同じビジュアル言語のミニ進捗バー (track + fill、`role="progressbar"`)
3. **初回参加**: `first_time_count` を主値、`名` を補助単位として表示。母集団は **member 数** (同伴は member 化されていないため対象外)
4. **キャンセル待ち**: `waitlist_count` を主値、`名` を補助単位として表示。MVP1 では DB 側で常に 0 を返すため `0 名` 固定表示

各 StatCard は `Kicker`（`— 01` ～ `— 04`）+ 主値（数値大表示）+ 補助単位 + ラベルで構成し、`@high-q/ui` のデザイントークン（`var(--hq-*)`）を使用 SHALL する。マジックナンバー（`#182F43` 等）禁止。

#### Scenario: capacity NULL（MVP1 デフォルト）の StatCard 表示
- **WHEN** event_detail_view から `capacity=null, reserved_count=19, checked_in_count=6, first_time_count=2, waitlist_count=0` が返る (16 件の予約 + 同伴計 3 名 + うち 4 件 attended で同伴 2 名チェックイン済の状態)
- **THEN** 4 枚の StatCard が左から「予約数 19 名」「チェックイン 6 / 19 + 進捗バー」「初回参加 2 名」「キャンセル待ち 0 名」と表示される

#### Scenario: capacity あり（将来 MVP2 で復活時）の StatCard 表示
- **WHEN** event_detail_view から `capacity=20, reserved_count=19, checked_in_count=6, first_time_count=2, waitlist_count=0` が返る
- **THEN** 4 枚の StatCard が左から「残席 1 / 20」「チェックイン 6 / 19 + 進捗バー」「初回参加 2 名」「キャンセル待ち 0 名」と表示される

#### Scenario: チェックイン操作で予約数は不変、チェックイン人数のみ増減
- **WHEN** 参加者の 1 件 (guest_count=0) をチェックイン操作で `'reserved' → 'attended'` に変更
- **THEN** **予約数 (StatCard 1) は不変**、チェックイン StatCard 02 の主値が **+1** される (本人 1 名分、optimistic 反映)。mutation の DB 反映完了後、event_detail_view を refetch して真値で StatCard を上書きする (`requestSeq` ガードで並列 mutation でも古い結果は捨てる)。

#### Scenario: 同伴ありのチェックインは「本人 + 同伴」分カウントが上がる
- **WHEN** 参加者の 1 件 (guest_count=2) をチェックイン
- **THEN** チェックイン StatCard 02 の主値が **+3** される (本人 1 + 同伴 2)。予約数 StatCard は不変。

#### Scenario: キャンセル代行後の即時反映（同伴も外れる）
- **WHEN** 参加者の 1 件 (guest_count=1, status='reserved') をキャンセル代行で `'cancelled'` に変更
- **THEN** 1 番目の StatCard (capacity NULL) は「予約数 **-2**」(本人 1 + 同伴 1)、capacity ありなら「残席 +2」となる (optimistic 反映)。DB UPDATE 完了後、event_detail_view を refetch して真値で StatCard を上書きする。

#### Scenario: 同伴者数の編集が StatCard に即時反映
- **WHEN** admin が ある reservation の guest_count を 0 → 2 に変更
- **THEN** 予約数 StatCard が **+2** される (本人は元々カウント済み、増分は同伴 2 名のみ)。当該 reservation が attended ならチェックイン StatCard も +2。

### Requirement: RemainBar の表示（capacity ありの時のみ）

`EventStatCards` の下段に MUST `@high-q/ui` の `RemainBar` を **`capacity` が non-NULL の時のみ** 表示する。`booked = reserved_count`、`capacity = events.capacity`、`waitlist = waitlist_count` を渡す。`capacity === null` の時は RemainBar を **描画せず**、領域も取らない SHALL（StatCard 直下に Tabs が続く）。

MVP1 では実質 RemainBar は描画されない（#86 の admin-events-crud で capacity 入力 UI が未提供のため、新規作成された events はすべて capacity = NULL）。capacity 入力 UI が将来復活した時点で自動的に RemainBar が出現する。

#### Scenario: capacity あり時の RemainBar 描画
- **WHEN** event_detail_view から `capacity=18, reserved_count=16, waitlist_count=0` が返る
- **THEN** RemainBar が 16/18 の比率で描画される

#### Scenario: capacity NULL 時の RemainBar 非表示
- **WHEN** capacity が NULL
- **THEN** RemainBar は描画されず、StatCard 直下に Tabs が続く（領域も取らない）

### Requirement: タブ構造（参加者一覧 / キャンセル待ち / 当日チェックイン）

`EventDetailPage` は MUST `EventDetailTabs` で 3 タブを表示する:

- **参加者一覧** (active, MVP1): 参加者数を Badge で表示
- **キャンセル待ち** (disabled, MVP2 予定): 件数 0 を Badge で表示。クリック時は無反応、ホバー時に「Coming soon」の `title` 属性ツールチップ
- **当日チェックイン** (disabled, MVP2 予定): モバイル専用画面への遷移予定。MVP1 では disabled

各タブは MUST `role="tab"` + `aria-selected="true|false"` + `aria-controls` を持ち、disabled タブは `aria-disabled="true"` を持つ。Tab キーで active タブにフォーカスでき、disabled タブはフォーカス対象外 SHALL。

#### Scenario: タブの初期状態
- **WHEN** 画面マウント直後
- **THEN** 「参加者一覧」が active、他 2 タブは disabled で「Coming soon」ツールチップを持つ

#### Scenario: disabled タブのクリック無反応
- **WHEN** 「キャンセル待ち」タブをクリック
- **THEN** active タブは「参加者一覧」のまま変化せず、URL も変化しない

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

### Requirement: 個別チェックイントグル（Switch / Toggle UI）

`EventParticipantsTable` の各行のチェックイン Switch は MUST 押下（クリック / タップ / Space / Enter）で以下の挙動を取る:

1. UI の Switch slider を即座にトグル（optimistic 反映）+ 隣接テキスト「未 / 済」も即座に切替
2. `update reservations set status = ?, checked_in_at = ? where id = :id` を Supabase に発行
   - 未 → 済: `status = 'attended', checked_in_at = now()`、WHERE 句に `status = 'reserved' and checked_in_at is null` を含める（多重 UPDATE 防御）
   - 済 → 未: `status = 'reserved', checked_in_at = null`、WHERE 句に `status = 'attended'` を含める
3. UI 反映: StatCard のチェックイン済カウントを `±(1 + guest_count)` で optimistic 反映 → mutation 完了 (await) 後に participants_view + event_detail_view を順に refetch して真値で同期。`requestSeq` ガードにより並列 mutation でも古い refetch 結果は捨てられ、複数 admin の同時操作にも整合する
4. 失敗時: UI の Switch を元の状態に戻す（slider と隣接テキスト両方）+ Toast でエラー表示（「チェックイン更新に失敗しました」）
5. 同 reservation_id への in-flight mutation が既にある場合は二重発火を防ぐ（クライアント側 `inFlight` Set）。in-flight 中は Switch を `disabled` 状態（`aria-busy="true"`）にする

`CheckinToggle` コンポーネントは MUST 以下の WAI-ARIA 仕様に準拠 SHALL:

- ルート要素: `role="switch"` + `aria-checked="true|false"` + `aria-label="<member名> のチェックイン"` + `tabindex="0"`
- キーボード: Space / Enter で toggle、Tab で次のフォーカス対象へ
- in-flight 中: `aria-busy="true"` + `aria-disabled="true"` + 視覚的に半透明
- アニメーション: slider 移動 transition 150ms、`@media (prefers-reduced-motion: reduce)` の時は 0ms

#### Scenario: 未 → 済 の正常系（クリック操作）
- **WHEN** 未チェックインの行の Switch をクリックし、UPDATE が成功
- **THEN** Switch が ON 状態（slider 右・緑・テキスト「済」）に変わり、`aria-checked="true"` になり、StatCard のチェックイン済カウントが +1 される

#### Scenario: 済 → 未 の正常系
- **WHEN** チェックイン済の行の Switch をクリックし、UPDATE が成功
- **THEN** Switch が OFF 状態（slider 左・グレー・テキスト「未」）に変わり、`aria-checked="false"` になり、StatCard のチェックイン済カウントが -1 される

#### Scenario: キーボードでの操作
- **WHEN** Switch にフォーカスがある状態で Space キーを押下
- **THEN** クリックと同じく toggle 挙動が発火する

#### Scenario: UPDATE 失敗時のロールバック
- **WHEN** Switch 押下後の UPDATE がネットワークエラーで失敗
- **THEN** UI の Switch が元の状態（slider 位置 + 隣接テキスト + `aria-checked`）に戻り、Toast「チェックイン更新に失敗しました」が表示される

#### Scenario: 多重 UPDATE 防御
- **WHEN** 同一行の Switch を連打（mutation が in-flight 中）
- **THEN** 2 回目以降のクリックは無視される（client side ガード）。in-flight 中の Switch は `aria-busy="true"` + 視覚的に半透明。既に DB 側に到達した重複 UPDATE は WHERE 句条件不一致で 0 行更新となり、データ整合性は保たれる

### Requirement: 個別キャンセル代行

`EventParticipantsTable` の各行の「キャンセル代行」アクションボタンは MUST 押下で以下の挙動を取る:

1. AlertDialog を表示し、タイトル「予約をキャンセルしますか？」+ 説明「{display_name} さんの予約をキャンセルします。この操作は元に戻せません。」+ ボタン「キャンセル」「予約を取消」を表示
2. 「予約を取消」確定で `update reservations set status = 'cancelled' where id = :id` を発行
3. 既存トリガー `set_reservations_cancelled_at` が `cancelled_at = now()` を自動設定する
4. 成功時: 該当行を一覧から消す（status='cancelled' は表示対象外）+ StatCard の reserved_count を -1（optimistic）+ background で view を invalidate + Toast「キャンセルしました」を表示
5. 失敗時: AlertDialog 内に inline error を表示。一覧表示は変更しない

#### Scenario: AlertDialog の表示
- **WHEN** 「キャンセル代行」ボタンを押下
- **THEN** AlertDialog が開き、対象 member の display_name が説明文に含まれる

#### Scenario: 確定でキャンセル成功
- **WHEN** AlertDialog の「予約を取消」を押下し、UPDATE が成功
- **THEN** 該当行が一覧から消え、Toast「キャンセルしました」が表示され、StatCard の残席が +1 される

#### Scenario: ダイアログのキャンセル
- **WHEN** AlertDialog の「キャンセル」ボタン or ESC を押下
- **THEN** AlertDialog が閉じ、reservations への UPDATE は発行されない

#### Scenario: UPDATE 失敗
- **WHEN** 確定後の UPDATE がエラーで失敗
- **THEN** AlertDialog 内に「キャンセルに失敗しました」inline error が表示され、行は一覧に残ったまま

### Requirement: 4 状態（Loading / Empty / Error / Success）の網羅

`EventDetailPage` は MUST 以下 4 状態を出し分ける:

- **Loading**: `event_detail_view` または `event_participants_view` の取得中。`EventDetailSkeleton` で StatCard 4 枚 + Toolbar + Table 行を Skeleton 描画
- **Empty**: event_detail_view は取得成功しているが participants が 0 件。「まだ予約がありません」+ 説明テキスト「公開直後 / または全員キャンセルされた状態です」を表示。StatCard と TopBar は通常表示する（StatCard の reserved_count = 0）
- **Error**:
  - `event not found`（0 行返る or RLS で見えない）: 「イベントが見つかりません。削除済みの可能性があります」+ 「イベント一覧へ戻る」CTA
  - `participants 取得失敗`: StatCard と TopBar は表示し、参加者一覧エリアにのみ Error バナー + 「再試行」CTA
  - `network/server error`: 全画面エラー + 「再試行」CTA
- **Success**: 通常表示

エラーメッセージは MUST `role="alert"` を持つ。

#### Scenario: Loading 状態
- **WHEN** 画面マウント直後で event_detail_view が取得中
- **THEN** Skeleton が表示される

#### Scenario: Empty 状態
- **WHEN** event_detail_view 取得成功 + event_participants_view が 0 件
- **THEN** TopBar と StatCard（reserved_count=0）は通常表示され、テーブルエリアに「まだ予約がありません」が表示される

#### Scenario: event not found
- **WHEN** `/events/<non-existent-uuid>` を開く（または RLS で見えない）
- **THEN** 「イベントが見つかりません。削除済みの可能性があります」と「イベント一覧へ戻る」CTA が表示される。CTA 押下で `/events` へ戻る

#### Scenario: 参加者取得のみ失敗
- **WHEN** event_detail_view は成功、event_participants_view のクエリが失敗
- **THEN** TopBar + StatCard は通常表示され、テーブルエリアに「参加者の取得に失敗しました」+ 「再試行」CTA が表示される

### Requirement: FSD レイヤー配置

本画面の実装は MUST 以下の FSD 配置に従う:

- `apps/admin/src/pages/EventDetailPage.vue` — Page。ルーター直下のエントリ
- `apps/admin/src/widgets/event-detail/` — TopBar + StatCards + Tabs + Skeleton + Error + Empty
  - `ui/EventDetailWidget.vue` / `EventDetailTopBar.vue` / `EventStatCards.vue` / `EventDetailTabs.vue` / `EventDetailSkeleton.vue` / `EventDetailErrorState.vue` / `EventDetailEmptyState.vue`
  - `composables/useEventDetailData.ts`
  - `index.ts`（Public API）
- `apps/admin/src/widgets/event-participants/` — Toolbar + Table
  - `ui/EventParticipantsWidget.vue` / `EventParticipantsToolbar.vue` / `EventParticipantsTable.vue`
  - `composables/useEventParticipantsData.ts`
  - `index.ts`
- `apps/admin/src/features/participants-filter/` — URL クエリ同期
  - `composables/useParticipantsFilter.ts`
  - `types.ts`
  - `index.ts`
- `apps/admin/src/features/reservation-checkin/` — チェックインのトグル
  - `composables/useReservationCheckin.ts`
  - `ui/CheckinToggle.vue`
  - `index.ts`
- `apps/admin/src/features/reservation-cancel-by-admin/` — キャンセル代行
  - `composables/useReservationCancelByAdmin.ts`
  - `ui/ReservationCancelDialog.vue`
  - `index.ts`
- `apps/admin/src/entities/event-detail/` — `event_detail_view` の DTO 型 + queries
  - `model/eventDetail.types.ts`
  - `api/eventDetailQueries.ts`
  - `index.ts`
- `apps/admin/src/entities/reservation/` — `event_participants_view` の DTO 型 + queries + mutations
  - `model/reservation.types.ts`
  - `api/reservationQueries.ts`
  - `api/reservationMutations.ts`
  - `index.ts`

依存方向は MUST `pages → widgets → features → entities → shared` の一方向のみ。`features` 同士の相互依存禁止 SHALL。

#### Scenario: 依存方向の検証
- **WHEN** ESLint （`eslint-plugin-boundaries`）を実行
- **THEN** 上位レイヤーから下位レイヤーへの import のみが許可されており、違反 import は 0 件

### Requirement: アクセシビリティ

本画面は MUST 以下を満たす:

- すべてのインタラクティブ要素（タブ / ボタン / Switch / リンク）は `aria-label` または可視テキストを持つ
- チェックイン Switch は `role="switch"` + `aria-checked="true|false"` + `aria-label="<member名> のチェックイン"` を持つ。in-flight 中は `aria-busy="true"` + `aria-disabled="true"`
- AlertDialog はフォーカストラップ + `role="alertdialog"` + `aria-labelledby` + `aria-describedby` を持つ
- エラーメッセージは `role="alert"` を持つ
- テキスト・背景のコントラスト比は AA（4.5:1）以上
- Tab キーで TopBar アクション → タブ → Toolbar コントロール → Table 内の Switch・操作ボタンの順にフォーカス移動できる
- Switch は Space / Enter キーでトグル可能
- ESC で AlertDialog を閉じられる
- `@media (prefers-reduced-motion: reduce)` の時は Switch のスライドアニメーションを無効化（即時切替）

#### Scenario: Switch の aria 属性
- **WHEN** Switch を描画
- **THEN** `role="switch"` + `aria-checked="true|false"` + `aria-label` が付与される

#### Scenario: Switch のキーボード操作
- **WHEN** Switch にフォーカスがある状態で Space キーを押下
- **THEN** Switch がトグルされ、`aria-checked` の値が反転する

#### Scenario: AlertDialog のフォーカストラップ
- **WHEN** AlertDialog が開いた状態で Tab を押し続ける
- **THEN** フォーカスが Dialog 内（キャンセル / 確定ボタン）でループし、外に出ない

### Requirement: 取得方法の単一性（クライアント join 禁止）

参加者一覧と StatCard 集計は MUST それぞれ SQL view（`event_detail_view` / `event_participants_view`）経由で取得 SHALL。クライアント側で events × reservations × members を join するクエリ実装は禁止する（N+1 と RLS 漏れリスクを回避）。

`is_first_time` フラグは MUST view 側で計算済みの列として返り、クライアント側で別 fetch して導出してはならない。

#### Scenario: ヘッダ取得の単一クエリ
- **WHEN** EventDetailPage がマウントされる
- **THEN** Supabase クライアントは `event_detail_view` を id 指定で 1 回 SELECT し、StatCard の 4 統計を含む 1 行を取得する

#### Scenario: 参加者一覧の単一クエリ
- **WHEN** 参加者一覧が描画される
- **THEN** Supabase クライアントは `event_participants_view` を event_id でフィルタして 1 回 SELECT し、`is_first_time` を含む全列を取得する

### Requirement: 複数 admin の同時操作整合性

本画面は MUST 複数の admin が同時に操作しても data の整合性を保ち SHALL なければならない。

具体的には以下を満たす:

1. **Optimistic UI** で即時フィードバック (押下感を維持)
2. mutation の DB UPDATE 完了 (`await`) を **待ってから** participants_view と event_detail_view を refetch する。並列 fire-and-forget は禁止 (UPDATE 完了前の fetch が古い DB 値で optimistic 値を上書きする race condition を起こす)
3. fetch の sequence ガード (`requestSeq`) で、**並列に複数 mutation** が走っても **古い refetch 結果は捨て**、最新 refetch のみを state に反映する
4. **タブが foreground に戻った時** (`document.visibilitychange` で visible) に participants_view と event_detail_view を自動で refetch して、他 admin がバックグラウンド中に行った変更を取り込む
5. 同一 reservation への二重操作は **DB の WHERE 句条件** (`status='reserved' AND checked_in_at IS NULL` 等) と **client side の in-flight Set** の二重ガードで防ぐ

#### Scenario: mutation 完了後の真値同期
- **WHEN** admin A がチェックイン UPDATE を発行し、mutation が DB 反映を完了
- **THEN** participants_view と event_detail_view の refetch が直列に実行され、StatCard と Table の両方が真値で上書きされる (optimistic 値の累積誤差は発生しない)

#### Scenario: 並列 mutation での古い refetch 結果は捨てる
- **WHEN** admin が短時間に 2 件の mutation A, B を連続発行し、A の refetch fetch が B の refetch fetch より遅れて返る
- **THEN** B の refetch が先に state を更新し、A の fetch 結果は `requestSeq` 不一致で捨てられる。state は B 完了時点の真値を保持

#### Scenario: 別 admin の変更がタブ復帰で取り込まれる
- **WHEN** admin A が画面を開いた状態で別タブに切り替え、その間に admin B が同 event をチェックイン操作 → admin A がタブを戻す
- **THEN** `document.visibilitychange` で visible になった瞬間に participants_view と event_detail_view が refetch され、admin B の変更 (チェックイン人数 +N 等) が admin A の画面に反映される

#### Scenario: 同一行への二重チェックインは DB レベルで no-op
- **WHEN** admin A と admin B が同じ未チェックインの予約を同時刻にチェックイン操作
- **THEN** 先着 1 件のみ `WHERE status='reserved' AND checked_in_at IS NULL` 条件にヒットして UPDATE 成功、後着は条件不一致で 0 行更新 (`ALREADY_UPDATED` エラーで Toast 表示)。データ整合性は保たれる

### Requirement: テスト

本画面は MUST 以下のテストを持つ:

- **Composable unit test**（Vitest）:
  - `useParticipantsFilter` の URL クエリ ⇄ state 双方向変換、「すべて」値の URL 削除
  - `useReservationCheckin` の optimistic 反映、UPDATE 失敗時のロールバック、in-flight ガード
  - `useReservationCancelByAdmin` の confirm → mutation → success/error フロー
- **API layer test**（Vitest + Supabase mock）:
  - `eventDetailQueries.getEventDetail` が `event_detail_view` を id でフィルタする
  - `eventDetailQueries.getEventParticipants` が `event_participants_view` を event_id でフィルタする
  - `reservationMutations.toggleCheckin` が status + checked_in_at を WHERE 句条件付きで UPDATE する
  - `reservationMutations.cancelByAdmin` が status='cancelled' で UPDATE する
- **Component test**（Vitest + @vue/test-utils）:
  - `EventDetailWidget` の 4 状態出し分け
  - `EventStatCards` の表示フォーマット（capacity NULL 時 / 通常時）
  - `EventParticipantsTable` のチェックボックス押下挙動 + 初回バッジ条件
  - `ReservationCancelDialog` の AlertDialog 開閉 + 確定 / キャンセル
- **E2E**（Playwright、本 change で 1 件）:
  - happy path: 認証済み admin で `/events/<id>` を開く → 1 名チェックイン → StatCard チェックイン済カウントが +1 反映される

#### Scenario: Component test の網羅
- **WHEN** `pnpm --filter @high-q/admin test` を実行
- **THEN** EventDetailPage / EventDetailWidget / EventParticipantsTable / 各 composable / 各 mutation の test がすべて pass する

#### Scenario: E2E の通過
- **WHEN** `pnpm --filter @high-q/e2e test` を実行（admin プロジェクト）
- **THEN** 「`/events/:id` を開く → チェックイン → StatCard +1 反映」の happy path が pass する

