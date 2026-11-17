<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import { useHomeAnnouncements } from "../model/useHomeAnnouncements";

/**
 * 会員ホーム（/events）のお知らせ掲示。
 *
 * 掲載対象が無い / Loading / 取得失敗のときは何も描画しない（fail-silent）。
 * ページ本体（イベント一覧等）を阻害しないための方針。本文は改行を保持し、
 * HTML は解釈しない（v-html 不使用・XSS 防止）。配色は CorrectionRequestPanel に
 * 揃えた落ち着いたトーン（警告色・絵文字は使わない）。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/reservation-announcements/spec.md
 */

const { items } = useHomeAnnouncements();

const hasAny = computed<boolean>(() => items.value.length > 0);
</script>

<template>
  <section
    v-if="hasAny"
    class="mx-hq-5 mt-hq-3 flex flex-col gap-hq-3 rounded-hq-lg border border-hairline bg-paper p-hq-4 shadow-[inset_3px_0_0_0_var(--hq-color-accent)]"
    aria-labelledby="home-announcements-heading"
    data-testid="home-announcements"
  >
    <Kicker id="home-announcements-heading">
      — お知らせ<template v-if="items.length > 1"> · {{ items.length }} 件</template>
    </Kicker>
    <ul class="flex flex-col gap-hq-3 m-0 p-0 list-none">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex flex-col gap-hq-1"
      >
        <p class="font-jp text-sm font-medium text-ink m-0">
          {{ item.title }}
        </p>
        <p class="font-jp text-xs text-ink-soft m-0 whitespace-pre-wrap">{{ item.body }}</p>
      </li>
    </ul>
  </section>
</template>
