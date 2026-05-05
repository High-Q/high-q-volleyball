<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import { EXPERIENCE_LEVEL_LABELS } from "@high-q/shared";
import type { IdentityDocumentDetail } from "@/entities/identity-document";

/**
 * 詳細画面のユーザー情報カード。
 *
 * 表示項目: display_name (大見出し) / email / birthday / phone (NULL は「未登録」) /
 * experience_level Badge。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: ユーザー情報カードの表示)
 */

const props = defineProps<{
  member: IdentityDocumentDetail["member"];
}>();

function formatBirthday(iso: string): string {
  // birthday は YYYY-MM-DD 形式
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

const EXPERIENCE_BADGE_CLASS: Record<string, string> = {
  beginner: "bg-paper-warm text-muted",
  intermediate: "bg-warning-soft text-warning",
  experienced: "bg-success-soft text-success",
};
</script>

<template>
  <section
    class="flex flex-col gap-hq-3 rounded-hq-md border border-hairline bg-paper p-hq-6"
    aria-labelledby="member-info-kicker"
  >
    <Kicker id="member-info-kicker">— 会員情報</Kicker>
    <div class="flex flex-col gap-hq-2">
      <p class="font-jp text-lg font-medium text-ink">
        {{ props.member.display_name }}
      </p>
      <dl class="grid grid-cols-1 gap-hq-2 sm:grid-cols-2">
        <div class="flex flex-col gap-hq-1">
          <dt class="font-mono text-xs uppercase tracking-widest text-muted">
            メール
          </dt>
          <dd class="font-mono text-sm text-ink">{{ props.member.email }}</dd>
        </div>
        <div class="flex flex-col gap-hq-1">
          <dt class="font-mono text-xs uppercase tracking-widest text-muted">
            生年月日
          </dt>
          <dd class="font-mono text-sm text-ink">
            {{ formatBirthday(props.member.birthday) }}
          </dd>
        </div>
        <div class="flex flex-col gap-hq-1">
          <dt class="font-mono text-xs uppercase tracking-widest text-muted">
            電話
          </dt>
          <dd class="font-mono text-sm text-ink">
            {{ props.member.phone ?? "未登録" }}
          </dd>
        </div>
        <div class="flex flex-col gap-hq-1">
          <dt class="font-mono text-xs uppercase tracking-widest text-muted">
            経験
          </dt>
          <dd>
            <span
              :class="`inline-flex items-center rounded-hq-sm px-hq-2 py-hq-1 text-xs font-jp font-medium ${EXPERIENCE_BADGE_CLASS[props.member.experience_level]}`"
            >
              {{ EXPERIENCE_LEVEL_LABELS[props.member.experience_level] }}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
