<script setup lang="ts">
import { SelectRoot, type SelectRootEmits, type SelectRootProps } from "radix-vue";
import { useForwardPropsEmits } from "radix-vue";

/**
 * shadcn-vue 由来の Select root プリミティブ。radix-vue の SelectRoot を
 * 透過 forward する。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/shadcn-vue-integration/spec.md
 */

const props = defineProps<SelectRootProps>();
const emits = defineEmits<SelectRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <SelectRoot v-bind="forwarded">
    <slot />
  </SelectRoot>
</template>
