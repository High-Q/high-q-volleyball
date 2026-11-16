<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  SwitchRoot,
  SwitchThumb,
  type SwitchRootEmits,
  type SwitchRootProps,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Switch プリミティブ。radix-vue SwitchRoot を HQ デザイン
 * トークン経由で着色する。`checked` は boolean を受け、`v-model:checked` で
 * トグルできる。ON/OFF の明示的な運用トグルに使う。
 *
 * #XXX 運営設定（新規会員登録の受付可否トグル）で使用する。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 */

interface Props extends SwitchRootProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
const emits = defineEmits<SwitchRootEmits>();

// class は radix に渡さず自前の :class に回す
const delegatedProps = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :class="
      cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-hq-full border border-hairline transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-paper-warm',
        props.class,
      )
    "
  >
    <SwitchThumb
      class="pointer-events-none block h-5 w-5 rounded-hq-full bg-paper shadow-hq-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchRoot>
</template>
