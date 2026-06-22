<template>
  <aside class="next-strip" aria-label="次回開催">
    <div class="next-strip__row">
      <span class="next-strip__tag" :class="{ 'next-strip__tag--muted': !nextEvent }">NEXT</span>

      <div class="next-strip__body">
        <template v-if="isPending">
          <div class="next-strip__title next-strip__title--placeholder">読み込み中…</div>
        </template>
        <template v-else-if="isError">
          <div class="next-strip__title next-strip__title--placeholder">
            開催情報を取得できませんでした
          </div>
        </template>
        <template v-else-if="nextEvent">
          <div class="next-strip__title">{{ formatDateName(nextEvent) }}</div>
          <div class="next-strip__meta">{{ formatTimeLocation(nextEvent) }}</div>
          <span
            v-if="availability"
            class="next-strip__avail"
            :class="`next-strip__avail--${availability.tone}`"
            data-testid="next-session-availability"
          >
            <span class="next-strip__avail-dot" aria-hidden="true" />
            {{ availability.text }}
          </span>
        </template>
        <template v-else>
          <div class="next-strip__title next-strip__title--placeholder">
            次回開催は調整中です
          </div>
        </template>
      </div>

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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

interface NextSessionEvent {
  id: string
  name: string
  start: Date | null
  end: Date | null
  location: string
}

function formatDateName(event: NextSessionEvent) {
  const d = event.start
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return event.name
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dow = WEEKDAYS[d.getDay()]
  return `${month}/${day} (${dow}) · ${event.name}`
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
  gap: 14px;
  padding: 14px 24px;
  padding-inline: max(24px, calc((100% - 880px) / 2));
}

.next-strip__tag {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--hq-color-accent);
  border: 1px solid var(--hq-color-accent);
  padding: 3px 7px;
  border-radius: 2px;
}

.next-strip__tag--muted {
  color: rgba(247, 243, 234, 0.5);
  border-color: rgba(247, 243, 234, 0.3);
}

.next-strip__body {
  flex: 1;
  min-width: 0;
}

.next-strip__title {
  font-family: var(--hq-font-jp-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-paper);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-strip__title--placeholder {
  font-family: var(--hq-font-jp);
  font-weight: 400;
  font-size: 12.5px;
  color: rgba(247, 243, 234, 0.7);
}

.next-strip__meta {
  font-family: var(--hq-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: rgba(247, 243, 234, 0.6);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-strip__avail {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  font-family: var(--hq-font-jp);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.next-strip__avail-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ダーク帯 (--hq-color-ink) 上のため on-dark トークンで着色し AA を確保する。
   募集中は本文を paper、満員/残りわずかは on-dark のトーン色で強調する。 */
.next-strip__avail--ok {
  color: var(--hq-color-paper);
}
.next-strip__avail--ok .next-strip__avail-dot {
  background: var(--hq-color-success-on-dark);
}

.next-strip__avail--warn {
  color: var(--hq-color-warn-on-dark);
}
.next-strip__avail--warn .next-strip__avail-dot {
  background: var(--hq-color-warn-on-dark);
}

.next-strip__avail--full {
  color: var(--hq-color-danger-on-dark);
}
.next-strip__avail--full .next-strip__avail-dot {
  background: var(--hq-color-danger-on-dark);
}

.next-strip__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: var(--hq-radius-pill);
  background: var(--hq-color-accent);
  color: var(--hq-color-paper);
  font-family: var(--hq-font-jp);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-decoration: none;
  min-height: 32px;
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
