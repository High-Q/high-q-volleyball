import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h, defineComponent } from "vue";
import AlertDialog from "./AlertDialog.vue";
import AlertDialogTrigger from "./AlertDialogTrigger.vue";
import AlertDialogContent from "./AlertDialogContent.vue";
import AlertDialogHeader from "./AlertDialogHeader.vue";
import AlertDialogFooter from "./AlertDialogFooter.vue";
import AlertDialogTitle from "./AlertDialogTitle.vue";
import AlertDialogDescription from "./AlertDialogDescription.vue";
import AlertDialogAction from "./AlertDialogAction.vue";
import AlertDialogCancel from "./AlertDialogCancel.vue";

const Harness = defineComponent({
  components: {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
  },
  props: { open: { type: Boolean, default: false } },
  setup(props) {
    return () =>
      h(AlertDialog, { open: props.open }, () => [
        h(AlertDialogTrigger, null, () => "Open"),
        h(AlertDialogContent, null, () => [
          h(AlertDialogHeader, null, () => [
            h(AlertDialogTitle, null, () => "Title"),
            h(AlertDialogDescription, null, () => "Description"),
          ]),
          h(AlertDialogFooter, null, () => [
            h(AlertDialogCancel, null, () => "Cancel"),
            h(AlertDialogAction, null, () => "Delete"),
          ]),
        ]),
      ]);
  },
});

describe("AlertDialog primitives", () => {
  it("open=false で content がドキュメントに無い", () => {
    mount(Harness, { props: { open: false }, attachTo: document.body });
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("open=true で role='alertdialog' の content が描画される", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
  });

  it("title / description / action / cancel が描画される", async () => {
    mount(Harness, { props: { open: true }, attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.textContent).toContain("Title");
    expect(document.body.textContent).toContain("Description");
    expect(document.body.textContent).toContain("Cancel");
    expect(document.body.textContent).toContain("Delete");
  });
});
