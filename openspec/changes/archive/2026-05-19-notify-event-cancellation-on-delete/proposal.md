## Why

#253 で admin がイベントを削除する際に有効予約者ごと CASCADE 削除できるようになったが、予約者への連絡は AlertDialog に「予約者には別途ご連絡ください」と注記するだけで、主催者が LINE オープンチャット等で都度個別連絡する運用に依存している。商用運用ではイベント削除のたびに連絡漏れリスク・運用負担が積み上がるため、削除と同時にキャンセル通知メールを自動で配信し、主催者の段取りに集中できるようにする。Issue #272、Epic #170。

## What Changes

- admin がイベント削除を確定したとき、当該イベントに紐づく **有効予約 (`status='reserved' | 'attended'`) の会員全員** に対し、キャンセル通知メールを自動配信する
- メール本文には対象イベント名 / 開催日時 / 会場 / マイページ URL / LINE オープンチャット URL に加え、主催者が任意で添えた一言メッセージ欄を含める（メッセージ欄は optional とし、空欄ならその欄を本文から省略する）
- 削除 AlertDialog の文言を「予約者には別途ご連絡ください」から「対象の予約者にはキャンセル通知メールを自動で送信します」に置き換え、必要なら主催者が一言メッセージを添えられる入力欄を追加する
- 通知メール送信は Supabase Edge Function 経由とし、削除トランザクションを妨げない fire-and-forget で発火する。Edge Function 側の送信失敗が `events` DELETE 自体や AlertDialog の Success 状態に波及してはならない
- 通知対象の email アドレスは CASCADE 削除前にアプリ層でスナップショット取得して Edge Function に渡す。削除済 reservations を後から SELECT し直すフェイルセーフ経路を作らない

## Capabilities

### New Capabilities

- `event-cancellation-notification-email`: admin によるイベント削除を起点に、当該イベントの有効予約者 N 名へ一斉にキャンセル通知メールを送信する経路を定義する。送信先決定（有効予約者の会員メールアドレス）、本文に含めるイベント情報・主催者メッセージ・LINE オープンチャット URL、admin 権限以外からの実行禁止、送信失敗が削除フローを妨げないこと、dev / preview 環境での送信抑制ルールを規定する

### Modified Capabilities

- `admin-events-crud`: 削除 AlertDialog の文言（注意書きの差し替え + 主催者メッセージ入力欄の追加）と、削除確定後にキャンセル通知メールの自動配信を発火する Requirement を追加する

## Impact

- **Supabase Edge Function**: 新規 `send-event-cancellation-notification` を追加（service_role で events / reservations / members を JOIN SELECT、admin JWT を検証、Gmail SMTP 経由で N 名へ送信）
- **Edge Function 共有レンダラ**: イベントキャンセル通知用の純粋関数レンダラを `_shared/mailer-templates.ts` に追加。会員別個人情報を含まず、イベント単位の文面 + 主催者メッセージのみで成立する形にする
- **`apps/admin`**: 削除 AlertDialog (`features/event-delete`) に主催者メッセージ textarea を追加し、`useEventDelete` の confirm フローを「メールアドレススナップショット → DELETE → Edge Function 呼び出し」の 3 ステップに拡張する
- **`event-cancellation-notification-email` spec**: 新規 spec.md を追加
- **`admin-events-crud` spec**: 削除挙動 Requirement に通知発火 + AlertDialog 文言更新を追加（既存 Requirement の本文に追記、Scenario 追加）
- **環境変数**: 既存 SMTP / 送信抑制モード変数を流用。追加 secret 不要
- **依存関係**: 新規 npm パッケージ追加なし
- **CI / RLS / DB スキーマ**: 変更なし（DELETE 経路 / FK CASCADE / RLS は #253 で確立済を踏襲）
- **影響なし**: LP / reservation / 既存 `send-reservation-notification` Edge Function（会員主体の経路は分離維持）
- **Phase 2 連携**: 独自ドメイン取得 + Resend 移行 (#266) の対象に本 Edge Function も加わるが、本 change のレンダラは `_shared` 配下の純粋関数として揃え、移行コストを最小化する
