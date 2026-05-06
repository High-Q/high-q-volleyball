import type { ReservationId } from "../model/reservation.types";

/**
 * Crockford Base32 のアルファベット (I / L / O / U を除外した 32 文字)。
 * 読み間違いを起こしやすい文字を意図的に外している。
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * UUID v4 形式の `ReservationId` を表示用予約番号 `#HQ-XXXX-XXXX` に変換する。
 *
 * - UUID 先頭の 40 bit (= 10 hex char) を 5 bit ずつ 8 文字の Base32 にエンコード
 * - 全長 8 文字を 4 文字 + 4 文字に分割し `#HQ-` プレフィックスを付与
 * - 決定的: 同一 id を渡せば常に同一文字列を返す
 * - 衝突確率: 32^8 ≒ 1.1e12 通り。MVP1 規模では実用上の衝突は発生しない
 */
export function formatReservationNumber(id: ReservationId): string {
  const hex = (id as string).replace(/-/g, "").toLowerCase();

  let bits = 0n;
  for (let i = 0; i < 10; i++) {
    const nibble = parseInt(hex[i] ?? "0", 16);
    bits = (bits << 4n) | BigInt(Number.isNaN(nibble) ? 0 : nibble);
  }

  let encoded = "";
  for (let i = 0; i < 8; i++) {
    const shift = BigInt((7 - i) * 5);
    const idx = Number((bits >> shift) & 0x1fn);
    encoded += ALPHABET[idx];
  }

  return `#HQ-${encoded.slice(0, 4)}-${encoded.slice(4, 8)}`;
}
