import { ref } from "vue";
import { sendMagicLink } from "../api/auth-client";
import type { AuthError } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendStatus = "idle" | "loading" | "success" | "error";

export function useSendMagicLink() {
  const status = ref<SendStatus>("idle");
  const error = ref<AuthError | null>(null);
  const submittedEmail = ref<string>("");
  // 同期的な再入ガード。`status.value = "loading"` は Vue の reactivity に依存し
  // DOM 反映が次 tick になるため、超速ダブルクリックや Enter 連打で同一フレーム
  // に複数の send() が走り、Supabase へ複数の signInWithOtp が飛ぶ事故が観測
  // された (#86 Apply 中、トークン全て異なる重複メールで判明)。closure フラグで
  // 同期的に塞ぐ。
  let inFlight = false;

  async function send(email: string): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      error.value = null;

      if (!email || !EMAIL_PATTERN.test(email)) {
        status.value = "error";
        error.value = "invalid-email";
        return;
      }

      status.value = "loading";
      try {
        await sendMagicLink(email);
        submittedEmail.value = email;
        status.value = "success";
      } catch (e: unknown) {
        status.value = "error";
        error.value = classifyError(e);
      }
    } finally {
      inFlight = false;
    }
  }

  function reset(): void {
    status.value = "idle";
    error.value = null;
    submittedEmail.value = "";
  }

  return { status, error, submittedEmail, send, reset };
}

function classifyError(e: unknown): AuthError {
  if (import.meta.env.DEV) {
    // 本番では出さない。開発時の原因切り分けを助けるため raw error を console に。
    // eslint-disable-next-line no-console
    console.error("[useSendMagicLink] raw error:", e);
  }
  if (typeof e === "object" && e !== null) {
    const obj = e as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
      name?: unknown;
    };
    const message = typeof obj.message === "string" ? obj.message : "";
    const status = typeof obj.status === "number" ? obj.status : 0;
    const code = typeof obj.code === "string" ? obj.code : "";
    // shouldCreateUser:false かつ auth.users 未登録、または email signups disabled
    if (
      code === "otp_disabled" ||
      /signups? not allowed/i.test(message) ||
      /email signups (are )?disabled/i.test(message)
    ) {
      return "not-registered";
    }
    if (
      status === 429 ||
      code === "over_email_send_rate_limit" ||
      /rate.limit/i.test(message)
    ) {
      return "rate-limit";
    }
    if (
      obj.name === "TypeError" ||
      /network|fetch|failed to fetch/i.test(message)
    ) {
      return "network";
    }
  }
  return "unknown";
}
