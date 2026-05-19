## Context

#253 (`fix-admin-event-delete-cancelled-reservations`) で admin 側のイベント削除フローが「FK CASCADE による一括削除 + AlertDialog 二段階確認 + 予約内訳表示」に整理された。当時の Open Question 1（キャンセル通知メールの自動送信）は MVP1 では「主催者が外部で別途連絡する」前提でリリースし、本 Issue #272 で後追い実装する。

既存資産の整理:

- 削除フロー: `apps/admin/src/features/event-delete/composables/useEventDelete.ts` の `confirm()` が `deleteEvent(eventId)` → Toast → `/events` redirect の 3 ステップで完結している
- メール送信基盤: `supabase/functions/send-reservation-notification/index.ts` が auth.uid() 検証 → reservations SELECT → renderer 経由で `_shared/mailer.ts` の `sendMail` を呼ぶパターンを確立しており、 `_shared/mailer-policy.ts` が送信抑制 / 許可リストモードを提供している
- 会員主体の通知メール (`reservation-notification-email`) は「1 会員 → 自分 1 通」の経路で完結しており、JWT の auth.uid() と reservations.member_id の一致を改ざんガードに使っている

本 change はこの「会員主体・1 通」のパターンとは構造が異なり、「admin 主体・N 通」を新規経路として作る。共有レンダラ層 / SMTP 経路 / 送信抑制ポリシーは流用するが、認証ガード（admin role 検証）と受信者リスト処理（重複排除 / スナップショット）は新規実装する。

関連 spec: 新規 `event-cancellation-notification-email` / 既存 `admin-events-crud`（削除挙動）。

## Goals / Non-Goals

**Goals:**

- admin がイベント削除を確定したとき、当該イベントの有効予約者全員に対しキャンセル通知メールを自動配信する
- 通知メール送信失敗が events DELETE / AlertDialog Success 状態 / `/events` redirect を妨げない fire-and-forget 構造を維持する
- 主催者が任意で添えられる一言メッセージ欄を AlertDialog に追加し、メール本文の理由欄に反映する
- 既存 SMTP / 送信抑制ポリシー / レンダラ純粋関数化方針を流用する
- 削除済 reservations を CASCADE 後に再 SELECT する経路を作らない（取得不能のため）

**Non-Goals:**

- 削除以外の状態変化（イベント変更・時刻変更）への通知拡大 — #251 で対応済み
- 通知メール送信失敗時のリトライキュー / DLQ / 送信ログ DB テーブル化 — MVP では Sentry + Edge Function ログで十分とする
- キャンセル後の代替日提案・再予約導線の本文埋め込み — マイページ URL 経由で会員自身に探させる
- HTML メール / マルチパート / .ics 添付
- admin が一部の予約者だけを通知対象から除外する選択 UI — 全有効予約者一斉が前提
- 役所提出書類 (#172) との連携 / 削除ログの監査トレース化 — 別 Issue

## Decisions

### Decision 1: Edge Function は新規 `send-event-cancellation-notification` を追加する（`send-reservation-notification` への分岐追加は採用しない）

**選定理由:**

- 既存 `send-reservation-notification` は「JWT の auth.uid() と reservations.member_id の一致」を改ざんガードに据えており、本質的に「会員 1 名 → 自分 1 通」の経路。これに admin 経由の N 通分岐を載せると認証ガードが二重化し、共有しても得が少ない
- 受信者ループ / 重複排除 / 部分成功ログなど構造が異なるため、関数本体を分けたほうがコードと型が読みやすい
- secret / SMTP 経路は `_shared/mailer.ts` で集約済みのため、関数を分けても運用負担は増えない（追加 secret 0 件）
- 将来 Phase 2 で Resend へ移行する際にも、admin 経路と会員経路の分離はそのまま保てる

**却下した案:**

- A. `send-reservation-notification` に `eventType: 'event-cancelled-by-admin'` を追加して分岐: 認証ガードを「member_id 一致」と「admin role」の 2 系統に分けることになり、 既存パスのテスト面積が増える / SELECT 経路と受信者ロジックが別物のため共通化メリットが薄い
- B. アプリ層から直接 SMTP を叩く: クライアントに SMTP 認証情報が必要になり禁止項目（service_role 系の露出と同等のリスク）

### Decision 2: 受信者メールアドレスは CASCADE 削除前にアプリ層でスナップショット取得する（案 A 採用）

Issue 本文の Design 候補:

- 案 A: event 削除前に reservations の email をスナップショット取得 → 削除後に Edge Function 送信
- 案 B: 削除トランザクション内で email リストを返却 → アプリ層が Edge Function 呼び出し

**選定: 案 A**

**選定理由:**

- 既存 `useEventDelete` は Supabase Client 経由で `DELETE FROM events WHERE id = ?` を 1 発投げる構造であり、トランザクション境界をアプリで握っていない。案 B には Postgres RPC (`SECURITY DEFINER`) が必須になり実装・テスト・GRANT 管理コストが増える（#253 design でも RPC 案は同様の理由で却下した）
- 削除直前の `reservations` SELECT は RLS 上 admin にしか開けない経路で、CASCADE 削除前なら通常の Supabase Client 経由で取得できる
- スナップショット取得失敗時は Edge Function 呼び出しをスキップし、DELETE は通常どおり進める fire-and-forget 流儀に揃う
- スナップショット取得時刻と DELETE 時刻の間にレースが入る可能性は理論上あるが、admin 専用画面の単一操作であり、現実的にはほぼ存在しない（会員側に reservation 行を追加する経路は同時に admin の AlertDialog が開いているシナリオに限定される）

**却下した案:**

- B. RPC `SECURITY DEFINER` で削除トランザクション内 email リスト返却: アプリ層が握れていないトランザクション境界を Postgres 側に押し付けることになり、RPC / GRANT / 戻り値型 / テスト面積がすべて増える。レースの除去価値が運用負担に見合わない
- C. Edge Function 側で削除前後の reservations を 2 段 SELECT: CASCADE 削除後の SELECT は 0 件しか返らず実装不可。事前 SELECT を Edge Function に押し込んでも、削除と Edge Function 呼び出しのトランザクション境界は依然開いたままで案 A と等価

### Decision 3: 送信先メールアドレスは削除直前に `members` 経由で取得する（reservations 行スナップショットには email を保持しない）

**選定理由:**

- `members.email` は会員の SSOT であり、reservations 行に email をコピーで持たせると同期コストが発生する
- 削除直前であれば `reservations join members` で active reservations の会員 email を取得できる（RLS は admin role に開いている）
- 送信先決定後すぐに DELETE と Edge Function 呼び出しに進むため、スナップショット保持時間は数百 ms 単位

**却下した案:**

- A. reservations 行に email カラムを追加してスナップショット永続化: 全予約フローに email 同期責務が広がり、過剰

### Decision 4: AlertDialog に主催者メッセージ textarea を追加する（optional / 500 文字上限）

**選定理由:**

- Issue 本文の完了条件「主催者からのメッセージ欄」を満たしつつ、運用負担を増やさないため optional とする。空欄でも削除は完了でき、メール本文側で理由欄が省略される
- 500 文字上限は会員に対して長文メッセージを書き連ねる用途を想定せず（謝罪・補足 1 〜 2 文を想定）、件名長・本文長を予測可能な範囲に収める
- 同一 textarea は AlertDialog 内に閉じ、削除 cancel すれば値は破棄される（永続化しない）

**却下した案:**

- A. メッセージ欄を別画面 (Confirm modal の前段) に分離: 段数が増えて UX が悪化する
- B. デフォルト定型文（「諸事情によりイベントを中止します」等）を埋め込む: 主催者の意図と関係なく定型文が会員に届くと違和感が出る。空欄なら理由欄を本文から省略するほうが穏当

### Decision 5: 送信ペイロード型は `{ eventId, snapshotRecipients, organizerMessage }` 形式とする

**選定理由:**

- `eventId` は削除済でもログ相関のために送る（events 行は削除済なので Edge Function 側で SELECT し直さない）
- `snapshotRecipients` は `{ memberId, email }[]` 配列で受け取り、Edge Function 側で重複排除（同一 memberId が複数の active reservation を持つことは構造上ありえないが、防御的に Set で重複排除）
- `organizerMessage` は string | undefined。Edge Function 側で空文字 / undefined のときは本文の理由欄を非描画

**却下した案:**

- A. Edge Function 側で reservations を再 SELECT して受信者を決定: CASCADE 削除後で 0 件しか返らないため不可
- B. クライアントから個別 SMTP 用 payload を完成形で渡す: SMTP 接続情報をクライアントに露出させる経路は禁止

### Decision 6: Edge Function は admin role JWT を必須とする

**選定理由:**

- 認証ガードは「呼び出し元の `members.role = 'admin'` を確認」で固定。`auth.getUser(token)` で `auth.uid()` を確定し、`members` テーブルを SELECT して role を確認する
- 一般会員が任意の `eventId` / `snapshotRecipients` を渡して送信させる経路を塞ぐ
- Service Role キーをクライアントに渡さない方針は既存 Edge Function と一致

**却下した案:**

- A. JWT なしで service_role を Edge Function 内部のみで使用し、リクエスト元は CORS + IP 制限で守る: admin UI 専用なのに Edge Function 自体は公開 URL なので、認証ガードは JWT 経由で行うほうが防御として明確

### Decision 7: 本文に予約番号 `#HQ-XXXX-XXXX` を含めない

**選定理由:**

- CASCADE 削除後は reservations 行が消えるため、メール本文に予約番号 (`#HQ-XXXX-XXXX`) を載せても会員が「マイページで該当予約を確認」できない
- 会員はマイページ URL から「予約履歴」を見れば自身のキャンセル済イベントを確認できる（履歴側で確認できる UI が #270 系列の予約履歴ページに揃っている）
- 予約番号を載せると「番号でマイページを検索したが見つからない」という混乱を招く

**却下した案:**

- A. 本文に予約番号を含めて表示する: CASCADE 削除済の番号を送ると会員側で再現性が取れないため不採用

### Decision 9: 文面レンダラを `packages/shared` に移管し、Dialog で送信前プレビューを描画する

**動機:** 主催者が「削除する」を押す前に、会員に届く本文を Dialog 内で確認できるとメッセージ文言の硬さ・長さを調整できる。Edge Function と admin の両方で同一の `renderEventCancellationMail` を使うため、SSOT を `packages/shared/src/mail-templates/event-cancellation.ts` に置く。

**実装:**
- `packages/shared/src/mail-templates/event-cancellation.ts` を canonical source とする
- Edge Function `_shared/mailer-templates.ts` は `renderEventCancellationMail` / `EventCancellationMailInput` を相対パス (`../../../packages/shared/src/mail-templates/event-cancellation.ts`) で re-export する。`supabase functions deploy` は import 追跡で `packages/shared` のファイルも bundle するため、追加 build step なしで deploy 可能 (実機 deploy で検証済)
- apps/admin は `@high-q/shared/mail-templates` から import (sub-export を `packages/shared/package.json` の `exports` に追加)
- `EventDeleteDialog` は `useEventDelete.open()` 時にスナップショット取得した `meta` を使い、主催者メッセージ入力に追従する `computed` で `renderEventCancellationMail` を呼び続け、件名と本文を `<pre>` 表示する

**他テンプレ移管との関係:** 本 change では `renderEventCancellationMail` のみ移管。`renderReservationConfirmedMail` / `renderReservationCancelledMail` / `renderReservationUpdatedMail` / `renderSignupCodeMail` は Edge Function ローカルのまま。アプリ側でプレビューが必要になっていない / 文面 drift リスクが低い (admin 操作で送信される本文を主催者が確認したいシーンが本ケース固有) ため、本 change のスコープを最小化する。全テンプレ統一は **Phase 2 Resend 移行 (#266)** のスコープに含めて整理する想定。

**却下した案:**
- A. 全テンプレを一度に移管: PR が肥大化、本 change の本旨 (#272) からはみ出る
- B. アプリ側でレンダラの簡略版を再実装: SSOT 崩壊・文面 drift
- C. プレビュー用 Edge Function を新設: 関数増 + ネットワーク往復が UX に出る

### Decision 8: 受信者リスト 0 件のときは Edge Function を呼ばない

**選定理由:**

- 有効予約 0 件 / スナップショット取得失敗のときに Edge Function を呼ぶ意味がない（送信件数 0 件のログだけが残り、ノイズになる）
- アプリ層で `snapshotRecipients.length === 0` のときは fire-and-forget をスキップする

**却下した案:**

- A. Edge Function 側で 0 件チェックをして即 return: ネットワーク往復のコストがかかる。アプリ側で前段スキップしたほうが軽い

## Risks / Trade-offs

- **[リスク] スナップショット取得後・DELETE 前にレース条件で reservations が追加される可能性** → Mitigation: admin 専用画面の単一操作であり、AlertDialog が開いている数秒の間に同イベントの予約が増えるシナリオは限定的。許容範囲とする
- **[リスク] Edge Function が部分失敗（N 名中 K 名のみ送信成功）したとき、admin に失敗が伝わらない** → Mitigation: Edge Function ログに失敗件数を出力 + Sentry 連携 (#267) で監視。MVP では admin UI への失敗通知は出さない（運用が複雑化する）
- **[リスク] 主催者メッセージに長文 / 機密情報が含まれる懸念** → Mitigation: 500 文字上限 + 「会員全員に届く」旨を AlertDialog 内に明示。Open Question として将来 admin 操作ログ化を別 Issue 検討
- **[リスク] 通知メールが会員にとってノイズになる（削除頻度が高い場合）** → Mitigation: 配信抑制 UI は MVP2 後半 / MVP3 で別 Issue 検討。現状は「削除自体が稀」「主催者は会員にむしろ届くべきと判断して削除する」運用前提
- **[トレードオフ] 案 A を採るためアプリ層・Edge Function 双方でメールアドレス情報をハンドルすることになる** → Mitigation: スナップショットは payload に閉じ込め、ログには会員 ID を主、メールアドレスはマスク or 出力しないポリシーで運用
- **[トレードオフ] Phase 2 で Resend 移行 (#266) の際に本 Edge Function も切替対象が増える** → Mitigation: 既存通知 Edge Function と同じ `_shared/mailer.ts` / `_shared/mailer-templates.ts` を共有しているため、移行スコープには既存通知と同じ形で含まれる。設計レベルで追加コストはない

## Migration Plan

- 本 change は新規 capability 追加 + 既存 capability の Requirement 強化。データ移行 / RLS 変更 / 環境変数追加なし
- 既存イベント / 過去の削除行為への遡及送信は行わない（適用は change ship 以降の新規 DELETE から）
- ロールバック: `useEventDelete.confirm()` から fire-and-forget 呼び出しを外し、Edge Function を deploy せずに残置すれば既存 DELETE フローは影響を受けない。`send-event-cancellation-notification` Edge Function は呼び出し側がなくなれば idle のまま残せる
- dev 環境での検証は送信抑制モード or 許可リスト宛のみ送信モードで実施。本番への展開はマージ後に `supabase functions deploy send-event-cancellation-notification` を prd プロジェクトで実行する（#266 の Resend 移行時に再 deploy）

## Open Questions

- なし（メッセージ欄の上限 / 受信者 0 件時の挙動 / 認証ガード方式は本 design で決定済）
