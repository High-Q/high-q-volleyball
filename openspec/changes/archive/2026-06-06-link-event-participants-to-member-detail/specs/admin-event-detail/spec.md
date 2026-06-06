## ADDED Requirements

### Requirement: 予約者リスト氏名のクリックで会員詳細シートを表示

`EventParticipantsTable` の名前セルは MUST 氏名（および存在する場合はニックネーム併記）部分をクリック可能な `<button>` として描画し、押下で `EventDetailPage` 上にオーバーレイ表示される `MemberDetailSheet` を開く SHALL。シートの開閉状態は MUST URL クエリ `?detail=<memberId>` で同期し、ブラウザ戻る / 進む / リロードで復元される。

ボタンには MUST `aria-label="<display_name> の詳細を開く"` を付与し、フォーカス可能（Tab で到達）かつ Enter / Space で発火する SHALL。ホバー時は氏名に下線を表示し、フォーカス時は `var(--hq-accent)` の `focus-visible:ring-1` を表示 SHALL（リンク性の視覚提示）。

シート内のコンテンツ・挙動（参加履歴 / 運営メモ編集 / 修正依頼セクション / 退会操作 / Esc・背景クリック・閉じるボタンでの閉動作）は `admin-members-list` capability の「詳細 sheet」要件群と同一の `MemberDetailSheet` を再利用 SHALL する。

退会済み会員の行（`member_id IS NULL`、`display_name = '退会済み会員'`）は MUST ボタン化せず、プレーンテキスト表示のままとする SHALL（開けるシートが存在しないため）。

#### Scenario: 氏名クリックで詳細シートが開く
- **WHEN** 参加者リストの「山田 太郎」（`member_id = abc-123`）の氏名ボタンをクリック
- **THEN** URL が `/events/<eventId>?detail=abc-123` に変化し、画面右側に `MemberDetailSheet` が slide-in し、山田 太郎の会員基本情報・参加履歴・運営メモが表示される

#### Scenario: ニックネーム付き氏名のクリック
- **WHEN** `display_name = '山田 太郎'` / `nickname = 'たろちゃん'` の参加者行の氏名ボタンをクリック
- **THEN** ボタン全体（`山田 太郎（たろちゃん）`）がクリック領域となり、`MemberDetailSheet` が開く

#### Scenario: キーボード操作で開く
- **WHEN** Tab キーでフォーカスを氏名ボタンに合わせ Enter キーを押下
- **THEN** クリックと同等の動作で `MemberDetailSheet` が開く

#### Scenario: URL から直接シートを開く
- **WHEN** 認証済み admin が `/events/<eventId>?detail=<memberId>` を直接開く
- **THEN** イベント詳細ページが描画され、当該会員の `MemberDetailSheet` が初期表示で開いている

#### Scenario: シートを閉じると URL クエリが消える
- **WHEN** `?detail=<id>` 付きでシートが開いた状態で Esc キー / 背景クリック / 閉じるボタンを操作
- **THEN** URL から `?detail=` が除去され、`/events/<eventId>` に戻り、イベント詳細ページのスクロール位置・タブ状態・mutation 中の編集状態は維持される

#### Scenario: aria-label
- **WHEN** 「山田 太郎」の氏名ボタンを screen reader でフォーカス
- **THEN** `aria-label="山田 太郎 の詳細を開く"` として読み上げられる（ニックネームは aria-label に含めない）

#### Scenario: ホバー / フォーカス時の視覚フィードバック
- **WHEN** マウスで氏名ボタンを hover、またはキーボードでフォーカス
- **THEN** hover 時は氏名に下線が表示され、focus-visible 時は `var(--hq-accent)` の ring が表示される

#### Scenario: 退会済み会員はリンク化されない
- **WHEN** `member_id IS NULL` / `display_name = '退会済み会員'` の予約行を描画
- **THEN** 氏名セルはプレーンテキストのままで `<button>` を含まず、フォーカス可能要素も存在しない

#### Scenario: シートを閉じてもイベント詳細の他状態は破壊されない
- **WHEN** 参加者リストで未保存の同伴者数編集中にシートを開閉
- **THEN** シート閉後、同伴者数編集の入力状態は失われず、`EventDetailPage` のタブ・スクロール位置も維持される
