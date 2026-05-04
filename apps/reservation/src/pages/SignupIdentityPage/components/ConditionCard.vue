<script setup lang="ts">
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_REQUIREMENTS,
} from "@high-q/shared";
import type { DocumentType } from "@/entities/identity-document";

interface Props {
  type: DocumentType;
}

const props = defineProps<Props>();
</script>

<template>
  <div
    class="mt-hq-4 rounded-lg border border-hairline bg-paper-warm px-hq-4 py-hq-3"
  >
    <div
      class="font-mono text-[10px] tracking-[0.16em] text-muted"
    >
      — ACCEPTED IF
    </div>
    <div class="mt-hq-2 font-jp-display text-[14px] font-medium text-ink">
      {{ DOCUMENT_TYPE_LABELS[props.type] }}
    </div>
    <p
      class="mt-hq-1 font-jp text-[12px] leading-[1.7] text-ink/80"
    >
      {{ DOCUMENT_TYPE_REQUIREMENTS[props.type] }}
    </p>
  </div>
</template>
