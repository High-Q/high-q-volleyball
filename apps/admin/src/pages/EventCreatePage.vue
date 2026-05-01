<script setup lang="ts">
import { EventForm } from "@/widgets/event-form";

/**
 * /events/new — 新規イベント作成ページ。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp">
    <EventForm mode="create" />
  </main>
</template>
