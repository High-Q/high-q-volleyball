import type { AvailabilitySlot, SlotSignatureKey } from "./types.js";

/**
 * 時刻文字列を UTC ISO に正規化する（instant 比較のため）。
 * `timestamptz` は DB 往復で `+09:00` → `Z` に正規化されるため、署名も瞬時に
 * そろえないと現在枠と通知済み枠が食い違い重複通知になる。parse 不能なら原文。
 */
function canonicalInstant(ts: string): string {
  const t = Date.parse(ts);
  return Number.isNaN(t) ? ts : new Date(t).toISOString();
}

/**
 * 枠署名を生成する。DB UNIQUE 制約
 * (facility, venue_name, slot_date, start_at, end_at) と同一のキー構成。
 * reserveURL は含めない（同一枠でも URL は変わり得るため）。
 */
export function slotSignature(slot: SlotSignatureKey): string {
  return [
    slot.facility,
    slot.venueName,
    slot.slotDate,
    canonicalInstant(slot.startAt),
    canonicalInstant(slot.endAt),
  ].join("");
}

export interface ReconcileResult {
  /** 新規に空いた枠（A − B）。通知して記録に追加する。 */
  toNotify: AvailabilitySlot[];
  /** もう空いていない枠（B − A）。記録から削除し再オープン時に再通知できるようにする。 */
  toRelease: AvailabilitySlot[];
}

/**
 * 現在空いている枠 A と通知済み枠 B を突き合わせ、差分を算出する。
 *
 * - `toNotify = A − B`：まだ通知していない新規の空き枠
 * - `toRelease = B − A`：埋まって空きが消えた通知済み枠（記録解除の対象）
 *
 * 記録解除により「いったん埋まって再び空いた枠」は次回以降に新規として再通知される。
 * A 内の重複（同一署名）は 1 件に畳む。
 */
export function reconcile(
  current: readonly AvailabilitySlot[],
  notified: readonly AvailabilitySlot[],
): ReconcileResult {
  const notifiedSigs = new Set(notified.map(slotSignature));
  const currentSigs = new Set(current.map(slotSignature));

  const seen = new Set<string>();
  const toNotify: AvailabilitySlot[] = [];
  for (const slot of current) {
    const sig = slotSignature(slot);
    if (notifiedSigs.has(sig) || seen.has(sig)) continue;
    seen.add(sig);
    toNotify.push(slot);
  }

  const toRelease = notified.filter(
    (slot) => !currentSigs.has(slotSignature(slot)),
  );

  return { toNotify, toRelease };
}
