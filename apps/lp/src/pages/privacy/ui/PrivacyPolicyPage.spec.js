// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "@/test/mountWithVuetify.js";
import PrivacyPolicyPage from "./PrivacyPolicyPage.vue";

describe("PrivacyPolicyPage", () => {
  it("8 セクションがすべて描画される (はじめに/取得項目/利用目的/第三者/保管/安全/権利/メタ)", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const ids = [
      "section-intro",
      "section-items",
      "section-purpose",
      "section-third-party",
      "section-retention",
      "section-security",
      "section-rights",
      "section-meta",
    ];
    for (const id of ids) {
      expect(wrapper.find(`[data-testid="${id}"]`).exists()).toBe(true);
    }
  });

  it("はじめにの団体名が「江東区社会教育団体」表記で記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-intro"]').text();
    expect(text).toContain("江東区社会教育団体");
    expect(text).not.toContain("事業者");
  });

  it("対象サービス一覧に内部呼称 (lp / admin / reservation) が含まれない", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-intro"]').text();
    expect(text).toContain("公式サイト");
    expect(text).toContain("予約サイト");
    expect(text).toContain("管理画面");
    expect(text).not.toMatch(/\(lp\)/);
    expect(text).not.toMatch(/\(admin\)/);
    expect(text).not.toMatch(/\(reservation\)/);
  });

  it("取得項目テーブルに認証情報・プロフィール・本人確認書類・利用ログの 4 行が含まれる", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const table = wrapper.find('[data-testid="items-table"]');
    expect(table.exists()).toBe(true);
    const rows = table.findAll("tbody tr");
    expect(rows).toHaveLength(4);
    const text = table.text();
    expect(text).toContain("認証情報");
    expect(text).toContain("プロフィール");
    expect(text).toContain("本人確認書類");
    expect(text).toContain("利用ログ");
  });

  it("取得項目に氏名・生年月日・電話番号・経験レベルが記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-items"]').text();
    expect(text).toContain("氏名");
    expect(text).toContain("生年月日");
    expect(text).toContain("電話番号");
    expect(text).toContain("経験レベル");
  });

  it("取得項目に技術用語 (マジックリンク / User-Agent / リクエストパス) が含まれない", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-items"]').text();
    expect(text).not.toContain("マジックリンク");
    expect(text).not.toContain("User-Agent");
    expect(text).not.toContain("リクエストパス");
    expect(text).toContain("ログイン状態を維持");
    expect(text).toContain("ブラウザの種類");
  });

  it("マイナンバー記述は簡潔 (「12 桁」「通知カード」が含まれない)", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-items"]').text();
    expect(text).toContain("マイナンバー");
    expect(text).toContain("マスク");
    expect(text).not.toContain("12 桁");
    expect(text).not.toContain("通知カード");
  });

  it("利用目的に 5 項目と目的外利用禁止の表明が記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-purpose"]').text();
    expect(text).toContain("本人確認");
    expect(text).toContain("連絡");
    expect(text).toContain("団体登録");
    expect(text).toContain("予約管理");
    expect(text).toContain("不正利用");
    expect(text).toContain("利用目的の範囲を超えて");
  });

  it("第三者提供セクションは法令準拠と役所提出の 2 例外を明示し、業務委託は概略のみ記載", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-third-party"]').text();
    expect(text).toContain("法令に基づく");
    expect(text).toContain("団体登録");
    expect(text).toContain("クラウドサービス");
    expect(text).toContain("日本");
    expect(text).toContain("個別");
  });

  it("第三者提供セクションに個別 SaaS 名と「米国」「(admin)」が含まれない", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-third-party"]').text();
    expect(text).not.toContain("Supabase");
    expect(text).not.toContain("Render");
    expect(text).not.toContain("AWS");
    expect(text).not.toContain("米国");
    expect(text).not.toMatch(/\(admin\)/);
  });

  it("保管期間に在籍中継続・退会時削除・役所提出済証憑の分離保管が記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-retention"]').text();
    expect(text).toContain("在籍中");
    expect(text).toContain("退会");
    expect(text).toContain("削除");
    expect(text).toContain("分離");
  });

  it("安全管理措置はフラットな箇条書きで概要のみ記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const section = wrapper.find('[data-testid="section-security"]');
    const text = section.text();
    expect(text).toContain("アクセス制御");
    expect(text).toContain("暗号化");
    expect(text).toContain("通信経路");
    expect(text).toContain("内部規程");
    expect(text).toContain("マイナンバー");
    expect(text).toContain("限定");
    // フラット化: 6 章内に h3 (技術的措置 / 組織的措置) 見出しを切らない
    expect(section.findAll("h3")).toHaveLength(0);
  });

  it("安全管理措置に個別技術名・SOP 略号・自己言及が含まれない", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-security"]').text();
    expect(text).not.toContain("Row Level Security");
    expect(text).not.toContain("RLS");
    expect(text).not.toContain("TLS");
    expect(text).not.toContain("Supabase");
    expect(text).not.toContain("SOP");
    expect(text).not.toContain("非公開");
  });

  it("ページ全体に法令条項番号 (§17 / §23 / §27 / §32 等) が含まれない", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.text();
    expect(text).not.toMatch(/§\d/);
    // 冒頭に法令準拠の 1 行は残す
    expect(text).toContain("関係法令");
  });

  it("最終更新日と問い合わせ先 mailto リンクが表示される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    expect(wrapper.text()).toContain("最終更新日");
    const mailto = wrapper.find('[data-testid="contact-mailto"]');
    expect(mailto.exists()).toBe(true);
    expect(mailto.attributes("href")).toMatch(/^mailto:/);
  });

  it("外部送信ポリシーへの相互参照リンクが存在する", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const link = wrapper.find('[data-testid="external-transmission-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/external-transmission");
  });

  it("開示請求セクションに 4 種請求権と mailto リンクが記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-rights"]').text();
    expect(text).toContain("開示");
    expect(text).toContain("訂正");
    expect(text).toContain("利用停止");
    expect(text).toContain("第三者提供の停止");
    const mailto = wrapper.find('[data-testid="rights-mailto"]');
    expect(mailto.exists()).toBe(true);
    expect(mailto.attributes("href")).toMatch(/^mailto:/);
  });

  it("開示請求セクションに手数料が MVP1 期間中は無料である旨が記載される", () => {
    const wrapper = mountWithVuetify(PrivacyPolicyPage);
    const text = wrapper.find('[data-testid="section-rights"]').text();
    expect(text).toContain("手数料");
    expect(text).toContain("無料");
    expect(text).toContain("MVP1");
  });
});
