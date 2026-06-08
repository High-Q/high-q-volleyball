<script setup lang="ts">
import { computed } from "vue";
import type { EventParticipantNickname } from "@/entities/event";

/**
 * 予約詳細画面用の「参加者」セクション (Issue #278)。
 *
 * 予約状況セクションの下、Cancel Policy ボックスの上に配置される。
 * nickname 未設定者は「参加メンバー」と汎用表記し、自分の行には「あなた」マーカーを
 * 付与する。同伴者は個別 nickname を持たないため、末尾サマリで「同伴者 +N 名」を集約表示。
 *
 * 個人特定可能情報 (本名 / メール / 電話番号 / 生年月日 / 経験レベル) は描画しない。
 *
 * 関連:
 *   openspec/changes/show-event-participant-nicknames/specs/reservation-detail-page/spec.md
 */

const props = defineProps<{
  /** RPC 戻り値 (`bookings.created_at ASC` 順を保持) */
  participants: EventParticipantNickname[];
  /** RPC 取得中は true。skeleton 表示用 */
  loading: boolean;
  /** RPC エラー時の文言。null なら通常描画 */
  errorMessage: string | null;
}>();

const guestSum = computed(() =>
  props.participants.reduce((sum, p) => sum + p.guestCount, 0),
);
</script>

<template>
  <section
    class="bg-surface border border-hairline rounded-hq-lg px-hq-5 py-hq-4 flex flex-col gap-hq-3"
    data-testid="reservation-participants"
  >
    <h2
      class="font-mono text-xs text-muted tracking-widest uppercase m-0"
      data-testid="reservation-participants-label"
    >
      参加者
    </h2>

    <!-- Loading: skeleton 4 行 -->
    <div
      v-if="loading"
      class="flex flex-col gap-hq-2"
      data-testid="reservation-participants-loading"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="h-hq-5 rounded-hq-sm bg-hairline animate-pulse"
      />
    </div>

    <!-- Error: セクション内エラー (画面全体 retry に集約) -->
    <p
      v-else-if="errorMessage !== null"
      class="text-sm text-muted m-0"
      data-testid="reservation-participants-error"
    >
      {{ errorMessage }}
    </p>

    <!-- 通常表示: 参加者一覧 + 同伴者サマリ -->
    <template v-else>
      <ul
        class="flex flex-col gap-hq-2 m-0 p-0 list-none"
        data-testid="reservation-participants-list"
      >
        <li
          v-for="p in participants"
          :key="p.memberId"
          class="flex items-center gap-hq-2 text-base"
          :data-is-self="p.isSelf ? 'true' : 'false'"
        >
          <span class="text-ink">
            {{ p.nickname !== null && p.nickname !== "" ? p.nickname : "参加メンバー" }}
          </span>
          <span
            v-if="p.isSelf"
            class="font-mono text-xs text-muted tracking-wider uppercase border border-hairline rounded-hq-sm px-hq-2 py-hq-1"
            data-testid="reservation-participants-self-marker"
          >
            あなた
          </span>
        </li>
      </ul>

      <p
        v-if="guestSum >= 1"
        class="text-sm text-muted m-0"
        data-testid="reservation-participants-guest-summary"
      >
        同伴者 +{{ guestSum }} 名
      </p>
    </template>
  </section>
</template>
