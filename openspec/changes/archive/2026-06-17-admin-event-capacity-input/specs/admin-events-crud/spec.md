## MODIFIED Requirements

### Requirement: 1 セクション構成のフォーム

`EventForm` は MUST 以下の 1 セクションを表示する。セクションは `FormSection`（kicker 番号 + タイトル + hint テキスト + 子要素のスロット）コンポーネントで wrap される。

- **01 基本情報**: タイトル / 開催日 / 開始時刻 / 終了時刻 / 会場（venues マスタからの select）/ 参加費（500 / 1,000 / 自由入力のプリセットボタン付き）/ **定員（任意）**

定員入力は MUST `shared/ui/FormField` でラップし（生 `<label>+<input>` 直書き禁止）、`type="number"` の任意入力フィールドとして基本情報セクション内・参加費の下に配置する SHALL。空欄時のプレースホルダ / hint で「上限なし」運用であることを示す MUST。

紹介文 / サムネイル画像 / キャンセル期限 / 公開設定の Radio は MVP1 ではフォームに **含めない**。これらに対応する DB 列（`description` / `thumbnail_path`（存在する場合） / `cancel_deadline`）は INSERT 時に NULL のまま残される SHALL。定員（`capacity`）は本フォームの入力対象 MUST であり、空欄時のみ NULL が投入される。

#### Scenario: セクション構成が仕様どおり
- **WHEN** EventForm を描画
- **THEN** `01 基本情報` セクションのみ表示され、当該セクション内にタイトル / 開催日 / 開始時刻 / 終了時刻 / 会場 / 参加費 / 定員 の入力が含まれる（紹介文 / サムネイル / 公開設定セクションは存在しない）

#### Scenario: 定員フィールドの描画
- **WHEN** EventForm を描画
- **THEN** 基本情報セクションに定員入力フィールドが `FormField` でラップされて表示され、`type="number"` の任意入力として「上限なし」を示すプレースホルダ / hint を持つ

#### Scenario: 「ゆる練 vol.XX」テンプレ補完
- **WHEN** 新規作成画面で初回マウント時、events に過去の「ゆる練 vol.NN」が存在する
- **THEN** タイトル欄に `ゆる練 vol.<NN+1>` がプレースホルダとして提示され、ユーザーが何も入力していなければそのまま保存できる（ユーザーが任意の文字列を入力したら補完は無視）

#### Scenario: テンプレ補完取得失敗時の縮退
- **WHEN** vol.NN の取得クエリが失敗する
- **THEN** タイトル欄は空のまま（補完なしで）描画され、フォーム全体の Error 状態にはしない

#### Scenario: 参加費プリセット
- **WHEN** ユーザーが参加費の `¥500` または `¥1,000` プリセットボタンを押下
- **THEN** 参加費の数値入力に当該値が反映される。`自由入力` を選択した場合は数値入力にフォーカスが移るのみで値は変わらない

### Requirement: バリデーション

`EventForm` は MUST 以下のバリデーションをクライアントサイドで実施し、不正な入力では「保存」ボタンを無効化（または送信を中止）する。各エラーは該当フィールド直下に inline で表示 SHALL。

必須項目:
- タイトル（1〜100 文字）
- 開催日 / 開始時刻 / 終了時刻
- 会場

任意項目（空欄保存可）:
- 参加費（空欄＝会場 default_fee 継承。値ありの場合は 0 以上の整数）
- 定員（空欄＝上限なし = `capacity` NULL。値ありの場合は 1 以上の整数）

整合性:
- 開始時刻 < 終了時刻
- **編集時の定員下限**: 値ありの定員は、当該イベントの現在の有効予約人数（本人 + 同伴、`status IN ('reserved','attended')` の集計値）以上でなければならない MUST。下回る値は inline error を表示し保存をブロックする SHALL。新規作成時（予約 0 件）は下限 1 とする。

定員下限の判定に用いる有効予約人数は MUST `event_detail_view` の `reserved_count` を編集対象 event_id で取得して用いる SHALL。当該取得に失敗した場合は下限チェックをスキップし（整数・1 以上チェックのみ適用）、フォーム全体を Error 状態にしてはならない MUST（縮退）。

#### Scenario: タイトル未入力で保存を試みる
- **WHEN** タイトル欄が空のまま「保存」ボタンを押下
- **THEN** タイトル欄直下に「タイトルを入力してください」と表示され、API 送信は発生しない

#### Scenario: 終了時刻 < 開始時刻
- **WHEN** 開始 21:00 / 終了 19:00 を入力
- **THEN** 終了時刻欄直下に「終了は開始より後にしてください」と表示され、保存ボタンは disabled になる

#### Scenario: 参加費空欄での保存
- **WHEN** 参加費を空欄にして「保存」を押下
- **THEN** events.fee = NULL で INSERT され、LP / 予約サイトでは選択された会場の `default_fee` が継承表示される

#### Scenario: 定員空欄での保存（上限なし）
- **WHEN** 定員を空欄にして「保存」を押下
- **THEN** `events.capacity = NULL` で INSERT / UPDATE され、下流の残席表示 / RemainBar は描画されず「上限なし」運用が維持される

#### Scenario: 定員に不正値を入力
- **WHEN** 定員に `0`・負数・小数・非数のいずれかを入力
- **THEN** 定員欄直下に inline error が表示され、保存ボタンは disabled になる（1 以上の整数のみ許容）

#### Scenario: 編集時に現在の予約数を下回る定員設定
- **WHEN** 現在の有効予約人数が 12 名のイベントの編集画面で、定員に `10` を入力
- **THEN** 定員欄直下に「現在 12 名の予約があります。定員はこれ以上にしてください」が表示され、保存ボタンは disabled になる

#### Scenario: 編集時に予約数以上の定員設定
- **WHEN** 現在の有効予約人数が 12 名のイベントの編集画面で、定員に `18` を入力
- **THEN** バリデーションを通過し、`events.capacity = 18` で UPDATE される

#### Scenario: 予約数取得失敗時の縮退
- **WHEN** 編集画面で `event_detail_view` の `reserved_count` 取得が失敗し、定員に `5` を入力
- **THEN** 下限チェックはスキップされ（整数・1 以上のみ判定）、フォーム全体は Error 状態にならず、定員 `5` で保存できる

### Requirement: 4 状態（Loading / Empty / Error / Success）の網羅

`EventForm` は MUST 以下の 4 状態を表示し分ける:

- **Loading**:
  - Edit mode 初期マウント中（既存 event の取得中）: フォーム全体を Skeleton で覆う。定員下限判定用の `event_detail_view`（`reserved_count`）取得も Edit マウント時に行う
  - 保存中（API call 中）: 「保存」ボタンに spinner を表示し、フォーム入力を disabled にする
- **Empty**: Create mode の初期状態。空のフォームを表示する（Empty メッセージは出さない — Create 自体が Empty 状態の解消手段のため）
- **Error**:
  - Edit mode で event 取得失敗: フォーム部に `role="alert"` でエラーコード（例: `ERR · supabase / events.get · 503`）と `[一覧に戻る]` ボタン
  - 保存失敗（バリデーション通過後の API エラー）: フォーム上部に Banner で `role="alert"` 表示、フィールド単位の上書きエラーがあれば inline 表示
  - 削除失敗: AlertDialog 内に inline error
- **Success**: 保存成功後 → Toast「保存しました」を表示し、Edit mode はそのまま（dirty フラグクリア）、Create mode は `/events`（一覧）に置換遷移（履歴は積まない）

#### Scenario: Edit Loading 状態
- **WHEN** `/events/:id/edit` を初期マウントし、event のフェッチが pending
- **THEN** 1 セクション分の Skeleton placeholder が表示される

#### Scenario: 保存中のボタン状態
- **WHEN** ユーザーが「保存」を押下し、API が pending
- **THEN** 「保存」ボタンに spinner が表示され、disabled となる。「削除」も disabled になる

#### Scenario: 保存成功時の Toast 通知
- **WHEN** Edit mode で `保存` ボタンが API 200 を返す
- **THEN** Toast で「保存しました」が表示され、フォームは saved 状態に戻る（dirty フラグがクリア）

#### Scenario: Create 成功時の遷移
- **WHEN** Create mode で 200 が返る
- **THEN** Toast で「保存しました」が表示され、URL が `/events`（一覧）に置換遷移する（戻るで `/events/new` には戻らない）。一覧で新規作成された event が `公開中` ステータスで表示される

#### Scenario: 保存失敗時のエラー Banner
- **WHEN** API が 500 を返す
- **THEN** フォーム上部に「保存に失敗しました（ERR · supabase / events.update · 500）」が `role="alert"` で表示され、再度ボタンは活性に戻る

### Requirement: テスト戦略

本 capability は MUST 以下のテストカバレッジを持つ:

- **Unit (Vitest)**:
  - `eventFormSchema.ts` の純関数バリデーション（必須・整合性の全ケース、参加費の任意性、**定員の任意性・1 以上の整数・編集時の予約数下限**）
  - `useVolumeSuggest.ts` の vol.NN 抽出ロジック（過去 events 0/1/N 件・「ゆる練」以外のみのケース）
- **Component (Vitest + @vue/test-utils)**:
  - `FormSection`: kicker / title / hint / slot 描画
  - `SectionBasic`: 値反映 / 参加費プリセットボタンで値反映 / **定員入力の値反映** / バリデーションエラー / aria-invalid 付与
  - `EventForm`: Loading / Empty / Error / Success の 4 状態
  - `EventDeleteDialog`: Open / Cancel / Confirm / Error
- **Integration (Vitest + MSW)**:
  - `useEventForm` の Create サイクル（POST 200 → Toast → URL 置換 + `visibility: 'published'` 固定確認 + **capacity 反映確認**）
  - `useEventForm` の Update サイクル（PATCH 200 → Toast → dirty クリア + **capacity 反映確認**）
  - `useEventDelete` の Delete サイクル（DELETE 200 → Toast → /events redirect）
- **E2E (Playwright、上限 2 件)**:
  - **Happy path**: 認証済み admin で `/events/new` を開く → 必須項目 + 定員を入力 → 「保存」を押下 → 一覧で公開中ステータスで表示される
  - **Edge case**: Edit 画面で「削除」→ AlertDialog → 「削除する」を押下 → 一覧から消える

#### Scenario: pnpm test が全テストを通す
- **WHEN** `pnpm --filter @high-q/admin test` を実行
- **THEN** 上記 Unit / Component / Integration / E2E テストがすべて pass する
