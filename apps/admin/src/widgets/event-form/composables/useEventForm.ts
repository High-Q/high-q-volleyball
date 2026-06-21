import { computed, reactive, ref, watch, type ComputedRef, type Ref } from "vue";
import { useRouter } from "vue-router";
import type { Event, EventInsert, VenueId } from "@high-q/shared";
import {
  createEvent,
  updateEvent,
  type FetchError,
  type FetchErrorCode,
} from "@/entities/event";
import { useToast } from "@/shared/ui/useToast";
import {
  emptyEventForm,
  validateEventForm,
  type EventFormState,
  type ValidationErrors,
} from "../model/eventFormSchema";
import { eventToState, toIsoJst } from "../model/eventStateMapper";

/**
 * EventForm の state + 送信ロジック composable。Create / Edit 共通。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D1, D3, D4, §3)
 */

export type EventFormMode = "create" | "edit";

export interface UseEventForm {
  state: EventFormState;
  /** 内部で常に最新のバリデーション結果。表示するかどうかは displayErrors を使う。 */
  errors: ComputedRef<ValidationErrors>;
  /**
   * UI に表示すべきエラー。late validation (Nielsen Norman 等の標準) のため
   * 「保存ボタン押下後」まで空オブジェクトを返す。それ以降は errors と同じ。
   * 入力中の aggressive validation を避け、ユーザーが「未入力エラーで埋め
   * 尽くされる」のを防ぐ。
   */
  displayErrors: ComputedRef<ValidationErrors>;
  isValid: ComputedRef<boolean>;
  isDirty: Ref<boolean>;
  isSubmitting: Ref<boolean>;
  submitError: Ref<{ code: FetchErrorCode; message: string } | null>;
  submit: () => Promise<void>;
  reset: () => void;
}

interface Options {
  mode: EventFormMode;
  /** Edit mode のときの編集対象。Create では undefined。 */
  initialEvent?: Event | null;
  /** Edit 時の対象 id。 */
  eventId?: string;
  /**
   * Create mode で複製元を下敷きにするときのシード初期 state。
   * 指定時は createDefaults の代わりにこれを初期 state とする
   * （会場・時間・参加費を引き継ぎ、開催日は空でシード済み）。
   */
  seedState?: EventFormState | null;
  /** 保存成功時に router 操作を行うかどうか。テストでは false にする手も。 */
  navigate?: boolean;
  /**
   * 編集時の現在の有効予約人数（本人 + 同伴）を返す getter。定員下限バリデーション
   * に使う。非同期取得のため reactive に読めるよう getter で受け取る。
   * 未指定 / undefined / null を返す場合は下限チェックをスキップする（縮退）。
   */
  reservedCount?: () => number | null | undefined;
}

export function useEventForm(options: Options): UseEventForm {
  const router = useRouter();
  const { toast } = useToast();
  const navigate = options.navigate !== false;

  // Create mode のデフォルト: ゆる練の典型的な開催時間 18:00 - 20:00 を初期値
  // にする。ユーザーは大半そのまま使えるので入力負荷を減らせる（翔太郎くん要望）。
  const createDefaults: EventFormState = {
    ...emptyEventForm(),
    startTime: "18:00",
    endTime: "20:00",
  };

  // Edit は対象 event から、Create は複製シード（あれば）→ なければ既定値。
  // dirty 判定の基準スナップショットも下の initialSnapshot で initial に揃うため、
  // 複製シード直後は dirty=false（開催日を埋めた時点で dirty になる）。
  const initial: EventFormState = options.initialEvent
    ? eventToState(options.initialEvent)
    : (options.seedState ?? createDefaults);

  const state = reactive<EventFormState>({ ...initial });
  const initialSnapshot = JSON.stringify(initial);

  const isDirty = ref<boolean>(false);
  const isSubmitting = ref<boolean>(false);
  const submitError = ref<{ code: FetchErrorCode; message: string } | null>(
    null,
  );
  // late validation: submit が押されるまで UI にはエラーを出さない
  const showErrors = ref<boolean>(false);

  const validation = computed(() =>
    validateEventForm(state, {
      reservedCount: options.reservedCount?.() ?? null,
    }),
  );
  const errors = computed<ValidationErrors>(() => validation.value.errors);
  const displayErrors = computed<ValidationErrors>(() =>
    showErrors.value ? validation.value.errors : {},
  );
  const isValid = computed<boolean>(() => validation.value.isValid);

  // dirty 判定: state が initial と異なる
  function recomputeDirty(): void {
    isDirty.value = JSON.stringify(state) !== initialSnapshot;
  }

  // state は reactive なので、setter は parent からの emit で来る。
  // useEventForm 利用側が `state.xxx = y` するたびに dirty を更新したいので、
  // proxy で監視する代わりに `update*` ヘルパーを使うか、watch する。
  // ここでは利用側に「変更時 isDirty を呼んでもらう」より、watch を使う。
  // ただし依存最小化のため computed の評価で副作用は避け、明示的な setter を提供。

  function reset(): void {
    Object.assign(state, initial);
    isDirty.value = false;
    submitError.value = null;
    showErrors.value = false;
  }

  async function submit(): Promise<void> {
    submitError.value = null;
    // 押下した瞬間にバリデーションエラー表示を解禁する。これ以降フィールドを
    // 修正すれば即時に inline エラーが消える（reactive バインドで自然に成立）。
    showErrors.value = true;
    if (!validation.value.isValid) return;

    isSubmitting.value = true;
    try {
      if (options.mode === "create") {
        const insert: EventInsert = {
          name: state.name.trim(),
          start_at: toIsoJst(state.date, state.startTime),
          end_at: toIsoJst(state.date, state.endTime),
          venue_id: state.venueId as VenueId,
          fee: state.fee.trim().length === 0 ? null : Number(state.fee),
          capacity:
            state.capacity.trim().length === 0 ? null : Number(state.capacity),
          email_note:
            state.emailNote.trim().length === 0 ? null : state.emailNote.trim(),
        };
        const result = await createEvent(insert);
        if (!result.ok) {
          submitError.value = result.error;
          toast({
            title: "保存に失敗しました",
            description: `ERR · ${result.error.code}`,
            variant: "destructive",
          });
          return;
        }
        isDirty.value = false;
        // Toast はナビゲーションの「前」に発火する。
        // 理由: useToast は module-level の reactive state に entry を積む。先に
        //   積んでおけば、その後の router.replace で /events に遷移した直後、
        //   App.vue 永続マウントの <Toaster> が同じ entry を v-for で描画する。
        //   逆順（replace を await → toast）だと、await 中に EventCreatePage
        //   コンポーネントが unmount される過程で submit() の続行が安定せず、
        //   実機モバイルで toast 呼び出しに到達しないケースが観測された。
        toast({ title: "保存しました" });
        if (navigate) {
          // Create 成功後は一覧画面に戻る。`replace` で /events/new を履歴から
          // 落とし、戻る操作で意図せず 2 回作成されないようにする。
          await router.replace("/events");
        }
      } else {
        if (!options.eventId) {
          throw new Error("eventId is required for edit mode");
        }
        const result = await updateEvent(options.eventId as never, {
          name: state.name.trim(),
          start_at: toIsoJst(state.date, state.startTime),
          end_at: toIsoJst(state.date, state.endTime),
          venue_id: state.venueId as VenueId,
          fee: state.fee.trim().length === 0 ? null : Number(state.fee),
          capacity:
            state.capacity.trim().length === 0 ? null : Number(state.capacity),
          email_note:
            state.emailNote.trim().length === 0 ? null : state.emailNote.trim(),
        });
        if (!result.ok) {
          submitError.value = result.error;
          toast({
            title: "保存に失敗しました",
            description: `ERR · ${result.error.code}`,
            variant: "destructive",
          });
          return;
        }
        // dirty クリア + initial を更新（次回比較のため）
        Object.assign(initial, state);
        isDirty.value = false;
        // Toast はナビゲーション前に発火（Create と同じ理由 — useEventForm.ts
        // の Create 分岐参照）
        toast({ title: "保存しました" });
        if (navigate) {
          // Edit 成功後も Create と同様に一覧画面へ遷移する (翔太郎くん要望、
          // 2026-05-01)。元の「Edit はその場 stay」設計から変更。
          await router.replace("/events");
        }
      }
    } finally {
      isSubmitting.value = false;
    }
  }

  // state 変更時に dirty を自動再計算する。reactive object 全体を deep watch
  // するため computed ではなく watch を使う。
  watch(state, recomputeDirty, { deep: true });

  // 公開する return
  return {
    state,
    errors,
    displayErrors,
    isValid,
    isDirty,
    isSubmitting,
    submitError,
    submit,
    reset,
  };
}
