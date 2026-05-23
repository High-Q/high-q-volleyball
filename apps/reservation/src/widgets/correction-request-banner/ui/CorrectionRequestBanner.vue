<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import {
  CORRECTION_FIELD_LABEL,
  type CorrectionField,
  type CorrectionRequest,
} from "@high-q/shared";
import { Button } from "@high-q/ui";

/**
 * #296 修正依頼バナー。
 *
 * 認証済会員の home (`/events`) 上部に表示し、admin から届いている未対応の
 * 修正依頼を縦に積み上げて見せる。「修正する」押下で `/profile?edit=<field>`
 * もしくは LEVEL セクションへ誘導する。
 *
 * dismiss UI は持たない（修正完了 / admin 取り下げ以外では消えない）。
 *
 * 関連: openspec/specs/member-correction-requests/spec.md
 *       (Requirement: 会員サイトの修正依頼バナー)
 */

const props = defineProps<{
  requests: ReadonlyArray<CorrectionRequest>;
}>();

const router = useRouter();

const hasAny = computed<boolean>(() => props.requests.length > 0);

/**
 * field → /profile への遷移目標
 * - last_name / first_name → ?edit=displayName（姓・名 共通モーダル）
 * - birthday / phone / nickname / email → ?edit=<field>
 * - experience_level → ?edit=experienceLevel (ProfilePage 側で LEVEL セクションへ scroll)
 */
function targetFor(field: CorrectionField): { path: string; query: Record<string, string> } {
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

function onFix(field: CorrectionField): void {
  const t = targetFor(field);
  void router.push({ path: t.path, query: t.query });
}
</script>

<template>
  <div
    v-if="hasAny"
    role="alert"
    aria-live="polite"
    class="flex flex-col gap-hq-2 rounded-hq-lg border border-warn bg-warn-soft px-hq-4 py-hq-3"
    data-testid="correction-request-banner"
  >
    <p class="font-jp text-xs font-medium text-warn">
      運営からのお願い
    </p>
    <ul class="flex flex-col gap-hq-2">
      <li
        v-for="entry in props.requests"
        :key="entry.field"
        class="flex flex-col gap-hq-1 sm:flex-row sm:items-center sm:justify-between sm:gap-hq-3"
        :data-field="entry.field"
      >
        <div class="flex flex-col gap-hq-1">
          <span class="font-jp text-sm font-medium text-ink">
            {{ CORRECTION_FIELD_LABEL[entry.field] }}
          </span>
          <span class="font-jp text-xs text-ink whitespace-pre-wrap">
            {{ entry.message }}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          @click="onFix(entry.field)"
        >修正する</Button>
      </li>
    </ul>
  </div>
</template>
