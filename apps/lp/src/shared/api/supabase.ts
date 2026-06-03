import { createSupabaseClient } from "@high-q/shared/api";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client === null) {
    client = createSupabaseClient();
  }
  return client;
}

export function _resetSupabaseForTest(): void {
  client = null;
}
