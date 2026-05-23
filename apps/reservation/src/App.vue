<script setup lang="ts">
import { ConsentBanner } from "@/widgets/consent-banner";
import { AppFooter } from "@/widgets/app-footer";
import { BottomTabBar } from "@/widgets/bottom-tab-bar";
import { CorrectionRequestModal } from "@/widgets/correction-request-modal";
import {
  BOTTOM_TAB_BAR_HEIGHT_PX,
  useBottomTabBarVisible,
} from "@/shared/lib/useBottomTabBarVisible";

const showBottomTabBar = useBottomTabBarVisible();
</script>

<template>
  <div
    class="flex min-h-screen flex-col"
    :style="
      showBottomTabBar
        ? `padding-bottom: ${BOTTOM_TAB_BAR_HEIGHT_PX}px;`
        : undefined
    "
  >
    <div class="flex-1">
      <RouterView />
    </div>
    <AppFooter v-if="!showBottomTabBar" />
  </div>
  <BottomTabBar />
  <ConsentBanner />
  <CorrectionRequestModal />
</template>
