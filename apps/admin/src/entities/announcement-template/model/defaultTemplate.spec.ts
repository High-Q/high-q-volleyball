import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_LINE_TEMPLATE } from "./defaultTemplate";

describe("DEFAULT_LINE_TEMPLATE", () => {
  it("migration の初期投入テンプレートと同一内容", () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        "../../../../../../supabase/migrations/20261029000000_announcement_templates.sql",
      ),
      "utf8",
    );
    const match = sql.match(/\$tpl\$([\s\S]*?)\$tpl\$/);
    expect(match?.[1]).toBe(DEFAULT_LINE_TEMPLATE);
  });
});
