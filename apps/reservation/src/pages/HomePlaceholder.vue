<script setup lang="ts">
import { Button, Kicker } from "@high-q/ui";
import { useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";

const router = useRouter();
const session = useAuthSession();

async function onLogout() {
  await session.signOut();
  void router.push({ name: "login" });
}

// TODO(後続 dashboard / nav Issue): ログアウトボタンを Sidebar / Header に移設
// TODO(#90): イベント一覧本実装でこの「準備中」表示を置き換え
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp">
    <div class="mx-auto flex max-w-3xl flex-col gap-hq-6 px-hq-6 py-hq-14">
      <div class="flex items-start justify-between gap-hq-4">
        <div class="flex flex-col gap-hq-2">
          <Kicker>— Members</Kicker>
          <h1 class="font-jp-display text-3xl text-ink">
            High Q 予約サイト — 準備中
          </h1>
        </div>
        <Button variant="ghost" type="button" @click="onLogout">
          ログアウト
        </Button>
      </div>
      <p class="max-w-prose text-sm text-muted">
        この画面は今後の Issue（#90-92, #148）でイベント一覧と予約機能に置き換えられます。
      </p>
    </div>
  </main>
</template>
