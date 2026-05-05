import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h, defineComponent } from "vue";
import Dialog from "./Dialog.vue";
import DialogTrigger from "./DialogTrigger.vue";
import DialogContent from "./DialogContent.vue";
import DialogHeader from "./DialogHeader.vue";
import DialogFooter from "./DialogFooter.vue";
import DialogTitle from "./DialogTitle.vue";
import DialogDescription from "./DialogDescription.vue";
import DialogClose from "./DialogClose.vue";

const Harness = defineComponent({
  components: {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
  },
  props: { open: { type: Boolean, default: false } },
  setup(props) {
    return () =>
      h(Dialog, { open: props.open }, () => [
        h(DialogTrigger, null, () => "Open Dialog"),
        h(DialogContent, null, () => [
          h(DialogHeader, null, () => [
            h(DialogTitle, null, () => "Image Preview"),
            h(DialogDescription, null, () => "Zoom and inspect the image"),
          ]),
          h(DialogFooter, null, () => [
            h(DialogClose, null, () => "Close Footer"),
          ]),
        ]),
      ]);
  },
});

describe("Dialog primitives (画像プレビュー Modal #171)", () => {
  it("open=false で content がドキュメントに無い", () => {
    mount(Harness, { props: { open: false }, attachTo: document.body });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("open=true で role='dialog' の content が描画される", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  });

  it("open=true で role='alertdialog' は描画されない (AlertDialog と区別)", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("title / description が描画される", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.textContent).toContain("Image Preview");
    expect(document.body.textContent).toContain("Zoom and inspect the image");
  });

  it("DialogContent 右上に aria-label='閉じる' の close ボタン (X) が組み込まれている", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    const closeBtn = document.querySelector('[aria-label="閉じる"]');
    expect(closeBtn).not.toBeNull();
  });

  it("DialogClose (footer 内) も描画される", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.textContent).toContain("Close Footer");
  });

  it("DialogContent には fixed positioning と z-50 が付与される (overlay と組み合わせ可能)", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    const content = document.querySelector('[role="dialog"]');
    expect(content?.className).toContain("fixed");
    expect(content?.className).toContain("z-50");
  });
});
