<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import {
  HIGH_Q_OPEN_CHAT_NAME,
  HIGH_Q_OPEN_CHAT_URL,
} from "@/shared/lib/contact-channels";

/**
 * Cancel Policy ボックス。
 *
 * MVP1 の実挙動 (`events.start_at > now()` のみで判定 / cancel_deadline 不参照) と整合させる
 * 文言を採用し、デザインサンプルの「開催 24 時間前」表現は使わない。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: Cancel Policy ボックス
 */
</script>

<template>
  <section
    class="bg-surface border border-hairline rounded-hq-lg px-hq-4 py-hq-4 flex flex-col gap-hq-2"
    data-testid="cancel-policy-box"
  >
    <Kicker color="muted">— CANCEL POLICY</Kicker>
    <p class="font-jp text-xs text-ink-soft m-0 leading-relaxed">
      キャンセル期限は開催前日中です。当日キャンセルが必要な場合は、LINE オープンチャット
      <a
        :href="HIGH_Q_OPEN_CHAT_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="text-accent underline underline-offset-2"
      >「{{ HIGH_Q_OPEN_CHAT_NAME }}」</a>
      までご連絡ください。
    </p>
  </section>
</template>
