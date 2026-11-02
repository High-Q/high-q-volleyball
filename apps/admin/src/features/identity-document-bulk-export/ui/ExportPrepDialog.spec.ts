import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import ExportPrepDialog from "./ExportPrepDialog.vue";
import type { ExportDialogMember } from "../model/dialog.types";

const members: ExportDialogMember[] = [
  { id: "m1", name: "田中 太郎", phone: "090-1234-5678" },
  { id: "m2", name: "佐藤 花子", phone: "" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

async function mountOpen() {
  const wrapper = mount(ExportPrepDialog, {
    props: { open: true, members },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

describe("ExportPrepDialog", () => {
  it("選択会員の氏名を表示し、電話番号を prefill する", async () => {
    await mountOpen();
    const body = document.body.textContent ?? "";
    expect(body).toContain("田中 太郎");
    expect(body).toContain("佐藤 花子");
    const inputs = document.body.querySelectorAll<HTMLInputElement>(
      "input[type='tel']",
    );
    expect(inputs.length).toBe(2);
    expect(inputs[0]?.value).toBe("090-1234-5678");
    expect(inputs[1]?.value).toBe("");
  });

  it("住所の入力欄は存在しない（入力は電話番号 tel のみ）", async () => {
    await mountOpen();
    // 入力欄は tel のみ。住所用の text 入力は無い
    const allInputs = document.body.querySelectorAll("input");
    const telInputs = document.body.querySelectorAll("input[type='tel']");
    expect(allInputs.length).toBe(2);
    expect(telInputs.length).toBe(2);
  });

  it("ダウンロードで確認済み電話番号を submit する", async () => {
    const wrapper = await mountOpen();
    const inputs = document.body.querySelectorAll<HTMLInputElement>(
      "input[type='tel']",
    );
    inputs[1]!.value = "070-9999";
    inputs[1]!.dispatchEvent(new Event("input"));
    await flushPromises();

    const downloadBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.textContent?.includes("ダウンロード"));
    downloadBtn?.click();
    await flushPromises();

    const emitted = wrapper.emitted("submit");
    expect(emitted).toBeTruthy();
    const payload = emitted?.[0]?.[0] as Record<string, string>;
    expect(payload.m1).toBe("090-1234-5678");
    expect(payload.m2).toBe("070-9999");
  });
});
