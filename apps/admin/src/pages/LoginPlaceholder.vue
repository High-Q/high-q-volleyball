<script setup lang="ts">
import { Button } from "@high-q/ui";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-paper text-ink font-jp"
  >
    <div class="flex w-full max-w-md flex-col gap-hq-6 px-hq-8 py-hq-14">
      <p
        class="font-mono text-xs uppercase tracking-widest text-accent"
        aria-hidden="true"
      >
        — Sign in
      </p>
      <h1 class="font-jp-display text-2xl text-ink">ログイン — 準備中</h1>
      <p class="text-sm text-muted">
        この画面は #84 で Supabase Auth マジックリンクと共に本実装されます。
      </p>
      <div>
        <Button variant="ghost" @click="router.push('/')">
          ホームへ戻る
        </Button>
      </div>
    </div>
  </main>
</template>
