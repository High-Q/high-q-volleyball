import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import EventsTable from "./EventsTable.vue";
import type { EventListRow } from "@/entities/event";

const REF_NOW = new Date("2026-04-30T12:00:00+09:00");

const baseRow = (overrides: Partial<EventListRow> = {}): EventListRow => ({
  id: "11111111-1111-4111-8111-111111111111" as EventListRow["id"],
  name: "ゆる練 vol.43",
  description: null,
  start_at: "2026-05-12T19:00:00+09:00",
  end_at: "2026-05-12T21:00:00+09:00",
  venue_id: "22222222-2222-4222-8222-222222222222" as EventListRow["venue_id"],
  venue_name: "亀戸スポーツセンター",
  fee: 1000,
  capacity: 24,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  reserved_count: 6,
  created_at: "2026-04-01T00:00:00+09:00",
  updated_at: "2026-04-01T00:00:00+09:00",
  ...overrides,
});

async function renderTable(props: {
  rows: ReadonlyArray<EventListRow>;
  sort?: "date" | "status";
  dir?: "asc" | "desc";
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/:id/edit",
        name: "edit",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push("/events");
  await router.isReady();
  return mount(EventsTable, {
    props: {
      rows: props.rows,
      sort: props.sort ?? "date",
      dir: props.dir ?? "asc",
      now: REF_NOW,
    },
    global: { plugins: [router] },
  });
}

describe("EventsTable", () => {
  it("8 列のヘッダーを描画する", async () => {
    const wrapper = await renderTable({ rows: [baseRow()] });
    const headers = wrapper.findAll("th");
    const labels = headers.map((h) => h.text().trim());
    expect(labels).toEqual([
      "日付",
      "タイトル",
      "会場",
      "時間",
      "定員",
      "予約",
      "ステータス",
      "操作",
    ]);
  });

  it("aria-sort='ascending' がデフォルトの date 列に付く", async () => {
    const wrapper = await renderTable({
      rows: [baseRow()],
      sort: "date",
      dir: "asc",
    });
    const dateHeader = wrapper.findAll("th").at(0);
    expect(dateHeader?.attributes("aria-sort")).toBe("ascending");
  });

  it("status='descending' で ステータス列が aria-sort='descending'", async () => {
    const wrapper = await renderTable({
      rows: [baseRow()],
      sort: "status",
      dir: "desc",
    });
    const statusHeader = wrapper.findAll("th").at(6);
    expect(statusHeader?.attributes("aria-sort")).toBe("descending");
    const dateHeader = wrapper.findAll("th").at(0);
    expect(dateHeader?.attributes("aria-sort")).toBe("none");
  });

  it("date 列クリックで update:sort emit", async () => {
    const wrapper = await renderTable({
      rows: [baseRow()],
      sort: "status",
      dir: "asc",
    });
    await wrapper.findAll("th").at(0)!.trigger("click");
    const events = wrapper.emitted("update:sort");
    expect(events?.[0]).toEqual(["date", "asc"]);
  });

  it("同じ date 列を再クリックすると asc → desc にトグル", async () => {
    const wrapper = await renderTable({
      rows: [baseRow()],
      sort: "date",
      dir: "asc",
    });
    await wrapper.findAll("th").at(0)!.trigger("click");
    expect(wrapper.emitted("update:sort")?.[0]).toEqual(["date", "desc"]);
  });

  it("capacity が null の行は RemainBar の代わりに「予約 N 件」を表示", async () => {
    const row = baseRow({ capacity: null, reserved_count: 12 });
    const wrapper = await renderTable({ rows: [row] });
    expect(wrapper.text()).toContain("予約 12 件");
  });

  it("end_at が past の行は ステータス列に「終了」を表示", async () => {
    const row = baseRow({
      end_at: "2026-04-01T10:00:00+09:00",
      visibility: "published",
    });
    const wrapper = await renderTable({ rows: [row] });
    expect(wrapper.text()).toContain("終了");
    expect(wrapper.text()).not.toContain("公開中");
  });

  it("status='cancelled' の行は ステータス列に「中止」を表示", async () => {
    const row = baseRow({ status: "cancelled" });
    const wrapper = await renderTable({ rows: [row] });
    expect(wrapper.text()).toContain("中止");
  });

  it("操作列のリンクが /events/:id/edit を指す", async () => {
    const row = baseRow();
    const wrapper = await renderTable({ rows: [row] });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toContain(`/events/${row.id}/edit`);
  });

  it("Enter キーで sort トグルが発火", async () => {
    const wrapper = await renderTable({
      rows: [baseRow()],
      sort: "date",
      dir: "asc",
    });
    await wrapper.findAll("th").at(0)!.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:sort")?.[0]).toEqual(["date", "desc"]);
  });
});
