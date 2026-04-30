<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import { RouterLink } from "vue-router";

/**
 * /events/new のプレースホルダ。実体（編集フォーム）は #86 で実装される。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/app-routing/spec.md
 *       Issue #86
 */
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp">
    <div class="mx-auto flex max-w-3xl flex-col gap-hq-6 px-hq-6 py-hq-14">
      <Kicker color="muted">— Workspace · Events / New</Kicker>
      <h1 class="font-jp-display text-3xl text-ink">
        新規イベント作成 — 準備中
      </h1>
      <p class="max-w-prose text-sm text-muted">
        この画面は Issue #86 で本実装されます。現在は #85 のフロー試験用プレース
        ホルダで、ルートのみ予約されています。
      </p>
      <div>
        <RouterLink
          to="/events"
          class="font-jp text-sm text-accent underline-offset-4 hover:underline"
        >
          ← 一覧に戻る
        </RouterLink>
      </div>
    </div>
  </main>
</template>
