/**
 * クライアント側 idle timeout 監視。
 *
 * - document の `mousedown` / `keydown` / `touchstart` / `scroll` を観測
 * - 最後のイベントから IDLE_LIMIT_MS 経過で `onIdle` を呼ぶ
 * - `start(onIdle)` / `stop()` で外側がライフサイクルを管理する
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *     "JWT 30 分 + idle timeout 15 分" Requirement
 *   openspec/changes/admin-login-magic-link/design.md (D12)
 */

const IDLE_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 分

export function useIdleTimeout() {
  let onIdleHandler: (() => void) | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let listening = false;

  const handleActivity = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      if (onIdleHandler) onIdleHandler();
    }, IDLE_LIMIT_MS);
  };

  function start(onIdle: () => void): void {
    if (listening) return;
    onIdleHandler = onIdle;
    listening = true;
    for (const ev of IDLE_EVENTS) {
      document.addEventListener(ev, handleActivity, { passive: true });
    }
    handleActivity();
  }

  function stop(): void {
    if (!listening) return;
    listening = false;
    onIdleHandler = null;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    for (const ev of IDLE_EVENTS) {
      document.removeEventListener(ev, handleActivity);
    }
  }

  return { start, stop };
}

export const _IDLE_LIMIT_MS_FOR_TEST = IDLE_LIMIT_MS;
