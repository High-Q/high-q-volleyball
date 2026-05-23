<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Kicker } from "@high-q/ui";
import type { CorrectionField, CorrectionRequest } from "@high-q/shared";
import CorrectionRequestRow from "./CorrectionRequestRow.vue";

/**
 * #296 修正依頼パネル（会員サイトの常設インライン表示）。
 *
 * 配置:
 *   - mode="inline" (Home): /events 上部、HomeNextCard の手前
 *   - mode="profile" (Profile): /profile の ProfileHeader 直下、AccountSection の手前
 *
 * 動作:
 *   - `requests` 0 件のときは描画しない (v-if 親で制御推奨)
 *   - 各エントリの「修正する」で /profile?edit=<field> へ誘導
 *   - dismiss UI なし。修正完了で自動消滅 (correction_requests が空になる)
 *
 * 配色:
 *   - bg-paper（落ち着いた紙色）+ 左 3px accent (terracotta) アクセント
 *   - 警告色（赤/danger）や ⚠ 絵文字は使わない（既存 UI 統一）
 *
 * 関連: openspec/specs/member-correction-requests/spec.md
 *       (Requirement: 会員サイトの修正依頼モーダル)
 */

const props = defineProps<{
  /** mode="inline" = Home 用（kicker のみ）/ mode="profile" = プロフィール用（kicker + 件数バッジ） */
  mode: "inline" | "profile";
  requests: ReadonlyArray<CorrectionRequest>;
}>();

const router = useRouter();

const count = computed<number>(() => props.requests.length);
const hasAny = computed<boolean>(() => count.value > 0);

function targetFor(
  field: CorrectionField,
): { path: string; query: Record<string, string> } {
  switch (field) {
    case "last_name":
    case "first_name":
      return { path: "/profile", query: { edit: "displayName" } };
    case "birthday":
      return { path: "/profile", query: { edit: "birthday" } };
    case "phone":
      return { path: "/profile", query: { edit: "phone" } };
    case "nickname":
      return { path: "/profile", query: { edit: "nickname" } };
    case "experience_level":
      return { path: "/profile", query: { edit: "experienceLevel" } };
  }
}

function onEdit(field: CorrectionField): void {
  const t = targetFor(field);
  void router.push({ path: t.path, query: t.query });
}
</script>

<template>
  <section
    v-if="hasAny"
    class="flex flex-col gap-hq-3 rounded-hq-lg border border-hairline bg-paper p-hq-4 shadow-[inset_3px_0_0_0_var(--hq-color-accent)]"
    aria-labelledby="correction-panel-heading"
    data-testid="correction-request-panel"
    :data-mode="mode"
  >
    <header class="flex items-baseline justify-between gap-hq-3">
      <div class="flex items-baseline gap-hq-2">
        <Kicker id="correction-panel-heading">
          — 運営からのお願い<template v-if="mode === 'inline'"> · {{ count }} 件</template>
        </Kicker>
      </div>
      <span
        v-if="mode === 'profile'"
        class="inline-flex items-center rounded-full bg-accent px-hq-2 py-hq-1 font-jp text-[10px] font-medium text-paper"
        data-testid="correction-panel-count-pill"
      >
        未対応 {{ count }}
      </span>
    </header>

    <p
      v-if="mode === 'inline'"
      class="font-jp text-xs text-ink-soft m-0"
    >
      ご登録内容について確認のお願いがあります。下記から修正してください。
    </p>

    <ul class="flex flex-col gap-hq-3 m-0 p-0 list-none">
      <CorrectionRequestRow
        v-for="entry in requests"
        :key="entry.field"
        :request="entry"
        @edit="onEdit"
      />
    </ul>
  </section>
</template>
