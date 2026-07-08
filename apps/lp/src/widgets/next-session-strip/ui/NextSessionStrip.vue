<template>
  <aside class="next-strip" aria-label="次回開催">
    <div class="next-strip__row">
      <!-- 左: 情報ブロック (2 行) -->
      <div class="next-strip__left">
        <template v-if="isPending">
          <div class="next-strip__placeholder">読み込み中…</div>
        </template>
        <template v-else-if="isError">
          <div class="next-strip__placeholder">開催情報を取得できませんでした</div>
        </template>
        <template v-else-if="nextEvent">
          <!-- 1 行目: NEXT / 日付 / シリーズ名 + 号数 -->
          <div class="next-strip__line1">
            <span class="next-strip__next">NEXT</span>
            <span
              v-if="stamp"
              class="next-strip__date"
              data-testid="next-session-date"
              >{{ stamp.date }}<span class="next-strip__dow">{{
                stamp.dow
              }}</span></span
            >
            <span class="next-strip__title">
              <span class="next-strip__series" data-testid="next-session-series">{{
                nextEvent.name
              }}</span
              ><span
                v-if="nextEvent.vol !== null"
                class="next-strip__vol"
                data-testid="next-session-vol"
                >vol.{{ nextEvent.vol }}</span
              >
            </span>
          </div>
          <!-- 2 行目: 時間 · 会場 (省略せず折り返す) + 残席バッジ -->
          <div class="next-strip__line2" data-testid="next-session-meta">
            {{ formatTimeLocation(nextEvent) }}
            <span
              v-if="availability"
              class="next-strip__avail"
              :class="`next-strip__avail--${availability.tone}`"
              data-testid="next-session-availability"
            >
              <span class="next-strip__avail-dot" aria-hidden="true" />
              {{ availability.text }}
            </span>
          </div>

        </template>
        <template v-else>
          <div class="next-strip__placeholder">次回開催は調整中です</div>
        </template>
      </div>

      <!-- 右: 予約 CTA (帯内で唯一のアクセント塗り) -->
      <a
        v-if="nextEvent"
        :href="targetUrl"
        class="next-strip__cta"
        data-testid="next-session-cta"
      >
        {{ availability?.isFull ? 'キャンセル待ち' : '予約する' }}
        <span aria-hidden="true">›</span>
      </a>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNextSession } from '../model/useNextSession'
import { reservationEventUrl } from '@shared/config/reservation'

const { nextEvent, availability, isPending, isError } = useNextSession()

const targetUrl = computed(() => {
  if (!nextEvent.value) return ''
  return reservationEventUrl(nextEvent.value.id)
})

const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** 日付 (M/D) と英略曜日。日付不正時は null。 */
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

.next-strip__left {
  flex: 1;
  min-width: 0;
}

.next-strip__placeholder {
  font-family: var(--hq-font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(247, 243, 234, 0.7);
}

/* 1 行目: 横並び・baseline 揃え・改行しない */
.next-strip__line1 {
  display: flex;
  align-items: baseline;
  gap: 12px;
  white-space: nowrap;
}

/* NEXT: 文脈として弱く保つ (無彩色淡色) */
.next-strip__next {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 1.5px;
  color: rgba(247, 243, 234, 0.5);
}

/* 日付: 左ブロック内で最大・縮小しない */
.next-strip__date {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.5px;
  color: var(--hq-color-paper);
}

.next-strip__dow {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: normal;
  color: rgba(247, 243, 234, 0.55);
  margin-left: 4px;
}

/* シリーズ名 + 号数グループ: 溢れたら ellipsis */
.next-strip__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--hq-font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--hq-color-paper);
}

/* 号数: 分割しない・無彩色淡色 (線/枠/チップで飾らない) */
.next-strip__vol {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  font-weight: 400;
  color: rgba(247, 243, 234, 0.6);
  margin-left: 8px;
}

/* 2 行目: 時間 · 会場。省略せず折り返す (狭幅で情報を消さない) */
.next-strip__line2 {
  margin-top: 7px;
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  line-height: 1.4;
  color: rgba(247, 243, 234, 0.55);
}

/* 残席バッジ (2 行目に併記)。ダーク帯上のため on-dark トークンで AA 確保。
   ドット色でトーンを表現し、テキストは弱い淡色に保つ (強調は日付と CTA のみ)。 */
.next-strip__avail {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  line-height: 1.4;
  color: rgba(247, 243, 234, 0.55);
}

.next-strip__avail-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.next-strip__avail--ok .next-strip__avail-dot {
  background: var(--hq-color-success-on-dark);
}

.next-strip__avail--warn .next-strip__avail-dot {
  background: var(--hq-color-warn-on-dark);
}

.next-strip__avail--full .next-strip__avail-dot {
  background: var(--hq-color-danger-on-dark);
}

/* CTA: 帯内で唯一のアクセント塗り・常に全文表示・縦中央 */
.next-strip__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--hq-font-jp);
  font-size: 13px;
  font-weight: 700;
  background: var(--hq-color-accent);
  color: var(--hq-color-paper);
  padding: 11px 18px;
  border-radius: 999px;
  text-decoration: none;
  transition: opacity 120ms ease;
}

.next-strip__cta:hover {
  opacity: 0.88;
}

.next-strip__cta:focus-visible {
  outline: 2px solid var(--hq-color-paper);
  outline-offset: 2px;
}
</style>
