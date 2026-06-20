<script setup lang="ts">
/**
 * 自前 Tabs 実装（D6: shadcn-vue Tabs を取り込まない方針）。
 *
 * MVP1 では「参加者一覧」のみ active。残り 2 タブは disabled = MVP2。
 * a11y: role="tab" + aria-selected + aria-disabled + aria-controls。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D6)
 */

interface TabItem {
  id: "participants" | "wait" | "checkin";
  label: string;
  count?: number;
  disabled?: boolean;
  /** count を accent pill で強調する (例: キャンセル待ちが 1 名以上いるとき) */
  emphasizeCount?: boolean;
  /** disabled タブの hover ツールチップ */
  comingSoon?: string;
}

defineProps<{
  active: TabItem["id"];
  items: ReadonlyArray<TabItem>;
}>();

const emit = defineEmits<{
  change: [id: TabItem["id"]];
}>();

function onClick(item: TabItem): void {
  if (item.disabled) return;
  emit("change", item.id);
}
</script>

<template>
  <div role="tablist" class="flex items-center gap-hq-1 px-hq-8 border-b border-hairline">
    <button
      v-for="item in items"
      :key="item.id"
      role="tab"
      type="button"
      :aria-selected="active === item.id"
      :aria-disabled="item.disabled === true"
      :aria-controls="`tabpanel-${item.id}`"
      :tabindex="item.disabled ? -1 : 0"
      :title="item.disabled ? item.comingSoon : undefined"
      class="relative flex items-center gap-hq-2 px-hq-3 py-hq-2 font-jp text-sm transition-colors"
      :class="[
        active === item.id
          ? 'text-ink font-medium'
          : item.disabled
            ? 'text-muted opacity-50 cursor-not-allowed'
            : 'text-muted hover:text-ink',
      ]"
      @click="onClick(item)"
    >
      {{ item.label }}
      <span
        v-if="item.count !== undefined"
        class="font-mono text-[10px] leading-none"
        :class="
          item.emphasizeCount
            ? 'bg-accent text-paper font-medium rounded-hq-pill px-hq-2 py-px'
            : 'text-muted'
        "
        :data-emphasized="item.emphasizeCount === true ? 'true' : undefined"
        data-testid="tab-count"
      >
        {{ item.count }}
      </span>
      <span
        v-if="active === item.id"
        class="absolute -bottom-px left-0 right-0 h-px bg-accent"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
