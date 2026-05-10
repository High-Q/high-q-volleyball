// =============================================================================
// Edge Function: request-signup
// =============================================================================
// Issue #189: 「ゼロ滞留」signup フローのコード発行ステップ。
//
// フロー:
//   1. クライアントから signup payload（メール + プロフィール）を受け取る
//   2. サーバ側バリデーションを再評価
//   3. 既登録メールチェック（members.email で SELECT）
//   4. 直近 60 秒以内の再送はレート制限で拒否
//   5. 6 桁コード生成 + SHA-256 ハッシュで signup_pending に UPSERT（TTL 30 分）
//   6. Gmail SMTP 経由でコード入りメールを送信
//   7. 成功レスポンスを返す（auth.users / members は本ステップでは作成しない）
//
// 関連:
//   - design.md D1〜D4
//   - specs/reservation-member-auth/spec.md "Requirement: 認証コード発行 Edge Function"
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { generateSixDigitCode, hashCode } from "../_shared/code.ts";
import {
  loadMailEnv,
  renderSignupCodeMail,
  sendMail,
} from "../_shared/mailer.ts";
import { validateSignupPayload } from "../_shared/validation.ts";

const RESEND_COOLDOWN_MS = 60_000; // 60 秒以内の再送は拒否
const TTL_MS = 30 * 60_000; // 30 分

export async function handleRequestSignup(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed" }, { status: 405 });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return jsonResponse({ error: "invalid-json" }, { status: 400 });
  }

  const validation = validateSignupPayload(bodyRaw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: validation.errors },
      { status: 400 },
    );
  }
  const payload = validation.payload;

  const supabase = createServiceClient();

  // 既登録チェック: members に同 email 行があれば既登録とみなす
  const { data: existingMember, error: memberErr } = await supabase
    .from("members")
    .select("id")
    .eq("email", payload.email)
    .maybeSingle();
  if (memberErr) {
    console.error("[request-signup] members lookup failed", memberErr);
    return jsonResponse(
      { error: "internal", stage: "members-lookup", detail: memberErr.message },
      { status: 500 },
    );
  }
  if (existingMember) {
    return jsonResponse(
      { error: "already-registered" },
      { status: 409 },
    );
  }

  // レート制限: 直近 60 秒以内に同 email で signup_pending が作られていれば拒否
  const { data: existingPending } = await supabase
    .from("signup_pending")
    .select("created_at")
    .eq("email", payload.email)
    .maybeSingle();
  if (existingPending) {
    const lastSent = new Date(existingPending.created_at).getTime();
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000,
      );
      return jsonResponse(
        { error: "rate-limited", retryAfter: retryAfterSec },
        { status: 429 },
      );
    }
  }

  const code = generateSixDigitCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const { error: upsertErr } = await supabase
    .from("signup_pending")
    .upsert(
      {
        email: payload.email,
        payload: {
          display_name: payload.display_name,
          birthday: payload.birthday,
          phone: payload.phone,
          experience_level: payload.experience_level,
          nickname: payload.nickname,
          terms_agreed_at: payload.terms_agreed_at,
        },
        code_hash: codeHash,
        attempt_count: 0,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  if (upsertErr) {
    console.error("[request-signup] signup_pending upsert failed", upsertErr);
    return jsonResponse(
      { error: "internal", stage: "upsert", detail: upsertErr.message },
      { status: 500 },
    );
  }

  // メール送信
  try {
    const mailEnv = loadMailEnv();
    const { subject, body } = renderSignupCodeMail(code);
    await sendMail(mailEnv, payload.email, subject, body);
  } catch (err) {
    // メール送信失敗時は signup_pending を巻き戻す（孤立行を残さない）
    console.error("[request-signup] sendMail failed", err);
    await supabase.from("signup_pending").delete().eq("email", payload.email);
    const detail = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { error: "mail-send-failed", detail },
      { status: 502 },
    );
  }

  return jsonResponse({ ok: true, expiresAt }, { status: 200 });
}

Deno.serve(handleRequestSignup);
