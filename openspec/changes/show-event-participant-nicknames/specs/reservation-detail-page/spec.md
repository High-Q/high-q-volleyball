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

- nickname (`get_event_participant_nicknames.nickname`)。NULL または空文字のときは「参加メンバー」と SHALL 表記し、本名や member_id をフォールバック表示 SHALL NOT
- 自分自身の行 (`is_self = true`) には「あなた」相当のマーカーを SHALL 付与し、他参加者と区別可能にする MUST

行内で MUST NOT 表示する項目:
- 本名 / メールアドレス / 電話番号 / 生年月日 / 経験レベル / アバター画像

並び順は UI 側で SHALL 並び替えしない (RPC 戻り値を素直に描画)。

各行末尾の同伴者数表示は本要件では扱わず、後続の「同伴者サマリ」要件で集約表示する MUST。

#### Scenario: nickname 未設定者のマスク表記
- **WHEN** RPC 戻り値に `nickname = NULL` の行が含まれる
- **THEN** その行は「参加メンバー」と描画され、本名や member_id は描画されない

#### Scenario: 自分の行のマーカー
- **WHEN** RPC 戻り値の `is_self = true` の行を確認
- **THEN** 当該行に「あなた」相当のマーカー (バッジ / 補足ラベル) が描画される

#### Scenario: 個人情報の非露出
- **WHEN** 参加者セクションの DOM 全体を確認
- **THEN** メールアドレス / 電話番号 / 生年月日 / 経験レベル / 本名 / アバター画像のいずれも描画されない

#### Scenario: 並び順は RPC 戻り値順
- **WHEN** RPC 戻り値が `[A, B, C]` の順で返ったとき
- **THEN** UI 上も A → B → C の順で描画される (UI 側並び替えなし)

### Requirement: 同伴者サマリの集約表示

参加者セクションは参加者リストの末尾に同伴者サマリを SHALL 表示する。サマリは RPC 戻り値の全行 `guest_count` 合算が 1 以上のとき「同伴者 +N 名」と SHALL 描画する。0 のときはサマリ行を描画 SHALL NOT。

同伴者個別の nickname は表示 SHALL NOT (data model 的に同伴者の nickname を持たないため)。

#### Scenario: 同伴者 1 名以上のサマリ表示
- **WHEN** RPC 戻り値の `guest_count` 合算が 3
- **THEN** リスト末尾に「同伴者 +3 名」が描画される

#### Scenario: 同伴者 0 名のサマリ非表示
- **WHEN** RPC 戻り値の `guest_count` 合算が 0
- **THEN** 同伴者サマリ行は描画されない

#### Scenario: 同伴者の個別 nickname は出さない
- **WHEN** 参加者セクションの DOM を確認
- **THEN** 同伴者個別の nickname / 名前は描画されず、合算 N 名のサマリのみが描画される

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
- nickname 未設定者のマスク表記
- 自分の行マーカーの存在
- 同伴者サマリの 0 / 1 以上 切替
- RPC エラー時のセクション内エラーメッセージ表示
- 本名 / メール / 電話番号 等の個人情報が DOM に出ないこと

#### Scenario: component test の整備
- **WHEN** `pnpm --filter @high-q/reservation test` を実行
- **THEN** 上記シナリオに対応する component test が pass する
