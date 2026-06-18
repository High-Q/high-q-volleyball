<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Toaster from "@/shared/ui/Toaster.vue";
import { ConsentBanner } from "@/widgets/consent-banner";
import { AppFooter } from "@/widgets/app-footer";
import { AdminShell } from "@/widgets/admin-shell";

/**
 * #155 認証配下ルートは共通レイアウトシェル (admin-shell) で包み、公開ルート /
 * 認証フロー (login / auth-callback / mfa / mfa-setup) はシェル無しで描画する。
 * グローバルナビ・ログアウトはシェルが提供する (各ページ header からは撤去)。
 */
const route = useRoute();

// シェルを出さないルート (公開 + AAL2 確定前の認証フロー)
const NO_SHELL_ROUTES = new Set([
  "login",
  "auth-callback",
  "mfa",
  "mfa-setup",
]);

const withShell = computed<boolean>(() => {
  const name = route.name;
  if (name == null) return false;
  return !NO_SHELL_ROUTES.has(String(name));
});
</script>

<template>
  <AdminShell v-if="withShell">
    <div class="flex min-h-full flex-1 flex-col">
      <div class="flex-1">
        <RouterView />
      </div>
      <AppFooter />
    </div>
  </AdminShell>
  <div v-else class="flex min-h-screen flex-col">
    <div class="flex-1">
      <RouterView />
    </div>
    <AppFooter />
  </div>
  <Toaster />
  <ConsentBanner />
</template>
