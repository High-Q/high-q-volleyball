<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { MemberId } from "@high-q/shared";
import {
  ANNOUNCEMENT_CHANNELS,
  isAnnouncementChannel,
  type AnnouncementChannel,
} from "@/entities/announcement-template";
import { useAuthSession } from "@/features/auth";
import { AnnouncementTemplateForm } from "@/features/announcement-template-edit";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /announcement-template — 告知テンプレート編集ページ (#386)。
 *
 * チャネル（LINE / X）ごとに 1 テンプレートのため一覧は持たず、チャネル切り替え +
 * 編集フォームのみ。選択中チャネルは URL クエリ `channel` と同期する（告知文ダイアログの
 * 「テンプレートを編集」から選択中チャネルで開ける）。未保存の編集があるときは切り替え前に確認する。
 * 保存者 (updated_by) として session.user.id (auth.uid()) をフォームに渡す。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 */

const session = useAuthSession();
const route = useRoute();
const router = useRouter();

const channel = computed<AnnouncementChannel>(() =>
  isAnnouncementChannel(route.query.channel) ? route.query.channel : "line",
);
const dirty = ref(false);

function selectChannel(next: AnnouncementChannel): void {
  if (next === channel.value) return;
  if (dirty.value && !window.confirm("保存していない変更があります。破棄して切り替えますか？")) {
    return;
  }
  dirty.value = false;
  void router.replace({ query: { ...route.query, channel: next } });
}

const adminMemberId = computed<MemberId | null>(() => {
  const uid = session.session.value?.user.id;
  return uid ? (uid as MemberId) : null;
});
</script>

<template>
  <div class="flex min-h-full flex-col bg-paper text-ink font-jp">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
          { label: '告知テンプレート' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">告知テンプレート</h1>
      <p class="mt-hq-1 font-jp text-xs text-muted">
        イベント詳細の「告知文をコピー」で使う告知文のひな形です。LINE はオープンチャットの参加者向け、X は High Q を知らない人向けです。
      </p>
    </header>

    <div class="flex flex-1 flex-col gap-hq-6 px-hq-6 py-hq-6 md:px-hq-8">
      <div
        role="tablist"
        aria-label="告知チャネル"
        class="inline-flex w-fit gap-hq-1 rounded-hq-md border border-hairline bg-paper-warm p-hq-1"
      >
        <button
          v-for="c in ANNOUNCEMENT_CHANNELS"
          :key="c.channel"
          type="button"
          role="tab"
          :aria-selected="channel === c.channel"
          :class="[
            'rounded-hq-sm px-hq-4 py-hq-1 font-jp text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            channel === c.channel ? 'bg-paper text-ink shadow-hq-sm' : 'text-muted hover:text-ink',
          ]"
          :data-testid="`template-channel-${c.channel}`"
          @click="selectChannel(c.channel)"
        >
          {{ c.label }}
        </button>
      </div>

      <AnnouncementTemplateForm
        :key="channel"
        :admin-member-id="adminMemberId"
        :channel="channel"
        @update:dirty="dirty = $event"
      />
    </div>
  </div>
</template>
