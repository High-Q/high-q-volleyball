// =============================================================================
// promote-waitlist Edge Function: 繰り上げ対象の選定ロジック (純関数)
// =============================================================================
// 純粋関数として切り出し、vitest でテスト可能にする。Deno 依存なし。
//
// 方針: 「空きを埋め切る」走査 + 同伴者数フィッティング (公平性より枠活用を優先)。
//   - 待機列を最古から全件走査
//   - 各待機者の必要人数 (1 + guest_count) が残り available に収まれば繰り上げ、
//     available を減算
//   - 収まらない (同伴者数が多い) 待機者はスキップして次を評価
//   - available が 0 になる or 走査し切ったら終了
//
// 仕様:
//   openspec/changes/reservation-waitlist-promotion/specs/reservation-waitlist-promotion/spec.md
//   "Requirement: 繰り上げ対象の選定（空きを埋め切る走査 + 同伴者数フィッティング）"
// =============================================================================

export type WaitlistEntry = {
  reservationId: string;
  memberId: string;
  /** 同伴者数 (本人は含まない)。必要人数は 1 + guestCount */
  guestCount: number;
  /** ISO 8601。最古から評価する */
  createdAt: string;
};

export type SelectPromotionsInput = {
  /** イベント定員。NULL は無制限 (繰り上げ対象外) */
  capacity: number | null;
  /** 現在の予約埋まり具合 (本人 + 同伴の人数ベース、reserved + attended) */
  booked: number;
  /** status='waitlist' の待機者一覧 */
  waitlist: ReadonlyArray<WaitlistEntry>;
};

/**
 * 繰り上げ対象の待機者を選定する。
 *
 * - capacity NULL → 空配列 (満員概念が無く待機が発生しない)
 * - available = capacity - booked が 0 以下 → 空配列
 * - それ以外: 最古から全件走査し、残り available に収まる待機者を選定。収まらない
 *   待機者はスキップして次を評価する。
 *
 * 返り値は昇格対象の WaitlistEntry 配列 (評価順 = 繰り上げ順)。
 */
export function selectPromotions(input: SelectPromotionsInput): WaitlistEntry[] {
  const { capacity, booked, waitlist } = input;
  if (capacity === null) {
    return [];
  }
  let available = capacity - booked;
  if (available <= 0) {
    return [];
  }

  // 防御的に created_at ASC へ整列 (呼び出し側で並んでいる前提だが二重防衛)。
  const ordered = [...waitlist].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const selected: WaitlistEntry[] = [];
  for (const e of ordered) {
    const need = 1 + e.guestCount;
    if (need <= available) {
      selected.push(e);
      available -= need;
      if (available <= 0) {
        break;
      }
    }
    // need > available の待機者はスキップして次へ (枠を埋め切る)
  }
  return selected;
}
