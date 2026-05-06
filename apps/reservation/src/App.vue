<script setup lang="ts">
import { ConsentBanner } from "@/widgets/consent-banner";
import { AppFooter } from "@/widgets/app-footer";
import { BottomTabBar } from "@/widgets/bottom-tab-bar";
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="flex-1">
      <RouterView />
    </div>
    <BottomTabBar />
    <AppFooter />
  </div>
  <ConsentBanner />
</template>
