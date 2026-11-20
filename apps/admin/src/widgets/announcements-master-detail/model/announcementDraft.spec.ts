import { describe, expect, it } from "vitest";
import { unsafeAnnouncementId, unsafeMemberId } from "@high-q/shared";
import type { Announcement } from "@/entities/announcement";
import {
  announcementToDraft,
  draftToWrite,
  emptyDraft,
  validateDraft,
  type AnnouncementDraft,
} from "./announcementDraft";

const ANN: Announcement = {
  id: unsafeAnnouncementId("33333333-3333-4333-8333-333333333333"),
  title: "休会のお知らせ",
  body: "本文",
  audience: "all",
  publishStart: "2026-11-18T00:00:00+09:00",
  publishEnd: "2026-11-21T00:00:00+09:00",
  createdBy: unsafeMemberId("22222222-2222-4222-8222-222222222222"),
  createdAt: "2026-11-18T00:00:00Z",
  updatedAt: "2026-11-18T03:00:00Z",
};

function validDraft(): AnnouncementDraft {
  return {
    id: null,
    title: "タイトル",
    body: "本文",
    audience: "public",
    startDate: "2026-11-18",
    endDate: "",
    updated: "",
  };
}

describe("emptyDraft", () => {
  it("開始日は今日・audience 未選択・終了は無期限", () => {
    const d = emptyDraft(new Date("2026-11-18T10:00:00+09:00"));
    expect(d.id).toBeNull();
    expect(d.startDate).toBe("2026-11-18");
    expect(d.endDate).toBe("");
    expect(d.audience).toBe("");
  });
});

describe("announcementToDraft / draftToWrite", () => {
  it("掲載終了は inclusive 日付に戻り、書き戻すと排他的翌日 ISO になる", () => {
    const d = announcementToDraft(ANN);
    expect(d.startDate).toBe("2026-11-18");
    expect(d.endDate).toBe("2026-11-20"); // 排他的上限 11-21T00:00 → 掲載最終日 11-20
    const w = draftToWrite(d);
    expect(w.publishStart).toBe("2026-11-18T00:00:00+09:00");
    expect(w.publishEnd).toBe("2026-11-21T00:00:00+09:00");
    expect(w.audience).toBe("all");
  });

  it("終了日が空なら publishEnd は null（無期限）", () => {
    const w = draftToWrite(validDraft());
    expect(w.publishEnd).toBeNull();
  });
});

describe("validateDraft", () => {
  it("正常なドラフトは valid", () => {
    expect(validateDraft(validDraft()).isValid).toBe(true);
  });

  it("タイトル空は invalid", () => {
    const r = validateDraft({ ...validDraft(), title: "   " });
    expect(r.isValid).toBe(false);
    expect(r.errors.title).toBeDefined();
  });

  it("本文空は invalid", () => {
    const r = validateDraft({ ...validDraft(), body: "" });
    expect(r.errors.body).toBeDefined();
  });

  it("audience 未選択は invalid", () => {
    const r = validateDraft({ ...validDraft(), audience: "" });
    expect(r.errors.audience).toBeDefined();
  });

  it("終了日 < 開始日は invalid", () => {
    const r = validateDraft({
      ...validDraft(),
      startDate: "2026-11-18",
      endDate: "2026-11-17",
    });
    expect(r.errors.endDate).toBeDefined();
  });

  it("終了日 = 開始日は valid（同日掲載）", () => {
    const r = validateDraft({
      ...validDraft(),
      startDate: "2026-11-18",
      endDate: "2026-11-18",
    });
    expect(r.isValid).toBe(true);
  });
});
