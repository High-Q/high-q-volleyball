<script setup lang="ts">
import {
  EXTERNAL_TRANSMISSION_URL,
  PRIVACY_POLICY_URL,
} from "@/shared/lib/externalLinks";

/**
 * 個人情報保護法 + 改正電気通信事業法対応の footer 注記.
 *
 * SignupIdentityPage / SignupProfilePage 等の登録系画面で本文末尾に表示する.
 * 利用目的のリード文 (`lead`) はページごとに差し替え可能、ポリシーリンク部は固定.
 *
 * プライバシーポリシー / 外部送信ポリシーはともに LP に集約された単一 source of
 * truth を別オリジンとして参照する (#193 で privacy も LP 集約に変更).
 *
 * 関連 spec:
 *   openspec/specs/reservation-identity-document-upload/spec.md (footer 注記)
 *   openspec/specs/reservation-member-auth/spec.md (SignupProfilePage の footer 注記)
 *   openspec/specs/privacy-policy-page/spec.md (#193)
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
      <a
        :href="PRIVACY_POLICY_URL"
        target="_blank"
        rel="noreferrer"
        class="text-accent underline"
        data-testid="policy-footer-privacy-link"
      >
        プライバシーポリシー
      </a>
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
