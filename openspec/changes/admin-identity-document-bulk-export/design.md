## Context

役所への団体登録の証憑として、江東区指定フォーマットの会員名簿と会員の本人確認書類をまとめて提出する運用がある。MVP1 は Supabase Dashboard からの個別手作業ダウンロード + 名簿手作業作成で非現実的。本 change で会員一覧（`/members`）から複数会員を選び、名簿 CSV（江東区フォーマット）と本人確認書類 PDF を ZIP でローカルに取り出す機能と、その監査ログを追加する。

江東区名簿様式の列（PDF 実物をデコードして確認済み）: **役職名 / 氏名 / 住所 / 電話番号**。本機能は役職名を除く **氏名 / 住所 / 電話番号** を出力する。ふりがな・性別・生年月日・番号の列は様式に存在しない。

現状の制約・前提:
- 本人確認書類は private な Supabase Storage バケット `identity-documents` に保管され、`identity_documents` の `storage_path_front` / `storage_path_back` から参照される。画像実体の拡張子は jpg / png 混在（heic はアップロード時に jpg 変換済み）。
- 既存 RLS により admin（`is_admin()`）は全件の行・Storage オブジェクトにアクセス可能。admin アプリは authenticated クライアントのみで動作し、`service_role` はクライアント側に存在しない（Pillar 4）。
- `members` テーブルは `last_name` / `first_name`（＝`display_name`、本名）・`phone`（NULL 可）を持つが、**住所は収集していない**。性別・ふりがなも持たない。
- 会員一覧は `member_list_view`（1 会員 1 行）を 25 件 / ページで表示し、行クリックで詳細 sheet を開く。承認済み件数は持たない。
- SOP §3: 役所提出はネットワーク送信不可・窓口対面のみ。出力は admin ローカルへの保存に閉じる。SOP §5: 監査ログ（役所提出ダウンロード）は MVP2 で実装する（＝本 change）。

## Goals / Non-Goals

**Goals:**
- `/members` で複数会員を選択し、江東区フォーマットの名簿 CSV と本人確認書類 PDF を 1 つの ZIP でダウンロードできる。
- 名簿 CSV は 氏名 / 住所 / 電話番号 を持ち、住所は admin がエクスポート時に入力する。
- 本人確認書類 PDF は承認済み書類画像のみを 1 ファイルに集約し、会員ごとにページ + 氏名ラベルで対応関係を明示する。
- ダウンロード操作を改ざんしにくい監査ログとして記録する（誰が・いつ・誰の書類を）。
- 既存の会員一覧の挙動を壊さない。追加インフラ・課金なし（クライアント側完結、既存 RLS を流用）。

**Non-Goals:**
- pending / rejected 書類のエクスポート（approved のみ）。
- 住所を DB に永続化すること（収集項目を増やさない。CSV 生成時の入力に閉じる）。
- 役職名の出力（江東区様式の役職名列は対象外）。
- 役所への直接送信・メール送付・クラウド共有リンク（SOP §3 で禁止）。
- 監査ログの閲覧 UI（テーブルに記録するのみ。確認は当面 Supabase Dashboard）。
- `/identity-documents` レビュー画面の変更。

## Decisions

### D1. ダウンロードはクライアント側で完結（Edge Function / service_role を使わない）
admin authenticated クライアントは RLS により全 Storage オブジェクトを取得できる。`supabase.storage.from('identity-documents').download(path)` で各画像の Blob を直接取得し、ブラウザ上で CSV / PDF / ZIP を組み立ててローカル保存する。
- **代替案（不採用）**: Edge Function で `service_role` を使いサーバ側生成。→ Deno 実装・無料枠制約・運用追加が必要で、RLS で同じことができるため過剰。Pillar 4 とも整合的にサーバを増やさない。
- **`download()` を使う**: signed URL + `fetch` でも可能だが、`download()` は Blob を直接返し CORS / URL 失効を考えなくてよいため採用。

### D2. 本人確認書類は 1 つの PDF に集約（pdf-lib、会員ごとページ + 氏名ラベル）
翔太郎くんの指定「画像を 1 ファイルにまとめて png か PDF」を受け、**複数ページ PDF** を採用する。複数会員 × 表裏画像を 1 ファイルへ自然に収められ、印刷して窓口提出（SOP §3）しやすい。
- 1 会員 1 ページ以上。各ページ上部に氏名（CSV と突合できるラベル）+ 書類種別を記し、その下に表面画像、続けて裏面画像（`storage_path_back` がある場合）を配置する。1 会員が複数の承認済み書類を持つ場合はページを分ける。
- PDF 生成は `pdf-lib`（`embedJpg` / `embedPng` で jpg・png 双方を埋め込み可能）を dynamic import する。
- **代替案（不採用）**: 全画像を 1 枚の PNG にタイル合成。→ 会員数が増えると 1 枚に収まらず破綻。複数 PNG を別ファイルにすると「1 ファイルにまとめて」に反する。
- **代替案（不採用）**: jsPDF。→ pdf-lib の方が png/jpg 埋め込みとページ構成の取り回しが堅牢。

### D3. 名簿 CSV は江東区フォーマット（氏名 / 住所 / 電話番号、UTF-8 BOM）
ZIP 直下に `会員名簿.csv` を 1 つ置く。列は **氏名 / 住所 / 電話番号**（役職名は出力しない）。UTF-8 BOM 付きで出力し役所側 Excel の文字化けを防ぐ。
- 氏名 = `last_name + ' ' + first_name`（本名）。
- 住所 = エクスポート準備ダイアログで admin が会員ごとに入力した値。
- 電話番号 = DB の `phone`（プリフィル、admin が編集可。NULL は空欄）。
- 行順は選択した全会員（承認済み書類の有無に関わらず名簿には載せる。役所には在籍会員名簿として全員を出す想定）。

### D4. 住所 / 電話番号は「エクスポート準備ダイアログ」で admin が入力・確認
`/members` で選択 → 一括アクションの「会員名簿と本人確認書類をダウンロード」→ **エクスポート準備ダイアログ**を開く。選択会員を一覧し、各会員に 氏名（読み取り専用）/ 電話番号（DB 値プリフィル・編集可）/ 住所（空・入力）を表示する。admin が住所を埋めて「ダウンロード」を押すと CSV / PDF / ZIP を生成する。
- 住所は DB に保存しない（収集項目を増やさない・個人情報の保管を最小化）。入力値は当該ダウンロードの CSV にのみ反映する。
- **代替案（不採用）**: 住所を members に収集追加。→ DB + RLS + 会員登録 UI 拡張の別 Issue になり個人情報の保管項目が増える。年次の役所提出用途には admin 入力で足りる。
- **代替案（不採用）**: 住所を常に空欄で CSV 出力し手書き。→ admin の希望（その場で入力）を採用。

### D5. 出力は 1 つの ZIP（会員名簿.csv + 本人確認書類.pdf）
2 ファイルを 1 回のダウンロードにまとめるため ZIP 化する（`jszip` を dynamic import）。ZIP 直下に `会員名簿.csv` と `本人確認書類.pdf` を置く。ZIP 名は日付を含める（詳細 tasks.md）。

### D6. 監査ログは専用テーブル `identity_document_downloads`（追記専用・admin RLS）
列（詳細値は tasks.md）: `id` / `downloaded_by`（admin の members.id、`on delete set null`）/ `downloaded_at` / `member_ids`（uuid[]）/ `document_ids`（uuid[]）/ `member_count` / `document_count` / `note`。
- RLS: SELECT / INSERT は `is_admin()` のみ。UPDATE / DELETE ポリシーは作らない（不変ログ）。anon GRANT なし、authenticated は select / insert のみ、service_role は全権（3 ロール明示 GRANT）。
- `document_ids` には PDF に実際に含めた承認済み書類のみを記録する。
- **記録タイミング**: ZIP のビルド完了後（含めた書類集合が確定後）かつローカル保存の直前に INSERT。失敗時はダウンロード自体は成立しているため警告 + 手動記録誘導（D8）。

### D7. 選択 UI は会員一覧に統合し、行クリックと両立させる
DataTable / モバイルカードの先頭に選択チェックボックス列を追加。チェックボックス操作はイベント伝播を止め行クリック（詳細 sheet）と衝突させない。ヘッダに現ページ全選択（indeterminate 対応）。選択状態は `Set<MemberId>` を feature の composable が保持し、ページ / フィルタをまたいでも維持。1 件以上選択時に一括アクションツールバー（件数 + ダウンロード起点 + 解除）を表示。
- 承認済み件数は会員一覧の view からは判別できないため選択は全会員に許容し、PDF に書類が無い会員は結果サマリで通知する（view 拡張は波及大のため見送り）。

### D8. 進捗と部分失敗の取り扱い（4 状態）
ダウンロードはアクションのため idle → 取得中（進捗「N / M ファイル」+ ボタン disabled / `aria-busy`）→ 結果ダイアログ、で表現。
- ある画像の `download()` が失敗しても処理は継続し、成功分のみで PDF を構成、失敗書類を記録。
- 結果ダイアログに「PDF に含めた書類数 / 名簿に載せた会員数」「承認済み書類なしの会員」「取得失敗書類」を表示。
- 監査ログ INSERT 失敗時は「ダウンロードは完了したが監査ログ記録に失敗」を警告し SOP の手動記録を促す。

### D9. FSD レイヤー配置
- `apps/admin/src/shared/ui/Checkbox.*` — shadcn-vue Checkbox プリミティブ（機能系）を新規取り込み。
- `apps/admin/src/features/identity-document-bulk-export/` — 選択状態 composable・エクスポート準備ダイアログ（住所/電話入力）・一括ダウンロードのオーケストレーション（承認済み書類取得 → Blob 取得 → CSV / PDF 組み立て → ZIP → ローカル保存 → 監査ログ INSERT）・一括アクションツールバー・結果ダイアログ。
- `apps/admin/src/entities/identity-document/` — 承認済み書類を会員 ID 群で取得するクエリを追加。
- `apps/admin/src/entities/identity-document-download/` — 監査ログテーブルの DTO + INSERT クエリ。
- `apps/admin/src/widgets/members-list/` — テーブル / カードに選択列を統合し、ツールバーを差し込む。
依存方向は `pages → widgets → features → entities → shared` の一方向のみ。各スライスは `index.ts` 経由で公開。jszip / pdf-lib はダウンロード実行時に dynamic import しメインバンドルに含めない。

## Risks / Trade-offs

- **[大量選択時のブラウザメモリ]** 多数会員 × 高解像度画像を PDF 化するとメモリを圧迫しうる。→ サークル規模（数十名）の年次単発運用が前提のため許容。選択数が大きいときは確認文言で注意喚起し進捗を表示。ハード上限は設けないが将来の閾値導入余地を残す。
- **[住所手入力の手間]** 選択会員ごとに住所を入力する手間がある。→ admin の希望。プリフィルできる電話は DB から補完し、入力は住所に絞る。多数選択時の負担は運用で調整（必要なら将来 DB 収集に移行）。
- **[クライアント側監査ログの信頼性]** ログ INSERT はクライアント起点で回避しうる。→ 利用者は admin（翔太郎くん）単独で自己の説明責任のための記録。RLS で admin 以外 INSERT 不可・追記専用。
- **[個人番号マスク済みカードの同梱]** approved のマイナンバーカード（マスク済み）も含める。→ 承認時に admin が目視でマスク済みを確認済みのため安全。結果は admin が PDF / CSV を確認のうえ持参。
- **[画像形式混在の埋め込み]** jpg / png が混在。→ pdf-lib の `embedJpg` / `embedPng` を拡張子・マジックバイトで判定して使い分ける。判定不能な画像は失敗として結果サマリに記録。
- **[行クリックと選択操作の衝突]** → チェックボックス領域で伝播を止め、E2E / component test でクリック分離を担保。
- **[新規依存 jszip / pdf-lib]** バンドルサイズ増。→ dynamic import でメインバンドルへの影響を抑える。

## Migration Plan

- DB: `identity_document_downloads` テーブル + RLS + 3 ロール GRANT の migration 1 本（`supabase/templates/new_table.sql` を出発点）。既存テーブルへの変更なし・後方互換。
- dev へ `pnpm db:push`（レムが実行）→ 動作確認 → PR → マージ後に prd-db-push CI の承認ゲート経由で prd 適用。
- ロールバック: migration 末尾の `-- ROLLBACK:` で drop policy / revoke / drop table を手動実行可能。テーブル追加のみのため既存データ影響なし。

## Open Questions

- 本人確認書類 PDF の 1 ページレイアウト（表裏の配置・氏名ラベルの体裁）は tasks.md 実装時に確定する。
- 選択数の注意喚起を出す閾値は実装時に仮置きし運用で調整する。
- 役職名を将来出力したくなった場合の扱い（admin 入力列として追加するか）は本 change では非対応とし、必要時に別 change で検討する。
