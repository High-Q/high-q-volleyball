## Context

Issue #248 で実装した予約完了 / キャンセル完了通知メールは、Edge Function 1 本 (`send-reservation-notification`) に集約され、アプリ層 (`apps/reservation`) の予約確定 / キャンセル confiposable が成功後に fire-and-forget で呼び出す形に整っている。Edge Function 側は `eventType` (`'confirmed' | 'cancelled'`) で分岐し、`_shared/reservation-mail-inputs.ts` で行ベースの入力を構造化、`_shared/mailer-templates.ts` の純粋関数レンダラで本文を生成して Gmail SMTP 経由で送信する。

本 change はこの 2 経路に並列で「予約内容変更 (edit)」経路を 1 つ足す。アプリ層には既に `useUpdateBooking` composable があり、編集成立後に何もしていないため、ここから既存の通知 helper を呼ぶだけで成立する。Edge Function 側は eventType の許容値・バリデーション・分岐・新規レンダラの 4 点を拡張する。

Phase 2 で独自ドメイン取得 + Resend 移行が予定されており、本 change のレンダラ層は完了 / キャンセル通知と同一の入力構造を共有して切替時の影響を最小化する。

## Goals / Non-Goals

**Goals:**
- 編集 (edit) 成立イベントで会員へ変更後の最新内容を含むメールを自動配信する
- メール送信失敗が編集成立そのものを妨げない fire-and-forget 構造を完了 / キャンセル通知と完全に同じ流儀で維持する
- 既存 Edge Function / 既存レンダラ層を最大限再利用し、新規 function / 新規 secret / 新規 SMTP 経路を増やさない
- 文面レンダラは引き続き純粋関数として `_shared/` に置き、Vitest で本文を検証可能とする
- 完了通知メールと取り違えない件名 / 本文冒頭の文言を採用する

**Non-Goals:**
- 変更差分の前後表示 (before / after diff) / 変更履歴の DB 保管
- HTML メール / マルチパート / .ics 同梱
- 開催前リマインダー / 一斉通知 / 通知設定 UI
- 送信失敗時の自動リトライ / 送信ログテーブル化
- 編集経路以外（管理者代行修正等）からの通知配信
- 「変更があった項目だけハイライト」「複数回連続 edit のスロットリング」

## Decisions

### Decision 1: 送信トリガーは `useUpdateBooking` の編集成立直後に既存 helper を fire-and-forget で呼ぶ

**選定理由:**
- `useCreateBooking` / `useCancelBooking` が `triggerReservationNotification(id, eventType)` を呼んでいる完全同型のパスがあり、`useUpdateBooking` でも `update()` 内 `try` 節の成功直後に同じ呼び方をするだけで成立する
- helper 側で例外を握りつぶしているが、編集成立を妨げないよう呼び出し側でも二重防衛 (`try` で `void` 呼び出し) を入れる流儀を踏襲する
- `submitting` フラグ・成功失敗マッピングなど既存 composable の構造を変えない

**却下した案:**
- DB トリガー / Database Webhook で UPDATE をフックする案: 完了 / キャンセル通知で却下したのと同じ理由（責務境界が DB に染み出す / 通知設定拡張余地が狭まる）。本 change だけ別パターンにすると一貫性が失われる
- アプリ層 helper に「直前値との diff を取って変更があるときだけ呼ぶ」ロジックを足す案: Decision 4 (未変更 update でも送る) で却下する

### Decision 2: Edge Function は既存 `send-reservation-notification` を拡張し、eventType に `'updated'` を追加する

**選定理由:**
- 関数本体・認証・CORS・member_id 改ざんガード・SMTP 接続経路はすべて完了 / キャンセル通知と共通。eventType による分岐は数行で済む
- バリデーション (`validateReservationNotificationPayload`) も配列に値を 1 つ足すだけ
- function 数を増やさないことで deploy / secret / ログ集約コストを保つ

**却下した案:**
- 更新通知用に function を新設する案: deploy / secret / CORS の重複コストが上回る（完了 / キャンセルを 1 本に集約した Decision と同じ理由）

### Decision 3: 文面レンダラは新規の純粋関数 1 つを `_shared/mailer-templates.ts` に追加する

**選定理由:**
- 入力構造は予約完了通知メールとほぼ同一（同伴者数 / 連絡事項 / 合計金額 / 会場 / 集合地点 / URL 群）。「変更後の値」を埋めるだけで完了メールとほぼ同じレイアウトが成立する
- 既存 `ReservationConfirmedInput` をそのまま再利用するか、別 type にして文言差分を持つかは後述
- レンダラを純粋関数として独立させることで、Vitest で文面検証（件名 / 本文冒頭 / 同伴者数 / 連絡事項空欄時の非表示 / `#HQ-XXXX-XXXX` フォーマット）がモックなしで書ける

**選定（type の扱い）:** 入力 type は予約完了通知 (`ReservationConfirmedInput`) と完全同一とし、レンダラだけ差し替える。これにより `reservation-mail-inputs.ts` 側で「buildConfirmedInput」を流用でき、Edge Function 本体の分岐コストも最小化する。文言差分はレンダラ内に閉じ込める。

**却下した案:**
- 入力 type を分けて専用の `buildUpdatedInput` を追加する案: 現状の入力データは完了通知と完全に重複しているため、type を分けると `_shared` 配下に冗長な型が増える。差分が増えた段階で再分割する余地は残す

### Decision 4: 差分判定は UI 層 (BookingSheet) の既存 `isDirty` に委ね、通知側には差分検出ロジックを持ち込まない

**前提（既存実装）:** `apps/reservation/src/features/booking/ui/BookingSheet.vue` には edit モード時に `editDraft.guestCount !== props.edit.initialGuestCount || editDraft.note !== props.edit.initialNote` を判定する `isDirty` computed が既にあり、`submitDisabled = editLocked || !isDirty` で確定ボタンを disabled にしている。つまり差分なしでは `useUpdateBooking.update()` 自体が呼ばれない。

**選定理由:**
- UI 層で構造的に「差分なし update」が発生しないため、通知側 (helper / Edge Function / レンダラ) は到達したリクエストをすべて「差分あり編集成立」として処理して問題ない
- 差分判定をクライアント helper や Edge Function に二重実装すると、`isDirty` の SSOT が崩れて将来の編集対象カラム追加時に整合管理コストが増える
- Edge Function 側で「直前値を再 SELECT して比較」する経路は SELECT を増やすうえ、トランザクション境界外での差分判定になり信頼性が下がる
- 「会員操作 1 アクション = メール 1 通」の既存流儀（完了 / キャンセル / 再活性化）にそのまま揃う

**却下した案:**
- helper 側 / Edge Function 側でも独自に差分判定する案: 上記の SSOT 崩壊と二重実装のため不採用
- proposal 段階で挙げていた「差分なし update でも送る」案: そもそも UI が submit を阻止しているので「送る／送らない」の判断自体が不要だった

### Decision 5: 件名 / 本文冒頭は完了メールと取り違えない文言に差し替える

**選定理由:**
- 完了メール件名は `【High Q】ご予約完了のお知らせ (#HQ-XXXX-XXXX)` 形式。同一プレフィックスを共有しつつ「更新」を含む語に差し替えることで、メールクライアント上で混同しにくくなる
- 本文冒頭の「ご予約ありがとうございます。下記の内容でお席を確保しました。」も「予約内容を更新しました。下記の内容でお席を確保しています。」相当に差し替える。残りの会場 / 同伴者数 / 連絡事項 / LINE / マイページ動線は完了メールと同等のレイアウトを保つ
- 完了メールの「メールが届かない場合は迷惑メールフォルダもご確認ください」相当の supportNote も同じく末尾に維持する

**却下した案:**
- 件名を完全別文言にする案: 「【High Q】予約変更しました」等にすると、メールクライアント上で完了メールと並んだときに視認性が落ちる（プレフィックスとフォーマットが揃っている方が一覧性が高い）

### Decision 6: 編集成立画面の UI は変更しない

**選定理由:**
- 完了画面と違って編集成立直後の UI（編集 BottomSheet 閉鎖 → 詳細画面の更新表示）はすでに会員のフォーカスが「予約詳細画面」に戻る動線であり、メール送信案内の追加なしでも「マイページで最新状態を確認できる」という情報経路は閉じている
- 「迷惑メールフォルダ確認の案内」はメール本文側の supportNote に閉じ込め、UI に冗長表示を持ち込まない

**却下した案:**
- 「変更通知メールをお送りしました」相当の薄いトースト / 案内を画面に出す案: ノイズの方が上回る。完了メールパスでも UI 上の案内は最小限に留めている

## Risks / Trade-offs

- **[リスク] 会員が短時間に複数回 edit を確定すると、その都度 1 通ずつ届くため通知ノイズになる可能性** → Mitigation: MVP2 では受け入れる。スロットリング / デバウンスは UX 副作用が大きいため別 Issue 候補として後送りする
- **[リスク] 完了メールと変更メールがメールクライアント上で混同される可能性** → Mitigation: 件名・本文冒頭で「更新」を明示する Decision 5 で抑える。Vitest で本文冒頭文言に `予約完了` 表現が含まれないことをアサートする
- **[リスク] Gmail SMTP の送信レート制限が編集経路の追加でやや早く到達する可能性** → Mitigation: 編集頻度は完了 / キャンセルより少ない見込みのため当面影響は限定的。Phase 2 (Resend 移行) で恒久対応

## Migration Plan

- 本 change は新規 capability 追加ではなく既存 capability `reservation-notification-email` への Requirement 追加。データ移行 / RLS 変更 / 環境変数追加なし
- 既存予約 / 過去の編集行為への遡及送信は行わない（適用は change ship 以降の新規 UPDATE から）
- ロールバックは `useUpdateBooking` から helper 呼び出しを外し、Edge Function の eventType 受け入れを 2 値に戻すだけで成立する（既存の編集成立は影響を受けない）

## Open Questions

- なし
