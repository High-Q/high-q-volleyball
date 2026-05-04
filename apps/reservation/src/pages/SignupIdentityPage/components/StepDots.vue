<script setup lang="ts">
interface Props {
  active?: number;
  total?: number;
}

const props = withDefaults(defineProps<Props>(), {
  active: 3,
  total: 3,
});
</script>

<template>
  <div class="flex items-center gap-hq-3">
    <div class="flex gap-hq-2">
      <span
        v-for="i in props.total"
        :key="i"
        class="block h-1 rounded-full transition-all"
        :class="
          i <= props.active
            ? 'w-[18px] bg-accent'
            : 'w-[6px] bg-hairline'
        "
      />
    </div>
    <span
      class="font-mono text-[10px] tracking-[0.16em] text-muted"
    >
      STEP {{ props.active }} / {{ props.total }}
    </span>
  </div>
</template>
