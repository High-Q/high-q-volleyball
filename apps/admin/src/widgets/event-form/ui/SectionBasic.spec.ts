import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SectionBasic from "./SectionBasic.vue";
import type { EventFormState } from "../model/eventFormSchema";
import type { VenueOption } from "@/entities/venue";
import type { VenueId } from "@high-q/shared";

const VENUE_ID = "11111111-1111-4111-8111-111111111111" as VenueId;
const VENUE_ID_2 = "22222222-2222-4222-8222-222222222222" as VenueId;

const venues: ReadonlyArray<VenueOption> = [
  { id: VENUE_ID, name: "亀戸スポーツセンター" },
  { id: VENUE_ID_2, name: "東陽町コミュニティセンター" },
];

function emptyState(): EventFormState {
  return {
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    venueId: "",
    fee: "",
  };
}

describe("SectionBasic", () => {
  it("必須フィールドに required 属性 + aria-required が付与される", () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    // input: タイトル + 開催日 = 2 個
    const requiredInputs = wrapper.findAll("input[required]");
    expect(requiredInputs.length).toBe(2);
    requiredInputs.forEach((el) => {
      expect(el.attributes("aria-required")).toBe("true");
    });
    // select: 時 / 分 × 開始・終了 = 4 個
    const requiredSelects = wrapper.findAll("select[required]");
    expect(requiredSelects.length).toBe(4);
    requiredSelects.forEach((el) => {
      expect(el.attributes("aria-required")).toBe("true");
    });
  });

  it("modelValue の値が input / select に反映される", () => {
    const state = emptyState();
    state.name = "ゆる練 vol.43";
    state.date = "2026-05-12";
    state.startTime = "19:30";
    state.endTime = "21:30";
    state.fee = "1500";
    const wrapper = mount(SectionBasic, {
      props: { modelValue: state, errors: {}, venues },
    });
    const inputs = wrapper.findAll("input").map((i) => i.element.value);
    expect(inputs).toContain("ゆる練 vol.43");
    expect(inputs).toContain("2026-05-12");
    expect(inputs).toContain("1500");
    // 時刻は 4 つの select の value で確認
    const selects = wrapper.findAll("select").map((s) => s.element.value);
    expect(selects).toContain("19");
    expect(selects).toContain("30");
    expect(selects).toContain("21");
    // 30 は 2 つあるが toContain で OK
  });

  it("name にエラーがあると aria-invalid='true' が付与される", () => {
    const wrapper = mount(SectionBasic, {
      props: {
        modelValue: emptyState(),
        errors: { name: "タイトルを入力してください" },
        venues,
      },
    });
    const nameInput = wrapper.find('input[required][maxlength="100"]');
    expect(nameInput.attributes("aria-invalid")).toBe("true");
  });

  it("エラーメッセージがロール alert で表示される", () => {
    const wrapper = mount(SectionBasic, {
      props: {
        modelValue: emptyState(),
        errors: {
          name: "タイトルを入力してください",
          fee: "参加費は 0 以上の整数で入力してください",
        },
        venues,
      },
    });
    const alerts = wrapper.findAll('[role="alert"]');
    const texts = alerts.map((a) => a.text());
    expect(texts).toContain("タイトルを入力してください");
    expect(texts).toContain("参加費は 0 以上の整数で入力してください");
  });

  it("namePlaceholder が input placeholder に反映される", () => {
    const wrapper = mount(SectionBasic, {
      props: {
        modelValue: emptyState(),
        errors: {},
        venues,
        namePlaceholder: "ゆる練 vol.43",
      },
    });
    const nameInput = wrapper.find('input[required][maxlength="100"]');
    expect(nameInput.attributes("placeholder")).toBe("ゆる練 vol.43");
  });

  it("name 変更で update:modelValue が emit される", async () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    const nameInput = wrapper.find('input[required][maxlength="100"]');
    await nameInput.setValue("新しいタイトル");
    const emitted = wrapper.emitted("update:modelValue") ?? [];
    expect(emitted.length).toBeGreaterThan(0);
    const last = emitted[emitted.length - 1]![0] as EventFormState;
    expect(last.name).toBe("新しいタイトル");
  });

  it("参加費プリセット ¥1,000 ボタンを押すと fee が '1000' に更新される", async () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    // ¥500 / ¥1,000 のプリセットボタンをテキストで検索（SelectTrigger のボタンと
    // 区別するため）
    const allButtons = wrapper.findAll("button[type='button']");
    const presetButtons = allButtons.filter((b) =>
      /¥\s*[\d,]+/.test(b.text()),
    );
    expect(presetButtons).toHaveLength(2);
    expect(presetButtons[0]!.text()).toContain("500");
    expect(presetButtons[1]!.text()).toContain("1,000");
    await presetButtons[1]!.trigger("click");
    const emitted = wrapper.emitted("update:modelValue") ?? [];
    expect(emitted.length).toBeGreaterThan(0);
    const last = emitted[emitted.length - 1]![0] as EventFormState;
    expect(last.fee).toBe("1000");
  });

  it("fee 空欄で error なし → hint「会場の標準参加費が継承」が出る (任意性)", () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    expect(wrapper.text()).toContain("会場の標準参加費が継承");
  });

  it("disabled を true にすると input / select が disabled になる", () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues, disabled: true },
    });
    const inputs = wrapper.findAll("input");
    inputs.forEach((i) => {
      expect(i.attributes("disabled")).toBeDefined();
    });
    const selects = wrapper.findAll("select");
    selects.forEach((s) => {
      expect(s.attributes("disabled")).toBeDefined();
    });
  });

  it("分 select は 00 / 15 / 30 / 45 の 4 択固定", () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    // 開始(分) と 終了(分) の select は同じ選択肢を持つので、片方だけ確認
    const minuteSelect = wrapper.find('select[aria-label="開始時刻（分）"]');
    expect(minuteSelect.exists()).toBe(true);
    const options = minuteSelect.findAll("option").map((o) => o.element.value);
    // 先頭 "" (placeholder) + 00/15/30/45 の 5 個
    expect(options).toEqual(["", "00", "15", "30", "45"]);
  });

  it("時 select は 06 〜 23 の 18 択", () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    const hourSelect = wrapper.find('select[aria-label="開始時刻（時）"]');
    expect(hourSelect.exists()).toBe(true);
    const options = hourSelect.findAll("option").map((o) => o.element.value);
    // 先頭 "" + 06..23 の 19 個
    expect(options).toHaveLength(19);
    expect(options[0]).toBe("");
    expect(options[1]).toBe("06");
    expect(options[18]).toBe("23");
  });

  it("時 select 変更で startTime が再構築されて emit される（分が既にあれば HH:mm）", async () => {
    const state = emptyState();
    state.startTime = "00:30"; // 分だけ事前にセット
    const wrapper = mount(SectionBasic, {
      props: { modelValue: state, errors: {}, venues },
    });
    const hourSelect = wrapper.find('select[aria-label="開始時刻（時）"]');
    await hourSelect.setValue("19");
    const emitted = wrapper.emitted("update:modelValue") ?? [];
    const last = emitted[emitted.length - 1]![0] as EventFormState;
    expect(last.startTime).toBe("19:30");
  });

  it("分 select 変更で startTime が再構築される", async () => {
    const state = emptyState();
    state.startTime = "19:00";
    const wrapper = mount(SectionBasic, {
      props: { modelValue: state, errors: {}, venues },
    });
    const minuteSelect = wrapper.find('select[aria-label="開始時刻（分）"]');
    await minuteSelect.setValue("45");
    const emitted = wrapper.emitted("update:modelValue") ?? [];
    const last = emitted[emitted.length - 1]![0] as EventFormState;
    expect(last.startTime).toBe("19:45");
  });

  it("片方だけ選択された状態は startTime = '' で emit される（バリデーションが効く）", async () => {
    const wrapper = mount(SectionBasic, {
      props: { modelValue: emptyState(), errors: {}, venues },
    });
    const hourSelect = wrapper.find('select[aria-label="開始時刻（時）"]');
    await hourSelect.setValue("19");
    const emitted = wrapper.emitted("update:modelValue") ?? [];
    const last = emitted[emitted.length - 1]![0] as EventFormState;
    // 分が未選択なので joinTime は "" を返す
    expect(last.startTime).toBe("");
  });

  it("時 → 分 と順に選ぶと startTime = 'HH:mm' で emit される（中間状態を保持）", async () => {
    // 親が emit を受けて modelValue を更新するシミュレーション
    let currentState = emptyState();
    const wrapper = mount(SectionBasic, {
      props: { modelValue: currentState, errors: {}, venues },
    });
    wrapper.vm.$emit = wrapper.vm.$emit; // satisfy TS
    // 時 を選ぶ
    await wrapper
      .find('select[aria-label="開始時刻（時）"]')
      .setValue("19");
    // 親が modelValue を更新する
    let emitted = wrapper.emitted("update:modelValue") ?? [];
    currentState = (emitted[emitted.length - 1]![0] as EventFormState);
    await wrapper.setProps({ modelValue: currentState });
    expect(currentState.startTime).toBe(""); // まだ "" のはず

    // 分 を選ぶ
    await wrapper
      .find('select[aria-label="開始時刻（分）"]')
      .setValue("30");
    emitted = wrapper.emitted("update:modelValue") ?? [];
    currentState = (emitted[emitted.length - 1]![0] as EventFormState);
    expect(currentState.startTime).toBe("19:30"); // 両方揃った
  });

  it("分 → 時 の順に選んでも startTime が再構築される", async () => {
    let currentState = emptyState();
    const wrapper = mount(SectionBasic, {
      props: { modelValue: currentState, errors: {}, venues },
    });
    await wrapper
      .find('select[aria-label="開始時刻（分）"]')
      .setValue("45");
    let emitted = wrapper.emitted("update:modelValue") ?? [];
    currentState = (emitted[emitted.length - 1]![0] as EventFormState);
    await wrapper.setProps({ modelValue: currentState });
    expect(currentState.startTime).toBe("");

    await wrapper
      .find('select[aria-label="開始時刻（時）"]')
      .setValue("21");
    emitted = wrapper.emitted("update:modelValue") ?? [];
    currentState = (emitted[emitted.length - 1]![0] as EventFormState);
    expect(currentState.startTime).toBe("21:45");
  });
});
