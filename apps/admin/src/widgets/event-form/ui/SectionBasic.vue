<script setup lang="ts">
import { ref, watch } from "vue";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import Label from "@/shared/ui/Label.vue";
import Select from "@/shared/ui/Select.vue";
import SelectTrigger from "@/shared/ui/SelectTrigger.vue";
import SelectValue from "@/shared/ui/SelectValue.vue";
import SelectContent from "@/shared/ui/SelectContent.vue";
import SelectItem from "@/shared/ui/SelectItem.vue";
import { Badge } from "@high-q/ui";
import type { EventFormState, ValidationErrors } from "../model/eventFormSchema";
import type { VenueOption } from "@/entities/venue";

/**
 * 01 基本情報セクション。タイトル / 開催日 / 開始 / 終了 / 会場 / 参加費の
 * 6 フィールドを束ねる。
 *
 * 時刻入力は「時」「分」の 2 つの select に分割し、分は 00 / 15 / 30 / 45 の
 * 4 択固定（翔太郎くん要望、2026-05-01）。state 上は引き続き "HH:mm" 文字列で
 * 保持する。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (§5.1, §6)
 */

const props = defineProps<{
  modelValue: EventFormState;
  errors: ValidationErrors;
  venues: ReadonlyArray<VenueOption>;
  /** タイトル placeholder（ゆる練 vol.NN+1 補完）。 */
  namePlaceholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: EventFormState];
}>();

function update<K extends keyof EventFormState>(
  key: K,
  value: EventFormState[K],
): void {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

const PRESETS = [500, 1000] as const;

const isPresetActive = (n: number) => Number(props.modelValue.fee) === n;

function selectPreset(n: number): void {
  update("fee", String(n));
}

// 時刻 select の選択肢
const HOURS: ReadonlyArray<string> = Array.from({ length: 18 }, (_, i) =>
  String(i + 6).padStart(2, "0"),
); // "06" 〜 "23"
const MINUTES = ["00", "15", "30", "45"] as const;

function splitTime(value: string): { h: string; m: string } {
  if (!/^\d{2}:\d{2}$/.test(value)) return { h: "", m: "" };
  const [h, m] = value.split(":") as [string, string];
  return { h, m };
}

function joinTime(h: string, m: string): string {
  if (h.length === 0 || m.length === 0) return "";
  return `${h}:${m}`;
}

// 時 / 分の途中状態をローカルに保持する。modelValue.startTime に書き戻すと
// 「片方だけ選んだ」中間状態が失われ（"" が emit され reset される）、両方
// 選び切るまで反対側の値が永久に空のまま emit され続ける問題を防ぐ。
const startHour = ref(splitTime(props.modelValue.startTime).h);
const startMinute = ref(splitTime(props.modelValue.startTime).m);
const endHour = ref(splitTime(props.modelValue.endTime).h);
const endMinute = ref(splitTime(props.modelValue.endTime).m);

// 親から modelValue が外部要因で変わった時（Edit mode の hydrate / reset）
// にローカル ref を再同期する。
watch(
  () => props.modelValue.startTime,
  (v) => {
    const p = splitTime(v);
    if (startHour.value !== p.h) startHour.value = p.h;
    if (startMinute.value !== p.m) startMinute.value = p.m;
  },
);
watch(
  () => props.modelValue.endTime,
  (v) => {
    const p = splitTime(v);
    if (endHour.value !== p.h) endHour.value = p.h;
    if (endMinute.value !== p.m) endMinute.value = p.m;
  },
);

function changeStart(part: "h" | "m", value: string): void {
  if (part === "h") startHour.value = value;
  else startMinute.value = value;
  update("startTime", joinTime(startHour.value, startMinute.value));
}

function changeEnd(part: "h" | "m", value: string): void {
  if (part === "h") endHour.value = value;
  else endMinute.value = value;
  update("endTime", joinTime(endHour.value, endMinute.value));
}

const timeSelectClass =
  "flex h-9 w-full items-center justify-between rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-2 text-sm font-jp text-ink shadow-hq-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 appearance-none";
</script>

<template>
  <div class="grid grid-cols-1 gap-hq-4">
    <!-- タイトル -->
    <FormField :error="errors.name">
      <template #default="{ fieldId, messageId, ariaInvalid }">
        <Label :html-for="fieldId">
          タイトル
          <span class="text-danger" aria-hidden="true">*</span>
        </Label>
        <Input
          :id="fieldId"
          :model-value="modelValue.name"
          required
          aria-required="true"
          :aria-invalid="ariaInvalid"
          :aria-describedby="messageId"
          :placeholder="namePlaceholder"
          :disabled="disabled"
          maxlength="100"
          @update:model-value="(v: string | number) => update('name', String(v))"
        />
      </template>
    </FormField>

    <!-- 開催日 / 開始 / 終了 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-hq-3">
      <FormField :error="errors.date">
        <template #default="{ fieldId, messageId, ariaInvalid }">
          <Label :html-for="fieldId">
            開催日
            <span class="text-danger" aria-hidden="true">*</span>
          </Label>
          <Input
            :id="fieldId"
            type="date"
            :model-value="modelValue.date"
            required
            aria-required="true"
            :aria-invalid="ariaInvalid"
            :aria-describedby="messageId"
            :disabled="disabled"
            @update:model-value="(v: string | number) => update('date', String(v))"
          />
        </template>
      </FormField>

      <FormField :error="errors.startTime">
        <template #default="{ fieldId, messageId, ariaInvalid }">
          <Label :html-for="fieldId">
            開始
            <span class="text-danger" aria-hidden="true">*</span>
          </Label>
          <div class="flex items-center gap-hq-2">
            <select
              :id="fieldId"
              :class="timeSelectClass"
              :value="startHour"
              required
              aria-required="true"
              aria-label="開始時刻（時）"
              :aria-invalid="ariaInvalid"
              :aria-describedby="messageId"
              :disabled="disabled"
              @change="(e) => changeStart('h', (e.target as HTMLSelectElement).value)"
            >
              <option value="">--</option>
              <option v-for="h in HOURS" :key="h" :value="h">{{ h }}</option>
            </select>
            <span class="font-mono text-muted" aria-hidden="true">:</span>
            <select
              :class="timeSelectClass"
              :value="startMinute"
              required
              aria-required="true"
              aria-label="開始時刻（分）"
              :aria-invalid="ariaInvalid"
              :disabled="disabled"
              @change="(e) => changeStart('m', (e.target as HTMLSelectElement).value)"
            >
              <option value="">--</option>
              <option v-for="m in MINUTES" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </template>
      </FormField>

      <FormField :error="errors.endTime">
        <template #default="{ fieldId, messageId, ariaInvalid }">
          <Label :html-for="fieldId">
            終了
            <span class="text-danger" aria-hidden="true">*</span>
          </Label>
          <div class="flex items-center gap-hq-2">
            <select
              :id="fieldId"
              :class="timeSelectClass"
              :value="endHour"
              required
              aria-required="true"
              aria-label="終了時刻（時）"
              :aria-invalid="ariaInvalid"
              :aria-describedby="messageId"
              :disabled="disabled"
              @change="(e) => changeEnd('h', (e.target as HTMLSelectElement).value)"
            >
              <option value="">--</option>
              <option v-for="h in HOURS" :key="h" :value="h">{{ h }}</option>
            </select>
            <span class="font-mono text-muted" aria-hidden="true">:</span>
            <select
              :class="timeSelectClass"
              :value="endMinute"
              required
              aria-required="true"
              aria-label="終了時刻（分）"
              :aria-invalid="ariaInvalid"
              :disabled="disabled"
              @change="(e) => changeEnd('m', (e.target as HTMLSelectElement).value)"
            >
              <option value="">--</option>
              <option v-for="m in MINUTES" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </template>
      </FormField>
    </div>

    <!-- 会場 -->
    <FormField :error="errors.venueId">
      <template #default="{ fieldId, messageId, ariaInvalid }">
        <Label :html-for="fieldId">
          会場
          <span class="text-danger" aria-hidden="true">*</span>
        </Label>
        <Select
          :model-value="modelValue.venueId"
          :disabled="disabled"
          @update:model-value="(v: string) => update('venueId', v)"
        >
          <SelectTrigger
            :id="fieldId"
            :aria-invalid="ariaInvalid"
            :aria-describedby="messageId"
            aria-required="true"
          >
            <SelectValue placeholder="会場を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="v in venues"
              :key="v.id"
              :value="(v.id as unknown as string)"
            >
              {{ v.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
    </FormField>

    <!-- 参加費 -->
    <FormField :error="errors.fee" :hint="errors.fee ? undefined : '空欄なら会場の標準参加費が継承されます'">
      <template #default="{ fieldId, messageId, ariaInvalid }">
        <Label :html-for="fieldId">参加費</Label>
        <div class="flex gap-hq-2 mb-hq-2">
          <button
            v-for="n in PRESETS"
            :key="n"
            type="button"
            class="cursor-pointer disabled:cursor-not-allowed"
            :disabled="disabled"
            @click="selectPreset(n)"
          >
            <Badge :tone="isPresetActive(n) ? 'accent' : 'neutral'">
              ¥{{ n.toLocaleString() }}
            </Badge>
          </button>
        </div>
        <Input
          :id="fieldId"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          :model-value="modelValue.fee"
          :aria-invalid="ariaInvalid"
          :aria-describedby="messageId"
          :disabled="disabled"
          placeholder="自由入力（円）"
          @update:model-value="(v: string | number) => update('fee', String(v))"
        />
      </template>
    </FormField>

    <!-- 定員 -->
    <FormField
      :error="errors.capacity"
      :hint="errors.capacity ? undefined : '空欄なら上限なし（先着の締切なし）で募集します'"
    >
      <template #default="{ fieldId, messageId, ariaInvalid }">
        <Label :html-for="fieldId">定員</Label>
        <Input
          :id="fieldId"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          :model-value="modelValue.capacity"
          :aria-invalid="ariaInvalid"
          :aria-describedby="messageId"
          :disabled="disabled"
          placeholder="上限なし（名）"
          @update:model-value="(v: string | number) => update('capacity', String(v))"
        />
      </template>
    </FormField>
  </div>
</template>
