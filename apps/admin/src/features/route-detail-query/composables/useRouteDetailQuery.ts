import { computed, type ComputedRef } from "vue";
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from "vue-router";

/**
 * URL クエリ `?detail=<id>` を購読・更新する汎用 composable。
 *
 * `useMembersFilter` が `/members` 専用の全フィルタ serialize を担うのに対し、
 * 本 composable は `detail` キー 1 本のみを操作し、他の query を保持する。
 * これにより `/members` 以外のページ (例: `/events/:id`) でも同じ
 * `MemberDetailSheet` を再利用できる。
 *
 * 関連:
 *   openspec/changes/link-event-participants-to-member-detail/design.md (D3)
 *   openspec/changes/link-event-participants-to-member-detail/specs/admin-members-list/spec.md
 */

function pickString(query: LocationQuery, key: string): string | undefined {
  const v = query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export interface UseRouteDetailQuery {
  detail: ComputedRef<string | undefined>;
  openDetail: (id: string) => Promise<void>;
  closeDetail: () => Promise<void>;
}

export function useRouteDetailQuery(): UseRouteDetailQuery {
  const route = useRoute();
  const router = useRouter();

  const detail = computed<string | undefined>(() => {
    const v = pickString(route.query, "detail");
    return v && v.length > 0 ? v : undefined;
  });

  async function openDetail(id: string): Promise<void> {
    const next: LocationQueryRaw = { ...route.query, detail: id };
    await router.push({ query: next });
  }

  async function closeDetail(): Promise<void> {
    const next: LocationQueryRaw = { ...route.query };
    delete next.detail;
    await router.push({ query: next });
  }

  return { detail, openDetail, closeDetail };
}
