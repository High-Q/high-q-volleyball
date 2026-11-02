import { describe, expect, it } from "vitest";
import type { MemberId } from "@high-q/shared";
import { useMembersSelection } from "./useMembersSelection";

const id = (s: string) => s as unknown as MemberId;

describe("useMembersSelection", () => {
  it("初期状態は空（count 0）", () => {
    const s = useMembersSelection();
    expect(s.count.value).toBe(0);
    expect(s.toArray()).toEqual([]);
  });

  it("add / isSelected / remove", () => {
    const s = useMembersSelection();
    s.add(id("m1"));
    expect(s.isSelected(id("m1"))).toBe(true);
    expect(s.count.value).toBe(1);
    s.remove(id("m1"));
    expect(s.isSelected(id("m1"))).toBe(false);
    expect(s.count.value).toBe(0);
  });

  it("toggle は追加と解除を交互に行う", () => {
    const s = useMembersSelection();
    s.toggle(id("m1"));
    expect(s.isSelected(id("m1"))).toBe(true);
    s.toggle(id("m1"));
    expect(s.isSelected(id("m1"))).toBe(false);
  });

  it("clear で全解除", () => {
    const s = useMembersSelection();
    s.add(id("m1"));
    s.add(id("m2"));
    s.clear();
    expect(s.count.value).toBe(0);
  });

  it("setPageSelection(true) で現ページを全選択、(false) で全解除", () => {
    const s = useMembersSelection();
    const page = [id("m1"), id("m2"), id("m3")];
    s.setPageSelection(page, true);
    expect(s.count.value).toBe(3);
    expect(s.pageAllSelected(page)).toBe(true);
    s.setPageSelection(page, false);
    expect(s.count.value).toBe(0);
  });

  it("pageIndeterminate は一部選択のとき true", () => {
    const s = useMembersSelection();
    const page = [id("m1"), id("m2"), id("m3")];
    expect(s.pageIndeterminate(page)).toBe(false);
    s.add(id("m2"));
    expect(s.pageIndeterminate(page)).toBe(true);
    expect(s.pageAllSelected(page)).toBe(false);
    s.setPageSelection(page, true);
    expect(s.pageIndeterminate(page)).toBe(false);
  });

  it("空ページでは allSelected も indeterminate も false", () => {
    const s = useMembersSelection();
    expect(s.pageAllSelected([])).toBe(false);
    expect(s.pageIndeterminate([])).toBe(false);
  });

  it("ページ・フィルタをまたいでも選択を保持する", () => {
    const s = useMembersSelection();
    const page1 = [id("m1"), id("m2")];
    const page2 = [id("m3"), id("m4")];
    s.setPageSelection(page1, true);
    // ページ 2 へ移動して 1 件選択
    s.add(id("m3"));
    // ページ 1 の選択は残っている
    expect(s.isSelected(id("m1"))).toBe(true);
    expect(s.isSelected(id("m2"))).toBe(true);
    expect(s.count.value).toBe(3);
    expect(s.pageAllSelected(page2)).toBe(false);
  });
});
