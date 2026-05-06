<script setup lang="ts">
import { ConsentBanner } from "@/widgets/consent-banner";
import { AppFooter } from "@/widgets/app-footer";
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="flex-1">
      <RouterView />
    </div>
    <AppFooter />
  </div>
  <ConsentBanner />
</template>
