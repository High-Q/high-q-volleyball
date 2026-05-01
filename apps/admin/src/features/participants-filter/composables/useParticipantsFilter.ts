import { computed, type ComputedRef } from "vue";
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from "vue-router";
import type { ExperienceLevel } from "@high-q/shared";
import {
  DEFAULT_FILTER,
  VALID_CHECKIN,
  VALID_EXPERIENCE,
  type CheckinState,
  type ParticipantsFilter,
} from "../types";

/**
 * URL クエリ ↔ 参加者フィルタ状態の双方向同期 composable。
 *
 * - `?q=` `?exp=beginner|intermediate|experienced` `?ck=checked|unchecked` の 3 キー
 * - 「すべて」は URL クエリから当該キーを削除
 * - 全変更は `replace`（履歴を増やさない、検索ボックス連続入力で履歴爆発を防ぐ）
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D5)
 */

function pickString(query: LocationQuery, key: string): string | undefined {
  const v = query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function parseFilter(query: LocationQuery): ParticipantsFilter {
  const qRaw = pickString(query, "q") ?? "";

  const expRaw = pickString(query, "exp");
  const experience = (VALID_EXPERIENCE as readonly string[]).includes(
    expRaw ?? "",
  )
    ? (expRaw as ExperienceLevel)
    : undefined;

  const ckRaw = pickString(query, "ck");
  const checkinState = (VALID_CHECKIN as readonly string[]).includes(ckRaw ?? "")
    ? (ckRaw as CheckinState)
    : undefined;

  return { q: qRaw, experience, checkinState };
}

function serialize(filter: ParticipantsFilter): LocationQueryRaw {
  const q: LocationQueryRaw = {};
  if (filter.q.length > 0) q.q = filter.q;
  if (filter.experience !== undefined) q.exp = filter.experience;
  if (filter.checkinState !== undefined) q.ck = filter.checkinState;
  return q;
}

export interface UseParticipantsFilter {
  filter: ComputedRef<ParticipantsFilter>;
  isFiltered: ComputedRef<boolean>;
  setSearch: (q: string) => Promise<void>;
  setExperience: (experience: ExperienceLevel | undefined) => Promise<void>;
  setCheckinState: (state: CheckinState | undefined) => Promise<void>;
  reset: () => Promise<void>;
}

export function useParticipantsFilter(): UseParticipantsFilter {
  const route = useRoute();
  const router = useRouter();

  const filter = computed<ParticipantsFilter>(() => parseFilter(route.query));

  const isFiltered = computed<boolean>(() => {
    const f = filter.value;
    return (
      f.q.length > 0 ||
      f.experience !== undefined ||
      f.checkinState !== undefined
    );
  });

  async function update(next: ParticipantsFilter): Promise<void> {
    // ルート上の他クエリ（将来 page= 等が増えたときの保護）は merge。
    // 本画面では q/exp/ck 以外のクエリを使わないため、ここでは serialize のみで十分。
    await router.replace({ query: serialize(next) });
  }

  async function setSearch(q: string): Promise<void> {
    await update({ ...filter.value, q });
  }

  async function setExperience(
    experience: ExperienceLevel | undefined,
  ): Promise<void> {
    await update({ ...filter.value, experience });
  }

  async function setCheckinState(
    checkinState: CheckinState | undefined,
  ): Promise<void> {
    await update({ ...filter.value, checkinState });
  }

  async function reset(): Promise<void> {
    await update({ ...DEFAULT_FILTER });
  }

  return {
    filter,
    isFiltered,
    setSearch,
    setExperience,
    setCheckinState,
    reset,
  };
}
