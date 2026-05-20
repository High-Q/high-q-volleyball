// =============================================================================
// Edge Function: verify-signup
// =============================================================================
// Issue #189: 「ゼロ滞留」signup フローのコード検証 + 一括登録ステップ。
//
// フロー:
//   1. クライアントから email + 6 桁コードを受け取る
//   2. signup_pending 行を SELECT、期限切れなら DELETE してエラー返却
//   3. コードハッシュ照合、誤入力なら attempt_count 増分（上限到達で行削除）
//   4. 検証成功時:
//      a. supabase.auth.admin.createUser({ email, email_confirm: true }) で auth.users 作成
//      b. members を payload の正式値で UPSERT
//         （on_auth_user_created トリガで作られた placeholder 行を即座に上書き）
//      c. signup_pending の該当行を DELETE
//      d. magiclink 型 generateLink で token_hash を取得しクライアントへ返却
//         → クライアントは supabase.auth.verifyOtp で session を確立する
//   5. 副作用としてベストエフォートに期限切れ行を掃除（pg_cron 不使用）
//
// 関連:
//   - design.md D1〜D4 / D8
//   - specs/reservation-member-auth/spec.md "Requirement: 認証コード検証 Edge Function"
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { verifyCode } from "../_shared/code.ts";
import { validateVerifyPayload } from "../_shared/validation.ts";

const ATTEMPT_LIMIT = 5;

export async function handleVerifySignup(req: Request): Promise<Response> {
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

  const validation = validateVerifyPayload(bodyRaw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: validation.errors },
      { status: 400 },
    );
  }
  const { email, code } = validation;

  const supabase = createServiceClient();

  const { data: pending, error: selectErr } = await supabase
    .from("signup_pending")
    .select("email, payload, code_hash, attempt_count, expires_at")
    .eq("email", email)
    .maybeSingle();
  if (selectErr) {
    console.error("[verify-signup] signup_pending select failed", selectErr);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
  if (!pending) {
    return jsonResponse({ error: "not-found" }, { status: 404 });
  }

  // 期限チェック
  if (new Date(pending.expires_at).getTime() <= Date.now()) {
    await supabase.from("signup_pending").delete().eq("email", email);
    return jsonResponse({ error: "expired" }, { status: 410 });
  }

  // コード照合
  const ok = await verifyCode(code, pending.code_hash);
  if (!ok) {
    const nextCount = (pending.attempt_count ?? 0) + 1;
    if (nextCount >= ATTEMPT_LIMIT) {
      await supabase.from("signup_pending").delete().eq("email", email);
      return jsonResponse({ error: "attempt-exceeded" }, { status: 429 });
    }
    await supabase
      .from("signup_pending")
      .update({ attempt_count: nextCount })
      .eq("email", email);
    return jsonResponse(
      { error: "invalid-code", remainingAttempts: ATTEMPT_LIMIT - nextCount },
      { status: 400 },
    );
  }

  // 検証成功 → auth.users + members 作成
  // #281: payload schema は last_name / first_name の 2 キー必須。
  //       旧 schema (display_name のみ) の signup_pending 行はここで早期検知する。
  const rawPayload = pending.payload as Record<string, unknown>;
  if (
    typeof rawPayload.last_name !== "string" ||
    typeof rawPayload.first_name !== "string"
  ) {
    // 旧 schema (#281 migration 直前の payload) を検知。
    // 該当行は安全側で削除し、クライアントにフォームからの再発行を促す。
    await supabase.from("signup_pending").delete().eq("email", email);
    return jsonResponse(
      {
        error: "payload-schema-outdated",
        message:
          "登録フォームの仕様が更新されました。お手数ですが、フォームから再度認証コードを発行してください。",
      },
      { status: 400 },
    );
  }
  const formPayload = rawPayload as {
    last_name: string;
    first_name: string;
    birthday: string;
    phone: string;
    experience_level: "beginner" | "intermediate" | "experienced";
    nickname: string | null;
    terms_agreed_at: string;
  };

  const { data: createdUser, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        signup_via: "code",
      },
    });
  if (createErr || !createdUser?.user) {
    console.error("[verify-signup] createUser failed", createErr);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
  const userId = createdUser.user.id;

  // members を正式値で UPSERT
  // on_auth_user_created トリガが placeholder 行を作っているため、id 衝突で UPDATE になる。
  // 確実性のため UPSERT で表現する。
  // #281: last_name / first_name を明示的に渡す。
  //       display_name は sync_members_display_name_trg トリガで自動同期される
  //       ため、ここでは明示指定しない。
  const memberRow = {
    id: userId,
    email,
    last_name: formPayload.last_name,
    first_name: formPayload.first_name,
    nickname: formPayload.nickname,
    birthday: formPayload.birthday,
    phone: formPayload.phone,
    experience_level: formPayload.experience_level,
    role: "member" as const,
    profile: {
      signup_completed: true,
      terms_agreed_at: formPayload.terms_agreed_at,
    },
  };
  const { error: memberErr } = await supabase
    .from("members")
    .upsert(memberRow, { onConflict: "id" });
  if (memberErr) {
    // members UPSERT に失敗した場合、auth.users をロールバックして整合性を保つ
    console.error("[verify-signup] members upsert failed", memberErr);
    await supabase.auth.admin.deleteUser(userId);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }

  // signup_pending 削除
  await supabase.from("signup_pending").delete().eq("email", email);

  // ベストエフォート: 期限を 1 時間以上過ぎた他の signup_pending 行を掃除
  const cleanupBefore = new Date(Date.now() - 60 * 60_000).toISOString();
  await supabase
    .from("signup_pending")
    .delete()
    .lt("expires_at", cleanupBefore);

  // session 発行: magiclink 型 generateLink で hashed_token を取得し、
  // クライアントが verifyOtp({ token_hash, type: 'magiclink' }) で session 確立する
  const { data: linkData, error: linkErr } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("[verify-signup] generateLink failed", linkErr);
    // 会員は既に作成済み。クライアントには「ログイン画面で改めてログイン」を促す
    return jsonResponse(
      { ok: true, requiresLogin: true },
      { status: 200 },
    );
  }

  return jsonResponse(
    {
      ok: true,
      tokenHash: linkData.properties.hashed_token,
      email,
    },
    { status: 200 },
  );
}

Deno.serve(handleVerifySignup);
