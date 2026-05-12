<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";
import { safeNextPath } from "@/shared/lib/safeNextPath";

const route = useRoute();
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

  // #189 ゼロ滞留 signup フロー導入後、認証済み = プロフィール完成済みが
  // 不変条件のため「未完成 → /signup/profile 誘導」分岐は撤廃。
  // #229: LP からのイベント指定遷移を引き継ぐため、next クエリが安全であれば
  // home の代わりにそのパスへ navigate する。書類未提出時は router guard 側で
  // /signup/identity に強制誘導される (next も guard で引き継がれる)。
  const nextPath = safeNextPath(route.query.next);
  if (nextPath) {
    void router.replace(nextPath);
  } else {
    void router.replace({ name: "home" });
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
