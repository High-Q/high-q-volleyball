<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Kicker } from "@high-q/ui";
import type { ExperienceLevel, MemberId } from "@/entities/member";
import { useLevelEdit } from "../composables/useLevelEdit";

const props = defineProps<{
  memberId: MemberId;
  initialLevel: ExperienceLevel;
}>();

type Option = {
  value: ExperienceLevel;
  label: string;
  sub: string;
};

const OPTIONS: ReadonlyArray<Option> = [
  { value: "beginner", label: "初めて", sub: "バレー自体が初めて、または久しぶり" },
  { value: "intermediate", label: "中級", sub: "基礎ができる・経験 1〜3 年程度" },
  { value: "experienced", label: "経験者", sub: "部活・社会人歴あり" },
];

const selected = ref<ExperienceLevel>(props.initialLevel);
watch(
  () => props.initialLevel,
  (v) => {
    selected.value = v;
  },
);

const { saving, error, save } = useLevelEdit();

async function onChoose(level: ExperienceLevel): Promise<void> {
  if (saving.value) return;
  if (level === selected.value) return;
  const previous = selected.value;
  selected.value = level;
  const ok = await save(props.memberId, level);
  if (!ok) {
    selected.value = previous;
  }
}

const radiosLabel = computed(() => "経験レベルを選択");
</script>

<template>
  <section class="flex flex-col gap-hq-3" aria-label="経験レベル">
    <Kicker color="muted">— LEVEL · 経験レベル</Kicker>
    <div
      class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-4"
    >
      <p class="font-jp text-sm text-muted m-0 leading-relaxed">
        当日のチーム分けと、初心者向けイベントのご案内に使います。いつでも変更できます。
      </p>
      <div
        role="radiogroup"
        :aria-label="radiosLabel"
        class="flex flex-col gap-hq-2"
      >
        <label
          v-for="opt in OPTIONS"
          :key="opt.value"
          class="flex items-start gap-hq-3 px-hq-3 py-hq-3 rounded-hq-md cursor-pointer border transition-colors"
          :class="
            opt.value === selected
              ? 'bg-accent-soft border-accent'
              : 'bg-paper border-hairline hover:border-muted'
          "
        >
          <input
            type="radio"
            class="sr-only"
            name="experience_level"
            :value="opt.value"
            :checked="opt.value === selected"
            :disabled="saving"
            @change="onChoose(opt.value)"
          />
          <span
            aria-hidden="true"
            class="inline-flex items-center justify-center rounded-full shrink-0 mt-hq-1"
            style="width: 16px; height: 16px;"
            :class="
              opt.value === selected
                ? 'border-2 border-accent bg-paper'
                : 'border border-muted bg-paper'
            "
          >
            <span
              v-if="opt.value === selected"
              class="rounded-full bg-accent"
              style="width: 8px; height: 8px;"
            />
          </span>
          <span class="flex-1 min-w-0">
            <span
              class="block font-jp text-sm"
              :class="
                opt.value === selected ? 'text-accent font-semibold' : 'text-ink'
              "
            >{{ opt.label }}</span>
            <span class="block font-jp text-xs text-muted mt-hq-1">{{ opt.sub }}</span>
          </span>
        </label>
      </div>
      <p
        v-if="error !== null"
        role="alert"
        class="font-jp text-xs text-error m-0"
      >{{ error }}</p>
    </div>
  </section>
</template>
