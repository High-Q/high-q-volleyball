<script setup lang="ts">
import { Skeleton } from "@/shared/ui";

/**
 * /events/:id 画面の Loading 状態 Skeleton。
 * StatCard 4 枚 + Tabs + Toolbar + Table 行を簡易プレースホルダで再現。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */
</script>

<template>
  <div class="flex flex-col" data-testid="event-detail-skeleton">
    <!-- TopBar 相当 -->
    <div
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-8 py-hq-3"
    >
      <div class="flex flex-col gap-hq-2">
        <Skeleton class="h-3 w-32" />
        <Skeleton class="h-6 w-48" />
        <Skeleton class="h-3 w-64" />
      </div>
      <Skeleton class="h-9 w-20" />
    </div>

    <!-- StatCard 4 枚 -->
    <div class="px-hq-8 pt-hq-5">
      <div
        class="grid grid-cols-4 bg-surface border border-hairline rounded-hq-lg overflow-hidden"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="py-hq-4 px-hq-6 flex flex-col gap-hq-2"
          :class="i < 4 ? 'border-r border-hairline-soft' : ''"
        >
          <Skeleton class="h-3 w-8" />
          <Skeleton class="h-7 w-16" />
          <Skeleton class="h-3 w-20" />
        </div>
      </div>
    </div>

    <!-- Tabs 相当 -->
    <div class="px-hq-8 mt-hq-5 border-b border-hairline pb-hq-2">
      <div class="flex gap-hq-3">
        <Skeleton class="h-5 w-24" />
        <Skeleton class="h-5 w-28" />
        <Skeleton class="h-5 w-32" />
      </div>
    </div>

    <!-- Toolbar 相当 -->
    <div
      class="flex items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
    >
      <Skeleton class="h-9 w-60" />
      <Skeleton class="h-9 w-32" />
      <Skeleton class="h-9 w-40" />
    </div>

    <!-- Table 行 -->
    <div class="px-hq-8 pt-hq-3 flex flex-col gap-hq-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
    </div>
  </div>
</template>
