import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import type { MemberId } from "@high-q/shared";

vi.mock("@/entities/member", async () => {
  const actual =
    await vi.importActual<typeof import("@/entities/member")>("@/entities/member");
  return {
    ...actual,
    updateMemberAdminNote: vi.fn(),
  };
});

import { updateMemberAdminNote } from "@/entities/member";
import {
  ADMIN_NOTE_MAX_LENGTH,
  useAdminNoteEdit,
} from "./useAdminNoteEdit";

const MEMBER_ID = "00000000-0000-0000-0000-000000000001" as unknown as MemberId;

function harness(
  initial: string | null,
  onSaved?: (note: string | null) => void,
  onError?: (e: { code: string; message: string }) => void,
): ReturnType<typeof useAdminNoteEdit> {
  let captured!: ReturnType<typeof useAdminNoteEdit>;
  const Harness = defineComponent({
    setup() {
      captured = useAdminNoteEdit({
        memberId: MEMBER_ID,
        initialValue: initial,
        onSaved,
        onError: onError as (e: { code: string; message: string }) => void,
      });
      return () => h("div");
    },
  });
  mount(Harness);
  return captured;
}

beforeEach(() => {
  vi.mocked(updateMemberAdminNote).mockReset();
});

describe("useAdminNoteEdit", () => {
  it("初期値を value に反映する", () => {
    const e = harness("左利き");
    expect(e.value.value).toBe("左利き");
    expect(e.isDirty.value).toBe(false);
  });

  it("500 文字超で canSave = false", () => {
    const e = harness("");
    e.value.value = "a".repeat(ADMIN_NOTE_MAX_LENGTH + 1);
    expect(e.isOverLimit.value).toBe(true);
    expect(e.canSave.value).toBe(false);
  });

  it("変更なしで canSave = false", () => {
    const e = harness("a");
    expect(e.isDirty.value).toBe(false);
    expect(e.canSave.value).toBe(false);
  });

  it("変更ありかつ範囲内で canSave = true", () => {
    const e = harness("a");
    e.value.value = "ab";
    expect(e.canSave.value).toBe(true);
  });

  it("save 成功で onSaved を normalized 値で呼ぶ (空文字 → null)", async () => {
    vi.mocked(updateMemberAdminNote).mockResolvedValue({
      ok: true,
      value: undefined,
    });
    const onSaved = vi.fn();
    const e = harness("初期値", onSaved);
    e.value.value = "";
    await e.save();
    expect(updateMemberAdminNote).toHaveBeenCalledWith(MEMBER_ID, null);
    expect(onSaved).toHaveBeenCalledWith(null);
    expect(e.isSaving.value).toBe(false);
  });

  it("save 失敗で onError を呼び、errorMessage がセットされる", async () => {
    vi.mocked(updateMemberAdminNote).mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "denied" },
    });
    const onError = vi.fn();
    const e = harness("a", undefined, onError);
    e.value.value = "ab";
    await e.save();
    expect(onError).toHaveBeenCalled();
    expect(e.errorMessage.value).toBe("denied");
    expect(e.isSaving.value).toBe(false);
  });

  it("resetToInitial で初期値に戻り errorMessage がクリアされる", () => {
    const e = harness("a");
    e.value.value = "ab";
    e.errorMessage.value = "boom";
    e.resetToInitial();
    expect(e.value.value).toBe("a");
    expect(e.errorMessage.value).toBeNull();
  });
});
