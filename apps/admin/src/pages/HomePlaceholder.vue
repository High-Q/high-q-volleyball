<script setup lang="ts">
import { Button } from "@high-q/ui";
import { useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";

// TODO(sync): /events 移行 (#85) に伴い HomePlaceholder は router から外された。
// ファイル本体は次の Sync フェーズで削除する候補。残存は履歴互換のみ。
const router = useRouter();
const session = useAuthSession();

async function onSignOut() {
  await session.signOut();
  await router.replace({ name: "login" });
}
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp">
    <div class="mx-auto flex max-w-3xl flex-col gap-hq-6 px-hq-6 py-hq-14">
      <p
        class="font-mono text-xs uppercase tracking-widest text-accent"
        aria-hidden="true"
      >
        — Internal console
      </p>
      <h1 class="font-jp-display text-3xl text-ink">
        High Q 管理画面 — 準備中
      </h1>
      <p class="max-w-prose text-sm text-muted">
        この画面は今後の Issue（#84 以降）で本実装されます。現在は UI 基盤
        （Tailwind preset / shadcn-vue / Vue Router）の疎通確認用プレースホルダ
        です。
      </p>
      <div class="flex gap-hq-3">
        <Button variant="ghost" @click="onSignOut">ログアウト</Button>
      </div>
    </div>
  </main>
</template>
