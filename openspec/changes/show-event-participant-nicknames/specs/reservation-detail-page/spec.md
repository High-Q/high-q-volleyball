## ADDED Requirements

### Requirement: 参加者セクションの配置と取得契約

ReservationDetailPage は「予約状況」セクションの **下** かつ Cancel Policy ボックスの **上** に「参加者」セクションを SHALL 表示する。本セクションは予約中のイベントに有効な予約 (`reservations.status IN ('reserved', 'attended')`) を持つ会員の nickname 一覧を表示し、初参加者の不安軽減と常連の参加意欲維持を狙う。

データ取得は `apps/reservation/src/entities/event/api/` 配下の `fetchEventParticipantNicknames(eventId)` を SHALL 経由し、本関数は Supabase RPC `public.get_event_participant_nicknames(p_event_id uuid)` を呼び出す MUST。直接 `reservations` テーブルや `members` テーブルを SELECT する実装は禁止 MUST NOT。

参加者セクション固有の Empty 状態 (取得 0 行) は **画面全体の 404 / Error 状態に吸収** する MUST。参加者セクション固有の Loading は画面全体 skeleton と整合する MUST。

#### Scenario: セクション配置順
- **WHEN** 予約詳細画面の DOM 順序を確認
- **THEN** `Meta テーブル → 予約状況セクション → 参加者セクション → Cancel Policy ボックス` の順で並ぶ

#### Scenario: RPC 経由の取得
- **WHEN** `fetchEventParticipantNicknames` 実装ファイルを確認
- **THEN** Supabase RPC `get_event_participant_nicknames` の呼び出しが含まれ、`reservations` / `members` の直接 SELECT は含まれない

#### Scenario: 0 行ヒット時の画面全体 404 吸収
- **WHEN** RPC が 0 行を返した (= 自分が当該イベントに有効な予約を持たない)
- **THEN** 画面全体の 404 状態が描画され、参加者セクション単独の Empty UI は描画されない

### Requirement: 参加者リストの描画ルール

参加者セクションは取得結果を `reservations.created_at ASC` の並び順を保ったまま 1 行 1 名で SHALL 表示する。各行は以下を MUST 表示する:

- nickname (`get_event_participant_nicknames.nickname`)。NULL または空文字のときは「ニックネーム未設定」とグレーアウト表記 (本物の nickname と異なる色) で SHALL 描画し、本物の nickname と同色・同ウェイトで紛れる表示 SHALL NOT。本名や member_id をフォールバック表示 SHALL NOT
- 自分自身の行 (`is_self = true`) には「あなた」相当のマーカーを SHALL 付与し、他参加者と区別可能にする MUST
- `guest_count >= 1` の行には「＋同伴N名」を SHALL 付与する (同伴者が誰の連れかを行単位で判別可能にする)

行内で MUST NOT 表示する項目:
- 本名 / メールアドレス / 電話番号 / 生年月日 / 経験レベル / アバター画像

並び順は UI 側で SHALL 並び替えしない (RPC 戻り値を素直に描画)。長い nickname (DB 上限 15 文字) は省略せず折り返して SHALL 全文描画する。

#### Scenario: nickname 未設定者のマスク表記
- **WHEN** RPC 戻り値に `nickname = NULL` の行が含まれる
- **THEN** その行は「ニックネーム未設定」と本物の nickname と異なる色 (グレーアウト) で描画され、本名や member_id は描画されない

#### Scenario: 自分の行のマーカー
- **WHEN** RPC 戻り値の `is_self = true` の行を確認
- **THEN** 当該行に「あなた」相当のマーカー (バッジ / 補足ラベル) が描画される

#### Scenario: 個人情報の非露出
- **WHEN** 参加者セクションの DOM 全体を確認
- **THEN** メールアドレス / 電話番号 / 生年月日 / 経験レベル / 本名 / アバター画像のいずれも描画されない

#### Scenario: 並び順は RPC 戻り値順
- **WHEN** RPC 戻り値が `[A, B, C]` の順で返ったとき
- **THEN** UI 上も A → B → C の順で描画される (UI 側並び替えなし)

### Requirement: 同伴者の行内表示

参加者セクションは同伴者を予約者本人の行に「＋同伴N名」として SHALL 表示する。`guest_count = 0` の行には同伴表記を描画 SHALL NOT。リスト末尾への集約サマリ (「同伴者 +N 名」) は、Meta テーブルの「同伴者」(自分の予約の同伴者数) と同一語が別意味で二重登場し混乱を招くため SHALL NOT 採用する。

同伴者個別の nickname は表示 SHALL NOT (data model 的に同伴者の nickname を持たないため)。

#### Scenario: 同伴者ありの行内表示
- **WHEN** RPC 戻り値に `guest_count = 2` の行が含まれる
- **THEN** 当該行に「＋同伴2名」が描画され、リスト末尾の集約サマリは描画されない

#### Scenario: 同伴者 0 名の行は同伴表記なし
- **WHEN** RPC 戻り値の行の `guest_count` が 0
- **THEN** 当該行に同伴表記は描画されない

#### Scenario: 同伴者の個別 nickname は出さない
- **WHEN** 参加者セクションの DOM を確認
- **THEN** 同伴者個別の nickname / 名前は描画されず、予約者行の「＋同伴N名」のみが描画される

### Requirement: 見出しの合計人数と人数整合性

参加者セクションの見出しは「参加者 N名」と SHALL 表示し、N は描画対象の参加者配列から算出 (行数 + `guest_count` 合算) する MUST。予約状況セクションの数値と独立に算出した値を見出しに表示 SHALL NOT (描画リストとの不一致を構造的に排除するため)。Loading / Error 状態では人数を表示 SHALL NOT。

#### Scenario: 見出しの合計人数
- **WHEN** RPC 戻り値が 6 行・`guest_count` 合算 2
- **THEN** 見出しに「参加者 8名」と描画される

### Requirement: 大人数時の折りたたみと 1 人参加時の補足

参加者リストは 10 行を超えるとき先頭 10 行のみ SHALL 表示し、「すべて表示（あとN名）」操作で全件展開できる MUST。折りたたみ中も見出しの合計人数は全件分を SHALL 表示する。

展開操作の要素は「ニックネーム未設定」のグレーアウト表記と区別できる本文色 + 操作可能と分かる視覚手がかり (シェブロンアイコン等) で SHALL 描画し、タップ領域は 44px 以上を MUST 確保する。

参加者が自分 1 人だけ (`is_self = true` の 1 行のみ) のときは「ほかの参加者はまだいません」相当の補足文を SHALL 表示する。

#### Scenario: 10 名超の折りたたみ
- **WHEN** RPC 戻り値が 12 行
- **THEN** 先頭 10 行と「すべて表示（あと2名）」が描画され、操作後に 12 行すべてが描画される

#### Scenario: 自分 1 人だけの表示
- **WHEN** RPC 戻り値が自分の 1 行のみ
- **THEN** 自分の行 (「あなた」マーカー付き) と「ほかの参加者はまだいません」相当の補足文が描画される

### Requirement: 参加者セクションのエラー状態

参加者セクションは RPC 呼び出しがネットワーク等のエラーを返したとき、セクション内に「参加者一覧を取得できませんでした」相当のメッセージを SHALL 描画する。セクション単位の retry ボタンは MUST NOT 配置する (画面全体の Error 状態が retry を提供する責務に集約)。

Meta テーブル / 予約状況セクション / Cancel Policy ボックス / CTA は通常通り描画継続する MUST (参加者セクション単独失敗で画面全体を Error に倒さない)。

#### Scenario: RPC エラー時のセクション内エラー表示
- **WHEN** `get_event_participant_nicknames` RPC がネットワーク例外を投げる
- **THEN** 参加者セクション内に「参加者一覧を取得できませんでした」相当のメッセージが描画され、retry ボタンは描画されない

#### Scenario: 参加者セクション失敗時の他セクション継続
- **WHEN** 参加者セクションのみが失敗
- **THEN** Meta テーブル / 予約状況 / Cancel Policy / CTA は通常通り描画されている

### Requirement: 参加者セクションの component test カバレッジ

参加者セクションの描画ルールは component test レベルで SHALL 自動検証される。E2E は本 capability で新規追加 SHALL NOT (既存 reservation-detail-page の auth guard E2E を継続流用)。

検証対象シナリオ (各 1〜2 件まで):
- 参加者複数名 + 自分含む の通常描画
- nickname 未設定者のマスク表記 (グレーアウト + 本物 nickname とのスタイル区別)
- 自分の行マーカーの存在
- 行内同伴表記の 0 / 1 以上 切替
- 見出し合計人数 (行数 + 同伴合算) の一致
- 長い nickname (15 文字) の折り返し全文描画
- 10 名超の折りたたみと展開
- 自分 1 人だけのときの補足文
- RPC エラー時のセクション内エラーメッセージ表示
- 本名 / メール / 電話番号 等の個人情報が DOM に出ないこと

#### Scenario: component test の整備
- **WHEN** `pnpm --filter @high-q/reservation test` を実行
- **THEN** 上記シナリオに対応する component test が pass する
