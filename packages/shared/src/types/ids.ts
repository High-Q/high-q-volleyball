/**
 * Branded Types によるドメイン識別子の型安全化。
 *
 * 生の `string` を `EventId` を期待する関数に直接渡せないようにすることで、
 * 「予約 ID をイベント ID として誤って渡す」等のミスをコンパイル時に防ぐ。
 *
 * 関連: CLAUDE.md Pillar 2「Branded Types でドメイン識別子を表現」
 *       openspec/changes/supabase-initial-schema/specs/supabase-foundation/spec.md
 */

import { type Result, ok, err, appError } from "./result.js";

declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type EventId = Brand<string, "EventId">;
export type MemberId = Brand<string, "MemberId">;
export type ReservationId = Brand<string, "ReservationId">;

/**
 * UUID v4 を含む UUID 全般を許容する正規表現。
 * Supabase の `gen_random_uuid()` は v4 を返すが、auth.users.id は別バージョン
 * の可能性もあるため緩めに合わせる。
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeIdConstructor<T extends string>(label: string) {
  return (value: string): Result<T> => {
    if (typeof value !== "string" || value.length === 0) {
      return err(
        appError(
          "VALIDATION_EMPTY_ID",
          `${label} must be a non-empty string`
        )
      );
    }
    if (!UUID_RE.test(value)) {
      return err(
        appError(
          "VALIDATION_INVALID_UUID",
          `${label} must be a valid UUID, got: ${value}`
        )
      );
    }
    return ok(value as T);
  };
}

export const createEventId = makeIdConstructor<EventId>("EventId");
export const createMemberId = makeIdConstructor<MemberId>("MemberId");
export const createReservationId =
  makeIdConstructor<ReservationId>("ReservationId");

/**
 * 信頼できるソース（DB から取得直後など）から型変換するための **unsafe** ヘルパー。
 * 使用箇所は最小限に留め、原則 `createXxxId` のバリデーション付きを使うこと。
 */
export const unsafeEventId = (value: string): EventId => value as EventId;
export const unsafeMemberId = (value: string): MemberId => value as MemberId;
export const unsafeReservationId = (value: string): ReservationId =>
  value as ReservationId;
