<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@high-q/ui";
import { EXPERIENCE_LABEL, type MemberListRow } from "@/entities/member";
import type { ExperienceLevel } from "@high-q/shared";

defineProps<{ member: MemberListRow }>();

const EXPERIENCE_TONE: Record<
  ExperienceLevel,
  "neutral" | "accent" | "success"
> = {
  beginner: "neutral",
  intermediate: "accent",
  experienced: "success",
};

function formatDate(iso: string | null): string {
  if (iso === null) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

const fields = computed<
  ReadonlyArray<{ label: string; value: string; mono?: boolean }>
>(() => []);
void fields; // 拡張ポイント、現状未使用
</script>

<template>
  <header class="space-y-hq-3">
    <div class="flex items-center gap-hq-3">
      <span
        class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-paper-warm font-jp text-sm text-muted"
        aria-hidden="true"
      >
        {{ member.display_name.charAt(0) }}
      </span>
      <div class="flex-1">
        <h2 class="font-jp-display text-lg text-ink">
          {{ member.display_name }}
        </h2>
        <p class="font-mono text-xs text-muted">{{ member.email }}</p>
      </div>
      <Badge :tone="EXPERIENCE_TONE[member.experience_level]">
        {{ EXPERIENCE_LABEL[member.experience_level] }}
      </Badge>
    </div>

    <dl class="grid grid-cols-3 gap-hq-3 rounded-hq-sm bg-paper-warm p-hq-3">
      <div>
        <dt class="font-mono text-[10px] uppercase tracking-widest text-muted">
          初回参加
        </dt>
        <dd class="mt-hq-1 font-mono text-sm text-ink">
          {{ formatDate(member.first_attended_at) }}
        </dd>
      </div>
      <div>
        <dt class="font-mono text-[10px] uppercase tracking-widest text-muted">
          累計
        </dt>
        <dd class="mt-hq-1 font-mono text-sm text-ink">
          {{ member.attended_count }} 回
        </dd>
      </div>
      <div>
        <dt class="font-mono text-[10px] uppercase tracking-widest text-muted">
          最終参加
        </dt>
        <dd class="mt-hq-1 font-mono text-sm text-ink">
          {{ formatDate(member.last_attended_at) }}
        </dd>
      </div>
    </dl>
  </header>
</template>
