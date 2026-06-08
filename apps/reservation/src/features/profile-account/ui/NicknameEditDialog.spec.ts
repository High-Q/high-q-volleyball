import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { unsafeMemberId } from "@high-q/shared";
import NicknameEditDialog from "./NicknameEditDialog.vue";

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    refresh: vi.fn().mockResolvedValue(undefined),
    member: ref(null),
  }),
}));

vi.mock("../api/updateMyAccount", () => ({
  updateMyNickname: vi.fn().mockResolvedValue(undefined),
}));

describe("NicknameEditDialog - ニックネーム公開周知 (Issue #278)", () => {
  it("モーダル本文に「予約イベントの参加者に表示される」旨の補足文が描画される", () => {
    const wrapper = mount(NicknameEditDialog, {
      props: {
        open: true,
        memberId: unsafeMemberId("00000000-0000-0000-0000-000000000001"),
        initialValue: null,
      },
      global: {
        stubs: {
          AlertDialog: { template: "<div><slot /></div>" },
          AlertDialogContent: { template: "<div><slot /></div>" },
          AlertDialogHeader: { template: "<div><slot /></div>" },
          AlertDialogTitle: { template: "<h2><slot /></h2>" },
          AlertDialogDescription: { template: "<p><slot /></p>" },
          AlertDialogFooter: { template: "<div><slot /></div>" },
          FormField: { template: "<div><slot /></div>" },
          Label: { template: "<label><slot /></label>" },
          Input: { template: "<input />" },
          Button: { template: "<button><slot /></button>" },
        },
      },
    });

    const note = wrapper.find('[data-testid="nickname-visibility-note"]');
    expect(note.exists()).toBe(true);
    expect(note.text()).toContain("同じ予約イベントの参加者に表示されます");
    expect(note.text()).toContain("お名前");
    expect(note.text()).toContain("メール");
    expect(note.text()).toContain("電話番号");
  });

  it("nickname 未設定者 (initialValue = null) にも補足文が表示される", () => {
    const wrapper = mount(NicknameEditDialog, {
      props: {
        open: true,
        memberId: unsafeMemberId("00000000-0000-0000-0000-000000000099"),
        initialValue: null,
      },
      global: {
        stubs: {
          AlertDialog: { template: "<div><slot /></div>" },
          AlertDialogContent: { template: "<div><slot /></div>" },
          AlertDialogHeader: { template: "<div><slot /></div>" },
          AlertDialogTitle: { template: "<h2><slot /></h2>" },
          AlertDialogDescription: { template: "<p><slot /></p>" },
          AlertDialogFooter: { template: "<div><slot /></div>" },
          FormField: { template: "<div><slot /></div>" },
          Label: { template: "<label><slot /></label>" },
          Input: { template: "<input />" },
          Button: { template: "<button><slot /></button>" },
        },
      },
    });

    expect(
      wrapper.find('[data-testid="nickname-visibility-note"]').exists(),
    ).toBe(true);
  });
});
