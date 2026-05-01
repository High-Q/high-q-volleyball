/**
 * shadcn-vue 公式パターン由来の useToast composable。
 * グローバル state（モジュールスコープの ref）に toast を蓄え、
 * <Toaster /> がそれを v-for で描画する。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D7)
 *
 * 使い方:
 *   const { toast } = useToast()
 *   toast({ title: '保存しました', variant: 'default' })
 *   toast({ title: '保存に失敗しました', variant: 'destructive' })
 */

import { ref, type Component } from "vue";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5_000;

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  /** 任意の追加要素（action ボタン等）。今は未使用だが将来拡張用。 */
  action?: Component;
  /** 自動消去までの ms。0 で消えない。 */
  duration?: number;
}

export interface ToastEntry extends Required<Pick<ToastOptions, "id">> {
  title?: string;
  description?: string;
  variant: "default" | "destructive";
  open: boolean;
  duration: number;
}

const toasts = ref<ToastEntry[]>([]);
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function genId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleRemove(id: string, delay: number): void {
  if (timeouts.has(id)) return;
  if (delay <= 0) return;
  const t = setTimeout(() => {
    timeouts.delete(id);
    toasts.value = toasts.value.filter((x) => x.id !== id);
  }, delay);
  timeouts.set(id, t);
}

function dismiss(id?: string): void {
  if (id == null) {
    toasts.value = toasts.value.map((t) => ({ ...t, open: false }));
    return;
  }
  toasts.value = toasts.value.map((t) =>
    t.id === id ? { ...t, open: false } : t,
  );
  scheduleRemove(id, 200);
}

export function useToast(): {
  toasts: typeof toasts;
  toast: (options: ToastOptions) => { id: string; dismiss: () => void };
  dismiss: (id?: string) => void;
} {
  const toast = (options: ToastOptions) => {
    const id = options.id ?? genId();
    const duration = options.duration ?? TOAST_REMOVE_DELAY;
    const entry: ToastEntry = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? "default",
      open: true,
      duration,
    };
    toasts.value = [entry, ...toasts.value].slice(0, TOAST_LIMIT);
    if (duration > 0) scheduleRemove(id, duration);
    return { id, dismiss: () => dismiss(id) };
  };

  return { toasts, toast, dismiss };
}
