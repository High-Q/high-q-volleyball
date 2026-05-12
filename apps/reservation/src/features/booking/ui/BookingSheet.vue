<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
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
import type {
  BookingDraft,
  Reservation,
  ReservationId,
} from "@/entities/reservation";
import type { BookingFormErrors } from "./BookingForm.vue";
import BookingForm from "./BookingForm.vue";
import BookingTotalCard from "./BookingTotalCard.vue";
import { useBookingDraft } from "../composables/useBookingDraft";
import { useCreateBooking } from "../composables/useCreateBooking";
import { useUpdateBooking } from "../composables/useUpdateBooking";
import { isCancellable } from "../composables/useCancelBooking";
import {
  HIGH_Q_OPEN_CHAT_NAME,
  HIGH_Q_OPEN_CHAT_URL,
} from "@/shared/lib/contact-channels";

/**
 * 予約 Bottom Sheet。
 *
 * - `mode='create'`: 新規予約 (reservations への INSERT)。localStorage 復元あり。
 *   イベント詳細画面の「予約に進む」CTA で開き、確定 = 完了画面へ router.push。
 * - `mode='edit'`: 既存予約の同伴者数 / 連絡事項の編集 (UPDATE)。localStorage は使わない。
 *   予約詳細画面の「予約内容を変更する」CTA で開き、確定 = sheet を閉じて saved を emit。
 *
 * 関連:
 *   openspec/changes/reservation-detail-edit/specs/reservation-booking-flow/spec.md
 */

type Mode = "create" | "edit";

type EditPayload = {
  reservationId: ReservationId;
  initialGuestCount: number;
  initialNote: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    event: EventDetail;
    mode?: Mode;
    /** edit モード時のみ必須 */
    edit?: EditPayload;
  }>(),
  { mode: "create" },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved", reservation: Reservation): void;
}>();

const router = useRouter();
const session = useAuthSession();

const eventIdRef = computed(() => props.event.id as unknown as string);
const endAtRef = computed(() => props.event.endAt);

// create モード専用 draft (localStorage 連動)。edit モードでは触らない。
const createDraftCtl = useBookingDraft(eventIdRef, endAtRef);

// edit モード専用 draft (localStorage 非連動)。open 時に props 値で初期化。
const editDraft = reactive<BookingDraft>({
  guestCount: 0,
  note: "",
  phone: undefined,
});

const draft = computed(() =>
  props.mode === "edit" ? editDraft : createDraftCtl.draft,
);

watch(
  () => [
    props.open,
    props.mode,
    props.edit?.initialGuestCount,
    props.edit?.initialNote,
  ],
  () => {
    if (props.mode === "edit" && props.open && props.edit !== undefined) {
      editDraft.guestCount = props.edit.initialGuestCount;
      editDraft.note = props.edit.initialNote;
    }
  },
  { immediate: true },
);

const createBooking = useCreateBooking();
const updateBooking = useUpdateBooking();

const formErrors = ref<BookingFormErrors>({});

const editLocked = computed(() =>
  props.mode === "edit" ? !isCancellable(props.event.startAt) : false,
);

const isDirty = computed(() => {
  if (props.mode !== "edit" || props.edit === undefined) {
    return true;
  }
  return (
    editDraft.guestCount !== props.edit.initialGuestCount ||
    editDraft.note !== props.edit.initialNote
  );
});

const submitting = computed(() =>
  props.mode === "edit"
    ? updateBooking.submitting.value
    : createBooking.submitting.value,
);

const submitDisabled = computed(() => {
  if (submitting.value) return true;
  if (props.mode === "edit") {
    return editLocked.value || !isDirty.value;
  }
  return false;
});

const submissionErrorMessage = computed(() => {
  const e =
    props.mode === "edit"
      ? updateBooking.error.value
      : createBooking.error.value;
  switch (e) {
    case "duplicate":
      return "このイベントには既に予約済みです。";
    case "rls":
      return props.mode === "edit"
        ? "この予約は変更できません。"
        : "予約に失敗しました。お手数ですが再度お試しください。";
    case "not_editable":
      // 期限切れ案内は別ブロックで表示するため、エラーバナーには出さない
      return null;
    case "not_cancellable":
      return null;
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
      updateBooking.reset();
    }
  },
);

const titleText = computed(() =>
  props.mode === "edit"
    ? "変更したい箇所を\n編集してください。"
    : "内容に間違いがないか\nご確認ください。",
);
const descriptionText = computed(() =>
  props.mode === "edit"
    ? "下記を編集のうえ、「変更を保存する」を押してください。"
    : "下記を確認のうえ、「予約を確定する」を押してください。",
);
const submitLabel = computed(() => {
  if (props.mode === "edit") {
    return submitting.value ? "保存中..." : "変更を保存する";
  }
  return submitting.value ? "確定中..." : "予約を確定する";
});
const kickerText = computed(() => (props.mode === "edit" ? "— Edit" : "— Review"));

function validate(): boolean {
  const next: BookingFormErrors = {};
  const d = draft.value;
  if (d.guestCount < 0 || d.guestCount > 5) {
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

  if (props.mode === "edit" && props.edit !== undefined) {
    const result = await updateBooking.update(
      {
        reservationId: props.edit.reservationId,
        memberId: unsafeMemberId(m.id as unknown as string),
        guestCount: editDraft.guestCount,
        note: editDraft.note,
      },
      props.event.startAt,
    );
    if (result !== null) {
      emit("saved", result);
      emit("update:open", false);
    }
    return;
  }

  // create
  const result = await createBooking.create({
    eventId: props.event.id,
    memberId: unsafeMemberId(m.id as unknown as string),
    guestCount: createDraftCtl.draft.guestCount,
    note: createDraftCtl.draft.note,
    // members.phone は signup-profile で必須入力済 (実質常に非 NULL)。
    phoneAtBooking: m.phone ?? "",
  });

  if (result !== null) {
    createDraftCtl.clear();
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
        <Kicker>{{ kickerText }}</Kicker>
        <SheetTitle>
          <template
            v-for="(line, i) in titleText.split('\n')"
            :key="i"
          >
            {{ line }}<br v-if="i < titleText.split('\n').length - 1" />
          </template>
        </SheetTitle>
        <SheetDescription>
          {{ descriptionText }}
        </SheetDescription>
      </div>

      <BookingForm :draft="draft" :errors="formErrors" />

      <BookingTotalCard :fee="event.fee" :guest-count="draft.guestCount" />

      <p
        v-if="editLocked"
        class="font-jp text-xs text-ink bg-paper-warm border border-hairline rounded-hq-md px-hq-3 py-hq-2 m-0"
        role="status"
        data-testid="edit-locked-notice"
      >
        キャンセル期限 (開催前日中) を過ぎているため変更できません。やむを得ない事情がある場合は、LINE オープンチャット
        <a
          :href="HIGH_Q_OPEN_CHAT_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent underline underline-offset-2"
        >「{{ HIGH_Q_OPEN_CHAT_NAME }}」</a>
        までご連絡ください。
      </p>

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
          :disabled="submitting"
          @click="close"
        >
          戻る
        </Button>
        <Button
          variant="ink"
          size="md"
          class="flex-1"
          :disabled="submitDisabled"
          @click="onSubmit"
        >
          {{ submitLabel }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
