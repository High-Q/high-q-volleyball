<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import { unsafeMemberId } from "@high-q/shared";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui";
import { useAuthSession } from "@/features/auth";
import type { EventDetail } from "@/entities/event";
import type { BookingFormErrors } from "./BookingForm.vue";
import BookingForm from "./BookingForm.vue";
import BookingTotalCard from "./BookingTotalCard.vue";
import { useBookingDraft } from "../composables/useBookingDraft";
import { useCreateBooking } from "../composables/useCreateBooking";

/**
 * 予約確認 Bottom Sheet。
 *
 * イベント詳細画面の「予約に進む」CTA で開き、確定 = 完了画面へ router.push、
 * sheet を閉じる = 詳細画面に戻る (URL は変わらない、ブラウザ戻る不要)。
 *
 * - 詳細画面のイベント情報は背後に視認できるため、本 sheet では再表示しない
 * - 入力 UI (同伴者数 / 連絡事項) と合計金額カード、確定 / 戻る CTA に純化
 * - phone_at_booking には members.phone をスナップショットとして保存
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/design.md (D11)
 */

const props = defineProps<{
  open: boolean;
  event: EventDetail;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const router = useRouter();
const session = useAuthSession();

const eventIdRef = computed(() => props.event.id as unknown as string);
const endAtRef = computed(() => props.event.endAt);

const { draft, clear } = useBookingDraft(eventIdRef, endAtRef);
const createBooking = useCreateBooking();

const formErrors = ref<BookingFormErrors>({});

const submissionErrorMessage = computed(() => {
  switch (createBooking.error.value) {
    case "duplicate":
      return "このイベントには既に予約済みです。";
    case "rls":
      return "予約に失敗しました。お手数ですが再度お試しください。";
    case "network":
      return "通信エラーが発生しました。時間を置いて再度お試しください。";
    case "unknown":
      return "予期しないエラーが発生しました。";
    default:
      return null;
  }
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      formErrors.value = {};
      createBooking.reset();
    }
  },
);

function validate(): boolean {
  const next: BookingFormErrors = {};
  if (draft.guestCount < 0 || draft.guestCount > 5) {
    next.guestCount = "同伴者人数は 0〜5 名で入力してください。";
  }
  formErrors.value = next;
  return Object.keys(next).length === 0;
}

function close(): void {
  emit("update:open", false);
}

async function onSubmit(): Promise<void> {
  if (!validate()) return;
  const m = session.member.value;
  if (m === null) return;

  const result = await createBooking.create({
    eventId: props.event.id,
    memberId: unsafeMemberId(m.id as unknown as string),
    guestCount: draft.guestCount,
    note: draft.note,
    // members.phone は signup-profile で必須入力済 (実質常に非 NULL)。
    phoneAtBooking: m.phone ?? "",
  });

  if (result !== null) {
    clear();
    emit("update:open", false);
    void router.push({
      name: "booking-done",
      params: { id: eventIdRef.value },
      query: { reservation: result.id as unknown as string },
    });
  }
}
</script>

<template>
  <Sheet :open="props.open" @update:open="emit('update:open', $event)">
    <SheetContent
      class="gap-hq-5"
      @open-auto-focus="(e) => e.preventDefault()"
    >
      <div class="flex flex-col gap-hq-2">
        <Kicker>— Review</Kicker>
        <SheetTitle>
          内容に間違いがないか<br />ご確認ください。
        </SheetTitle>
        <SheetDescription>
          下記を確認のうえ、「予約を確定する」を押してください。
        </SheetDescription>
      </div>

      <BookingForm :draft="draft" :errors="formErrors" />

      <BookingTotalCard :fee="event.fee" :guest-count="draft.guestCount" />

      <p
        v-if="submissionErrorMessage !== null"
        class="font-jp text-xs text-danger m-0"
        role="alert"
      >
        {{ submissionErrorMessage }}
      </p>

      <div class="flex gap-hq-3 pt-hq-2">
        <Button
          variant="ghost"
          size="md"
          :disabled="createBooking.submitting.value"
          @click="close"
        >
          戻る
        </Button>
        <Button
          variant="primary"
          size="md"
          class="flex-1"
          :disabled="createBooking.submitting.value"
          @click="onSubmit"
        >
          {{ createBooking.submitting.value ? "確定中..." : "予約を確定する" }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
