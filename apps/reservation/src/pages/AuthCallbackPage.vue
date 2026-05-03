<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";

const router = useRouter();
const session = useAuthSession();

onMounted(async () => {
  try {
    await session.ready();
  } catch {
    void router.replace({ name: "login", query: { reason: "link-invalid" } });
    return;
  }

  if (session.status.value !== "authenticated" || session.session.value === null) {
    void router.replace({ name: "login", query: { reason: "link-invalid" } });
    return;
  }

  if (session.isProfileComplete.value) {
    void router.replace({ name: "home" });
  } else {
    void router.replace({ name: "signup-profile" });
  }
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-paper text-ink font-jp">
    <div class="flex flex-col items-center gap-hq-4 px-hq-8 text-center">
      <p class="font-mono text-xs uppercase tracking-widest text-accent">
        — Signing in
      </p>
      <h1 class="font-jp-display text-xl text-ink">サインインしています…</h1>
      <p class="text-sm text-muted">少々お待ちください。</p>
    </div>
  </main>
</template>
