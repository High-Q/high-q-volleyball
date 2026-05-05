# reservation-identity-document-upload Specification

## Purpose
TBD - created by archiving change reservation-identity-document-upload. Update Purpose after archive.
## Requirements
### Requirement: ルート `/signup/identity` が会員登録フロー Step 3/3 として存在する

`apps/reservation/src/app/router.ts` に `name: 'signup-identity'` / `path: '/signup/identity'` のルートを MUST 定義する。`meta.public` は付与せず、認証必須とする SHALL。コンポーネントは `apps/reservation/src/pages/SignupIdentityPage.vue`。

#### Scenario: ルート定義の存在
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/identity'` / `name: 'signup-identity'` のルートが存在し、`meta.public` プロパティを持たない

#### Scenario: 未認証アクセス
- **WHEN** 未認証ユーザーが `/signup/identity` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる

### Requirement: プロフィール完成済 + 書類未提出会員の `/signup/identity` 強制誘導

認証済 + `isProfileComplete === true` + `hasIdentityDocument === false` の会員が `/signup/identity` 以外のルートにアクセスした場合、auth guard により `/signup/identity` に MUST リダイレクトする。`/signup/identity` 自体および `/auth/callback` へのアクセスは通過する SHALL。

`hasIdentityDocument === false` の判定対象には以下の **両方** を MUST 含める:
- 書類を 1 件も提出していない (新規未提出) 会員
- 過去の提出が admin に差し戻され、現状 `status = 'rejected'` の行のみ持つ (再提出待ち) 会員

これにより、admin の差し戻し / マスク漏れ削除 (admin-identity-document-review capability の連鎖予約キャンセル mutation 後) を受けた member は、次回ログインまたは画面遷移時に自動的に `/signup/identity` の再提出フローへ復帰する SHALL。

#### Scenario: 書類未提出で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + 書類未提出 (0 件) のユーザーが `/` にアクセス
- **THEN** `/signup/identity` にリダイレクトされる

#### Scenario: rejected のみ持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='rejected'` 1 件のみ持つユーザーが `/` にアクセス
- **THEN** `/signup/identity` にリダイレクトされる (再提出フローに復帰)

#### Scenario: pending を持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='pending'` 1 件以上持つユーザーが `/` にアクセス
- **THEN** リダイレクトされず、`/` (ホーム) が描画される (pending は予約可能な有効状態)

#### Scenario: approved を持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='approved'` 1 件以上持つユーザーが `/` にアクセス
- **THEN** リダイレクトされず、`/` (ホーム) が描画される

#### Scenario: 書類未提出で `/signup/identity` にアクセス
- **WHEN** 認証済 + プロフィール完成 + 書類未提出のユーザーが `/signup/identity` にアクセス
- **THEN** `/signup/identity` のフォームが描画される (無限ループしない)

#### Scenario: rejected のみ持つ会員で `/signup/identity` にアクセス
- **WHEN** 認証済 + プロフィール完成 + rejected のみ持つユーザーが `/signup/identity` にアクセス
- **THEN** `/signup/identity` のフォームが描画される (無限ループしない、再提出可能)

#### Scenario: pending 提出済 + `/signup/identity` 直リン
- **WHEN** 認証済 + プロフィール完成 + pending 1 件以上持つユーザーが `/signup/identity` に直接アクセス
- **THEN** `/` (ホーム) にリダイレクトされる (再提出済みのため)

#### Scenario: approved 提出済 + `/signup/identity` 直リン
- **WHEN** 認証済 + プロフィール完成 + approved 1 件以上持つユーザーが `/signup/identity` に直接アクセス
- **THEN** `/` (ホーム) にリダイレクトされる

### Requirement: AuthSession に `hasIdentityDocument` 派生プロパティが存在する

`useAuthSession` の戻り値型 `AuthSession` に `hasIdentityDocument: ComputedRef<boolean>` を MUST 含める。`evaluate()` 実行時に `members` 取得と並行 (Promise.all 等) で `select id from identity_documents where member_id = ? and status in ('pending', 'approved') limit 1` を実行し、行が 1 件以上あれば `true`、0 件なら `false` を保持する SHALL。`refresh()` で再評価される。

判定ロジックの本質は「**有効な (pending または approved) 提出物が 1 件でも存在するか**」である。`status = 'rejected'` の行は **無効な提出物** として除外 SHALL。これにより、admin に差し戻された (rejected 化された) member は再度 `hasIdentityDocument === false` 扱いとなり、auth guard で `/signup/identity` への再提出フローへ強制誘導される。

#### Scenario: 未提出会員の取得
- **WHEN** 書類を 1 件も提出していない会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` となる

#### Scenario: pending 会員の取得
- **WHEN** `identity_documents` に `status = 'pending'` の行が 1 件以上ある会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる (pending は admin レビュー待ちの有効な提出物として扱う)

#### Scenario: approved 会員の取得
- **WHEN** `identity_documents` に `status = 'approved'` の行が 1 件以上ある会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる

#### Scenario: rejected のみ持つ会員の取得
- **WHEN** `identity_documents` に `status = 'rejected'` の行のみ持つ会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` となる (rejected 行は無効な提出物として除外)

#### Scenario: pending と rejected を混在で持つ会員
- **WHEN** `identity_documents` に `status = 'rejected'` の旧行 + `status = 'pending'` の新行を持つ会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる (有効な pending 行が 1 件以上あるため、rejected 行の存在は判定に影響しない)

#### Scenario: アップロード成功後の refresh
- **WHEN** 書類アップロード成功直後に `useAuthSession.refresh()` が呼ばれる
- **THEN** `hasIdentityDocument` が `true` に更新される (新規 pending 行が追加されたため)

#### Scenario: admin 差し戻し直後の reservation 側 refresh
- **WHEN** admin が member の唯一の identity_documents (`status='pending'`) を差し戻して `'rejected'` に UPDATE 後、reservation 側 member が再ログインまたは `useAuthSession.refresh()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` に更新され、router guard により `/signup/identity` へ強制誘導される

### Requirement: 画面ヘッダーに Step 3 of 3 インジケーターと見出し・リード文を表示

`SignupIdentityPage` は画面上部に MUST 以下を順に表示する:
- Step インジケーター: ドット 3 つ (1 / 2 / 3) + テキスト「STEP 3 / 3」(モノスペース、active=3)
- 見出し: 明朝書体で「本人確認書類を／アップロード」(改行入り)
- リード文: 「下記いずれか 1 点。氏名・住所・生年月日が確認できる鮮明な画像。」

#### Scenario: 初期表示
- **WHEN** ユーザーが `/signup/identity` にアクセス
- **THEN** ヘッダーに 3/3 のステップ表示・「本人確認書類を」「アップロード」の見出し・リード文が表示される

### Requirement: 10 種類の書類を 2 列チップグリッドで選択可能にする

`SignupIdentityPage` は `DocumentType` enum 全 10 種類を 2 列のチップグリッドで MUST 表示する。各チップは `role="radio"` 属性を持ち、`aria-checked` で選択状態を表現する SHALL。チップ群を覆う要素は `role="radiogroup"` で `aria-labelledby` により「書類種別」ラベルと紐付ける MUST。

書類ラベルは `packages/shared/src/types/labels.ts:DOCUMENT_TYPE_LABELS` を **唯一の真実の源** として参照する SHALL。

`document_type === 'my_number_card_masked'` のチップには「注意」ラベル (赤系) を MUST 付与する。

#### Scenario: 全 10 種類の表示
- **WHEN** 画面が描画される
- **THEN** 運転免許証 / 運転経歴証明書 / 住民票 / 身体障害者手帳等 / 在留カード / 特別永住者証明書 / 学生証 / パスポート / マイナンバーカード (個人番号マスク済み) / 健康保険資格確認書 の 10 個のチップが表示される

#### Scenario: チップ選択
- **WHEN** ユーザーが「運転免許証」チップを押下
- **THEN** そのチップが selected 状態 (アクセント色のリング) になり、`aria-checked="true"` が付与される。他のチップの `aria-checked` は `false` になる

#### Scenario: マイナンバーチップの注意バッジ
- **WHEN** マイナンバーカードチップが描画される
- **THEN** チップ内に「注意」テキストの赤系バッジが表示される

#### Scenario: ラベル文言の SSOT 参照
- **WHEN** `DOCUMENT_TYPE_LABELS` の値が変更された
- **THEN** 画面上のチップ表示も自動的に新しいラベルになる (ハードコード文字列を使わない)

### Requirement: 書類選択時に受付条件カードを表示する (マイナンバー以外)

`document_type !== 'my_number_card_masked'` の書類が選択されたとき、`SignupIdentityPage` は受付条件カードを MUST 表示する。カードは Kicker「— ACCEPTED IF」+ 書類名 + 受付条件文言で構成する SHALL。

受付条件文言は `packages/shared/src/types/labels.ts:DOCUMENT_TYPE_REQUIREMENTS` を SSOT として参照する MUST。

#### Scenario: 運転免許証選択時の条件表示
- **WHEN** ユーザーが運転免許証チップを押下
- **THEN** 受付条件カードに「— ACCEPTED IF」「運転免許証」「有効期間内であること」が表示される

#### Scenario: パスポート選択時の条件表示
- **WHEN** ユーザーがパスポートチップを押下
- **THEN** 受付条件カードに「令和 2 年 2 月 4 日以前に発給申請されたもの (住所記載欄があるもの) のみ可」が表示される

#### Scenario: マイナンバー選択時は受付条件カード非表示
- **WHEN** ユーザーがマイナンバーカードチップを押下
- **THEN** 受付条件カードは表示されず、代わりに三重防壁ブロック (次 Requirement) が表示される

### Requirement: マイナンバーカード選択時に三重防壁ブロックを表示する

`document_type === 'my_number_card_masked'` が選択されたとき、`SignupIdentityPage` は MUST 以下 3 要素を順に表示する:
1. **赤帯アラート**: 朱色 (`#a14336`) のサイドボーダー + 同色背景 (alpha 0.08) のバナー。タイトル「個人番号 (裏面 12 桁) を完全に隠してください」+ 説明「マスキングテープ・付箋などで確実に隠せていない画像は受け付けられません。」
2. **サンプル比較カード**: 横 2 列グリッド。左 = ❌ マスク不十分 (赤枠 + 数字 `1234 5678 9012` 表示)、右 = ⭕ マスク適切 (緑枠 + 黒帯で覆う表現)。各カード下に「マスク不十分 / 数字が読み取れる」「マスク適切 / 黒帯で完全に覆う」のラベル。下に注釈「※ 番号の一部でも見える画像は審査で差し戻されます。」
3. **必須同意チェックボックス**: 「個人番号を完全に隠して撮影したことを確認しました」+ 必須マーク `*`。チェック前/後で外観が変化する SHALL

同意チェックボックスの状態は **画面ローカル state** で管理し、DB / Supabase Storage には MUST NOT 保存する。

#### Scenario: 三重防壁の全要素表示
- **WHEN** ユーザーがマイナンバーカードチップを押下
- **THEN** 赤帯アラート / サンプル比較 (❌/⭕) / 必須同意チェックボックスの 3 要素が順に表示される

#### Scenario: 同意チェック前の CTA disabled
- **WHEN** マイナンバー選択 + 画像アップロード済 + 同意チェックなしで CTA を押そうとする
- **THEN** CTA は disabled で押下できない

#### Scenario: 同意チェックで CTA 活性化
- **WHEN** マイナンバー選択 + 画像アップロード済 + 同意チェックを ON にする
- **THEN** CTA「送信する」が活性化する

#### Scenario: 別書類への切替で同意状態リセット
- **WHEN** マイナンバー選択 + 同意 ON 状態から別書類 (運転免許証) に切替
- **THEN** 同意チェックボックス自体が画面から消え、再度マイナンバーに戻すと unchecked から始まる

### Requirement: 画像アップロードタイルは表面・裏面の 2 スロット構成で書類選択後に表示される

書類が選択された後、`SignupIdentityPage` は **表面スロット (必須)** と **裏面スロット (任意)** の 2 タイルを縦に並べて MUST 表示する。各タイルはアスペクト比 85:54 (マイナンバーカード実比率) で、`<input type="file">` を内包する `<label>` 要素として実装する SHALL。

`accept` 属性は `image/jpeg,image/png,image/heic,image/heif,image/*` (Android で heic を選択可能にするため `image/*` を含める)、`capture="environment"` でモバイルでは背面カメラを優先起動する SHALL。

各スロットのラベル:
- 表面スロット: 「表面」+「必須」赤バッジ
- 裏面スロット: 「裏面」+「任意」グレーバッジ + 補助文「本籍欄・在留情報・見開き 2 ページ目などを撮影してください」

マイナンバーカード選択時のスロット:
- 表面スロット: 「表面 (顔写真側)」+「必須」バッジ
- 裏面スロット: 「裏面 (個人番号マスク済み)」+「任意」バッジ + 補助文「裏面を提出する場合は個人番号 12 桁を完全にマスクしてください」

各スロットは独立した state (empty / validating / ready / uploading / uploaded / error) を持ち、片方の error が他方に影響しない MUST。

#### Scenario: 書類未選択時はタイル非表示
- **WHEN** 画面初期表示 (書類未選択)
- **THEN** 表面・裏面いずれのスロットも表示されない

#### Scenario: 通常書類選択後の 2 スロット表示
- **WHEN** 運転免許証を選択
- **THEN** 表面スロット (「必須」バッジ) と裏面スロット (「任意」バッジ) が縦に表示される

#### Scenario: マイナンバー選択後の 2 スロット表示
- **WHEN** マイナンバーカードを選択
- **THEN** 表面スロット「表面 (顔写真側) / 必須」と裏面スロット「裏面 (個人番号マスク済み) / 任意」が表示される

#### Scenario: 裏面の任意性
- **WHEN** 表面のみアップロード済 + 裏面 empty で送信
- **THEN** 送信処理は実行され、`storage_path_back = NULL` で identity_documents 行が作成される

#### Scenario: 表面未アップロードでの送信不可
- **WHEN** 表面 empty で送信ボタンが押された
- **THEN** UI 側で CTA が disabled、composable 側でも `'front_required'` エラーで弾かれる

#### Scenario: スロット独立性
- **WHEN** 裏面で error (形式不正) が発生
- **THEN** 表面スロットの状態は影響を受けず、裏面スロットのみ赤枠 + エラー表示になる

### Requirement: アップロードタイルが Empty / Loading / Error / Success の 4 状態で見た目を変える

`SignupIdentityPage` のアップロードタイルは MUST 以下 4 状態で異なる見た目を表示する:

| state | 見た目 |
|---|---|
| empty | 破線枠 (hairline 色) + カメラアイコン + 「画像を選択 / 撮影」 + 「jpg · png · heic ／ 最大 10MB」 |
| loading | 実線アクセント枠 + プレビュー薄表示 + 中央に進捗バー (アクセント色) + 「アップロード中… N%」 |
| error | 実線赤枠 + ファイル名 + サイズ表示 + ❌ アイコン |
| success | 実線緑枠 + プレビュー + 右上 ✓ バッジ + 左下にファイル名キャプション |

各状態の遷移は composable から発行される `state` 値で SHALL 駆動される。

#### Scenario: 画像選択前 (empty)
- **WHEN** 書類選択直後でファイル未選択
- **THEN** 破線枠 + カメラアイコン + 「画像を選択 / 撮影」が表示される

#### Scenario: アップロード中 (loading)
- **WHEN** ファイル選択直後で Storage upload 進行中
- **THEN** タイルに進捗バーと「アップロード中… N%」が表示される

#### Scenario: 形式不正 (error)
- **WHEN** ユーザーが `.gif` ファイルを選択
- **THEN** タイルが赤枠になり、ファイル名「<filename>.gif」とサイズが表示される

#### Scenario: アップロード成功 (success)
- **WHEN** Storage upload + DB UPDATE が成功
- **THEN** タイルが緑枠になり、右上に ✓、左下に「<filename> · NMB」が表示される

### Requirement: ファイル検証はクライアント側で 3 段階で行い heic は jpeg に自動変換する

`SignupIdentityPage` のファイル選択ハンドラは MUST 以下を順に処理する:
1. `file.type` が `image/jpeg` / `image/png` / `image/heic` / `image/heif` のいずれかであること、または拡張子末尾 (大文字小文字無視) が `.jpg` / `.jpeg` / `.png` / `.heic` / `.heif` のいずれかであること
2. `file.size <= 10 * 1024 * 1024` (10 MB) であること
3. heic / heif 検出時は `heic2any` 等のクライアント変換ライブラリで `image/jpeg` (quality 0.92) に MUST 変換する。変換後のファイル名は元拡張子を `.jpg` に置換する SHALL
4. 変換後のサイズが 10MB を超える場合は再度サイズエラーとして扱う MUST

検証失敗時は対象スロットの state を 'error' に遷移し、画面上部にエラーバナー (`role="alert"`) を表示する SHALL。エラーバナーのメッセージは:
- type/拡張子不正: 「ファイル形式が不正です。jpg / png / heic のみ受け付けています。」
- サイズ超過: 「ファイルサイズが大きすぎます (10MB まで)。」
- heic 変換失敗: 「画像の変換に失敗しました。jpg または png でお試しください。」

`heic2any` ライブラリは **dynamic import** で MUST 読み込む (heic ファイル選択時のみダウンロード)。

#### Scenario: gif 拡張子のファイル
- **WHEN** ユーザーが `id_back.gif` を選択
- **THEN** スロット state が 'error' になり、上部バナーに「ファイル形式が不正です」が表示される

#### Scenario: pdf 拡張子のファイル
- **WHEN** ユーザーが `id.pdf` を選択
- **THEN** スロット state が 'error' になり、上部バナーに「ファイル形式が不正です」が表示される

#### Scenario: 11MB の jpg ファイル
- **WHEN** ユーザーが 11MB の jpg を選択
- **THEN** スロット state が 'error' になり、上部バナーに「ファイルサイズが大きすぎます (10MB まで)」が表示される

#### Scenario: 5MB の jpg ファイル
- **WHEN** ユーザーが 5MB の jpg を選択
- **THEN** 検証を通過し、スロット state が 'ready' に遷移する

#### Scenario: iPhone heic ファイルの自動変換
- **WHEN** ユーザーが iPhone で撮影した `IMG_1234.HEIC` (8MB) を選択
- **THEN** `heic2any` で jpeg に変換され、`IMG_1234.jpg` として `image/jpeg` MIME type で扱われる。スロット state は 'ready' に遷移

#### Scenario: Android Chrome での heic 選択
- **WHEN** Android Chrome ユーザーが `accept="image/*"` 経由で heic ファイルを選択
- **THEN** `heic2any` で jpeg に変換され、変換後ファイルが upload 対象となる

#### Scenario: heic 変換失敗
- **WHEN** ユーザーが破損した `.heic` ファイルを選択し `heic2any` が例外を投げる
- **THEN** スロット state が 'error' になり、上部バナーに「画像の変換に失敗しました。jpg または png でお試しください。」が表示される

#### Scenario: 変換後にサイズ超過
- **WHEN** ユーザーが 9MB の heic ファイル選択 → jpeg 変換結果が 12MB
- **THEN** スロット state が 'error' になり、上部バナーに「ファイルサイズが大きすぎます (10MB まで)」が表示される

### Requirement: アップロード手順は DB 行 INSERT → Storage 表裏並列 upload → storage_path UPDATE の順で行う

書類アップロードは `features/identity-document/composables/useUploadIdentityDocument.ts` の `submit(input)` で MUST 以下の順序で実行する:

1. `supabase.from('identity_documents').insert({ member_id: <auth.uid()>, document_type: <selected>, storage_path_front: '<placeholder>', storage_path_back: null, status: 'pending' }).select('id').single()` で行を作成し、生成された `id` を取得
2. パスを構築: `frontPath = <member_id>/<id>-front.<ext_front>` (必須) と、裏面提出時は `backPath = <member_id>/<id>-back.<ext_back>` (任意)
3. **`Promise.all` で表裏並列アップロード**:
   - `supabase.storage.from('identity-documents').upload(frontPath, frontFile, { contentType: frontFile.type })`
   - 裏面ファイルがある場合のみ: `supabase.storage.from('identity-documents').upload(backPath, backFile, { contentType: backFile.type })`
4. **両方成功時**: `supabase.from('identity_documents').update({ storage_path_front: frontPath, storage_path_back: backPath ?? null }).eq('id', id)`
5. **いずれか失敗時**: 成功した方の Storage オブジェクトも削除した上で、`supabase.from('identity_documents').delete().eq('id', id)` で行を削除し、エラーを返す

裏面アップロードは表面と同等の **必須トランザクション境界** で扱う MUST: 裏面が指定されていれば両方成功で初めて全体成功とみなす。片方だけ成功した中途半端な状態は許容しない。

#### Scenario: 表面のみの happy path
- **WHEN** ユーザーが運転免許証 + 5MB jpg (表面のみ) を選択して送信
- **THEN** identity_documents に 1 行 INSERT → Storage に `<member_id>/<id>-front.jpg` がアップロードされ、`storage_path_front` が UPDATE される。`storage_path_back` は NULL のまま

#### Scenario: 表裏両方の happy path
- **WHEN** ユーザーが運転免許証 + 表面 jpg + 裏面 jpg を選択して送信
- **THEN** identity_documents に 1 行 INSERT → Storage に front と back の 2 オブジェクトが並列アップロードされ、`storage_path_front` / `storage_path_back` 両方が UPDATE される

#### Scenario: ファイル名の正規化
- **WHEN** ユーザーが `IMG.HEIC` をアップロード (heic2any で jpeg 変換後)
- **THEN** Storage パスは `<member_id>/<id>-front.jpg` (拡張子は変換後の jpg) になる

#### Scenario: 表面 Storage upload 失敗のロールバック
- **WHEN** 表面の Storage upload が失敗 (network エラー等)
- **THEN** identity_documents の対応行が DELETE され、孤立行・孤立 Storage オブジェクトが残らない。エラーは `'storage_failed_front'` として返る

#### Scenario: 裏面 Storage upload 失敗のロールバック
- **WHEN** 表面 upload は成功したが裏面 upload が失敗
- **THEN** 表面の Storage オブジェクトも削除され、identity_documents 行も DELETE される。エラーは `'storage_failed_back'` として返る

#### Scenario: storage_path UPDATE 失敗時の挙動
- **WHEN** Storage upload は成功したが最終 UPDATE のみ失敗
- **THEN** ユーザーに error メッセージを表示する (Storage には実体あり、admin レビュー画面で異常検出可能)。エラーは `'db_failed'` として返る

### Requirement: アップロード結果は Result 型で表現される

`useUploadIdentityDocument` の `submit(input: SubmitInput)` は MUST `Result<IdentityDocumentId, UploadError>` 相当の型を返す。`UploadError` 型は次の union を持つ SHALL:
- `'unsupported_format'`
- `'file_too_large'`
- `'consent_required'`
- `'front_required'`
- `'storage_failed_front'`
- `'storage_failed_back'`
- `'db_failed'`
- `'network'`

`SubmitInput` 型は MUST 以下を持つ:
- `documentType: DocumentType`
- `frontFile: File` (必須)
- `backFile?: File` (任意)
- `consented: boolean` (mynumber のみ意味を持つ)

UI 側はエラー種別ごとに適切な日本語メッセージへ変換する。

#### Scenario: 形式不正の Result
- **WHEN** gif ファイルで `submit()` を呼ぶ
- **THEN** `{ ok: false, error: 'unsupported_format' }` 相当を返す

#### Scenario: 表面ファイル未指定
- **WHEN** `frontFile: null` 相当で `submit()` を呼ぶ
- **THEN** `{ ok: false, error: 'front_required' }` を返す (UI 側 disabled で本来到達しない、防御的)

#### Scenario: マイナンバー同意なしで submit
- **WHEN** マイナンバー選択 + 同意なしで `submit()` を呼ぶ
- **THEN** `{ ok: false, error: 'consent_required' }` を返す (UI 側 disabled で本来到達しない、防御的)

#### Scenario: 表面のみ成功時の Result
- **WHEN** 表面のみ条件を満たして `submit()` が成功
- **THEN** `{ ok: true, value: <IdentityDocumentId> }` を返す

#### Scenario: 表裏両方成功時の Result
- **WHEN** 表裏両方条件を満たして `submit()` が成功
- **THEN** `{ ok: true, value: <IdentityDocumentId> }` を返し、DB 上 `storage_path_back` が NOT NULL になる

### Requirement: Sticky CTA は state から純関数で導出された label / disabled / spinner で描画する

画面下部の Sticky CTA は `pageState` + `frontSlot.state` + `backSlot.state` + `consented` (mynumber のみ) から MUST 以下の通り導出される:

| 条件 | label | disabled | spinner |
|---|---|---|---|
| 書類未選択 | 送信する | true | false |
| 書類選択 + 表面未アップロード | 送信する | true | false |
| 書類選択 + 表面 ready / 裏面 ready or empty (通常書類) | 送信する | false | false |
| マイナンバー選択 + 表面 ready + 同意 OFF | 送信する | true | false |
| マイナンバー選択 + 表面 ready + 同意 ON | 送信する | false | false |
| いずれかのスロットが uploading 中 | アップロード中… | true | true |
| pageState='submitting' (DB UPDATE 含む) | アップロード中… | true | true |
| 直前の試行が error で残存 | もう一度試す | false | false |
| pageState='success' | 完了する | false | false |

`disabled` 時は `aria-disabled="true"` を付与する SHALL。CTA 押下イベントは `disabled === true` のときに無効化される MUST。

#### Scenario: 書類未選択時の CTA
- **WHEN** 画面初期表示 (書類未選択)
- **THEN** CTA は「送信する」+ disabled で表示される

#### Scenario: 表面未アップロードでの CTA
- **WHEN** 書類選択済 + 表面 empty + 裏面 ready
- **THEN** CTA は「送信する」+ disabled (front_required を防ぐ)

#### Scenario: 表面のみ ready の CTA (通常書類)
- **WHEN** 運転免許証選択 + 表面 ready + 裏面 empty
- **THEN** CTA「送信する」が活性化される (裏面は任意のため)

#### Scenario: 送信中の spinner
- **WHEN** いずれかのスロットが uploading or pageState='submitting'
- **THEN** CTA は「アップロード中…」+ disabled + spinner が回転表示される

#### Scenario: success 時のラベル
- **WHEN** Storage upload + DB UPDATE が成功 (pageState='success')
- **THEN** CTA ラベルが「完了する」になり活性化される

### Requirement: 成功時は緑バナー表示後に CTA でホーム遷移

state が 'success' に遷移したとき、`SignupIdentityPage` は MUST 緑バナー (`role="status"`) を画面上に表示する。バナー内容は「アップロードが完了しました」+ 説明「オーナーが内容を確認します (最長 3 日以内)。結果はメールでお知らせします。」

CTA「完了する」押下で `useAuthSession.refresh()` を呼び `hasIdentityDocument` を再評価したのち、`/` (ホーム) に MUST 遷移する。

#### Scenario: 成功バナー表示
- **WHEN** Storage upload + DB UPDATE が成功
- **THEN** 緑バナーに「アップロードが完了しました」「オーナーが内容を確認します (最長 3 日以内)」が表示される

#### Scenario: CTA でホーム遷移
- **WHEN** success 状態で CTA「完了する」を押下
- **THEN** `useAuthSession.refresh()` が呼ばれ、`hasIdentityDocument === true` となった上で `/` に遷移する

### Requirement: footer 注記でデータ利用目的・第三者提供・関連ポリシーへのリンクを明示する

`SignupIdentityPage` は本文末尾 (CTA 上) に MUST 以下の注記を表示する (個人情報保護法 + 改正電気通信事業法対応):

> アップロードいただいた画像は、参加者の身元確認 (安全担保) と、江東区・東京都への団体登録 (スポーツ団体・社会教育団体) の証憑提出のためにのみ使用します。第三者への提供は法令に基づく場合を除き行いません。
>
> 画像は Supabase (米国法人運営の SaaS、データは日本リージョン保管) を経由して安全に保管されます。
>
> 詳細は[プライバシーポリシー](/privacy)・[外部送信ポリシー](/external-transmission)をご覧ください。

リンク先 (`/privacy` / `/external-transmission`) のページ本文は **本 change のスコープ外** で、別 Issue (#193 / #192) で実装される。本 change では footer のリンク張りまでを完了させる SHALL。本件マージ時点でリンク先が 404 でも本件単独の受け入れには影響しない (順不同で進めて良い)。ファーストリリース時点で全 Issue が揃っていれば良い。

#### Scenario: footer 注記の存在
- **WHEN** 画面が描画される
- **THEN** 本文末尾に上記の利用目的 + 第三者保管 + 関連ポリシーリンクが表示される

#### Scenario: プライバシーポリシーリンクの遷移先
- **WHEN** ユーザーが「プライバシーポリシー」リンクをクリック
- **THEN** `/privacy` ルートに遷移する (ページ本文は別 Issue で実装、リンク先存在は前提)

#### Scenario: 外部送信ポリシーリンクの遷移先
- **WHEN** ユーザーが「外部送信ポリシー」リンクをクリック
- **THEN** `/external-transmission` ルートに遷移する (ページ本文は別 Issue で実装)

### Requirement: アクセシビリティ AA 準拠

`SignupIdentityPage` は MUST 以下を満たす:
- 書類チップ群: `<div role="radiogroup" aria-labelledby="docTypeLabel">` 配下に `<button role="radio" aria-checked={selected}>`
- ファイル input: `<label>` で覆い、`<input type="file" accept=".jpg,.jpeg,.png,.heic,.heif" capture="environment">` を内包 (hidden 装飾はキーボード操作可能性を保つこと)
- マイナンバー同意 checkbox: `<input type="checkbox" required aria-describedby="consentDesc">`
- エラーバナー: `role="alert"` + `aria-live="polite"`
- 成功バナー: `role="status"` + `aria-live="polite"`
- Sticky CTA: disabled 時は `aria-disabled="true"`
- タップ領域: 全 interactive 要素は最小 44×44px
- コントラスト比: テキスト・アイコンとも AA 以上 (HQ アクセント on paper / 朱 on paper / 緑 on paper を確認)

#### Scenario: スクリーンリーダーでの書類選択
- **WHEN** スクリーンリーダーで radiogroup にフォーカスを当てる
- **THEN** 「書類種別、ラジオグループ」と読み上げられ、矢印キーで各書類を移動できる

#### Scenario: エラー発生時の読み上げ
- **WHEN** ファイル形式不正で error バナーが表示される
- **THEN** `role="alert"` により即座にスクリーンリーダーで「ファイル形式が不正です。jpg / png / heic のみ受け付けています。」が読み上げられる

### Requirement: 上部エラーバナーはファイル受付エラー時に表示される

`SignupIdentityPage` の書類セレクター上に MUST エラーバナーを配置する。state が 'error' のときのみ表示され、それ以外は非表示。バナーは `role="alert"` + 朱色サイドボーダー + 同色背景 (alpha 0.08) で構成する SHALL。

タイトル + 説明の 2 段組構成:
- 形式不正: タイトル「ファイル形式が不正です」 + 説明「jpg / png / heic のみ受け付けています。別のファイルを選んでください。」
- サイズ超過: タイトル「ファイルサイズが大きすぎます」 + 説明「10MB までのファイルを選んでください。」

#### Scenario: 形式不正時のバナー表示
- **WHEN** gif ファイル選択でエラー発生
- **THEN** 書類セレクター上にバナーが表示される

#### Scenario: 別書類選択でバナー消去
- **WHEN** error 状態から別書類チップを押下
- **THEN** state が 'selected' に戻り、エラーバナーが消去される (リトライ意図)

### Requirement: ファイル名命名規則は SOP §4 に準拠する

Storage オブジェクトの命名は MUST `<member_id>/<document_id>-(front|back).(jpg|png)` 形式とする。`member_id` をディレクトリ階層に持たせることで Storage RLS のパスチェックと整合させる SHALL。

`side` はスロット単位で固定:
- 表面スロットからのアップロード: `front`
- 裏面スロットからのアップロード: `back`

document_type による分岐は MUST しない (マイナンバーカードも他書類と同じく表面 = front / 裏面 = back)。

拡張子は変換後の MIME type から導出: `image/jpeg → .jpg`、`image/png → .png`。heic / heif は D18 の自動変換により最終的に `.jpg` となる。

#### Scenario: 通常書類の表面パス
- **WHEN** 運転免許証の表面を提出
- **THEN** Storage パスは `<member_id>/<document_id>-front.jpg` 形式になる

#### Scenario: 通常書類の裏面パス
- **WHEN** 運転免許証の裏面 (本籍欄等) を任意提出
- **THEN** Storage パスは `<member_id>/<document_id>-back.jpg` 形式になる

#### Scenario: マイナンバー表面のパス
- **WHEN** マイナンバーカードの表面 (顔写真側) を提出
- **THEN** Storage パスは `<member_id>/<document_id>-front.<ext>` 形式 (front 固定)

#### Scenario: マイナンバー裏面のパス
- **WHEN** マイナンバーカードの裏面 (個人番号マスク済) を任意提出
- **THEN** Storage パスは `<member_id>/<document_id>-back.<ext>` 形式 (back 固定)

#### Scenario: heic ファイルの拡張子変換
- **WHEN** ユーザーが `.HEIC` (大文字) ファイルを提出
- **THEN** heic2any で jpeg に変換され、保存パス末尾は `.jpg` (変換後拡張子) になる

