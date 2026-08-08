/**
 * NotifiedStore の Supabase 実装（service_role）。
 * crawl ジョブ（GitHub Actions）から `court_availability_notifications` を
 * 読み書きする。service_role キーはサーバ側（Actions）でのみ使用し、
 * クライアントには決して出さない。
 */
import { createClient } from "@supabase/supabase-js";
import type { AvailabilitySlot } from "../core/types.js";
import type { NotifiedStore } from "./notified-store.js";

const TABLE = "court_availability_notifications";
const SLOT_SIGNATURE_CONFLICT =
  "facility,venue_name,slot_date,start_at,end_at";

interface NotifiedRow {
  facility: string;
  venue_name: string;
  slot_date: string;
  start_at: string;
  end_at: string;
  reserve_url: string;
}

function toRow(s: AvailabilitySlot): NotifiedRow {
  return {
    facility: s.facility,
    venue_name: s.venueName,
    slot_date: s.slotDate,
    start_at: s.startAt,
    end_at: s.endAt,
    reserve_url: s.reserveUrl,
  };
}

function fromRow(r: NotifiedRow): AvailabilitySlot {
  return {
    facility: r.facility,
    venueName: r.venue_name,
    slotDate: r.slot_date,
    startAt: r.start_at,
    endAt: r.end_at,
    reserveUrl: r.reserve_url,
  };
}

export function createSupabaseNotifiedStore(
  url: string,
  serviceRoleKey: string,
): NotifiedStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async fetchNotified(facility) {
      const { data, error } = await client
        .from(TABLE)
        .select("facility,venue_name,slot_date,start_at,end_at,reserve_url")
        .eq("facility", facility);
      if (error) throw new Error(`fetchNotified: ${error.message}`);
      return (data ?? []).map((r) => fromRow(r as NotifiedRow));
    },

    async addNotified(slots) {
      if (slots.length === 0) return;
      const { error } = await client.from(TABLE).upsert(slots.map(toRow), {
        onConflict: SLOT_SIGNATURE_CONFLICT,
        ignoreDuplicates: true,
      });
      if (error) throw new Error(`addNotified: ${error.message}`);
    },

    async removeReleased(slots) {
      // 枠署名（5 列）一致で削除。timestamptz は instant 比較で +09:00 でも一致する。
      for (const s of slots) {
        const { error } = await client
          .from(TABLE)
          .delete()
          .eq("facility", s.facility)
          .eq("venue_name", s.venueName)
          .eq("slot_date", s.slotDate)
          .eq("start_at", s.startAt)
          .eq("end_at", s.endAt);
        if (error) throw new Error(`removeReleased: ${error.message}`);
      }
    },
  };
}
