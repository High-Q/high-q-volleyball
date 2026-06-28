<template>
  <aside class="next-strip" aria-label="次回開催">
    <div class="next-strip__row">
      <!-- 左ブロック: NEXT / 日付スタンプ / タイトル+メタ -->
      <div class="next-strip__left">
        <span
          class="next-strip__tag"
          :class="{ 'next-strip__tag--muted': !nextEvent }"
          >NEXT</span
        >

        <template v-if="isPending">
          <div class="next-strip__placeholder">読み込み中…</div>
        </template>
        <template v-else-if="isError">
          <div class="next-strip__placeholder">開催情報を取得できませんでした</div>
        </template>
        <template v-else-if="nextEvent">
          <!-- 日付スタンプ (最優先情報・省略しない) -->
          <div
            v-if="stamp"
            class="next-strip__stamp"
            data-testid="next-session-stamp"
          >
            <span class="next-strip__date">{{ stamp.date }}</span>
            <span class="next-strip__dow">{{ stamp.dow }}</span>
          </div>

          <div class="next-strip__info">
            <div class="next-strip__titlerow">
              <span class="next-strip__series" data-testid="next-session-series">{{
                nextEvent.name
              }}</span>
              <!-- 号数: 特別回 (vol=null) では出さずシリーズ名を主役にする -->
              <span
                v-if="nextEvent.vol !== null"
                class="next-strip__vol"
                data-testid="next-session-vol"
                >vol.{{ nextEvent.vol }}</span
              >
            </div>
            <div class="next-strip__meta">{{ formatTimeLocation(nextEvent) }}</div>
          </div>
        </template>
        <template v-else>
          <div class="next-strip__placeholder">次回開催は調整中です</div>
        </template>
      </div>

      <!-- 右ブロック: 予約導線 (塗りなしのテキストリンク) -->
      <a
        v-if="nextEvent"
        :href="targetUrl"
        class="next-strip__cta"
        data-testid="next-session-cta"
      >
        予約
        <span aria-hidden="true">›</span>
      </a>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNextSession } from '../model/useNextSession'
import { reservationEventUrl } from '@shared/config/reservation'

const { nextEvent, isPending, isError } = useNextSession()

const targetUrl = computed(() => {
  if (!nextEvent.value) return ''
  return reservationEventUrl(nextEvent.value.id)
})

const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** 日付スタンプ (上=M/D / 下=英略曜日)。日付不正時は null でスタンプ非表示。 */
const stamp = computed<{ date: string; dow: string } | null>(() => {
  const d = nextEvent.value?.start
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    dow: DOW_EN[d.getDay()] ?? '',
  }
})

interface NextSessionEvent {
  start: Date | null
  end: Date | null
  location: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatTimeLocation(event: NextSessionEvent) {
  const { start, end, location } = event
  let time = ''
  if (start instanceof Date && !Number.isNaN(start.getTime())) {
    time = `${pad(start.getHours())}:${pad(start.getMinutes())}`
    if (end instanceof Date && !Number.isNaN(end.getTime())) {
      time += `–${pad(end.getHours())}:${pad(end.getMinutes())}`
    }
  }
  const loc = location ?? ''
  if (time && loc) return `${time} · ${loc}`
  return time || loc
}
</script>

<style scoped>
.next-strip {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
}

.next-strip__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 24px;
  padding-inline: max(24px, calc((100% - 880px) / 2));
}

/* 左ブロック: 残り幅を占有し、内部 (会場名) を省略可能にする */
.next-strip__left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.next-strip__tag {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--hq-color-accent);
}

.next-strip__tag--muted {
  color: rgba(247, 243, 234, 0.5);
}

.next-strip__placeholder {
  font-family: var(--hq-font-jp);
  font-size: 12.5px;
  color: rgba(247, 243, 234, 0.7);
}

/* 日付スタンプ: 最優先・省略しない */
.next-strip__stamp {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid rgba(247, 243, 234, 0.18);
  padding-right: 16px;
}

.next-strip__date {
  font-family: var(--hq-font-mono);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.5px;
  line-height: 1;
  color: var(--hq-color-paper);
}

.next-strip__dow {
  font-family: var(--hq-font-mono);
  font-size: 8.5px;
  letter-spacing: 2px;
  color: rgba(247, 243, 234, 0.5);
  margin-top: 3px;
}

.next-strip__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.next-strip__titlerow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.next-strip__series {
  flex-shrink: 0;
  font-family: var(--hq-font-jp-display);
  font-size: 14px;
  font-weight: 500;
  color: var(--hq-color-paper);
  white-space: nowrap;
}

/* 号数: 分割せず一語。アクセント色文字 + 枠のみ (塗りは使わない) */
.next-strip__vol {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--hq-color-accent);
  border: 1px solid var(--hq-color-accent);
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* メタ (時間 · 会場): 狭幅では会場名から省略 */
.next-strip__meta {
  font-family: var(--hq-font-mono);
  font-size: 9.5px;
  letter-spacing: 1.2px;
  color: rgba(247, 243, 234, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-strip__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--hq-font-mono);
  font-size: 10px;
  color: rgba(247, 243, 234, 0.85);
  text-decoration: none;
  transition: opacity 120ms ease;
}

.next-strip__cta:hover {
  opacity: 0.7;
}

.next-strip__cta:focus-visible {
  outline: 2px solid var(--hq-color-paper);
  outline-offset: 2px;
}
</style>
