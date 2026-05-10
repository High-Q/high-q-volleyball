// CORS helper for Supabase Edge Functions
//
// 本プロジェクトでは Edge Function を `apps/reservation`（ブラウザ）から直接呼び出す。
// 開発時は localhost:5174 (reservation dev サーバ) / 本番は Render の reservation URL から
// 来る。`Access-Control-Allow-Origin: *` で全ドメイン許可しているのは、Edge Function 自体が
// service_role を握って機密処理するわけではなく、入力 payload を受けて自身で auth を発行する
// 経路だから（クライアント側の credential を信用してアクセスを通す設計ではない）。
// レート制限・既登録判定はサーバ側の責務で行う。

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
