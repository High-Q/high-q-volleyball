<script setup lang="ts">
import { EXTERNAL_TRANSMISSION_URL } from "@/shared/lib/externalLinks";

/**
 * 個人情報保護法 + 改正電気通信事業法対応の footer 注記.
 *
 * SignupIdentityPage / SignupProfilePage 等の登録系画面で本文末尾に表示する.
 * 利用目的のリード文 (`lead`) はページごとに差し替え可能、ポリシーリンク部は固定.
 *
 * 関連 spec:
 *   openspec/specs/reservation-identity-document-upload/spec.md (footer 注記)
 *   openspec/specs/reservation-member-auth/spec.md (SignupProfilePage の footer 注記)
 */

withDefaults(
  defineProps<{
    lead?: string;
    storageNote?: string;
  }>(),
  {
    lead: "",
    storageNote: "",
  },
);
</script>

<template>
  <div
    class="mt-hq-5 flex flex-col gap-hq-2 font-jp text-[11px] leading-[1.7] text-muted"
    data-testid="policy-footer"
  >
    <p v-if="lead">{{ lead }}</p>
    <p v-if="storageNote">{{ storageNote }}</p>
    <p>
      詳細は
      <RouterLink to="/privacy" class="text-accent underline">
        プライバシーポリシー
      </RouterLink>
      ・
      <a
        :href="EXTERNAL_TRANSMISSION_URL"
        target="_blank"
        rel="noreferrer"
        class="text-accent underline"
        data-testid="policy-footer-external-link"
      >
        外部送信ポリシー
      </a>
      をご覧ください。
    </p>
  </div>
</template>
