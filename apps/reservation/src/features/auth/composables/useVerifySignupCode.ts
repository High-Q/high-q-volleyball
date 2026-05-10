import { ref } from "vue";
import { getSupabase } from "@/shared/api/supabase";
import { useAuthSession } from "./useAuthSession";

type Status = "idle" | "loading" | "success" | "error";

export type VerifyErrorCode =
  | "validation"
  | "invalid-code"
  | "expired"
  | "attempt-exceeded"
  | "not-found"
  | "session-failed"
  | "network"
  | "unknown";

/**
 * Issue #189 ゼロ滞留 signup フローの段階 2 composable。
 * /signup/verify から Edge Function `verify-signup` を呼び、成功で
 * `verifyOtp({ token_hash, type: 'magiclink' })` で session を確立する。
 */
export function useVerifySignupCode() {
  const status = ref<Status>("idle");
  const errorCode = ref<VerifyErrorCode | null>(null);
  const remainingAttempts = ref<number | null>(null);
  const session = useAuthSession();

  async function submit(email: string, code: string): Promise<boolean> {
    errorCode.value = null;
    remainingAttempts.value = null;

    if (!/^\d{6}$/.test(code)) {
      status.value = "error";
      errorCode.value = "validation";
      return false;
    }

    status.value = "loading";

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke("verify-signup", {
        body: { email, code },
      });

      if (error) {
        // supabase-js の functions.invoke は 4xx/5xx の場合 data を null にして
        // error.context (Response) に body を保持する。明示的に json() で読み出す。
        let detail: { error?: string; remainingAttempts?: number } | null =
          (data ?? null) as typeof detail;
        if (!detail) {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              detail = await ctx.json();
            } catch {
              detail = null;
            }
          }
        }
        if (detail?.error === "invalid-code") {
          status.value = "error";
          errorCode.value = "invalid-code";
          remainingAttempts.value = detail.remainingAttempts ?? null;
          return false;
        }
        if (detail?.error === "expired") {
          status.value = "error";
          errorCode.value = "expired";
          return false;
        }
        if (detail?.error === "attempt-exceeded") {
          status.value = "error";
          errorCode.value = "attempt-exceeded";
          return false;
        }
        if (detail?.error === "not-found") {
          status.value = "error";
          errorCode.value = "not-found";
          return false;
        }
        if (/network|fetch|failed to fetch/i.test(error.message ?? "")) {
          status.value = "error";
          errorCode.value = "network";
          return false;
        }
        status.value = "error";
        errorCode.value = "unknown";
        return false;
      }

      const ok = (data ?? {}) as {
        ok?: boolean;
        tokenHash?: string;
        email?: string;
        requiresLogin?: boolean;
      };
      if (!ok.ok) {
        status.value = "error";
        errorCode.value = "unknown";
        return false;
      }

      // session 発行: tokenHash + verifyOtp で確立
      if (ok.tokenHash) {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: ok.tokenHash,
          type: "magiclink",
        });
        if (verifyErr) {
          status.value = "error";
          errorCode.value = "session-failed";
          return false;
        }
        await session.refresh();
      }
      // tokenHash 未返却（generateLink 失敗時）はクライアント側で /login に戻す挙動
      // を呼び出し側で実装する想定（requiresLogin = true）

      status.value = "success";
      return true;
    } catch (e: unknown) {
      status.value = "error";
      errorCode.value = classifyError(e);
      return false;
    }
  }

  function reset(): void {
    status.value = "idle";
    errorCode.value = null;
    remainingAttempts.value = null;
  }

  return { status, errorCode, remainingAttempts, submit, reset };
}

function classifyError(e: unknown): VerifyErrorCode {
  if (typeof e === "object" && e !== null) {
    const obj = e as { message?: unknown; name?: unknown };
    const message = typeof obj.message === "string" ? obj.message : "";
    if (
      obj.name === "TypeError" ||
      /network|fetch|failed to fetch/i.test(message)
    ) {
      return "network";
    }
  }
  return "unknown";
}
