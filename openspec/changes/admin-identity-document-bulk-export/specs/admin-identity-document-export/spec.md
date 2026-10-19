## ADDED Requirements

### Requirement: エクスポート準備ダイアログ（住所 / 電話番号の入力・確認）

`/members` で会員を選択し一括アクションの「会員名簿と本人確認書類をダウンロード」を起動すると、システムは MUST **エクスポート準備ダイアログ**を表示する SHALL。ダイアログは選択会員を一覧し、会員ごとに以下を表示する:

- **氏名**: `last_name + ' ' + first_name`（読み取り専用）
- **電話番号**: DB の `phone` をプリフィルし、admin が編集可能。NULL のときは空欄
- **住所**: 空欄の入力フィールド（DB 未収集のため admin がその場で入力）

admin が住所等を入力し「ダウンロード」を押すと CSV / PDF / ZIP の生成を開始する。住所の入力値は MUST DB に保存せず、当該ダウンロードの CSV にのみ反映する SHALL。

#### Scenario: ダイアログに選択会員が並ぶ
- **WHEN** 会員を 3 名選択して一括ダウンロードを起動する
- **THEN** エクスポート準備ダイアログに 3 名分の 氏名 / 電話番号（DB 値プリフィル）/ 住所（空欄入力）が表示される

#### Scenario: 電話番号のプリフィルと編集
- **WHEN** DB の `phone` が登録済みの会員行を表示する
- **THEN** 電話番号フィールドにその値がプリフィルされ、admin が編集できる

#### Scenario: 住所は DB に保存されない
- **WHEN** admin が住所を入力してダウンロードを実行する
- **THEN** 住所は当該 CSV にのみ出力され、`members` テーブルへの UPDATE は発行されない

### Requirement: 承認済み書類のみの抽出

本人確認書類 PDF は MUST `identity_documents.status = 'approved'` の書類のみを対象とする。`pending` / `rejected` の書類は MUST 含めない SHALL。マスク漏れ削除済み（`storage_path_front IS NULL` かつ `storage_path_back IS NULL`）の書類は実体が無いため MUST 含めない。

書類種別による除外は行わない（`document_type = 'my_number_card_masked'` の承認済み書類も含める）。

選択会員のうち承認済み書類を 1 件も持たない会員は MUST 名簿 CSV には載せる（在籍会員名簿として）一方、PDF には当該会員のページを作らず、ダウンロード結果サマリで「承認済み書類なし」として通知する SHALL。

#### Scenario: approved のみ抽出
- **WHEN** ある会員が approved 1 件 + pending 1 件 + rejected 1 件の書類を持つ状態でエクスポートする
- **THEN** PDF にはその会員の approved 1 件分の画像のみが含まれ、pending / rejected は含まれない

#### Scenario: マスク漏れ削除済みは除外
- **WHEN** approved だが `storage_path_front` / `storage_path_back` がともに NULL の書類が選択会員に含まれる
- **THEN** その書類は PDF に含まれず、取得対象外として扱われる

#### Scenario: マイナンバーカード（承認済み）は含む
- **WHEN** 選択会員が `document_type = 'my_number_card_masked'` の approved 書類を持つ
- **THEN** その画像が PDF に含まれる

#### Scenario: 承認済み書類ゼロの会員
- **WHEN** 選択会員のうち 1 名が承認済み書類を 1 件も持たない
- **THEN** その会員は名簿 CSV には載るが PDF にページは作られず、結果サマリに「承認済み書類なし」として表示される

### Requirement: 会員名簿 CSV（江東区フォーマット）

ZIP は MUST `会員名簿.csv` を 1 ファイル同梱する SHALL。CSV は江東区登録団体名簿様式に準拠し、MUST 以下の列を持つ: **氏名 / 住所 / 電話番号**。役職名列は MUST 含めない SHALL。

- 氏名 = `last_name + ' ' + first_name`（本名）。
- 住所 = エクスポート準備ダイアログで admin が入力した値（未入力は空欄）。
- 電話番号 = ダイアログで確認・編集した値（未入力 / NULL は空欄）。
- CSV は MUST UTF-8 BOM 付きで出力し、Excel で日本語が文字化けしないようにする SHALL。
- 行は選択した全会員を対象とする（承認済み書類の有無に関わらず名簿に載せる）。

#### Scenario: CSV の列構成
- **WHEN** エクスポートを実行して ZIP を生成する
- **THEN** `会員名簿.csv` の列が 氏名 / 住所 / 電話番号 の 3 列であり、役職名列は存在しない

#### Scenario: admin 入力の住所が反映される
- **WHEN** ある会員の住所に「東京都江東区…」と入力してダウンロードする
- **THEN** CSV の当該行の住所列にその値が出力される

#### Scenario: UTF-8 BOM
- **WHEN** 生成した `会員名簿.csv` を Excel で開く
- **THEN** 氏名・住所などの日本語が文字化けせず表示される

#### Scenario: 電話番号 NULL は空欄
- **WHEN** `phone` が NULL かつダイアログでも未入力の会員
- **THEN** CSV の当該行の電話番号列は空欄になる

### Requirement: 本人確認書類 PDF（1 ファイル集約・会員ごとページ）

ZIP は MUST `本人確認書類.pdf` を 1 ファイル同梱する SHALL。PDF は選択会員の**承認済み書類画像のみ**を 1 つのファイルに集約する。

- 会員ごとにページを分け、各ページ MUST 上部に**氏名ラベル**（CSV と突合可能）+ 書類種別を記し、その下に表面画像、`storage_path_back` がある場合は続けて裏面画像を配置する SHALL。
- 1 会員が複数の承認済み書類を持つ場合はページを分ける。
- jpg / png 混在に対応するため、画像は MUST 拡張子またはマジックバイトで判定し、`embedJpg` / `embedPng` を使い分ける SHALL。判定不能・埋め込み失敗の画像は取得失敗として結果サマリに記録する。

#### Scenario: 会員ごとにページが分かれ氏名ラベルが付く
- **WHEN** 承認済み書類を持つ会員 2 名をエクスポートする
- **THEN** PDF に各会員のページがあり、各ページ上部に当該会員の氏名ラベルが表示される

#### Scenario: 表裏 2 画像の配置
- **WHEN** ある会員の approved 書類が `storage_path_front` と `storage_path_back` の両方を持つ
- **THEN** その会員のページに表面・裏面の両画像が配置される

#### Scenario: 表面のみの書類
- **WHEN** `storage_path_front` のみで `storage_path_back IS NULL` の approved 書類
- **THEN** その会員のページには表面画像のみが配置される

#### Scenario: jpg と png の混在埋め込み
- **WHEN** 選択会員の承認済み画像に jpg と png が混在する
- **THEN** いずれの形式も PDF に正しく埋め込まれる

### Requirement: 出力は 1 つの ZIP

一括ダウンロードの成果物は MUST 単一の ZIP ファイルとし、ZIP 直下に `会員名簿.csv` と `本人確認書類.pdf` を置く SHALL。承認済み書類が 1 件も無い（PDF が空になる）場合の挙動は実装時に確定するが、少なくとも CSV は出力する SHALL。

#### Scenario: ZIP の中身
- **WHEN** エクスポートを実行してローカルに保存する
- **THEN** 保存された ZIP の直下に `会員名簿.csv` と `本人確認書類.pdf` が存在する

### Requirement: ローカル保存に閉じる（外部送信なし）

本機能は MUST 生成した ZIP を admin のブラウザからローカル端末へ保存するのみとし、ネットワーク経由の外部送信（メール送付・クラウド共有リンク発行・第三者 API への送信）を MUST 行わない SHALL（SOP §3「窓口対面のみ」）。書類画像の取得は admin authenticated クライアント + RLS 経由で行い、`service_role` をクライアント側で使用しない SHALL。

#### Scenario: ローカル保存のみ
- **WHEN** 一括ダウンロードを実行する
- **THEN** ZIP がブラウザのダウンロードとしてローカルに保存され、外部送信は発生しない

### Requirement: 進捗表示と部分失敗の取り扱い

一括ダウンロードは MUST 以下の状態を表示し分ける SHALL:

- **取得中**: 進捗（取得済み / 対象ファイル数）を表示し、ダウンロードボタンは disabled + `aria-busy="true"`。
- **結果**: 結果ダイアログに「PDF に含めた書類数 / 名簿に載せた会員数」「承認済み書類なしで PDF 対象外となった会員」「取得に失敗した書類（あれば）」を表示する。

ある画像の取得に失敗しても処理は MUST 継続し、成功分のみで PDF を生成する SHALL。全画像が失敗した場合でも CSV は出力する SHALL。エラー表示要素は MUST `role="alert"` を持つ。

#### Scenario: 取得中の進捗表示
- **WHEN** 多数の画像を取得している最中
- **THEN** 進捗（N / M）が表示され、ダウンロードボタンは disabled + `aria-busy="true"`

#### Scenario: 一部失敗でも成功分で PDF 生成
- **WHEN** 対象画像のうち 1 件の取得が失敗し、残りは成功
- **THEN** 成功分のみを含む PDF が生成され、結果ダイアログに失敗した書類が表示される

#### Scenario: 全画像失敗でも CSV は出力
- **WHEN** 対象画像の取得がすべて失敗する
- **THEN** PDF は空または欠落として扱われるが、名簿 CSV を含む ZIP は生成され、結果サマリに失敗が表示される

### Requirement: ダウンロード監査ログの記録

一括ダウンロードは MUST `identity_document_downloads` テーブルに監査ログを 1 行記録する SHALL。記録内容は「誰が（`downloaded_by` = 実行した admin の member id）」「いつ（`downloaded_at`）」「誰の / どの書類を（`member_ids` / `document_ids`）」「件数（`member_count` / `document_count`）」を含む。

記録は MUST ZIP のビルド完了後（実際に PDF へ含めた書類集合が確定した後）に、実際に含めた書類のみを対象として INSERT する SHALL。監査ログの INSERT に失敗した場合、ダウンロード自体は成立しているため、admin に「ダウンロードは完了したが監査ログの記録に失敗した」旨を警告表示し、SOP の手動記録を促す SHALL。

#### Scenario: 監査ログの記録
- **WHEN** 2 名の会員の承認済み書類計 3 件を一括ダウンロードして成功する
- **THEN** `identity_document_downloads` に 1 行が INSERT され、`downloaded_by` に実行 admin の member id、`document_ids` に 3 件、`member_ids` に 2 名、`document_count = 3`、`member_count = 2` が記録される

#### Scenario: 実際に含めた書類のみ記録
- **WHEN** 一部の画像取得が失敗し、成功分のみで PDF を生成した
- **THEN** 監査ログの `document_ids` は PDF に実際に含めた書類のみを反映する

#### Scenario: 監査ログ INSERT 失敗時の警告
- **WHEN** ZIP のローカル保存は成立したが、監査ログの INSERT が失敗する
- **THEN** 「ダウンロードは完了しましたが監査ログの記録に失敗しました」と警告が表示される

### Requirement: 権限（admin のみ）

本機能は MUST admin（AAL2 + role=admin）配下でのみ利用可能とする SHALL。書類画像の取得・監査ログの記録は既存の RLS により admin 以外からは実行できない SHALL。

#### Scenario: 非 admin は機能に到達しない
- **WHEN** 非 admin が会員一覧に到達しようとする
- **THEN** 既存 auth guard により `/login?reason=not-admin` へリダイレクトされ、一括ダウンロード機能に到達できない

### Requirement: FSD レイヤー配置と遅延ロード

本機能は MUST 以下の FSD 配置に従う SHALL:

- `apps/admin/src/features/identity-document-bulk-export/` — 選択状態 composable・エクスポート準備ダイアログ・一括ダウンロードのオーケストレーション・一括アクションツールバー UI・結果ダイアログ
- `apps/admin/src/entities/identity-document/` — 承認済み書類を会員 ID 群で取得するクエリ（既存 entity に追加）
- `apps/admin/src/entities/identity-document-download/` — 監査ログテーブルの DTO + INSERT クエリ
- `apps/admin/src/shared/ui/Checkbox.*` — shadcn-vue Checkbox プリミティブ（新規取り込み）

依存方向は MUST `pages → widgets → features → entities → shared` の一方向のみとし、各スライスは MUST `index.ts` 経由で公開する SHALL。ZIP 生成（jszip）・PDF 生成（pdf-lib）ライブラリは MUST ダウンロード実行時に dynamic import し、メインバンドルに含めない SHALL。

#### Scenario: 依存方向の検証
- **WHEN** ESLint（`eslint-plugin-boundaries`）を実行する
- **THEN** 上位 → 下位の一方向 import のみで、違反 import は 0 件である

### Requirement: デザイントークン準拠とアクセシビリティ

本機能の全 UI は MUST HQ デザイントークン（`@high-q/tailwind-preset` utility または `var(--hq-*)`）経由でのみ着色し、リテラル色 / リテラル spacing を埋め込まない SHALL。

a11y は MUST WCAG 2.1 AA を満たす SHALL:
- 各チェックボックスは関連ラベル（`aria-label` 等）を持つ。
- エクスポート準備ダイアログの 住所 / 電話番号 入力は `shared/ui/FormField` でラップし、ラベルと関連付ける（初期表示で赤枠を出さない）。
- 一括アクションツールバー / 各ダイアログはキーボード操作可能で、ダイアログはフォーカストラップ + ESC で閉じる。
- 取得中のボタンは `aria-busy="true"`、エラーは `role="alert"`。

#### Scenario: マジックナンバー検査
- **WHEN** 本機能のコンポーネントを `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep する
- **THEN** マッチが 0 件である

#### Scenario: 住所入力のフォーム規約
- **WHEN** エクスポート準備ダイアログを初期表示する
- **THEN** 住所 / 電話番号入力は FormField でラップされ、初期表示で赤枠（invalid 表示）は出ない

### Requirement: テスト

本機能は MUST 以下のテストを持つ SHALL:

- **Composable / unit test**（Vitest）:
  - 選択状態 composable（追加 / 解除 / ページまたぎ保持 / 現ページ全選択 / indeterminate 判定 / 全解除）
  - 承認済み書類取得クエリが `status = 'approved'` と選択 member id 群で WHERE を組み立て、NULL 書類を除外する
  - 監査ログ INSERT クエリが `downloaded_by` / `document_ids` / `member_ids` / 件数を組み立てる
  - 会員名簿 CSV ビルダの列（氏名 / 住所 / 電話番号）・admin 入力住所の反映・UTF-8 BOM・役職名を含まないこと
  - 画像形式判定（jpg / png）と PDF 埋め込み関数の選択
  - 部分失敗時に成功分のみで PDF を構成し、監査ログ対象が実含有集合に一致する
- **Component test**（Vitest + @vue/test-utils）:
  - 一括アクションツールバーの表示条件（1 件以上選択時）と件数表示
  - エクスポート準備ダイアログの 氏名表示 / 電話プリフィル / 住所入力 / 住所未保存
  - 結果ダイアログの「含めた件数 / 承認済みなし会員 / 失敗書類」表示
  - チェックボックスクリックで行クリック（詳細 sheet）が発火しない（イベント分離）
- **E2E**（Playwright、本 change で 1 件）:
  - happy path: 認証済み admin で `/members` を開く → 複数会員を選択 → 一括ダウンロード起動 → 住所入力 → ダウンロード → 結果ダイアログが表示される

#### Scenario: ユニット / コンポーネントテストの網羅
- **WHEN** `pnpm --filter @high-q/admin test` を実行する
- **THEN** 選択 composable / 各クエリ / CSV ビルダ / 画像判定 / ツールバー / 準備ダイアログ / 結果ダイアログ / イベント分離のテストがすべて pass する

#### Scenario: E2E の通過
- **WHEN** `pnpm --filter @high-q/e2e test` を admin プロジェクトで実行する
- **THEN** 「`/members` で複数選択 → 住所入力 → 一括ダウンロード → ZIP 生成」の happy path が pass する
