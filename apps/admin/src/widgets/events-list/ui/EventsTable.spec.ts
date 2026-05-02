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
      {
        path: "/events/:id",
        name: "events-detail",
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
    // 「定員」列は MVP1 で UI から削除（capacity フィールドそのものをフォーム
    // からも外したため、表示の必要性が無い）
    expect(labels).toEqual([
      "日付",
      "タイトル",
      "会場",
      "時間",
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
    // 「定員」列削除後の順: 0=日付 1=タイトル 2=会場 3=時間 4=予約 5=ステータス 6=操作
    const statusHeader = wrapper.findAll("th").at(5);
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

  it("capacity が null の行は RemainBar の代わりに「N 件」を表示（『予約』プレフィックスは冗長なので省略）", async () => {
    const row = baseRow({ capacity: null, reserved_count: 12 });
    const wrapper = await renderTable({ rows: [row] });
    expect(wrapper.text()).toContain("12 件");
    expect(wrapper.text()).not.toContain("予約 12 件");
  });

  it("会場名は施設種別末尾を削った主要部のみ表示する（モバイル改行抑止）", async () => {
    const row = baseRow({ venue_name: "亀戸スポーツセンター" });
    const wrapper = await renderTable({ rows: [row] });
    // 短縮表示
    expect(wrapper.text()).toContain("亀戸");
    expect(wrapper.text()).not.toContain("亀戸スポーツセンター");
    // 元の名前は title 属性でホバー時に確認可能
    const venueCell = wrapper
      .findAll("td")
      .find((c) => c.text().includes("亀戸"));
    expect(venueCell?.attributes("title")).toBe("亀戸スポーツセンター");
  });

  it("会場名が NULL の行は '—' を表示", async () => {
    const row = baseRow({ venue_name: null });
    const wrapper = await renderTable({ rows: [row] });
    expect(wrapper.text()).toContain("—");
  });

  it("テーブルセルに whitespace-nowrap が付与されている（モバイル改行抑止）", async () => {
    const row = baseRow();
    const wrapper = await renderTable({ rows: [row] });
    const cells = wrapper.findAll("td");
    // 全セルが nowrap
    cells.forEach((c) => {
      expect(c.classes()).toContain("whitespace-nowrap");
    });
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
    // 行内には title (events-detail) + edit の 2 リンクが存在する。
    // 末尾の操作列が /events/:id/edit。
    const links = wrapper.findAll("a");
    const editLink = links.find((a) =>
      a.attributes("href")?.endsWith("/edit"),
    );
    expect(editLink?.attributes("href")).toContain(
      `/events/${row.id}/edit`,
    );
  });

  it("タイトル列のリンクが /events/:id（詳細）を指す", async () => {
    const row = baseRow();
    const wrapper = await renderTable({ rows: [row] });
    const links = wrapper.findAll("a");
    const titleLink = links.find(
      (a) =>
        a.attributes("href") === `/events/${row.id}` &&
        a.text() === row.name,
    );
    expect(titleLink).toBeDefined();
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
