## MODIFIED Requirements

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
