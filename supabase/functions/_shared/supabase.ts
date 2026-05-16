// service_role 権限で動作する Supabase クライアントを Edge Function 内で初期化する
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Supabase が自動で Edge Function に注入する
// secret。Edge Function 外（ブラウザ等）で service_role キーを使うことは絶対禁止。

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が Edge Function 環境に設定されていません",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 呼び出し元の JWT を保持したクライアント。auth.getUser() で uid を取得して
// 認可判定に使う用途。DB 操作は service_role 側で行う (RLS bypass)。
export function createUserClient(authHeader: string | null): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY が Edge Function 環境に設定されていません",
    );
  }
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}
