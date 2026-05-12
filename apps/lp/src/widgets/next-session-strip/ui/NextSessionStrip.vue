<template>
  <aside class="next-strip" aria-label="次回開催">
    <component
      :is="targetUrl ? 'a' : 'div'"
      :href="targetUrl || undefined"
      class="next-strip__row"
      :class="{ 'next-strip__row--link': !!targetUrl }"
      :data-testid="targetUrl ? 'next-session-strip-link' : 'next-session-strip-static'"
    >
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
        </template>
        <template v-else>
          <div class="next-strip__title next-strip__title--placeholder">
            次回開催は調整中です
          </div>
        </template>
      </div>

      <span v-if="targetUrl" class="next-strip__arrow" aria-hidden="true">予約 ›</span>
    </component>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useNextSession } from '../model/useNextSession'
import { reservationEventUrl } from '@shared/config/reservation'
import { LINE_OPEN_CHAT_URL } from '@shared/config/sns'

const { nextEvent, isPending, isError } = useNextSession()

const targetUrl = computed(() => {
  if (!nextEvent.value) return ''
  const url = reservationEventUrl(nextEvent.value.id)
  return url || LINE_OPEN_CHAT_URL
})

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateName(event) {
  const d = event.start
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return event.name
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dow = WEEKDAYS[d.getDay()]
  return `${month}/${day} (${dow}) · ${event.name}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTimeLocation(event) {
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
  background: var(--hq-color-paper-warm);
  color: var(--hq-color-ink);
  border-top: 1px solid var(--hq-color-hairline);
  border-bottom: 1px solid var(--hq-color-hairline);
}

.next-strip__row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
  padding-inline: max(24px, calc((100% - 880px) / 2));
  text-decoration: none;
  color: inherit;
}

.next-strip__row--link {
  cursor: pointer;
  transition: background 150ms ease;
}

.next-strip__row--link:hover {
  background: rgba(31, 29, 26, 0.04);
}

.next-strip__row--link:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: -2px;
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
  color: var(--hq-color-muted);
  border-color: var(--hq-color-muted);
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
  color: var(--hq-color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-strip__title--placeholder {
  font-family: var(--hq-font-jp);
  font-weight: 400;
  font-size: 12.5px;
  color: var(--hq-color-muted);
}

.next-strip__meta {
  font-family: var(--hq-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--hq-color-muted);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-strip__arrow {
  flex-shrink: 0;
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-accent);
  font-weight: 500;
  padding: 4px 10px;
  border: 1px solid var(--hq-color-accent);
  border-radius: 2px;
  transition: background 150ms ease;
}

.next-strip__row--link:hover .next-strip__arrow {
  background: var(--hq-color-accent-soft);
}
</style>
