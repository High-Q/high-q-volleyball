<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import type { Member } from "@/entities/member";
import AccountRow from "./AccountRow.vue";

defineProps<{
  member: Pick<
    Member,
    "displayName" | "nickname" | "email" | "phone"
  >;
}>();

type EditField = "displayName" | "nickname" | "email" | "phone";
const emit = defineEmits<{
  edit: [field: EditField];
}>();
</script>

<template>
  <section class="flex flex-col gap-hq-3" aria-label="アカウント情報">
    <Kicker color="muted">— ACCOUNT · アカウント情報</Kicker>
    <div
      class="bg-surface border border-hairline rounded-hq-lg overflow-hidden"
    >
      <AccountRow
        label="お名前"
        :value="member.displayName"
        editable
        aria-edit-label="お名前を編集"
        @edit="emit('edit', 'displayName')"
      />
      <AccountRow
        label="ニックネーム"
        :value="member.nickname"
        placeholder="未設定"
        editable
        aria-edit-label="ニックネームを編集"
        @edit="emit('edit', 'nickname')"
      />
      <AccountRow
        label="メール"
        :value="member.email"
        editable
        aria-edit-label="メールアドレスを編集"
        @edit="emit('edit', 'email')"
      />
      <AccountRow
        label="電話番号"
        :value="member.phone"
        placeholder="未設定"
        editable
        aria-edit-label="電話番号を編集"
        @edit="emit('edit', 'phone')"
      />
    </div>
  </section>
</template>
