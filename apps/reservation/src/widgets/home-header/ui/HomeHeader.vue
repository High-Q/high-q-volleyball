<script setup lang="ts">
import { computed } from "vue";
import { resolveMemberDisplayName, type Member } from "@/entities/member";

const props = defineProps<{
  member: Pick<Member, "displayName" | "nickname">;
}>();

const initial = computed(() => {
  const name = resolveMemberDisplayName(props.member);
  if (name.length === 0) return "—";
  return Array.from(name)[0] ?? "—";
});
</script>

<template>
  <header
    class="px-hq-5 pt-hq-4 pb-hq-2 flex items-center justify-between gap-hq-4"
    aria-label="ホームヘッダ"
  >
    <div class="flex items-baseline gap-hq-2">
      <span
        class="font-jp-display text-xl font-semibold text-ink tracking-wide"
        data-testid="home-header-logo"
      >High Q</span>
      <span
        class="font-mono text-[9px] text-muted tracking-widest"
        aria-hidden="true"
      >EST.21</span>
    </div>

    <router-link
      :to="{ name: 'profile' }"
      aria-label="プロフィール"
      data-testid="home-header-avatar"
      class="inline-flex items-center justify-center rounded-full bg-accent-soft text-accent border border-hairline font-jp-display font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style="width: 34px; height: 34px; font-size: 14px;"
    >
      {{ initial }}
    </router-link>
  </header>
</template>
