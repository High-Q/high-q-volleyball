import { onMounted, onUnmounted, readonly, ref, type Ref } from "vue";
import {
  fetchPendingCount,
  type FetchError,
} from "@/entities/identity-document";

/**
 * pending 件数の reactive state を **module-scope の shared singleton** として保持する。
 *
 * 任意の composable instance が refresh() を呼ぶと、全 consumer (TopNav Badge / Dashboard
 * サマリ / 各 mutation 完了後の hook) が同期して更新される。
 *
 * 更新タイミング (design D12):
 *  - 各 composable instance が onMounted されたとき
 *  - document.visibilitychange で foreground 復帰したとき
 *  - 各 mutation (approve / reject / maskDelete) 成功直後に refresh() を呼んだとき
 *
 * リアルタイム購読 (Supabase Realtime) は MUST 提供しない (MVP1 範囲外)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D12)
 */

const _count = ref(0);
const _loading = ref(false);
const _error = ref<FetchError | null>(null);
let _activeInstances = 0;
let _visibilityListenerInstalled = false;

async function fetchCount(): Promise<void> {
  _loading.value = true;
  _error.value = null;
  const result = await fetchPendingCount();
  if (result.ok) {
    _count.value = result.value;
  } else {
    _error.value = result.error;
  }
  _loading.value = false;
}

function onVisibilityChange(): void {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "visible") {
    void fetchCount();
  }
}

function installVisibilityListener(): void {
  if (typeof document === "undefined") return;
  if (_visibilityListenerInstalled) return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  _visibilityListenerInstalled = true;
}

function uninstallVisibilityListener(): void {
  if (typeof document === "undefined") return;
  if (!_visibilityListenerInstalled) return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  _visibilityListenerInstalled = false;
}

export interface UsePendingCount {
  count: Readonly<Ref<number>>;
  loading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<FetchError | null>>;
  refresh: () => Promise<void>;
}

export function usePendingCount(): UsePendingCount {
  onMounted(() => {
    _activeInstances += 1;
    installVisibilityListener();
    void fetchCount();
  });

  onUnmounted(() => {
    _activeInstances = Math.max(0, _activeInstances - 1);
    if (_activeInstances === 0) {
      uninstallVisibilityListener();
    }
  });

  return {
    count: readonly(_count),
    loading: readonly(_loading),
    error: readonly(_error),
    refresh: fetchCount,
  };
}

/**
 * テスト用: shared state を初期化する。本番コードからの呼び出し禁止。
 */
export function _resetPendingCountForTest(): void {
  _count.value = 0;
  _loading.value = false;
  _error.value = null;
  _activeInstances = 0;
  uninstallVisibilityListener();
}
