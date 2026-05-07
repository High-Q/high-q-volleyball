<script setup lang="ts">
import { computed } from "vue";
import { buildMapUrl, type VenueMapInput } from "../lib/build-map-url";

/**
 * 「会場の地図を見る」リンク。
 * `target="_blank" rel="noopener noreferrer"` で新規タブを開く。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: 会場地図リンク
 */

const props = defineProps<{
  venue: VenueMapInput;
}>();

const href = computed(() => buildMapUrl(props.venue));
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="block w-full text-center py-hq-3 bg-transparent text-ink border border-hairline rounded-full font-jp text-sm no-underline hover:bg-paper-warm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors"
    data-testid="venue-map-link"
  >
    会場の地図を見る
  </a>
</template>
