<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  CheckboxRoot,
  CheckboxIndicator,
  type CheckboxRootEmits,
  type CheckboxRootProps,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Checkbox プリミティブ。radix-vue CheckboxRoot を HQ デザイン
 * トークン経由で着色する。`checked` は boolean | 'indeterminate' を受け、
 * `v-model:checked` でトグルできる。
 *
 * #172 会員一覧の複数選択（現ページ全選択の indeterminate を含む）で使用する。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 */

interface Props extends CheckboxRootProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
const emits = defineEmits<CheckboxRootEmits>();

// class は radix に渡さず自前の :class に回す
const delegatedProps = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="
      cn(
        'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-hq-sm border border-hairline bg-paper text-paper',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        props.class,
      )
    "
  >
    <CheckboxIndicator class="flex items-center justify-center text-current">
      <!-- indeterminate: マイナス / checked: チェック -->
      <svg
        v-if="props.checked === 'indeterminate'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3 w-3"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3 w-3"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
