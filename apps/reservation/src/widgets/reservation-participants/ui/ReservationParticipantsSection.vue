<script setup lang="ts">
import { computed, ref } from "vue";
import type { EventParticipantNickname } from "@/entities/event";

/**
 * 予約詳細画面用の「参加者」セクション (Issue #278)。
 *
 * 予約状況セクションの下、Cancel Policy ボックスの上に配置される。
 * nickname 未設定者は「ニックネーム未設定」とグレーアウト表記し、本物の nickname と
 * 同色・同ウェイトで紛れないよう区別する。自分の行には「あなた」マーカーを付与する。
 * 同伴者は個別 nickname を持たないため、予約者本人の行に「＋同伴N名」を付けて表す。
 *
 * 見出しの「参加者 N名」は描画中の配列 (行数 + 同伴合算) から算出するため、
 * リストとの不一致は構造上起きない。予約状況セクションの reserved_count も同じ母集団
 * (status IN ('reserved','attended') の 1+guest_count) を数えるため通常一致するが、
 * 退会済み会員の予約行 (member_id IS NULL) のみ RPC が除外するためズレうる
 * (design.md「退会済み参加者は表示しない」判断による)。
 *
 * 個人特定可能情報 (本名 / メール / 電話番号 / 生年月日 / 経験レベル) は描画しない。
 *
 * 関連:
 *   openspec/changes/show-event-participant-nicknames/specs/reservation-detail-page/spec.md
 */

const props = defineProps<{
  /** RPC 戻り値 (`reservations.created_at ASC` 順を保持) */
  participants: EventParticipantNickname[];
  /** RPC 取得中は true。skeleton 表示用 */
  loading: boolean;
  /** RPC エラー時の文言。null なら通常描画 */
  errorMessage: string | null;
}>();

/** この行数を超えたら折りたたみ、「すべて表示」で展開する */
const COLLAPSE_THRESHOLD = 10;

const expanded = ref(false);

const guestSum = computed(() =>
  props.participants.reduce((sum, p) => sum + p.guestCount, 0),
);

/** 見出しの合計人数。描画リストと同じ配列から算出し、行数との一致を構造的に保証する */
const totalHeadcount = computed(
  () => props.participants.length + guestSum.value,
);

/** 見出し文言。Loading / Error 中は人数を出さない */
const headingLabel = computed(() =>
  !props.loading && props.errorMessage === null && totalHeadcount.value >= 1
    ? `参加者 ${totalHeadcount.value}名`
    : "参加者",
);

const visibleParticipants = computed(() =>
  expanded.value || props.participants.length <= COLLAPSE_THRESHOLD
    ? props.participants
    : props.participants.slice(0, COLLAPSE_THRESHOLD),
);

const hiddenCount = computed(
  () => props.participants.length - visibleParticipants.value.length,
);

const isAlone = computed(
  () => props.participants.length === 1 && props.participants[0]?.isSelf === true,
);

function hasNickname(p: EventParticipantNickname): boolean {
  return p.nickname !== null && p.nickname !== "";
}
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
      {{ headingLabel }}
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

    <!-- 通常表示: 参加者一覧 (罫線区切り・行内に同伴数) -->
    <template v-else>
      <ul
        class="divide-y divide-hairline m-0 p-0 list-none"
        data-testid="reservation-participants-list"
      >
        <li
          v-for="p in visibleParticipants"
          :key="p.memberId"
          class="flex items-center gap-hq-2 py-hq-2 text-sm"
          :data-is-self="p.isSelf ? 'true' : 'false'"
        >
          <span
            v-if="hasNickname(p)"
            class="text-ink min-w-0 break-words"
          >{{ p.nickname }}</span>
          <span
            v-else
            class="text-muted"
            data-testid="reservation-participants-no-nickname"
          >ニックネーム未設定</span>
          <!-- 縦 padding を持たせると行高が本文 (text-sm = 20px) を超えて自分の行だけ膨らむため、
               text-xs の行高 (16px) + 枠線のみで 20px 以内に収める -->
          <span
            v-if="p.isSelf"
            class="font-mono text-xs text-muted tracking-wider uppercase border border-hairline rounded-hq-sm px-hq-2 py-0 shrink-0"
            data-testid="reservation-participants-self-marker"
          >
            あなた
          </span>
          <span
            v-if="p.guestCount >= 1"
            class="ml-auto text-xs text-muted shrink-0"
            data-testid="reservation-participants-guest-count"
          >＋同伴{{ p.guestCount }}名</span>
        </li>
      </ul>

      <!-- 「ニックネーム未設定」(text-muted) と同一スタイルだと無効テキストに見えるため、
           本文色 + シェブロンでタップ可能と分かる見た目にする。タップ領域は 44px 以上
           (min-h-[44px] は DocumentChip.vue と同じ既存イディオム) -->
      <button
        v-if="hiddenCount >= 1"
        type="button"
        class="flex items-center gap-hq-1 min-h-[44px] font-jp text-sm text-ink hover:text-accent transition-colors"
        data-testid="reservation-participants-expand"
        @click="expanded = true"
      >
        すべて表示（あと{{ hiddenCount }}名）
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <p
        v-if="isAlone"
        class="text-xs text-muted m-0"
        data-testid="reservation-participants-alone-note"
      >
        ほかの参加者はまだいません。
      </p>
    </template>
  </section>
</template>
