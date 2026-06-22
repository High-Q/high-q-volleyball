# admin-events-crud Specification

## Purpose
TBD - created by archiving change admin-events-crud-screen. Update Purpose after archive.
## Requirements
### Requirement: `/events/new` と `/events/:id/edit` 画面のルートと共通フォーム

`apps/admin` は MUST `/events/new`（新規作成）と `/events/:id/edit`（編集）の 2 つのルートを公開し、両方を単一の `EventForm` widget で描画 SHALL する。フォームは `mode: 'create' | 'edit'` props で挙動を切り替え、1 セクション構成（基本情報のみ）の DOM 構造をどちらの mode でも維持しなければならない。

両ルートは admin 認証下に置かれ MUST、未認証 / AAL1 / 非 admin の場合はそれぞれ `/login` / `/mfa` / `/login?reason=not-admin` に redirect される（既存 auth guard 流用）。

#### Scenario: 新規作成画面の初期描画
- **WHEN** 認証済み admin が `/events/new` を開く
- **THEN** EventForm が空フィールドで描画され、ヘッダのアクションは「キャンセル」「保存」の 2 ボタンになる（編集画面と異なり「削除」は表示されない）

#### Scenario: 編集画面の初期描画
- **WHEN** 認証済み admin が `/events/:id/edit` を開き、対象 event が存在する
- **THEN** EventForm が対象 event の値で初期化され、ヘッダのアクションは「削除」「保存」の 2 ボタンになる

#### Scenario: 編集対象が存在しない場合
- **WHEN** `/events/:id/edit` の `:id` に対応する event が無い、または RLS で取得不可
- **THEN** Error 状態が表示され、`role="alert"` のメッセージと `[一覧へ戻る]` CTA が表示される

### Requirement: 1 セクション構成のフォーム

`EventForm` は MUST 以下の 1 セクションを表示する。セクションは `FormSection`（kicker 番号 + タイトル + hint テキスト + 子要素のスロット）コンポーネントで wrap される。

- **01 基本情報**: タイトル / 開催日 / 開始時刻 / 終了時刻 / 会場（venues マスタからの select）/ 参加費（500 / 1,000 / 自由入力のプリセットボタン付き）/ **定員（任意）** / **メール追記メッセージ（任意）**

定員入力は MUST `shared/ui/FormField` でラップし（生 `<label>+<input>` 直書き禁止）、`type="number"` の任意入力フィールドとして基本情報セクション内・参加費の下に配置する SHALL。空欄時のプレースホルダ / hint で「上限なし」運用であることを示す MUST。

メール追記メッセージ入力は MUST `shared/ui/FormField` でラップした複数行テキスト入力（textarea）とし、基本情報セクション内に配置する SHALL。hint で「予約完了/変更メールの末尾に会員へそのまま掲載される。懇親会の案内や当日の集合補足などに使う」旨と、会場固有の注意事項は会場マスタのアクセスメモ側に書く運用であることを示す MUST。空欄時は events.email_note に NULL（または空）が投入され、メールには当該セクションが描画されない SHALL。

紹介文 / サムネイル画像 / キャンセル期限 / 公開設定の Radio は MVP1 ではフォームに **含めない**。これらに対応する DB 列（`thumbnail_path`（存在する場合） / `cancel_deadline`）は INSERT 時に NULL のまま残される SHALL。定員（`capacity`）およびメール追記メッセージ（`email_note`）は本フォームの入力対象 MUST であり、空欄時のみ NULL が投入される。

#### Scenario: セクション構成が仕様どおり
- **WHEN** EventForm を描画
- **THEN** `01 基本情報` セクションのみ表示され、当該セクション内にタイトル / 開催日 / 開始時刻 / 終了時刻 / 会場 / 参加費 / 定員 / メール追記メッセージ の入力が含まれる（サムネイル / 公開設定セクションは存在しない）

#### Scenario: 定員フィールドの描画
- **WHEN** EventForm を描画
- **THEN** 基本情報セクションに定員入力フィールドが `FormField` でラップされて表示され、`type="number"` の任意入力として「上限なし」を示すプレースホルダ / hint を持つ

#### Scenario: メール追記メッセージフィールドの描画
- **WHEN** EventForm を描画
- **THEN** 基本情報セクションにメール追記メッセージの textarea が `FormField` でラップされて表示され、任意入力であること・メールに会員へ掲載される旨を示す hint を持つ

#### Scenario: メール追記メッセージの保存と空欄
- **WHEN** メール追記メッセージに文字列を入力して保存／空欄のまま保存
- **THEN** 入力時は events.email_note に当該文字列（前後トリム後）が、空欄時は NULL が投入される

#### Scenario: 「ゆる練 vol.XX」テンプレ補完
- **WHEN** 新規作成画面で初回マウント時、events に過去の「ゆる練 vol.NN」が存在する
- **THEN** タイトル欄に `ゆる練 vol.<NN+1>` がプレースホルダとして提示され、ユーザーが何も入力していなければそのまま保存できる（ユーザーが任意の文字列を入力したら補完は無視）

#### Scenario: テンプレ補完取得失敗時の縮退
- **WHEN** vol.NN の取得クエリが失敗する
- **THEN** タイトル欄は空のまま（補完なしで）描画され、フォーム全体の Error 状態にはしない

#### Scenario: 参加費プリセット
- **WHEN** ユーザーが参加費の `¥500` または `¥1,000` プリセットボタンを押下
- **THEN** 参加費の数値入力に当該値が反映される。`自由入力` を選択した場合は数値入力にフォーカスが移るのみで値は変わらない

### Requirement: 即時公開ポリシー（visibility 固定）

`EventForm` は MUST INSERT 時に `events.visibility = 'published'` を固定で投入する。UPDATE 時も既存の `visibility` を上書きしない（読み込んだ値をそのまま戻す）。下書き / 限定公開 / 中止 など、公開状態の切替 UI は MVP1 では提供しない SHALL。

理由: 「登録 → 即時表示 / 削除 → 即時非表示」を MVP1 の運用方針として確立し、admin 操作の認知負荷を最小化する。下書きや限定公開は MVP2 で公開設定セクションが追加される際に再設計する。

#### Scenario: 新規作成は published で投入
- **WHEN** ユーザーが `/events/new` で「保存」を押下
- **THEN** API ペイロードに `visibility: 'published'` が含まれ、INSERT 直後に LP / 予約サイトの公開イベント一覧に表示される

#### Scenario: 編集は visibility を維持
- **WHEN** ユーザーが `/events/:id/edit` で「保存」を押下
- **THEN** UPDATE ペイロードに `visibility` フィールドは含まれない（または読み込んだ値をそのまま送る）。既存値が `'draft'` だったとしても、本画面の操作で意図せず `'published'` に変わってはならない

#### Scenario: 削除は即時非表示
- **WHEN** ユーザーが Edit 画面で削除を確定する
- **THEN** events から DELETE され、`reservations.event_id` の FK CASCADE により紐づく予約レコードも整合的に削除される。LP / 予約サイトのイベント一覧からも消える

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

### Requirement: 削除の AlertDialog による二重確認

Edit mode のヘッダ「削除」ボタンは MUST AlertDialog（shadcn-vue `AlertDialog`）を開き、ユーザーが「削除する」を **2 段階で（Dialog 内で再度押下）** 確認した場合のみ削除 API を呼ぶ。Dialog の Cancel または ESC キーで閉じた場合は何も起きない。

AlertDialog は対象イベントに紐づく予約の内訳（有効予約 = reserved + attended の合計 / キャンセル済 = cancelled + no_show の合計）を表示 SHALL。有効予約が 1 件以上ある場合は、削除により当該予約も同時に削除される旨と「対象の予約者にはキャンセル通知メールを自動で送信します」の注意書きを Dialog 内に明示 MUST する。

AlertDialog は MUST 主催者からの一言メッセージを任意で添えられる textarea を提供する。textarea は空欄のままでもよく、入力された場合は通知メール本文の理由欄にそのまま反映される SHALL。textarea 文字数は 500 文字以内を上限とする MUST。

AlertDialog は MUST textarea の直下に、実際に会員へ送信されるメール本文のプレビューを描画する SHALL。プレビューは件名と本文の両方を表示し、textarea の入力に reactive に追従する MUST。event meta 取得失敗時はプレビューを非表示にする SHALL。

削除確定時は MUST 以下の順序で処理する:

1. 有効予約者の `members.email` を `reservations` 経由で SELECT してスナップショット取得（CASCADE 削除前に行う）
2. `DELETE FROM events WHERE id = ?` を 1 回呼び出し、reservations は FK CASCADE で連鎖削除
3. DELETE 成功後、スナップショットが 1 件以上かつ送信先がある場合のみ `send-event-cancellation-notification` Edge Function を fire-and-forget で呼び出す（主催者メッセージを引数に渡す）
4. Toast を表示（予約 0 件なら「削除しました」、予約あり なら「削除しました（N 件の予約も整理されました）」）
5. `/events`（一覧）に redirect

Edge Function 呼び出しの成功 / 失敗は MUST 上位の Toast / redirect / Success 状態を妨げない（fire-and-forget）。

#### Scenario: 削除キャンセル
- **WHEN** Edit 画面で「削除」を押下し AlertDialog を開く → 「キャンセル」を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない（API も呼ばれない）

#### Scenario: 削除確定（予約 0 件）
- **WHEN** 有効予約 0 件・キャンセル済 0 件のイベントで AlertDialog 内「削除する」を押下
- **THEN** event が削除され、`/events` に redirect。Toast「削除しました」を表示する。Edge Function 呼び出しは発火しない

#### Scenario: 削除確定（キャンセル済のみ残存）
- **WHEN** 有効予約 0 件・キャンセル済 / no_show が N 件残るイベントで AlertDialog 内「削除する」を押下
- **THEN** event および N 件のキャンセル履歴行が削除される。`/events` に redirect、Toast「削除しました（N 件の予約も整理されました）」を表示する。Edge Function 呼び出しは発火しない（有効予約者が 0 件のため）

#### Scenario: 削除確定（有効予約あり）
- **WHEN** 有効予約 M 件が残るイベントで AlertDialog を開き、Dialog 内に内訳と「対象の予約者にはキャンセル通知メールを自動で送信します」が表示されている状態で「削除する」を押下
- **THEN** メールアドレススナップショットを取得 → event および M 件の有効予約 + 同イベントの全 reservations が CASCADE 削除 → `/events` に redirect、Toast「削除しました（M 件の予約も整理されました）」を表示 → `send-event-cancellation-notification` Edge Function が fire-and-forget で呼び出される

#### Scenario: 主催者メッセージ欄を伴う削除
- **WHEN** AlertDialog の主催者メッセージ textarea に文章を入力した状態で「削除する」を押下
- **THEN** Edge Function 呼び出しのペイロードに当該メッセージが含まれ、通知メール本文の理由欄に描画される

#### Scenario: 削除前のメール本文プレビュー
- **WHEN** 有効予約のあるイベントで AlertDialog を開き、主催者メッセージ textarea に文章を入力
- **THEN** textarea 直下のプレビューブロックに、入力文言を反映した実送信メール件名と本文が描画される

#### Scenario: メール送信失敗が削除成功を妨げない
- **WHEN** Edge Function 呼び出しがネットワークエラー / SMTP エラーで失敗
- **THEN** Toast 表示と `/events` redirect は通常どおり完了し、UI には「メール送信に失敗しました」エラーは描画されない

#### Scenario: ESC キーで Dialog 閉鎖
- **WHEN** AlertDialog 表示中に ESC を押下
- **THEN** Dialog が閉じ、event も reservations も変更されない

#### Scenario: 内訳の取得失敗
- **WHEN** AlertDialog 表示中の予約内訳取得クエリが失敗する
- **THEN** Dialog 内に `role="alert"` でエラーメッセージが表示され、「削除する」ボタンは disabled になる

### Requirement: FSD レイヤー配置

本 capability の実装は MUST 以下の FSD 配置に従う:

- `apps/admin/src/pages/EventCreatePage.vue`: `/events/new` のページコンポーネント。EventForm を mode='create' で wrap
- `apps/admin/src/pages/EventEditPage.vue`: `/events/:id/edit` のページコンポーネント。event 取得 + EventForm を mode='edit' で wrap
- `apps/admin/src/widgets/event-form/`:
  - `ui/EventForm.vue` / `ui/FormSection.vue` / `ui/SectionBasic.vue`
  - `composables/useEventForm.ts`（state + 送信ロジック）/ `composables/useVolumeSuggest.ts`
  - `model/eventFormSchema.ts`（純関数バリデーション + 型）
  - `index.ts`（Public API: `EventForm`）
- `apps/admin/src/features/event-delete/`:
  - `ui/EventDeleteDialog.vue` / `composables/useEventDelete.ts`
  - `index.ts`
- `apps/admin/src/entities/event/api/eventQueries.ts`: 既存に加えて `getEventById` / `createEvent` / `updateEvent` / `deleteEvent` をエクスポート
- `apps/admin/src/shared/ui/`: `AlertDialog.vue`（+ サブコンポーネント）/ `Toast.vue` / `Toaster.vue` / `useToast.ts` を追加

依存方向は `pages → widgets → features → entities → shared` の一方向のみ MUST 守る。各スライスは `index.ts`（Public API）経由で外部 import される SHALL。

#### Scenario: pages / widgets / features の依存方向
- **WHEN** `pnpm --filter @high-q/admin lint` を実行
- **THEN** ESLint の boundaries plugin が `widgets → pages` / `entities → widgets` 等の逆向き依存を検出した場合エラーになる（boundary 違反 0 件）

### Requirement: アクセシビリティ

`EventForm` は MUST 以下の a11y 要件を満たす:

- 全 input / select に `<label>` を関連付け（`for` 属性 or wrap）
- 必須項目には `required` 属性を付与し、`aria-required="true"` を併記
- バリデーションエラーは該当 input に `aria-invalid="true"` と `aria-describedby` でエラー要素を関連付け
- AlertDialog は `role="alertdialog"` + `aria-labelledby` + `aria-describedby` を満たす
- Error Banner は `role="alert"`
- Toast は `role="status"`（保存成功）/ `role="alert"`（失敗）
- フォーカス順序は 01 セクションの各フィールド → ヘッダアクションの順
- ヘッダの「削除」ボタンは `aria-label="このイベントを削除"`

#### Scenario: 必須項目の aria 属性
- **WHEN** `<EventForm>` を描画して開発者ツールでタイトル `<input>` を確認
- **THEN** `required` と `aria-required="true"` が付与されている

#### Scenario: バリデーションエラーの aria 関連付け
- **WHEN** タイトルを未入力のまま blur
- **THEN** `<input>` に `aria-invalid="true"` が付与され、`aria-describedby` がエラーメッセージ要素の id を指している

### Requirement: モバイルファースト

`EventForm` は MUST 375px 〜 1280px のビューポートで操作可能であること:

- セクションは 1 カラム積みを基本とし、デスクトップ（>= 768px）でのみ「開催日 / 開始 / 終了」を 3 カラム grid に切替
- ヘッダのアクションボタンはモバイルでは「削除」「保存」の順で wrap し、タップ領域は 44px 以上を確保
- AlertDialog はモバイルで full-width / centered

#### Scenario: モバイル幅での 1 カラム積み
- **WHEN** viewport を 375px で描画
- **THEN** 「開催日 / 開始 / 終了」が縦 3 段に積まれて表示される

#### Scenario: タップ領域の最小サイズ
- **WHEN** ヘッダのアクションボタンの bounding box を確認
- **THEN** すべて 44px × 44px 以上である

### Requirement: HQ デザイントークンによる着色

`EventForm` 配下の全コンポーネントは MUST HQ Tailwind preset utility（`bg-paper` / `text-ink` / `border-hairline` 等）または `var(--hq-*)` CSS 変数のみで着色 SHALL し、リテラル色（`#xxxxxx` / `rgb()` / `rgba()`）の埋め込みは禁止する。

#### Scenario: マジックナンバー禁止
- **WHEN** `apps/admin/src/widgets/event-form/**/*.vue` と `apps/admin/src/features/event-delete/**/*.vue` を `#[0-9a-f]{3,6}\b` / `rgb(` / `rgba(` で grep
- **THEN** マッチが 0 件である

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

