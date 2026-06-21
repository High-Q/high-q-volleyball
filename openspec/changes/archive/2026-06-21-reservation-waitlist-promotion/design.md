## Context

#344 で会員はキャンセル待ちに登録・撤回できるようになったが、枠が空いたときの繰り上げが無い。キャンセルは以下の経路で発生する:

- 会員サイト: 自分の予約を `reserved → cancelled` に UPDATE（`apps/reservation` の `useCancelBooking`）
- 管理画面: admin が予約を `cancelled` に UPDATE（キャンセル代行）

既存インフラの制約（確認済み）:

- 通知 Edge Function `send-reservation-notification` は **呼び出し元 JWT の `member_id === auth.uid()` を検証**し、本人の予約にのみメールを送る。繰り上げは「キャンセルした人」とは別の「待機していた人」にメールを送るため、本関数は流用できない。
- メール送信基盤は `_shared/mailer`（Gmail SMTP / nodemailer 系）+ `_shared/mailer-templates` のテキストテンプレート。
- 予約埋まり具合の集計は `event_availability_view`（`SECURITY DEFINER`、本人＋同伴 = `sum(1 + guest_count) filter (status in ('reserved','attended'))`）。
- capacity は DB レベルで強制されていない（INSERT/UPDATE 時に容量チェックは無く、UI と集計 view による soft 制約）。

## Goals / Non-Goals

**Goals:**

- キャンセルで枠が空いたら、最古の待機者を自動で `reserved` に昇格する。
- 昇格判定は同伴者数込み（`1 + guest_count`）で、まとまった空きが出たときのみ。半端な空きでは昇格しない。
- 昇格した会員に繰り上げ通知メールを送る（システム起点）。
- 会員・管理画面の両キャンセル経路から起動する。
- #344 と stack して 1 PR で同時出荷する。

**Non-Goals:**

- 管理画面の手動繰り上げ・キャンセル待ち上書き UI（後続）。
- capacity の DB レベル強制（既存の soft 制約を維持）。
- 待機者への「空きそう」事前予告や順番通知（昇格確定時のみ通知）。
- オーナーへの繰り上げ発生通知（会員への通知に限定）。

## Decisions

### D1: 繰り上げは app 層から起動する Edge Function で行う（DB トリガーではない）

繰り上げロジックを **Supabase Edge Function `promote-waitlist`**（service_role）に置き、キャンセル成功後に会員サイト・管理画面から **fire-and-forget で起動** する。これは既存の `triggerReservationNotification`（キャンセル後にメール送信関数を await せず叩く）と同一のパターン。

代替案: `reservations` の `reserved → cancelled` を捕捉する `SECURITY DEFINER` の DB トリガー + `pg_net` / Database Webhook で Edge Function を呼んでメール送信。却下理由 — メール送信を DB から起動するには `pg_net` + 関数 URL / シークレットの DB 保管（vault）または Dashboard Webhook 設定が必要で、インフラが重く、本プロジェクトの「クライアントがアクション後に Edge Function を叩く」既存パターンから外れる。現行のキャンセル経路はすべて app 駆動のため、app 層起動で全経路をカバーできる。

abuse 耐性: 関数は「現在の空き容量に収まる待機者のみ」を昇格するため、認証済みユーザーが本関数を不正に連打しても、正当に入れる人しか昇格せず実害が無い（過剰昇格は起きない）。呼び出しは authenticated に限定する。

### D2: 両キャンセル経路から起動する

会員サイト（`useCancelBooking.cancel` の成功後）と管理画面（admin のキャンセル代行成功後）の双方に、`promote-waitlist` を fire-and-forget で叩く起動を追加する。キャンセル待ちの撤回（DELETE）は枠を空けないため起動しない。失敗・例外は握りつぶし、キャンセル成立を妨げない。

### D3: 繰り上げ対象の選定 — 「空きを埋め切る」走査 + 同伴者数フィッティング

Edge Function は対象イベントについて以下を行う:

1. 現在の予約埋まり具合（本人＋同伴の人数ベース）と `capacity` から空き容量 `available = capacity - booked` を算出する。
2. `status='waitlist'` の行を `created_at ASC` で取得する。
3. 最古から **全件を走査** し、各待機者について `1 + guest_count <= available` なら `reserved` に昇格し、`available` を `1 + guest_count` 減らす。`1 + guest_count > available`（同伴者数が多くて収まらない）の待機者は **スキップ** して次の待機者を評価する。`available` が 0 になる、または列を走査し切るまで続ける。

これにより「先頭の人が大人数で入らないために、後ろの少人数まで繰り上がらず空き枠が埋まらない」事態を避け、枠を埋め切る。公平性（厳格 FIFO）よりも枠の活用を優先する方針（オーナーの希望）。

`capacity IS NULL`（無制限）のイベントでは満員概念が無いため繰り上げ対象としない（そもそも待機が発生しない）。

### D4: 繰り上げ通知メールはシステム起点の新経路

既存 `send-reservation-notification` は本人検証のため流用不可。昇格した予約に対して、`promote-waitlist` Edge Function 内から **service_role で会員のメールアドレスを引き**、繰り上げ用テンプレート（`reservation-mail-inputs` / `mailer-templates` に `promoted` を追加）でメールを送る。送信は `_shared/mailer` を流用する。メール送信失敗は昇格を取り消さない（昇格は成立、ログに残す）。

### D5: 冪等性・並行性・失敗時の安全性

- 冪等性: 関数は「現在の空き」に基づくため、重複起動しても既に埋まっていれば何もしない。
- 並行性: 同一イベントへの同時キャンセルで関数が並走すると、理論上は capacity を超える昇格があり得る。MVP では既存の soft-capacity モデルに合わせて許容する（稀。将来 advisory lock 等で厳格化可）。本トレードオフを spec に明記する。
- 部分失敗: 複数名を昇格する途中で 1 件のメール送信が失敗しても、昇格自体は継続・成立させ、失敗はログに残す。

### D6: capacity の DB 強制は導入しない

昇格は容量チェックを関数内のアプリロジックで行い、DB の CHECK / トリガーによる hard 制約は追加しない（既存の予約 INSERT も同様に soft 制約のため、整合性方針を変えない）。

## Risks / Trade-offs

- [並行キャンセルで capacity を超える昇格] → soft-capacity モデルで許容（既存方針と一致）。発生頻度は低い。必要時に advisory lock で厳格化する後続課題として spec に記載。
- [app 駆動でないキャンセル経路（直接 DB 等）では繰り上げが起動しない] → 現行の全キャンセル経路は app 駆動でありカバー済み。将来 server 駆動のキャンセルを追加する場合は、その経路にも起動を足す（または D1 の DB トリガー方式へ移行）。
- [繰り上げメールの文面が誤解を生む] → 「キャンセル待ちから繰り上がり、予約が確定した」ことと、当日連絡 LINE 導線を明記。既存の確定メールに準拠した構成にする。
- [昇格した会員が実は不参加だった場合] → 本 change では昇格後の辞退は通常のキャンセル動線（#344 / 既存）に委ね、辞退すればさらに次の待機者が繰り上がる（キャンセル → 再度 promote 起動）。

## Migration Plan

1. `promote-waitlist` Edge Function を追加（service_role、authenticated 限定、FIFO + フィッティング + メール送信）。`_shared` のメール基盤・集計取得を流用。
2. 繰り上げ通知メールのテンプレートを追加。
3. 会員サイト・管理画面のキャンセル成功後に fire-and-forget 起動を追加。
4. dev で Edge Function deploy + 動作確認（満員イベントでキャンセル → 待機者が昇格 + メール）。
5. #344 と同一ブランチ（stack）で 1 PR。merge で prd へ Edge Function / migration を sync（Render 自動範囲外は手動 deploy）。

ロールバック: Edge Function は新規追加のため、問題時は起動呼び出しを外す（fire-and-forget なのでキャンセル動線には影響しない）+ 関数を無効化。

## Open Questions

- 繰り上げ通知メールの件名・文面の最終確定（apply フェーズで既存テンプレに合わせて確定）。
- 将来、オーナーにも繰り上げ発生を通知するか（本 change では非対象）。
