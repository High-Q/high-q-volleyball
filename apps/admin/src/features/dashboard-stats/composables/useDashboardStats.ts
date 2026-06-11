import { onMounted, readonly, ref } from "vue";
import {
  getDashboardStats,
  type DashboardStatsRow,
  type FetchError,
} from "@/entities/dashboard";
import { toStatCardVms, type StatCardVm } from "../lib/toStatCardVm";

/**
 * Dashboard 集計取得 composable (#149)。
 *
 * - mount で fetch、refetch() で手動再取得
 * - state: { vms, loading, error }
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-dashboard-screen/design.md (D8)
 */

export interface UseDashboardStatsReturn {
  vms: ReturnType<typeof readonly<ReturnType<typeof ref<StatCardVm[]>>>>;
  loading: ReturnType<typeof readonly<ReturnType<typeof ref<boolean>>>>;
  error: ReturnType<typeof readonly<ReturnType<typeof ref<FetchError | null>>>>;
  refetch: () => Promise<void>;
}

export function useDashboardStats(): {
  vms: Readonly<ReturnType<typeof ref<StatCardVm[]>>>;
  loading: Readonly<ReturnType<typeof ref<boolean>>>;
  error: Readonly<ReturnType<typeof ref<FetchError | null>>>;
  refetch: () => Promise<void>;
} {
  const vms = ref<StatCardVm[]>([]);
  const loading = ref(false);
  const error = ref<FetchError | null>(null);

  async function refetch(): Promise<void> {
    loading.value = true;
    error.value = null;
    const result = await getDashboardStats();
    if (result.ok) {
      vms.value = toStatCardVms(result.value as DashboardStatsRow);
    } else {
      error.value = result.error;
    }
    loading.value = false;
  }

  onMounted(() => {
    void refetch();
  });

  return {
    vms: readonly(vms) as unknown as Readonly<ReturnType<typeof ref<StatCardVm[]>>>,
    loading: readonly(loading) as unknown as Readonly<
      ReturnType<typeof ref<boolean>>
    >,
    error: readonly(error) as unknown as Readonly<
      ReturnType<typeof ref<FetchError | null>>
    >,
    refetch,
  };
}
