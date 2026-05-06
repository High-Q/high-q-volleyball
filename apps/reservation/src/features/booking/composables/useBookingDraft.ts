import { reactive, watch, type Ref } from "vue";
import type { BookingDraft } from "@/entities/reservation";

const STORAGE_PREFIX = "hq:reservation-booking:";

type StoredDraft = BookingDraft & {
  /** ISO 8601 文字列。当該イベントの開催終了時刻 */
  eventEndAt: string;
  /** ISO 8601 文字列。最終保存時刻 */
  savedAt: string;
};

function key(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId}`;
}

function readStored(eventId: string): StoredDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key(eventId));
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

function writeStored(eventId: string, draft: StoredDraft): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key(eventId), JSON.stringify(draft));
  } catch {
    // localStorage が壊れていても予約フロー本体は止めない
  }
}

function removeStored(eventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key(eventId));
  } catch {
    // ignore
  }
}

function isExpired(draft: StoredDraft, now: Date): boolean {
  const end = Date.parse(draft.eventEndAt);
  if (Number.isNaN(end)) {
    return false;
  }
  return end < now.getTime();
}

export type UseBookingDraftReturn = {
  draft: BookingDraft;
  /** 現在の draft をストレージへ書き込む */
  save: () => void;
  /** ストレージとメモリ双方の draft を初期値に戻す */
  clear: () => void;
};

/**
 * 予約確認画面の入力内容を `localStorage` にイベント ID 単位で保持する composable。
 *
 * - mount 時に該当キーを読み出し、`eventEndAt` が現在時刻を超過していたら破棄する
 * - draft の変更は watch で自動保存
 * - `clear()` で当該イベント分のキーを削除
 */
export function useBookingDraft(
  eventIdRef: Ref<string>,
  eventEndAtRef: Ref<string | null>,
): UseBookingDraftReturn {
  const draft = reactive<BookingDraft>({
    guestCount: 0,
    note: "",
    phone: undefined,
  });

  function loadFromStorage(): void {
    const eventId = eventIdRef.value;
    const eventEndAt = eventEndAtRef.value;
    if (eventId.length === 0 || eventEndAt === null) {
      return;
    }
    const stored = readStored(eventId);
    if (stored === null) {
      return;
    }
    if (isExpired(stored, new Date())) {
      removeStored(eventId);
      return;
    }
    draft.guestCount = stored.guestCount;
    draft.note = stored.note;
    draft.phone = stored.phone;
  }

  function save(): void {
    const eventId = eventIdRef.value;
    const eventEndAt = eventEndAtRef.value;
    if (eventId.length === 0 || eventEndAt === null) {
      return;
    }
    writeStored(eventId, {
      guestCount: draft.guestCount,
      note: draft.note,
      phone: draft.phone,
      eventEndAt,
      savedAt: new Date().toISOString(),
    });
  }

  function clear(): void {
    const eventId = eventIdRef.value;
    if (eventId.length > 0) {
      removeStored(eventId);
    }
    draft.guestCount = 0;
    draft.note = "";
    draft.phone = undefined;
  }

  // event id / endAt が確定したら storage から復元する
  watch(
    [eventIdRef, eventEndAtRef],
    () => {
      loadFromStorage();
    },
    { immediate: true },
  );

  // draft 変更を自動保存
  watch(
    () => ({
      guestCount: draft.guestCount,
      note: draft.note,
      phone: draft.phone,
    }),
    () => {
      save();
    },
    { deep: false },
  );

  return { draft, save, clear };
}

/**
 * テスト / 起動時の sweep 用。`STORAGE_PREFIX` を持つ全キーを走査し、
 * 開催終了時刻を超過したものを削除する。本 MVP1 では呼び出し必須ではないが、
 * Page 初期化時の cleanup として利用可能。
 */
export function pruneExpiredBookingDrafts(now: Date = new Date()): void {
  if (typeof window === "undefined") {
    return;
  }
  const removeKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k === null || !k.startsWith(STORAGE_PREFIX)) {
      continue;
    }
    try {
      const raw = window.localStorage.getItem(k);
      if (raw === null) {
        continue;
      }
      const draft = JSON.parse(raw) as StoredDraft;
      if (isExpired(draft, now)) {
        removeKeys.push(k);
      }
    } catch {
      removeKeys.push(k);
    }
  }
  for (const k of removeKeys) {
    window.localStorage.removeItem(k);
  }
}
