## ADDED Requirements

### Requirement: 修正依頼エントリの構造

システムは `members.profile` jsonb 列の `correction_requests` キー（配列）として、未対応の修正依頼を格納 MUST する。各エントリは以下の 4 属性を MUST 持つ:

- `field` (string) — 修正対象の属性名。許容値は `'display_name' | 'birthday' | 'phone' | 'experience_level' | 'nickname'` のみ SHALL。`display_name` は姓・名 を 1 つの編集モーダルで同時更新するため、admin / 会員側とも単一の「お名前」として扱う（個別の `last_name` / `first_name` は持たない）
- `message` (string) — admin が入力する依頼文。1〜500 文字 SHALL
- `requested_at` (string) — ISO 8601 タイムスタンプ。エントリ作成時の `now()` SHALL
- `requested_by` (string) — 依頼を作成した admin の `members.id`（UUID 文字列）SHALL

`correction_requests` キーが未定義の `members` 行は、空配列 `[]` として扱う MUST。

#### Scenario: エントリの基本構造
- **WHEN** admin が会員に対し field=`birthday`、message="本人確認書類と一致しません" の修正依頼を作成
- **THEN** 対象会員の `profile.correction_requests` に `{ field: 'birthday', message: '本人確認書類と一致しません', requested_at: '<ISO8601>', requested_by: '<admin uuid>' }` のエントリが 1 件追加される

#### Scenario: correction_requests 未定義行の扱い
- **WHEN** `profile` jsonb に `correction_requests` キーがない会員行を SELECT
- **THEN** アプリ層では空配列扱いされ、バナー / バッジは出ない

#### Scenario: 同会員に複数 field の依頼が同時存在
- **WHEN** 同会員に `birthday` / `display_name` / `phone` の 3 件の修正依頼が同時存在
- **THEN** 全 3 エントリが配列に保持され、会員サイトのパネルで 3 件が縦に積み上げ表示される

### Requirement: admin による修正依頼の作成

admin は会員詳細画面から、対象会員に対し修正依頼を作成 SHALL できる。作成時、`field` / `message` を入力 MUST し、システムは `requested_at` / `requested_by` を自動セット MUST する。同会員の同 `field` に対する既存の未対応エントリがある場合、新規作成は **エラー** で拒否 SHALL する（同 field の重複は許容しない）。

#### Scenario: 新規依頼の作成
- **WHEN** admin が「修正依頼を作成」ダイアログで `field=birthday`、`message="本人確認書類と一致しません"` を入力して送信
- **THEN** 対象会員の `profile.correction_requests` 配列に新規エントリが追加され、admin 画面で当該会員の「修正依頼中」バッジが N+1 件に増える

#### Scenario: 同 field の重複作成を拒否
- **WHEN** 既に `field=birthday` の未対応エントリがある会員に対し、再度 `field=birthday` の依頼を作成しようとする
- **THEN** API はエラーを返し、UI に「既に同じ属性の修正依頼が存在します。先に取り下げてください」のメッセージが表示される

#### Scenario: 取り下げ後の再作成
- **WHEN** 既存の `field=birthday` 依頼を取り下げた後、同じ field で新規依頼を作成
- **THEN** 新規エントリが追加される（取り下げ済みエントリは配列から消えているため重複しない）

### Requirement: admin による修正依頼の取り下げ

admin は会員詳細画面の未対応一覧から、任意の修正依頼を **取り下げ** SHALL できる。取り下げは対応する配列エントリの削除 MUST であり、履歴は残さない（MVP1 では未対応リストのみを持つ）。

#### Scenario: 取り下げ操作
- **WHEN** admin が `field=phone` の未対応依頼の「取り下げ」ボタンを押す
- **THEN** 配列から該当エントリが削除され、admin 画面の未対応一覧から消え、会員サイトのバナーからも消える

#### Scenario: 全件取り下げ
- **WHEN** 会員の最後の修正依頼を取り下げる
- **THEN** `profile.correction_requests` は空配列となり、admin 一覧のバッジが非表示になる

### Requirement: 会員による修正完了時の自動消化

会員サイトの `apps/reservation` で各属性の値を更新する mutation は、対応する `correction_requests` エントリを **同時に削除** MUST する。エントリ削除条件は「該当 `field` の値が UPDATE された」のみで、値の妥当性検証や同値判定は行わない SHALL。

属性と削除対象 field の対応:

| 更新 mutation | 削除される field |
|---|---|
| `updateMyName(lastName, firstName)` | `display_name` のエントリ |
| `updateMyBirthday(birthday)` | `birthday` |
| `updateMyPhone(phone)` | `phone` |
| `updateMyExperienceLevel(level)` | `experience_level` |
| `updateMyNickname(nickname)` | `nickname` |

email 編集（`requestMyEmailChange`）は本 capability の対象外 SHALL（auth 経路の確認完了が成功条件で複雑、Phase 2 で扱う）。

#### Scenario: 生年月日 update で対応 field の依頼が消える
- **WHEN** `field=birthday` の未対応依頼を持つ会員が `/profile` で生年月日を更新
- **THEN** `updateMyBirthday` 成功と同時に `correction_requests` から `field=birthday` のエントリが削除される

#### Scenario: 氏名 update で display_name エントリが消える
- **WHEN** 会員に `field=display_name` の未対応依頼があり、`updateMyName` で姓・名 両方を一度に更新
- **THEN** 該当エントリが配列から削除される

#### Scenario: 同値 update でも消化される
- **WHEN** `field=birthday` の未対応依頼を持つ会員が、生年月日編集モーダルを開いて値を変えず保存
- **THEN** `updateMyBirthday` mutation は実行され、対応エントリは削除される（admin が要請を出した時点で会員側の確認動作が完了したと見なす）

#### Scenario: 他属性の update は他 field の依頼に影響しない
- **WHEN** `field=birthday` の依頼を持つ会員が `nickname` を更新
- **THEN** `birthday` の依頼は配列に残る

### Requirement: 会員サイトの修正依頼パネル

`apps/reservation` の認証済ユーザーに対し、`members.profile.correction_requests` が 1 件以上ある場合は **常設インラインパネル** を MUST 表示する。表示箇所は 2 つ:

- **Home (`/events`)**: HomeHeader 直下、greeting kicker の手前に `mode="inline"` で配置 MUST
- **Profile (`/profile`)**: ProfileHeader 直下、AccountSection の手前に `mode="profile"` で配置 MUST

両モードとも未対応の全エントリを縦に積み上げ表示 SHALL し、各エントリは:

- 該当 field の日本語ラベル（「お名前」「生年月日」「電話番号」「経験レベル」「ニックネーム」）
- admin が入力した `message` テキスト
- 「✎ 修正する ›」accent text link

を MUST 持つ。

配色は `bg-paper` + **左 3px accent (terracotta) シャドウ** + `1px hairline` ボーダーを用い、警告色（赤 / danger）や ⚠ 絵文字は **使わない** MUST NOT。文言は「確認のお願い」など丁寧で非威圧的に保つ MUST。

mode による違い:

- `inline` モード: kicker に件数表記「— 運営からのお願い · N 件」+ 1 行説明「ご登録内容について確認のお願いがあります。下記から修正してください。」
- `profile` モード: kicker に件数表記なし + 右上に accent fill の「未対応 N」pill

「修正する」ボタン押下時の遷移:

- `display_name` → `/profile?edit=displayName` に遷移し、姓・名 編集モーダルを自動で開く
- `birthday` / `phone` / `nickname` → `/profile?edit=<field>` で同名モーダルを開く
- `experience_level` → `/profile?edit=experienceLevel` に遷移し、LEVEL セクションへスクロール + 短時間ハイライト

パネルは **dismiss UI を持たない** MUST NOT (閉じるボタン無し)。修正完了 / admin 取り下げで `correction_requests` が空になれば自動的に非表示になる MUST。

加えて `BottomTabBar` のプロフィールアイコンに **件数バッジ** を表示 MUST する (accent 円 + paper ring 縁取り)。`correction_requests.length === 0` では非表示。

#### Scenario: 1 件の依頼でパネル表示 (home)
- **WHEN** 認証済会員に `field=birthday` の未対応依頼が 1 件ある状態で `/events` を開く
- **THEN** HomeHeader 直下に `inline` モードのパネルが表示され、「生年月日」ラベル + message テキスト + 「修正する」リンクを含む 1 行が見える

#### Scenario: 1 件の依頼でパネル表示 (profile)
- **WHEN** 同じ会員が `/profile` を開く
- **THEN** ProfileHeader 直下に `profile` モードのパネルが表示され、右上に「未対応 1」pill が表示される

#### Scenario: 0 件ならパネル非表示
- **WHEN** 認証済会員の `correction_requests` が空配列または未定義
- **THEN** パネルは描画されない（DOM にも出ない）

#### Scenario: 「修正する」リンクで該当モーダルが開く
- **WHEN** パネルの `field=display_name` 行で「修正する」リンクを押す
- **THEN** `/profile?edit=displayName` に遷移し、姓・名 編集モーダルが自動で開いた状態になる

#### Scenario: experience_level の動線
- **WHEN** パネルの `field=experience_level` 行で「修正する」リンクを押す
- **THEN** `/profile?edit=experienceLevel` に遷移し、LEVEL セクションが画面内に来るようスクロールし、当該セクションが一時的にハイライトされる

#### Scenario: dismiss UI を持たない
- **WHEN** パネルを描画する
- **THEN** 「閉じる」「×」等の dismiss UI は存在しない

#### Scenario: 修正完了で自動消滅
- **WHEN** 該当 field の更新成功で `correction_requests` が空配列になる
- **THEN** パネルが自動的に非表示 (v-if で DOM から除去) になる

#### Scenario: タブバーのプロフィールバッジ
- **WHEN** 認証済会員に `correction_requests` が 2 件ある状態でアプリを開く
- **THEN** BottomTabBar のプロフィールアイコン右上に「2」の accent 円バッジが表示される

#### Scenario: 0 件でタブバーバッジ非表示
- **WHEN** `correction_requests` が空
- **THEN** プロフィールアイコンにバッジは表示されない

### Requirement: admin 詳細 sheet の修正依頼セクション

`apps/admin` の会員詳細 sheet は、対象会員の未対応 `correction_requests` を一覧表示する「修正依頼」セクションを MUST 持つ。本セクションは:

- 未対応エントリ 0 件のときは「修正依頼はありません」と空状態を表示
- 1 件以上のときは各エントリの `field` 日本語ラベル / `message` / `requested_at` / 「取り下げ」ボタンを縦リスト表示
- ヘッダーに「修正依頼を作成」ボタンを配置 MUST し、押下で field 選択（select） + message 入力（textarea, 1〜500 文字） + 投稿 CTA を持つダイアログを開く

#### Scenario: 空状態
- **WHEN** 未対応依頼が 0 件の会員の詳細 sheet を開く
- **THEN** 「修正依頼はありません」が表示され、「修正依頼を作成」ボタンが表示される

#### Scenario: 1 件以上の表示
- **WHEN** 未対応依頼が 2 件の会員の詳細 sheet を開く
- **THEN** 2 件が縦リスト表示され、各行に取り下げボタンが付く

#### Scenario: 作成ダイアログ
- **WHEN** 「修正依頼を作成」ボタンを押す
- **THEN** field select / message textarea / 投稿 CTA / キャンセル を持つダイアログが開く

#### Scenario: 投稿後の更新
- **WHEN** ダイアログで `field=birthday` / `message` を入力して投稿、成功
- **THEN** ダイアログが閉じ、詳細 sheet の修正依頼セクションに新規エントリが 1 件追加されて表示される
