# reservation-booking-flow Specification

## Purpose

会員サイト (`apps/reservation`) の予約導線 (確認 / 完了 / キャンセル) の責務を規定する。Epic #170「メンバーが High Q に参加し、繰り返す」のユーザージャーニー後半 (予約 → 参加) を担い、reservations テーブルへの実書き込みパスを提供する。確認 UI は独立画面ではなく Bottom Sheet として詳細画面の上に立ち上がる構成を採り、詳細画面と確認画面の情報重複・遷移コストを同時に解消する。MVP1 スコープに合わせてメール通知 / .ics / cancel_deadline 表示 / プロフィール画面接続は含まない。
## Requirements
### Requirement: 予約確認 Bottom Sheet (詳細画面上に立ち上がる)

会員サイトは予約 Bottom Sheet を **新規予約モード (create) と既存予約編集モード (edit) の 2 モード兼用** で SHALL 提供する。両モードは同一コンポーネントを共有し、kicker 文言 / 確定 CTA ラベル / 初期値供給元 / 確定処理経路 / 成功遷移をモード単位で切り替える MUST。

本 sheet はイベント詳細画面の「予約に進む」CTA（create モード）または予約詳細画面の「予約内容を変更する」CTA（edit モード）から立ち上がり、画面下部から表示される MUST。独立したルート (`/.../book/confirm` 等) は持たず、起動元画面の URL のまま完結する MUST。

理由: 詳細画面で既に表示されている情報（イベント名 / DATE & TIME / VENUE / FEE 等）を確認画面で再描画するのは冗長 UI であり、ページ遷移コスト（戻る操作 / コンテキスト喪失）に見合わない。Bottom Sheet で起動元画面の上に重ね、背後の情報を視認できる状態を保つことで、情報重複と遷移負荷を同時に解消する SHALL。

Sheet 内に表示する要素は以下に **限定** する MUST:

- kicker（モードに応じた文言）と説明文
- 入力欄 — 同伴者数 (stepper) / 連絡事項 (textarea)
- 合計金額カード（参加費 × (1 + 同伴者数)・「当日現金」案内）
- 「戻る」（sheet を閉じる）と確定 CTA（モードに応じたラベル）の 2 つの CTA

Sheet 内に **再表示しない** 要素 MUST NOT:

- 起動元画面に既に存在する DATE & TIME / VENUE / MEETING POINT / FEE / イベント名（背後の起動元画面で見える）
- 氏名 / メール / 電話番号 / 経験レベル の自己プロフィール（会員はログイン済で自身が誰かは自明）
- 編集可能な電話番号入力欄 (`<input type="tel" ...>`)

電話番号は内部処理として `members.phone` をそのまま `reservations.phone_at_booking` に保存する MUST（画面表示はしない、create モードのみ書き込み）。会員サイトの当日連絡導線は LINE オープンチャットに一元化されているため、運営オーナー個人連絡先や会員別の当日連絡用電話番号を sheet で改めて尋ねる SHALL NOT。

「戻る」押下で sheet を閉じる MUST（URL は変わらず、ブラウザ戻るボタン操作も不要）。確定処理中は二重送信防止のため CTA を無効化する MUST。

確定処理の失敗時（RLS 違反 / 重複予約 / 編集期限切れ / ネットワークエラー等）は sheet に留まり、エラー種別に応じた説明を sheet 内に表示する MUST。

Sheet 実装は radix-vue の Dialog プリミティブを bottom slide-in styling でラップした `shared/ui/Sheet` 系コンポーネントを SHALL 使用する。focus trap / Escape close / 背景クリック close / aria 属性は radix-vue が a11y 準拠で提供する。

**create モードの挙動**:

- 起動元: イベント詳細画面の「予約に進む」CTA
- 初期値供給元: localStorage 復元 → なければ空欄
- Kicker / 説明文: 「— Review」「内容に間違いがないかご確認ください。」相当
- 確定 CTA: 「予約を確定する」
- 確定経路: `reservations` への INSERT。`(event_id, member_id)` UNIQUE 制約により重複違反 (Postgres `23505`) となった場合、既存行が `'cancelled'` であれば `'reserved'` に再活性化する UPDATE で予約を再成立させる MUST。既存行が `'reserved'` のままであれば「重複予約」エラーとして UI に通知する MUST
- 成功時遷移: sheet を閉じてから完了画面 (`booking-done`) へ `router.push` で遷移する MUST。`reservation` クエリに新規予約 ID が含まれる MUST

**edit モードの挙動**:

- 起動元: 予約詳細画面の「予約内容を変更する」CTA
- 初期値供給元: サーバーから取得した現在の `reservations.guest_count` / `reservations.note` の値で **必ず** 初期化する MUST。localStorage は参照 SHALL NOT
- Kicker / 説明文: 「— Edit」「変更したい箇所を編集してください。」相当
- 確定 CTA: 「変更を保存する」
- 確定 CTA の活性条件: 同伴者数 / 連絡事項のいずれかが初期値（サーバー値）と差分を持つときのみ活性。両方とも初期値と同一の状態では非活性とする MUST
- 編集対象: `reservations.guest_count` および `reservations.note` の 2 列のみ MUST。`event_id` / 開催日時 / 会場 / `phone_at_booking` / `status` / 経験レベル等は本 sheet で編集 SHALL NOT
- 確定経路: 自分自身の `status='reserved'` 行に対する UPDATE。クエリは RLS 単独依存ではなく、アプリ層でも `member_id = auth.uid()` AND `status = 'reserved'` を明示的に WHERE 句に含める二重防衛とする MUST
- 編集可能期限: 予約キャンセル可能期限と完全一致させる MUST。判定は `useCancelBooking.isCancellable(eventStartAt, now)`（JST カレンダー基準で `now の JST 日 < events.start_at の JST 日`）を流用する MUST。期限切れ時は edit 用 sheet を開かない / 開いても確定 CTA を活性化しない MUST
- 成功時遷移: sheet を閉じ、起動元の予約詳細画面に留まる MUST。保存内容は予約詳細画面に通知 (`saved` イベント等) し、Meta テーブル等の表示が新値で即時に再描画される MUST。完了トースト（「変更を保存しました」相当）の表示は起動元画面側の責務とし、BookingSheet からは直接発火 SHALL NOT
- ローカル保持: localStorage への書き出し / 読み込みのいずれも行わない MUST NOT

#### Scenario: create モードでの基本表示
- **WHEN** ログイン済み会員がイベント詳細で「予約に進む」を押下
- **THEN** 画面下部から sheet が立ち上がり、create 用 kicker / 説明文 / 同伴者数 stepper / 連絡事項 textarea / 合計金額カード / 戻る・「予約を確定する」の 2 CTA が描画される

#### Scenario: edit モードでの基本表示
- **WHEN** ログイン済み会員が予約詳細画面で「予約内容を変更する」を押下
- **THEN** 画面下部から sheet が立ち上がり、edit 用 kicker / 説明文 / 同伴者数 stepper（初期値 = 現在の guest_count）/ 連絡事項 textarea（初期値 = 現在の note）/ 合計金額カード / 戻る・「変更を保存する」の 2 CTA が描画される

#### Scenario: 起動元画面の URL を維持する
- **WHEN** create / edit いずれかのモードで sheet が開いている状態
- **THEN** 現在の URL は起動元画面（イベント詳細 or 予約詳細）のまま変わらない

#### Scenario: 起動元画面の情報を sheet 内に再表示しない
- **WHEN** create / edit いずれかのモードで sheet が開いている状態の DOM を確認
- **THEN** sheet 内には DATE & TIME / VENUE / MEETING POINT / FEE / イベント名 のいずれも描画されない（背後の起動元画面に存在し、視認可能なため）

#### Scenario: 自己プロフィールの非表示
- **WHEN** create / edit いずれかのモードで sheet が開いている状態の DOM を確認
- **THEN** 氏名 / メール / 電話番号 / 経験レベル のいずれも描画されない

#### Scenario: 電話番号入力欄を設けない
- **WHEN** create / edit いずれかのモードで sheet が開いている状態の DOM を確認
- **THEN** 編集可能な電話番号入力欄 (`<input type="tel" ...>`) は存在しない

#### Scenario: phone_at_booking のスナップショット (create モード)
- **WHEN** create モードで予約確定が成功
- **THEN** reservations.phone_at_booking にはユーザー入力ではなく `members.phone` の値がそのまま保存される

#### Scenario: phone_at_booking は edit モードで更新されない
- **WHEN** edit モードで保存が成功
- **THEN** `reservations.phone_at_booking` の値は変更前と同一のまま保たれる（編集対象外）

#### Scenario: 合計金額の即時計算
- **WHEN** どちらのモードでも同伴者数を 0 → N に変更
- **THEN** 合計金額は (参加費 × (1 + N)) として即時に再描画される

#### Scenario: 「戻る」で sheet を閉じる
- **WHEN** create / edit いずれかのモードで「戻る」を押下
- **THEN** sheet が閉じ、URL は変わらず起動元画面のままとなる

#### Scenario: Escape キーで sheet を閉じる
- **WHEN** create / edit いずれかのモードで Escape キーを押下
- **THEN** sheet が閉じる（radix-vue の標準挙動）

#### Scenario: create モードでの確定成功時の遷移
- **WHEN** create モードで「予約を確定する」押下が成功
- **THEN** sheet が閉じ、完了画面 (`booking-done`) へ `router.push` で遷移し、`reservation` クエリに新規予約 ID が含まれる

#### Scenario: edit モードでの保存成功時の挙動
- **WHEN** edit モードで「変更を保存する」押下が成功
- **THEN** BookingSheet は更新後の Reservation を `saved` イベントで通知して閉じる。起動元画面 (予約詳細画面) はこれを受けて Meta テーブルを新しい同伴者数 / 連絡事項で再描画し、完了トーストを表示する。BookingSheet 自体はトーストを直接発火しない

#### Scenario: 確定処理中の二重送信防止
- **WHEN** create / edit いずれかのモードで確定 CTA を押下した直後の処理中
- **THEN** CTA は disabled となり、再押下しても新たな INSERT / UPDATE は発行されない

#### Scenario: バリデーションエラー
- **WHEN** どちらのモードでも同伴者数に許容範囲外の値が入力されたまま確定 CTA を押下
- **THEN** 当該フィールドにエラーメッセージが表示され、INSERT / UPDATE は発行されない

#### Scenario: 重複予約のエラー (create モード・既存 reserved 行)
- **WHEN** create モードで、同一会員が同一イベントに対して既に `status='reserved'` の予約を持つ状態で確定を試行
- **THEN** sheet 内に「既に予約済みです」相当の説明が表示され、完了画面へは遷移しない

#### Scenario: キャンセル後の再予約 (create モード・既存 cancelled 行)
- **WHEN** create モードで、同一会員が同一イベントの過去キャンセル済予約 (`status='cancelled'`) を持つ状態で確定を試行
- **THEN** 既存行が `'reserved'` に再活性化され、`guest_count` / `note` / `phone_at_booking` が今回入力で上書きされ、`cancelled_at` は NULL に戻り、完了画面へ遷移する

#### Scenario: edit モードで初期値はサーバー値
- **WHEN** 予約詳細画面で「予約内容を変更する」を押下
- **THEN** sheet 内の同伴者数 stepper / 連絡事項 textarea には現在の `reservations.guest_count` / `reservations.note` の値が初期表示される（localStorage 由来の値ではない）

#### Scenario: edit モードで差分なしのとき保存 CTA は非活性
- **WHEN** edit モードで sheet を開いた直後、何も変更していない状態
- **THEN** 「変更を保存する」CTA は非活性で描画される

#### Scenario: edit モードで差分検知 → 元に戻すと再び非活性
- **WHEN** edit モードで同伴者数を 1 増やすと CTA が活性化し、その後 stepper を元の値に戻す
- **THEN** 「変更を保存する」CTA は再び非活性となる

#### Scenario: edit モードで他人の予約 ID を改ざんしての UPDATE 試行
- **WHEN** 会員 A が会員 B の reservation_id を指定して UPDATE を試行
- **THEN** RLS により 0 行更新となり、UI にエラーが表示され、sheet は閉じない

#### Scenario: edit モードで編集期限切れ
- **WHEN** 編集中に `now` が `events.start_at` の JST 開催日 0:00 JST を超え、確定 CTA を押下した
- **THEN** UPDATE は発行されず、「キャンセル期限を過ぎているため変更できません」相当の案内（LINE オープンチャットリンク付き）が sheet 内に表示される

#### Scenario: edit モードでの CTA ラベル
- **WHEN** edit モードで sheet が開いている状態
- **THEN** 確定 CTA ラベルは「変更を保存する」であり、create モードの「予約を確定する」とは異なる

### Requirement: 予約完了画面

会員サイトは予約完了画面を SHALL 提供する。本画面は確認画面からの予約確定成功時にのみ到達可能とし、予約成立をユーザーに明示する MUST。

画面に含む要素:

- 完了バッジ + 「予約が完了しました」見出し
- 予約サマリカード (予約番号・イベント名・開催日時・会場・参加費)
- 予約完了メール送信の薄い案内（送信先メールアドレスの提示 + 迷惑メールフォルダ確認の促し）
- 次アクション一覧:
  - 会場マップを開く (venues.map_url が登録されている場合のみ)
  - 当日連絡用 LINE オープンチャット「社会人バレーボールサークル High Q」への外部リンク
  - 予約をキャンセル (キャンセル可能性に応じた表示)
- 「イベント一覧へ戻る」 CTA

当日連絡導線として運営オーナー個人連絡先 (電話 / メール等) を画面上で案内 SHALL NOT。連絡経路は LINE オープンチャットに一元化する MUST。LINE オープンチャットの URL は `shared/lib/contact-channels` に定数として保管し、UI 個別にハードコードしない MUST。

予約番号は表示用フォーマット (例: `#HQ-XXXX-XXXX`) で reservations.id を変換した文字列を SHALL 表示する。生 UUID をそのまま表示してはならない MUST NOT。

予約完了画面はブラウザ戻るボタン操作で確認画面に戻れない MUST (履歴置換)。誤って戻った場合の二重予約を防ぐため、確認画面のローカル保持はクリアする MUST。

カレンダー追加 (.ics) 動線は本画面に **含めない** MUST NOT (MVP1 スコープアウト)。メール送信完了案内は本画面に薄く 1 行で含める MUST が、メール送信失敗エラーや SMTP 由来の警告は UI に描画してはならない MUST NOT（送信失敗は別 capability `reservation-notification-email` のログに集約される）。

#### Scenario: 完了画面の基本表示
- **WHEN** 確認画面で予約確定が成功
- **THEN** 完了バッジ・予約サマリ・メール送信案内 1 行・次アクション・イベント一覧 CTA が描画される

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

#### Scenario: メール送信案内の表示
- **WHEN** 完了画面の DOM を確認
- **THEN** 「予約完了メールを <会員のメールアドレス> 宛にお送りしました」相当の薄い案内が 1 行で描画される

#### Scenario: メール送信失敗は UI に出ない
- **WHEN** メール送信が SMTP エラーで失敗した状態で完了画面を表示
- **THEN** 完了画面にはエラーバナーや警告は描画されず、通常の完了表示が続く

#### Scenario: .ics 動線の非表示
- **WHEN** 完了画面の DOM を確認
- **THEN** .ics / カレンダー追加リンクは存在しない

#### Scenario: ブラウザ戻る操作で確認画面に戻れない
- **WHEN** 完了画面でブラウザ戻る操作を実行
- **THEN** 確認画面ではなくイベント詳細またはイベント一覧に到達する (履歴置換)

#### Scenario: ローカル保持のクリア
- **WHEN** 予約確定が成功して完了画面に到達
- **THEN** 確認画面のローカル保持データはクリアされ、同一イベントで再度確認画面に入っても初期状態となる

### Requirement: 予約キャンセル

会員サイトは自分の予約をキャンセルする操作を SHALL 提供する。MVP1 ではキャンセル動線を以下の 2 経路で MUST 提供する:

- 予約完了画面 (`booking-done`) の「予約をキャンセル」アクション（直近の予約用）
- 予約履歴画面 (`/history`) の予約中グループのキャンセルボタン、および予約詳細画面 (`/reservations/:reservationId`) のキャンセル CTA（後追い用）

3 経路の判定基準と挙動は同一とし、コードを共通化する MUST (`features/booking/composables/useCancelBooking.ts` の `isCancellable` 関数を全経路から参照)。

キャンセル可否は **JST カレンダー基準で「開催前日中」まで** とし、`isCancellable(eventStartAt, now)` は以下のロジックで判定する MUST:

- `now` の JST カレンダー日 < `events.start_at` の JST カレンダー日 のとき: キャンセル可能 (= 前日 23:59 JST まで)
- それ以外 (当日 0:00 JST 以降 / 開催以降): キャンセル不可

`events.cancel_deadline` 列は本 capability では参照しない MUST NOT (MVP1 スコープアウト方針を維持)。

キャンセル可能時は ConfirmDialog を経由し、確定操作で reservations.status を `'reserved' → 'cancelled'` に更新する MUST。`cancelled_at` は DB トリガー (`set_reservations_cancelled_at`) で自動設定される。成功時は完了トーストを表示し、経路ごとに以下の遷移挙動を取る MUST:

- **完了画面経由**: キャンセルした **イベントが受付可能（未開催かつ非満席）なとき**は、イベント一覧へ遷移せず、完了画面上に「やっぱり予約する」再予約導線を含む結果表示へ切り替える MUST。「やっぱり予約する」は対象イベント詳細へ遷移し、予約 Sheet（create モード）自動オープンのディープリンク（「予約 Sheet のディープリンク起動」要件）を起動する MUST。結果表示には「イベント一覧へ」の退出導線も併存させる MUST。**イベントが受付不可（開催済 / 満席）なとき**は、従来どおりイベント一覧画面へ遷移する MUST
- **履歴画面経由**: 同画面に留まり対象行を `'cancelled'` 表示に切り替える MUST（当該行は「キャンセル済み」グループへ移動し、受付可能なら再予約導線を持つ）
- **詳細画面経由**: 履歴画面へ `router.replace` で遷移する MUST

キャンセル不可時 (当日 0:00 JST 以降) はキャンセル CTA を無効化し、「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません。やむを得ない事情がある場合は LINE オープンチャット『社会人バレーボールサークル High Q』までご連絡ください」相当の案内文を SHALL 表示する。LINE オープンチャットへの外部リンクを案内文中に含める MUST。本 capability では admin への自動通知や問い合わせフォーム連携は行わない MUST NOT (MVP2)。

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（完了画面経由）
- **WHEN** 完了画面の「予約をキャンセル」を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 開催前日 23:59 JST まではキャンセル可能（履歴画面 / 詳細画面経由）
- **WHEN** 履歴画面の予約中行 / 詳細画面のキャンセル CTA を押下し、現在時刻が `events.start_at` の JST 開催日の前日 23:59 JST 以前
- **THEN** ConfirmDialog が表示され、確定操作で reservations.status が 'cancelled' に更新される

#### Scenario: 完了画面経由のキャンセル成功後の遷移（受付不可イベント）
- **WHEN** 完了画面からのキャンセル確定が成功し、対象イベントが受付不可（開催済 / 満席）
- **THEN** 完了トーストが表示され、イベント一覧画面に遷移する

#### Scenario: 完了画面経由のキャンセル成功後の再予約導線（受付可能イベント）
- **WHEN** 完了画面からのキャンセル確定が成功し、対象イベントが受付可能（未開催かつ非満席）
- **THEN** イベント一覧へは遷移せず、完了画面上に「やっぱり予約する」導線と「イベント一覧へ」退出導線を含む結果表示が描画される

#### Scenario: 完了画面の「やっぱり予約する」でディープリンク起動
- **WHEN** 完了画面のキャンセル後結果表示で「やっぱり予約する」を押下する
- **THEN** 対象イベント詳細へ遷移し、予約 Sheet（create モード）自動オープンのディープリンクが起動される

#### Scenario: 履歴画面経由のキャンセル成功後の挙動
- **WHEN** 履歴画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、画面遷移は行われず、対象行のバッジが「キャンセル済」に切り替わる

#### Scenario: 詳細画面経由のキャンセル成功後の遷移
- **WHEN** 詳細画面からのキャンセル確定が成功
- **THEN** 完了トーストが表示され、`/history` に `router.replace` で遷移する

#### Scenario: 当日 0:00 JST 以降はキャンセル不可
- **WHEN** 現在時刻が `events.start_at` の JST 開催日 0:00 JST 以降の状態でキャンセル動線を確認する
- **THEN** どの経路でも CancelBookingDialog が「キャンセル期限を過ぎています」案内 (LINE オープンチャットリンク付き) を表示し、確定 CTA は描画されない

#### Scenario: cancel_deadline は判定に使われない
- **WHEN** events.cancel_deadline に過去日時が設定されているが現在時刻が `events.start_at` の JST 前日中の予約に対してキャンセル操作
- **THEN** どの経路でもキャンセル可能として扱われる (cancel_deadline 列は判定に影響しない)

#### Scenario: 他人の予約のキャンセル試行
- **WHEN** ある会員が他人の reservation_id を改ざんしてキャンセル UPDATE を試行
- **THEN** RLS により 0 行更新となり、エラーが UI に表示される

### Requirement: 入力内容のローカル保持

会員サイトは予約 Bottom Sheet の入力内容を、**create モードに限り**、同一イベント ID 単位で SHALL ローカル保持する。リロード・「修正する」でイベント詳細に戻った後の再到達・別タブからの再到達で入力内容が復元される MUST。

保持先は会員のブラウザ内 (localStorage 等) とし、サーバー側には永続化しない MUST NOT。保持期限は当該イベントの開催終了時刻 (`events.end_at`) を超過したら自動破棄する MUST。

予約確定が成功したとき、もしくはユーザーがフォームから明示的に離脱（イベント一覧へ戻る等）したときも、保持データは破棄する MUST。

**edit モードでは localStorage への書き込み / 読み込みのいずれも行わない** MUST NOT。編集対象の正本は DB 側にあり、ローカルに古い入力を残すと「サーバーの最新状態と乖離した値が表示される」混乱を招くため。edit モードでは sheet を開く都度サーバーから現在値を取得して初期化する MUST。

#### Scenario: create モードでのリロードでの復元
- **WHEN** create モードで入力途中で同一 URL をリロード
- **THEN** 入力内容が復元される

#### Scenario: create モードでの修正後の再到達でも保持される
- **WHEN** create モードで sheet を閉じ、再度「予約に進む」で sheet を開き直す
- **THEN** 直前の入力内容が復元される

#### Scenario: create モードでの確定後の自動破棄
- **WHEN** create モードで予約確定が成功し完了画面に到達
- **THEN** ローカル保持データはクリアされる

#### Scenario: イベント別の独立保持 (create モード)
- **WHEN** create モードで異なる 2 つのイベント A / B を別々に途中入力
- **THEN** それぞれが独立に復元され、互いに影響しない

#### Scenario: 開催終了時刻の超過で破棄 (create モード)
- **WHEN** create モードで入力途中のままイベント開催終了時刻を超過した状態で同一フォームに戻る
- **THEN** 保持データは破棄され、フォームは初期状態となる

#### Scenario: edit モードは localStorage を使わない
- **WHEN** edit モードで sheet を開いて値を変更し、戻るで閉じた後、同じ予約詳細画面で再度 sheet を開く
- **THEN** sheet の初期値は変更前のサーバー値であり、戻る前に編集中だった値が復元 SHALL NOT

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

### Requirement: 予約 Sheet のディープリンク起動 (再予約導線)

会員サイトはイベント詳細画面 (`event-detail`) に対し、**クエリパラメータによる予約 Sheet（create モード）の自動オープン** を SHALL 提供する。これは再予約導線（履歴の「再予約する」/ 完了画面の「やっぱり予約する」）の共通着地点とする MUST。

イベント詳細画面はマウント時に所定の自動オープンクエリを検知し、**対象イベントが受付可能なときに限り** create モードの予約 Sheet を自動オープンする MUST。受付可能の判定は新規予約と同一基準（`events.start_at > now()`（未開催）かつ 満席でない（`formatAvailability(availability).isFull === false`））とする MUST。受付不可（受付終了 / 満席）のときは Sheet を開かず、通常のイベント詳細（締切表示を含む）を描画する MUST。

自動オープン後はブラウザ戻る操作等による再発火を防ぐため、当該クエリパラメータを履歴から除去する MUST（`router.replace` 相当でクエリを除く）。

自動オープンで開いた Sheet の挙動（入力欄 / 合計金額 / localStorage 復元 / 確定経路 / 重複・再活性化処理）は通常の create モードと同一とする MUST。すなわち過去キャンセル済予約があれば確定時に既存行が再活性化される（「予約確認 Bottom Sheet」要件の create モード挙動に従う）。

#### Scenario: 受付可能イベントでの自動オープン
- **WHEN** 受付可能（未開催かつ非満席）なイベントの詳細画面に自動オープンクエリ付きで遷移する
- **THEN** create モードの予約 Sheet が自動的に立ち上がる

#### Scenario: 受付不可イベントでは自動オープンしない
- **WHEN** 受付終了（開催済）または満席のイベントの詳細画面に自動オープンクエリ付きで遷移する
- **THEN** 予約 Sheet は開かず、通常のイベント詳細（締切表示）が描画される

#### Scenario: 自動オープンクエリの除去
- **WHEN** 自動オープンクエリで予約 Sheet が開いた直後に URL を確認する
- **THEN** 自動オープンクエリは URL から除去されており、ブラウザ戻る操作で Sheet が再オープンされない

#### Scenario: 自動オープン経由でのキャンセル後再予約
- **WHEN** 過去キャンセル済予約 (`status='cancelled'`) を持つ会員が自動オープンで開いた create Sheet で予約を確定する
- **THEN** 既存行が `'reserved'` に再活性化され、完了画面へ遷移する（通常 create モードと同一の再活性化挙動）

