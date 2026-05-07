<script setup lang="ts">
import { computed } from "vue";
import {
  jstDay,
  jstHours,
  jstMinutes,
  jstMonth,
  jstYear,
} from "@/shared/lib/jst-calendar";

/**
 * 予約詳細画面の Meta テーブル (参加費 / 同伴者 / 経験レベル / 予約日時)。
 *
 * `<dl>` / `<dt>` / `<dd>` のセマンティック構造で 4 行を順序固定で描画する。
 * 経験レベルラベルマップを内包し、`'beginner' / 'intermediate' / 'experienced'` を
 * 日本語ラベルに変換する。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: Meta テーブル
 */

const EXPERIENCE_LEVEL_LABEL: Record<
  "beginner" | "intermediate" | "experienced",
  string
> = {
  beginner: "初めて",
  intermediate: "経験あり",
  experienced: "上級",
};

const props = defineProps<{
  fee: number | null;
  guestCount: number;
  experienceLevel: "beginner" | "intermediate" | "experienced";
  /** ISO 8601 (UTC)。reservations.created_at */
  reservedAt: string;
}>();

const feeLabel = computed(() => {
  if (props.fee === null) return "—";
  return `¥${props.fee.toLocaleString("ja-JP")}（当日現金）`;
});

const guestCountLabel = computed(() => `${props.guestCount} 名`);

const experienceLabel = computed(
  () => EXPERIENCE_LEVEL_LABEL[props.experienceLevel],
);

const reservedAtLabel = computed(() => {
  const d = new Date(props.reservedAt);
  if (Number.isNaN(d.getTime())) return "—";
  const yyyy = jstYear(d);
  const mm = String(jstMonth(d) + 1).padStart(2, "0");
  const dd = String(jstDay(d)).padStart(2, "0");
  const hh = String(jstHours(d)).padStart(2, "0");
  const mi = String(jstMinutes(d)).padStart(2, "0");
  return `${yyyy} / ${mm} / ${dd} ${hh}:${mi}`;
});

type Row = { key: string; label: string; value: string; testid: string };
const rows = computed<Row[]>(() => [
  { key: "fee", label: "参加費", value: feeLabel.value, testid: "meta-fee" },
  {
    key: "guests",
    label: "同伴者",
    value: guestCountLabel.value,
    testid: "meta-guests",
  },
  {
    key: "level",
    label: "経験レベル",
    value: experienceLabel.value,
    testid: "meta-level",
  },
  {
    key: "reservedAt",
    label: "予約日時",
    value: reservedAtLabel.value,
    testid: "meta-reserved-at",
  },
]);
</script>

<template>
  <dl
    class="border-t border-b border-hairline divide-y divide-hairline m-0"
    data-testid="reservation-meta-table"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="grid grid-cols-[92px_1fr] gap-hq-3 py-hq-3"
    >
      <dt class="font-mono text-xs text-muted tracking-widest uppercase">
        {{ row.label }}
      </dt>
      <dd
        class="font-jp text-sm text-ink m-0"
        :data-testid="row.testid"
      >{{ row.value }}</dd>
    </div>
  </dl>
</template>
