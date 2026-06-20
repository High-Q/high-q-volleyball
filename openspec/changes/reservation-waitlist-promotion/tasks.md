## 1. 繰り上げ選定ロジック（純関数・TDD）

- [x] 1.1 `supabase/functions/_shared/waitlist-promotion.ts` に純関数 `selectPromotions({ capacity, booked, waitlist })` を追加。`waitlist` は `{ reservationId, memberId, guestCount, createdAt }[]`（created_at ASC 前提）。`available = capacity - booked` から、最古から **全件を走査** し `1 + guestCount <= available` の待機者を順に選定（`available` を減算）、収まらない待機者は **スキップ** して次へ。`capacity` NULL は空配列を返す。返り値は昇格対象の配列。
- [x] 1.2 `_shared/waitlist-promotion.spec`（または対応する Deno/vitest テスト）を TDD で追加: 空きに収まる最古を選定 / 収まらない先頭をスキップして次を繰り上げ / 残り空きに大人数が入らずスキップして埋め切る / まとまった空きで複数名 / capacity NULL → 空 / 空き 0 → 空。

## 2. promote-waitlist Edge Function

- [x] 2.1 `supabase/functions/promote-waitlist/index.ts` を追加。POST `{ eventId }`、authenticated 限定（Authorization JWT 検証）。service_role client で: (a) event の capacity 取得、(b) 現在 booked（`event_availability_view` の reserved_count）取得、(c) `status='waitlist'` を `created_at ASC` で取得、(d) `selectPromotions` で対象決定、(e) 対象を `status='reserved'` に UPDATE（guest_count/note/phone は保持＝当該列を触らない）。
- [x] 2.2 昇格した各会員へ繰り上げ通知メール送信。`_shared/reservation-mail-inputs` / `_shared/mailer-templates` に `promoted` 入力ビルダ + `renderReservationPromotedMail`（繰り上げ確定・イベント情報・LINE 導線）を追加。`members.email` を service_role で引き、`_shared/mailer` の `sendMail` で送信。送信失敗・1 件失敗は握りつぶしてログに残し、他の昇格/送信を継続。
- [x] 2.3 関数のレスポンスは `{ ok, promotedCount }`（失敗時も 200 + 構造化 body、既存通知関数の方針に準拠）。CORS / preflight は `_shared/cors` を流用。

## 3. キャンセル経路からの起動（fire-and-forget）

- [x] 3.1 `apps/reservation/src/shared/api/` に `triggerWaitlistPromotion(eventId)` を追加（`functions.invoke('promote-waitlist', { body: { eventId } })` を try/catch で握りつぶす、既存 `triggerReservationNotification` と同型）。`useCancelBooking.cancel` の成功後に当該予約の event_id で fire-and-forget 起動（撤回 `cancelWaitlist` では起動しない）。event_id は cancel 対象から解決する。
- [x] 3.2 管理画面のキャンセル代行成功後にも `promote-waitlist` を fire-and-forget 起動（`apps/admin` の該当キャンセル composable / mutation）。admin 側の起動 helper を `apps/admin/src/shared/api/` に追加。

## 4. dev 動作確認

- [ ] 4.1 `promote-waitlist` Edge Function を dev に deploy（レム実行）。満員テストイベントで「待機者あり → 予約をキャンセル → 待機者が reserved に昇格 + 繰り上げメール受信」を確認。同伴者数フィッティング（半端な空きでは昇格しない / まとまった空きで複数昇格）も dev データで確認し結果を提示。

## 5. 最終確認（#344 と stack）

- [ ] 5.1 選定ロジックの unit test green。reservation / admin の既存スイート回帰なし。`pnpm --filter @high-q/reservation test` ほか + 関連 build + typecheck をまとめて実行。
- [ ] 5.2 #344 と同一ブランチ（stack）で 1 PR を出せる状態を確認（両 change の openspec strict valid / migration 連番整合）。
