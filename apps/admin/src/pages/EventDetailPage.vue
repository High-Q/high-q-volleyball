<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { EventId, MemberId } from "@high-q/shared";
import { EventDetailWidget } from "@/widgets/event-detail";
import {
  MemberDetailSheet,
  type MemberDetailSource,
} from "@/widgets/member-detail-sheet";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useRouteDetailQuery } from "@/features/route-detail-query";

/**
 * /events/:id のルートエントリページ。
 *
 * 予約者一覧の氏名押下で `MemberDetailSheet` をオーバーレイ表示する
 * （URL クエリ `?detail=<memberId>` で開閉同期）。
 *
 * #155 ログアウト等のグローバルナビは共通シェル (admin-shell) へ移設したため、
 * ページ header はパンくず + タイトルのみに縮約。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-event-detail/spec.md
 */

const route = useRoute();
const { detail, openDetail, closeDetail } = useRouteDetailQuery();

const eventId = computed<EventId | null>(() => {
  const raw = route.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || id.length === 0) return null;
  return id as unknown as EventId;
});

const detailSource: MemberDetailSource = { detail, closeDetail };

function onMemberClicked(memberId: MemberId): void {
  void openDetail(memberId as unknown as string);
}
</script>

<template>
  <div class="flex h-screen flex-col bg-paper text-ink font-jp">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
          { label: 'Events', to: { name: 'events' } },
          { label: '詳細' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">イベント詳細</h1>
    </header>

    <div class="flex-1 overflow-hidden">
      <EventDetailWidget :event-id="eventId" @member-clicked="onMemberClicked" />
    </div>

    <MemberDetailSheet :source="detailSource" />
  </div>
</template>
