<script setup lang="ts">
import { computed } from "vue";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { ProfileHeader } from "@/widgets/profile-header";
import { LevelEditSection } from "@/features/profile-level-edit";

const session = useAuthSession();
const member = computed(() => session.member.value);
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <header
      class="px-hq-5 py-hq-4 flex items-start justify-between gap-hq-4 border-b border-hairline"
    >
      <div class="flex flex-col gap-hq-1">
        <PageBreadcrumb
          :items="[
            { label: 'マイページ', to: { name: 'events-list' } },
            { label: 'プロフィール' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <template v-if="member !== null">
        <ProfileHeader :member="member" />
        <LevelEditSection
          :member-id="member.id"
          :initial-level="member.experienceLevel"
        />
      </template>
      <!-- 後続タスクで ACCOUNT / STATS / SignOut を組み込む -->
    </section>
  </main>
</template>
