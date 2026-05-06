<script setup lang="ts">
import Toaster from "@/shared/ui/Toaster.vue";
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
  <Toaster />
  <ConsentBanner />
</template>
