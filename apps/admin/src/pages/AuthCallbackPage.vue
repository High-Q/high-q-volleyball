<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";

/**
 * マジックリンクの戻り先。
 * Supabase SDK が hash 内のトークンを `detectSessionInUrl: true` で消化し
 * セッションが確立した後、AAL / factor 状態に応じて適切なページへ遷移する。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D5)
 */
const router = useRouter();
const session = useAuthSession();

onMounted(async () => {
  await session.ready();

  if (session.status.value !== "authenticated") {
    void router.replace({
      name: "login",
      query: { reason: "link-invalid" },
    });
    return;
  }

  if (session.aal.value === "aal2") {
    if (session.isAdmin.value === true) {
      void router.replace({ name: "home" });
    } else {
      await session.signOut();
      void router.replace({
        name: "login",
        query: { reason: "not-admin" },
      });
    }
    return;
  }

  // AAL1
  void router.replace({
    name: session.hasMfaFactor.value ? "mfa" : "mfa-setup",
  });
});
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-paper text-ink font-jp"
  >
    <div class="flex flex-col items-center gap-hq-3 px-hq-6">
      <p
        class="font-mono text-xs uppercase tracking-widest text-accent"
        aria-hidden="true"
      >
        — Authenticating
      </p>
      <p class="text-sm text-muted">サインインしています…</p>
    </div>
  </main>
</template>
