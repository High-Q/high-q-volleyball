<script setup lang="ts">
import { computed } from "vue";
import {
  formatMemberShortId,
  resolveMemberDisplayName,
  type Member,
} from "@/entities/member";

const props = defineProps<{
  member: Pick<Member, "id" | "email" | "displayName" | "nickname">;
}>();

const displayName = computed(() => resolveMemberDisplayName(props.member));

const initial = computed(() => {
  const name = displayName.value;
  if (name.length === 0) return "—";
  return Array.from(name)[0] ?? "—";
});

const shortId = computed(() => formatMemberShortId(props.member.id));
</script>

<template>
  <header
    class="flex items-center gap-hq-4"
    aria-label="プロフィールヘッダ"
  >
    <div
      class="flex items-center justify-center rounded-full bg-accent-soft text-accent font-jp-display font-medium shrink-0"
      style="width: 56px; height: 56px; font-size: 22px;"
      aria-hidden="true"
    >
      {{ initial }}
    </div>
    <div class="flex-1 min-w-0">
      <p
        class="font-jp-display text-lg text-ink m-0 truncate"
        data-testid="profile-header-name"
      >{{ displayName }}</p>
      <p
        class="font-jp text-xs text-muted mt-hq-1 m-0 truncate"
        data-testid="profile-header-email"
      >{{ member.email }}</p>
    </div>
    <span
      class="font-mono text-xs text-muted shrink-0"
      style="letter-spacing: 0.14em;"
      data-testid="profile-header-shortid"
    >{{ shortId }}</span>
  </header>
</template>
