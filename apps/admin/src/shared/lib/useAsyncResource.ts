import { onMounted, ref, type Ref } from "vue";
import type { Result } from "@high-q/shared";

/**
 * `Result<T, E>` を返す async fetcher を mount 時に実行し、loading / data /
 * error / refetch を提供する小さな composable (#149)。
 *
 * Dashboard の各 widget が共通利用し、4 状態 (Loading / Empty / Error / Success)
 * の出し分けを widget 側で行うための土台になる。
 *
 * 関連: openspec/changes/admin-dashboard-screen/design.md (D8)
 */
export interface AsyncResource<T, E> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<E | null>;
  refetch: () => Promise<void>;
}

export function useAsyncResource<T, E>(
  fetcher: () => Promise<Result<T, E>>,
  options: { immediate?: boolean } = {},
): AsyncResource<T, E> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<E | null>(null) as Ref<E | null>;

  async function refetch(): Promise<void> {
    loading.value = true;
    error.value = null;
    const result = await fetcher();
    if (result.ok) {
      data.value = result.value;
    } else {
      error.value = result.error;
    }
    loading.value = false;
  }

  if (options.immediate !== false) {
    onMounted(() => {
      void refetch();
    });
  }

  return { data, loading, error, refetch };
}
