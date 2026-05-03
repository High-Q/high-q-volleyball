import { ref } from "vue";
import { sendMagicLink, type SendOptions } from "../api/auth-client";
import type { AuthError } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendStatus = "idle" | "loading" | "success" | "error";

export function useSendMagicLink() {
  const status = ref<SendStatus>("idle");
  const error = ref<AuthError | null>(null);
  const submittedEmail = ref<string>("");
  let inFlight = false;

  async function send(email: string, options: SendOptions): Promise<void> {
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
        await sendMagicLink(email, options);
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
