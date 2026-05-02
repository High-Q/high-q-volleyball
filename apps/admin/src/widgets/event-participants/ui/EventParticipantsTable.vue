<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@high-q/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import type { ExperienceLevel } from "@high-q/shared";
import type { ParticipantRow } from "@/entities/reservation";
import {
  CheckinToggle,
  useReservationCheckin,
} from "@/features/reservation-checkin";
import { ReservationCancelDialog } from "@/features/reservation-cancel-by-admin";
import {
  GuestCountStepper,
  useReservationGuestEdit,
} from "@/features/reservation-guest-edit";

/**
 * 参加者一覧の DataTable 本体（Success 状態専用）。
 *
 * 列: アバター + 名前 + 初回バッジ / 経験 Badge / 同伴 / 予約日時 / メール /
 *      Switch チェックイン / キャンセル代行
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const props = defineProps<{
  rows: ReadonlyArray<ParticipantRow>;
}>();

const emit = defineEmits<{
  /** Optimistic flip 用: caller の rawData を更新する */
  "checkin-flip": [reservationId: string, nextChecked: boolean];
  /** 同伴者数編集 (caller の rawData / StatCard 更新用) */
  "guest-changed": [reservationId: string, prev: number, next: number];
  /** キャンセル代行成功時 */
  cancelled: [reservationId: string];
}>();

const checkin = useReservationCheckin();
const guest = useReservationGuestEdit();

const EXP_TONE: Record<ExperienceLevel, "success" | "accent" | "neutral"> = {
  experienced: "success",
  intermediate: "accent",
  beginner: "neutral",
};

const EXP_LABEL: Record<ExperienceLevel, string> = {
  experienced: "経験者",
  intermediate: "中級",
  beginner: "初回",
};

interface DisplayedRow extends ParticipantRow {
  __initial: string;
  __whenLabel: string;
  __isChecked: boolean;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

const displayedRows = computed<DisplayedRow[]>(() =>
  props.rows.map((r) => ({
    ...r,
    __initial: r.display_name.charAt(0),
    __whenLabel: formatWhen(r.created_at),
    __isChecked: r.checked_in_at !== null,
  })),
);

async function onToggle(row: DisplayedRow): Promise<void> {
  const nextChecked = !row.__isChecked;
  // Optimistic 反映: caller (Widget / parent) に伝える
  emit("checkin-flip", row.reservation_id as unknown as string, nextChecked);
  await checkin.toggle({
    reservationId: row.reservation_id,
    currentCheckedIn: row.__isChecked,
    onRollback: () => {
      // 失敗時は元に戻す
      emit(
        "checkin-flip",
        row.reservation_id as unknown as string,
        row.__isChecked,
      );
    },
  });
}

function onCancelled(reservationId: string): void {
  emit("cancelled", reservationId);
}

async function onGuestChange(
  row: DisplayedRow,
  nextCount: number,
): Promise<void> {
  const prev = row.guest_count;
  // Optimistic 反映: caller (Widget) に通知 → caller が rawData を更新
  emit("guest-changed", row.reservation_id as unknown as string, prev, nextCount);
  await guest.setGuestCount({
    reservationId: row.reservation_id,
    prevCount: prev,
    nextCount,
    onRollback: () => {
      // 失敗時は元に戻す
      emit(
        "guest-changed",
        row.reservation_id as unknown as string,
        nextCount,
        prev,
      );
    },
  });
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>名前</TableHead>
        <TableHead class="w-24">経験</TableHead>
        <TableHead class="w-20 text-right">同伴</TableHead>
        <TableHead class="w-32">予約日時</TableHead>
        <TableHead class="w-56">メール</TableHead>
        <TableHead class="w-32">チェックイン</TableHead>
        <TableHead class="w-28 text-right">操作</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="row in displayedRows" :key="row.reservation_id">
        <TableCell class="whitespace-nowrap">
          <span class="inline-flex items-center gap-hq-2">
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-paper-warm font-jp text-[10px] text-ink-soft"
              aria-hidden="true"
            >
              {{ row.__initial }}
            </span>
            <span class="font-jp text-sm font-medium text-ink">{{
              row.display_name
            }}</span>
            <Badge v-if="row.is_first_time" tone="accent">初回</Badge>
          </span>
        </TableCell>
        <TableCell class="whitespace-nowrap">
          <Badge :tone="EXP_TONE[row.experience_level]">
            {{ EXP_LABEL[row.experience_level] }}
          </Badge>
        </TableCell>
        <TableCell class="whitespace-nowrap text-right">
          <GuestCountStepper
            :count="row.guest_count"
            :member-name="row.display_name"
            :in-flight="guest.isInFlight(row.reservation_id)"
            @change="(next) => onGuestChange(row, next)"
          />
        </TableCell>
        <TableCell class="whitespace-nowrap font-mono text-xs text-muted">
          {{ row.__whenLabel }}
        </TableCell>
        <TableCell class="whitespace-nowrap font-mono text-xs text-muted">
          {{ row.email }}
        </TableCell>
        <TableCell class="whitespace-nowrap">
          <CheckinToggle
            :checked="row.__isChecked"
            :member-name="row.display_name"
            :in-flight="checkin.isInFlight(row.reservation_id)"
            @toggle="onToggle(row)"
          />
        </TableCell>
        <TableCell class="whitespace-nowrap text-right">
          <ReservationCancelDialog
            :reservation-id="row.reservation_id"
            :member-name="row.display_name"
            @cancelled="onCancelled(row.reservation_id as unknown as string)"
          />
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
