<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { Button } from "@high-q/ui";
import type { Event } from "@high-q/shared";
import { useVenues } from "@/entities/venue";
import FormSection from "./FormSection.vue";
import SectionBasic from "./SectionBasic.vue";
import { useEventForm, type EventFormMode } from "../composables/useEventForm";
import type { EventFormState } from "../model/eventFormSchema";

/**
 * イベントの作成 / 編集を共有するフォーム widget。`mode` props で挙動分岐。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D1)
 *   openspec/changes/admin-event-duplicate/design.md (D2, D5)
 *
 * NOTE: 削除ボタンは widget 内部で feature を直接 import せず、`headerActions`
 *       slot で受け取る。Edit 画面は EventDeleteDialog をそこに差し込む。
 */

const props = withDefaults(
  defineProps<{
    mode: EventFormMode;
    initialEvent?: Event | null;
    eventId?: string;
    /** Create mode で複製元を下敷きにするときのシード初期 state。 */
    seedEvent?: EventFormState | null;
    /** 複製元イベント名。指定時は「複製して作成中」の手がかりを表示する。 */
    duplicateSourceName?: string | null;
    /**
     * 編集時の現在の有効予約人数（本人 + 同伴）。定員下限バリデーションに使う。
     * 非同期取得のため null も許容（取得中 / 取得失敗時は下限チェックをスキップ）。
     */
    reservedCount?: number | null;
  }>(),
  {
    initialEvent: null,
    eventId: undefined,
    seedEvent: null,
    duplicateSourceName: null,
    reservedCount: null,
  },
);

const router = useRouter();
const { venues } = useVenues();

// 編集時のみ確定済み回号を読み取り専用表示する (create では自動採番前のため非表示)。
const vol = computed<number | null | undefined>(() =>
  props.mode === "edit" ? (props.initialEvent?.vol ?? null) : undefined,
);

const f = useEventForm({
  mode: props.mode,
  initialEvent: props.initialEvent ?? undefined,
  eventId: props.eventId,
  seedState: props.seedEvent ?? undefined,
  reservedCount: () => props.reservedCount,
});

const headerTitle = computed(() =>
  props.mode === "create"
    ? "新規イベント"
    : (props.initialEvent?.name ?? "イベントを編集"),
);

async function handleCancel() {
  if (f.isDirty.value) {
    const ok = window.confirm("変更を破棄して一覧に戻りますか？");
    if (!ok) return;
  }
  await router.push("/events");
}
</script>

<template>
  <article class="bg-paper min-h-screen">
    <!-- ヘッダ -->
    <header
      class="sticky top-0 z-10 bg-paper border-b border-hairline px-hq-6 py-hq-4 flex items-center justify-between gap-hq-3 flex-wrap"
    >
      <div class="flex flex-col gap-hq-1 min-w-0">
        <PageBreadcrumb
          :items="[
            { label: 'Workspace', to: { name: 'dashboard' } },
            { label: 'Events', to: { name: 'events' } },
            { label: mode === 'create' ? '新規作成' : '編集' },
          ]"
        />
        <h2 class="font-jp text-base font-medium text-ink truncate">
          {{ headerTitle }}
        </h2>
      </div>
      <div class="flex items-center gap-hq-2 flex-wrap">
        <slot name="headerActions" :is-submitting="f.isSubmitting.value" />
        <Button
          v-if="mode === 'create'"
          variant="outline"
          size="sm"
          :disabled="f.isSubmitting.value"
          @click="handleCancel"
        >
          キャンセル
        </Button>
        <Button
          variant="primary"
          size="sm"
          :loading="f.isSubmitting.value"
          :disabled="f.isSubmitting.value"
          @click="f.submit()"
        >
          保存
        </Button>
      </div>
    </header>

    <!-- 複製して作成中の手がかり -->
    <div
      v-if="mode === 'create' && duplicateSourceName"
      class="mx-hq-6 mt-hq-4 rounded-hq-sm border border-accent/40 bg-accent-soft px-hq-4 py-hq-3 font-jp text-sm text-accent"
    >
      「{{ duplicateSourceName }}」を複製して作成中です。開催日を選び直してください。
    </div>

    <!-- 保存失敗時の Banner -->
    <div
      v-if="f.submitError.value"
      role="alert"
      class="mx-hq-6 mt-hq-4 rounded-hq-sm border border-danger/40 bg-danger-soft px-hq-4 py-hq-3 font-jp text-sm text-danger"
    >
      保存に失敗しました（ERR · supabase / events ·
      {{ f.submitError.value.code }}）
    </div>

    <!-- 本体 -->
    <div class="px-hq-6 pb-hq-8">
      <FormSection
        kicker="01"
        title="基本情報"
        hint="LP・予約サイトに表示される項目です。"
      >
        <SectionBasic
          :model-value="f.state"
          :errors="f.displayErrors.value"
          :venues="venues"
          :vol="vol"
          :disabled="f.isSubmitting.value"
          @update:model-value="
            (v) => {
              Object.assign(f.state, v);
            }
          "
        />
      </FormSection>
    </div>
  </article>
</template>
