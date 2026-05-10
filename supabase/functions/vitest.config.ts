// Edge Function 共有ユーティリティ用の Vitest config。
//
// Edge Function 本体（Deno.serve / npm:nodemailer 等の Deno 固有依存）は
// 本ランナーでは扱わず、純 TypeScript の `_shared/` にあるロジック層のみを対象とする。
// Function entry 全体の統合テストはローカル `supabase functions serve` または
// 後続 Issue で Deno test infra を立てて実装する。
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["_tests/**/*.spec.ts"],
    globals: false,
  },
});
