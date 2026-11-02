import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES } from "./defaultTemplate";

function migrationTemplate(file: string): string | undefined {
  const sql = readFileSync(
    resolve(__dirname, "../../../../../../supabase/migrations", file),
    "utf8",
  );
  return sql.match(/\$tpl\$([\s\S]*?)\$tpl\$/)?.[1];
}

describe("DEFAULT_TEMPLATES", () => {
  it("LINE: migration の初期投入テンプレートと同一内容", () => {
    expect(migrationTemplate("20261029000000_announcement_templates.sql")).toBe(
      DEFAULT_TEMPLATES.line,
    );
  });

  it("X: migration の初期投入テンプレートと同一内容", () => {
    expect(
      migrationTemplate("20261103000000_announcement_templates_add_x.sql"),
    ).toBe(DEFAULT_TEMPLATES.x);
  });
});
