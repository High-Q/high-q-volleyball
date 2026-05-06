## ADDED Requirements

### Requirement: 予約確認 Bottom Sheet (詳細画面上に立ち上がる)

会員サイトは予約確認 UI を **Bottom Sheet** として SHALL 提供する。本 sheet はイベント詳細画面の「予約に進む」CTA で開き、画面下部から立ち上がる。独立したルート (`/.../book/confirm` 等) は持たず、イベント詳細画面の URL のまま完結する MUST。

理由: 詳細画面で既に表示されているイベント情報 (開催日 / 名前 / DATE & TIME / VENUE / MEETING POINT / FEE) を確認画面で再描画するのは冗長 UI であり、ページ遷移コスト (戻る操作 / コンテキスト喪失) に見合わない。Bottom Sheet で詳細画面の上に重ね、背後の情報を視認できる状態を保つことで、情報重複と遷移負荷を同時に解消する SHALL。

Sheet 内に表示する要素は以下に **限定** する MUST:

- kicker (`— Review`) と確認文言 (例: 「内容に間違いがないかご確認ください。」)
- 入力欄 — 同伴者数 (stepper) / 連絡事項 (textarea)
- 合計金額カード (参加費 × (1 + 同伴者数)・「当日現金」案内)
- 「戻る」 (sheet を閉じる) と「予約を確定する」 (確定処理) の 2 つの CTA

Sheet 内に **再表示しない** 要素 MUST NOT:

- 詳細画面に既に存在する DATE & TIME / VENUE / MEETING POINT / FEE / イベント名 (背後の詳細画面で見える)
- 氏名 / メール / 電話番号 / 経験レベル の自己プロフィール (会員はログイン済で自身が誰かは自明)
- 編集可能な電話番号入力欄 (`<input type="tel" ...>`)

電話番号は内部処理として `members.phone` をそのまま `reservations.phone_at_booking` に保存する MUST (画面表示はしない)。会員サイトの当日連絡導線は LINE オープンチャットに一元化されているため、運営オーナー個人連絡先や会員別の当日連絡用電話番号を確認 sheet で改めて尋ねる SHALL NOT。

「戻る」押下で sheet を閉じる MUST (URL は変わらず、ブラウザ戻るボタン操作も不要)。「予約を確定する」押下で reservations 行を作成し、成功時は sheet を閉じてから完了画面 (`booking-done`) へ `router.push` で遷移する MUST。確定処理中は二重送信防止のため CTA を無効化する MUST。

reservations の `(event_id, member_id)` UNIQUE 制約により、同一会員が過去にキャンセル済 (`status='cancelled'`) の同イベント予約を持つ場合、新規 INSERT は重複違反 (Postgres `23505`) となる。本要件は data-schema spec の方針 (「キャンセル後の再予約は status の更新で対応」) に従い、INSERT 失敗時は既存キャンセル済行を `'reserved'` に戻す UPDATE で予約を再成立させる MUST。既存行が `'reserved'` のままで残っている場合のみ「重複予約」エラーとして UI に通知する MUST。

確定処理の失敗時 (RLS 違反・重複予約・ネットワークエラー等) は sheet に留まり、エラー種別に応じた説明を sheet 内に表示する MUST。

Sheet 実装は radix-vue の Dialog プリミティブを bottom slide-in styling でラップした `shared/ui/Sheet` 系コンポーネントを SHALL 使用する。focus trap / Escape close / 背景クリック close / aria 属性は radix-vue が a11y 準拠で提供する。

#### Scenario: Sheet の基本表示
- **WHEN** ログイン済み会員がイベント詳細で「予約に進む」を押下
- **THEN** 画面下部から sheet が立ち上がり、kicker / 確認文言 / 同伴者数 stepper / 連絡事項 textarea / 合計金額カード / 戻る・確定の 2 CTA が描画される

#### Scenario: 詳細画面の URL を維持する
- **WHEN** 「予約に進む」を押して sheet が開いている状態
- **THEN** 現在の URL はイベント詳細画面のもの (`/events/:id`) のまま変わらない (`/book/confirm` のような独立ルートには遷移しない)

#### Scenario: 詳細画面の情報を sheet 内に再表示しない
- **WHEN** sheet が開いている状態の DOM を確認
- **THEN** sheet 内には DATE & TIME / VENUE / MEETING POINT / FEE / イベント名 のいずれも描画されない (背後の詳細画面に存在し、視認可能なため)

#### Scenario: 自己プロフィールの非表示
- **WHEN** sheet が開いている状態の DOM を確認
- **THEN** 氏名 / メール / 電話番号 / 経験レベル のいずれも描画されない

#### Scenario: 電話番号入力欄を設けない
- **WHEN** sheet が開いている状態の DOM を確認
- **THEN** 編集可能な電話番号入力欄 (`<input type="tel" ...>`) は存在しない

#### Scenario: phone_at_booking のスナップショット
- **WHEN** 予約確定が成功
- **THEN** reservations.phone_at_booking にはユーザー入力ではなく `members.phone` の値がそのまま保存される

#### Scenario: 合計金額の即時計算
- **WHEN** 同伴者数を 0 → N に変更
- **THEN** 合計金額は (参加費 × (1 + N)) として即時に再描画される

#### Scenario: 「戻る」で sheet を閉じる
- **WHEN** sheet 内で「戻る」を押下
- **THEN** sheet が閉じ、URL は変わらず詳細画面のままとなる。入力内容はローカル保持される

#### Scenario: Escape キーで sheet を閉じる
- **WHEN** sheet 内で Escape キーを押下
- **THEN** sheet が閉じる (radix-vue の標準挙動)

#### Scenario: 確定成功時の遷移
- **WHEN** 「予約を確定する」押下が成功
- **THEN** sheet が閉じ、完了画面 (`booking-done`) へ `router.push` で遷移し、`reservation` クエリに新規予約 ID が含まれる

#### Scenario: 確定処理中の二重送信防止
- **WHEN** 「予約を確定する」を押下した直後の処理中
- **THEN** CTA は disabled となり、再押下しても新たな INSERT は発行されない

#### Scenario: バリデーションエラー
- **WHEN** 同伴者数に許容範囲外の値が入力されたまま「予約を確定する」CTA を押下
- **THEN** 当該フィールドにエラーメッセージが表示され、INSERT は発行されない

#### Scenario: 重複予約のエラー (既存 reserved 行)
- **WHEN** 同一会員が同一イベントに対して既に `status='reserved'` の予約を持つ状態で確定を試行
- **THEN** sheet 内に「既に予約済みです」相当の説明が表示され、完了画面へは遷移しない

#### Scenario: キャンセル後の再予約 (既存 cancelled 行)
- **WHEN** 同一会員が同一イベントの過去キャンセル済予約 (`status='cancelled'`) を持つ状態で確定を試行
- **THEN** 既存行が `'reserved'` に再活性化され、`guest_count` / `note` / `phone_at_booking` が今回入力で上書きされ、`cancelled_at` は NULL に戻り、完了画面へ遷移する

### Requirement: 予約完了画面

会員サイトは予約完了画面を SHALL 提供する。本画面は確認画面からの予約確定成功時にのみ到達可能とし、予約成立をユーザーに明示する MUST。

画面に含む要素:

- 完了バッジ + 「予約が完了しました」見出し
- 予約サマリカード (予約番号・イベント名・開催日時・会場・参加費)
- 次アクション一覧:
  - 会場マップを開く (venues.map_url が登録されている場合のみ)
  - 当日連絡用 LINE オープンチャット「社会人バレーボールサークル High Q」への外部リンク
  - 予約をキャンセル (キャンセル可能性に応じた表示)
- 「イベント一覧へ戻る」 CTA

当日連絡導線として運営オーナー個人連絡先 (電話 / メール等) を画面上で案内 SHALL NOT。連絡経路は LINE オープンチャットに一元化する MUST。LINE オープンチャットの URL は `shared/lib/contact-channels` に定数として保管し、UI 個別にハードコードしない MUST。

予約番号は表示用フォーマット (例: `#HQ-XXXX-XXXX`) で reservations.id を変換した文字列を SHALL 表示する。生 UUID をそのまま表示してはならない MUST NOT。

予約完了画面はブラウザ戻るボタン操作で確認画面に戻れない MUST (履歴置換)。誤って戻った場合の二重予約を防ぐため、確認画面のローカル保持はクリアする MUST。

メール送信に関する文言・カレンダー追加 (.ics) 動線は本画面に **含めない** MUST NOT (MVP1 スコープアウト)。

#### Scenario: 完了画面の基本表示
- **WHEN** 確認画面で予約確定が成功
- **THEN** 完了バッジ・予約サマリ・次アクション・イベント一覧 CTA が描画される

#### Scenario: 予約番号の表示形式
- **WHEN** 完了画面に到達
- **THEN** 予約番号は表示用フォーマット (ハイフン区切りの英数字) で描画され、生 UUID は描画されない

#### Scenario: 会場マップの条件表示
- **WHEN** 予約したイベントの venues.map_url が NULL
- **THEN** 「会場マップを開く」アクションは描画されない (登録済みの場合のみ表示)

#### Scenario: LINE オープンチャットの常時表示
- **WHEN** 完了画面の next アクションを確認
- **THEN** 「当日の連絡は LINE オープンチャットへ」リンクが常に存在し、外部 URL (`HIGH_Q_OPEN_CHAT_URL`) を target="_blank" で開く

#### Scenario: 運営オーナー個人連絡先の非表示
- **WHEN** 完了画面 / キャンセル不可ダイアログ の DOM を確認
- **THEN** オーナー個人の電話番号 / メール / SNS ID は描画されない (連絡経路は LINE オープンチャットのみ)

#### Scenario: メール文言と .ics の非表示
- **WHEN** 完了画面の DOM を確認
- **THEN** 「確認メールを送信しました」相当の文言と .ics / カレンダー追加リンクのいずれも存在しない

#### Scenario: ブラウザ戻る操作で確認画面に戻れない
- **WHEN** 完了画面でブラウザ戻る操作を実行
- **THEN** 確認画面ではなくイベント詳細またはイベント一覧に到達する (履歴置換)

#### Scenario: ローカル保持のクリア
- **WHEN** 予約確定が成功して完了画面に到達
- **THEN** 確認画面のローカル保持データはクリアされ、同一イベントで再度確認画面に入っても初期状態となる

### Requirement: 予約キャンセル

会員サイトは自分の予約をキャンセルする操作を SHALL 提供する。MVP1 ではキャンセル動線は予約完了画面の「予約をキャンセル」アクションに集約する MUST (プロフィール画面 #91 への展開は MVP2)。

キャンセル可否はイベント開催開始時刻 (`events.start_at`) と現在時刻の比較で判定する MUST:

- `events.start_at > now()` (開催前) のとき: キャンセル可能
- `events.start_at <= now()` (開催開始以降) のとき: キャンセル不可

`events.cancel_deadline` 列は本 capability では参照しない MUST NOT (MVP1 スコープアウト)。

キャンセル可能時は ConfirmDialog を経由し、確定操作で reservations.status を `'reserved' → 'cancelled'` に更新する MUST。`cancelled_at` は DB トリガー (`set_reservations_cancelled_at`) で自動設定される。成功時は完了トーストを表示し、イベント一覧画面へ遷移する MUST。

キャンセル不可時 (開催開始以降) はキャンセル CTA を無効化し、「イベント開催が始まっているためキャンセルできません。やむを得ない事情がある場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください」相当の案内文を SHALL 表示する。LINE オープンチャットへの外部リンクを案内文中に含める MUST。本 capability では admin への自動通知や問い合わせフォーム連携は行わない MUST NOT (MVP2)。

#### Scenario: キャンセル可能時の動線
- **WHEN** 完了画面の「予約をキャンセル」を押下し、現在時刻が events.start_at より前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: キャンセル成功後の遷移
- **WHEN** キャンセル確定が成功
- **THEN** 完了トーストが表示され、イベント一覧画面に遷移する

#### Scenario: 開催開始以降はキャンセル不可
- **WHEN** 現在時刻が events.start_at 以降の状態で完了画面を表示
- **THEN** 「予約をキャンセル」CTA は disabled となり、High Q 公式チャットへの問い合わせ案内が表示される

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** events.cancel_deadline に過去日時が設定されているが events.start_at が未来の予約に対してキャンセル操作
- **THEN** キャンセル可能として扱われる (cancel_deadline 列は判定に影響しない)

#### Scenario: 他人の予約のキャンセル試行
- **WHEN** ある会員が他人の reservation_id を改ざんしてキャンセル UPDATE を試行
- **THEN** RLS により拒否され、エラーが UI に表示される

### Requirement: 入力内容のローカル保持

会員サイトは予約確認画面の入力内容を、同一イベント ID 単位で SHALL ローカル保持する。リロード・「修正する」でイベント詳細に戻った後の再到達・別タブからの再到達で入力内容が復元される MUST。

保持先は会員のブラウザ内 (localStorage 等) とし、サーバー側には永続化しない MUST NOT。保持期限は当該イベントの開催終了時刻 (`events.end_at`) を超過したら自動破棄する MUST。

予約確定が成功したとき、もしくはユーザーがフォームから明示的に離脱 (イベント一覧へ戻る等) したときも、保持データは破棄する MUST。

#### Scenario: リロードでの復元
- **WHEN** ユーザーが入力途中で同一 URL をリロード
- **THEN** 入力内容が復元される

#### Scenario: 修正してから再到達でも保持される
- **WHEN** 「修正する」でイベント詳細に戻り、再度「予約に進む」で確認画面に到達
- **THEN** 直前の入力内容が復元される

#### Scenario: 確定後の自動破棄
- **WHEN** 予約確定が成功し完了画面に到達
- **THEN** ローカル保持データはクリアされる

#### Scenario: イベント別の独立保持
- **WHEN** 異なる 2 つのイベント A / B の確認画面を別々に途中入力
- **THEN** それぞれが独立に復元され、互いに影響しない

#### Scenario: 開催終了時刻の超過で破棄
- **WHEN** 入力途中のままイベント開催終了時刻を超過した状態で同一フォームに戻る
- **THEN** 保持データは破棄され、フォームは初期状態となる

### Requirement: 4 状態 UI の網羅

予約確認 / 完了 / キャンセルの各画面は、以下 4 状態の UI を SHALL 実装する:

- 読み込み中 (イベント情報取得中・予約確定処理中・キャンセル処理中)
- 該当なし (存在しないイベント ID で確認画面に到達した等)
- エラー (RLS 違反・ネットワーク・重複予約等)
- 正常表示

エラー状態では再試行操作または上位画面 (イベント詳細・一覧) への戻り導線を SHALL 提示する。

#### Scenario: 確定処理中の表示
- **WHEN** 確認画面で「予約を確定する」を押下した処理中
- **THEN** 処理中であることがユーザーに視覚的に伝わり、CTA は disabled となる

#### Scenario: 存在しないイベント ID
- **WHEN** 存在しない / 公開対象外のイベント ID で確認画面 URL に直接アクセス
- **THEN** 「イベントが見つかりません」相当の表示と、一覧へ戻る導線が提示される

#### Scenario: 確定エラー時の戻り導線
- **WHEN** 予約確定がネットワークエラーで失敗
- **THEN** 確認画面にエラー説明と再試行操作が表示される

### Requirement: ナビゲーション規約

予約フローの各画面は `widgets/page-breadcrumb` を経由してパンくずを SHALL 表示する。各画面で独自の `<nav>` 実装は禁止 MUST NOT。パンくずは横遷移リンクの双方向性ルールに従い、各画面から上位画面への戻り経路を常に持つ MUST。

パンくず構造:

- 予約確認 Bottom Sheet: 独立ルートを持たず詳細画面 URL のままで開閉するため、sheet 内にはパンくずを **持たない** MUST NOT。背後の詳細画面のパンくず (`マイページ > イベント > [イベント名]`) が継続表示される
- 予約完了画面: パンくずは表示せず、画面右上に DONE 表記 + 「イベント一覧へ戻る」 CTA で代替する SHALL (デザインサンプル準拠)

第 1 セグメント「マイページ」は会員サイトのトップ (イベント一覧) への戻り導線を SHALL 提供する。

#### Scenario: 予約確認 Sheet 内にパンくずを持たない
- **WHEN** 予約確認 Bottom Sheet が開いた状態の DOM を確認
- **THEN** sheet 内に独自のパンくずは存在しない (背後の詳細画面のパンくずが継続表示される)

#### Scenario: 完了画面のパンくず非表示
- **WHEN** 予約完了画面にアクセス
- **THEN** パンくずは描画されず、DONE 表記と「イベント一覧へ戻る」CTA で上位導線が提供される

#### Scenario: 独自実装の禁止
- **WHEN** 予約フロー画面群でパンくず用 `<nav>` の独自記述を検索
- **THEN** 該当箇所はパンくず専用 widget 以外には存在しない

### Requirement: デザイントークンの徹底使用

予約フローの各画面のスタイリングは HQ デザイントークン経由 (Tailwind preset utility または HQ ブランドの CSS 変数) でのみ SHALL 行う。生の色コード・ピクセル値・rem 値の直書きを禁止 MUST NOT する。

書体は見出しはブランド和文セリフ書体、本文はブランド和文ゴシック書体、数値・予約番号・kicker はモノスペース書体を SHALL 使用する。

#### Scenario: マジックナンバー検出
- **WHEN** 該当画面のテンプレート / スタイルから生の色コード・ピクセル値・rem 値の直書きを検索
- **THEN** ヒット 0 件 (すべてトークン経由)

### Requirement: アクセシビリティ AA

予約フローの各画面は WCAG 2.1 AA 相当のアクセシビリティ要件を SHALL 満たす:

- フォームの各入力に `<label>` の関連付け、エラー表示は `aria-invalid` / `aria-describedby` で関連付け
- ConfirmDialog は role 属性 / focus trap / Escape キーで閉じる挙動を SHALL 持つ
- すべての CTA・入力欄・キャンセル動線がキーボード操作で到達・実行可能 MUST
- スクリーンリーダーが入力内容と確認内容を構造化された形で読み上げ可能 MUST

#### Scenario: フォームの aria 属性
- **WHEN** バリデーションエラー発生時
- **THEN** 該当入力欄に aria-invalid="true" と aria-describedby でエラーメッセージへの参照が付与される

#### Scenario: ConfirmDialog の操作性
- **WHEN** キャンセル ConfirmDialog が開いた状態で Escape キーを押下
- **THEN** ダイアログが閉じ、フォーカスは元の CTA に戻る

### Requirement: RLS とセキュリティ

予約フローのデータアクセスは reservations / events / members / venues の既存 RLS ポリシーに SHALL 完全準拠する。クライアントから service_role キーを使用してはならない MUST NOT。

予約 INSERT 時は member_id に必ず `auth.uid()` を渡し、RLS WITH CHECK で他人の member_id を指定する INSERT が拒否される状態を保つ MUST。キャンセル UPDATE は自分の reservation かつ status='reserved' のみ通る既存ポリシーに依存する MUST。

#### Scenario: 自分の予約のみ作成可能
- **WHEN** 会員 A がリクエスト改ざんで member_id に B の id を指定して INSERT
- **THEN** RLS WITH CHECK 違反でエラーとなり、UI にも作成失敗が反映される

#### Scenario: 他人の予約はキャンセル不可
- **WHEN** 会員 A が会員 B の reservation_id でキャンセル UPDATE
- **THEN** RLS により 0 行更新となり、UI にエラーが表示される

### Requirement: 主要シナリオの自動テストカバレッジ

予約フローの主要シナリオは component test (Vitest + @vue/test-utils) レベルで SHALL 自動検証される。E2E (Playwright) 環境は #201 で別途整備されるため、本 capability では component test での代替を許容する MUST。

検証対象シナリオ (各 1〜2 件まで):

- 予約確認 → 完了 の happy path (reservations 行が作成される)
- 「修正する」でイベント詳細に戻り、再到達で入力内容が保持される
- キャンセル可能な予約 (events.start_at > now()) のキャンセル成功
- 開催開始以降の予約で CTA 無効化と問い合わせ案内
- 重複予約 INSERT 時のエラー表示
- members.phone 登録済 / 未登録 で電話番号入力欄の表示が切り替わる

#### Scenario: component test の整備
- **WHEN** `pnpm --filter @high-q/reservation test` を実行する
- **THEN** 上記シナリオに対応する component / unit テストが pass する

### Requirement: 予約番号の表示形式

予約番号は reservations.id (UUID) を `#HQ-XXXX-XXXX` 形式 (ハイフン区切り英数字 4 桁 × 2) に変換して表示する MUST。変換は決定的 (同一 id から常に同一表示) かつ衝突確率を最小化する形で行う SHALL。生 UUID を画面に露出してはならない MUST NOT。

DB 列としての予約番号追加は本 capability では行わない MUST NOT (UUID から計算可能なため)。

#### Scenario: 表示形式の決定性
- **WHEN** 同一 reservations.id を 2 回表示
- **THEN** 同一の `#HQ-XXXX-XXXX` 文字列が描画される

#### Scenario: 生 UUID の非露出
- **WHEN** 完了画面 DOM を確認
- **THEN** UUID 形式 (8-4-4-4-12 hex) の文字列は存在しない
