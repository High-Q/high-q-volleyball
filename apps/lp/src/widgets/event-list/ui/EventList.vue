<template>
  <section
    class="event-list"
    data-testid="event-list"
    aria-labelledby="event-list-heading"
  >
    <header class="event-list__head">
      <Kicker color="accent">— Schedule</Kicker>
      <h2 id="event-list-heading" class="event-list__heading">
        次に、来れる日。
      </h2>
      <p class="event-list__lead">{{ rangeLabel }}</p>
    </header>

    <div v-if="isPending" class="event-list__state event-list__state--pending">
      <p>開催情報を読み込んでいます…</p>
    </div>
    <div v-else-if="isError" class="event-list__state event-list__state--error" role="alert">
      <p>開催情報の取得に失敗しました。<br />しばらくしてから再読み込みしてください。</p>
    </div>
    <div v-else-if="isEmpty" class="event-list__state event-list__state--empty">
      <p>現在、予定されている開催はありません。<br />新しい開催が決まり次第ここに表示します。</p>
    </div>
    <ul v-else class="event-list__items">
      <li v-for="event in events" :key="event.id" class="event-list__item">
        <article class="event-card" :data-event-id="event.id">
          <div class="event-card__date">
            <div class="event-card__month">{{ event.monthLabel }}</div>
            <div class="event-card__day">{{ event.dayLabel }}</div>
            <div class="event-card__dow">{{ event.dowLabel }}</div>
          </div>
          <div class="event-card__body">
            <div class="event-card__title">{{ event.title }}</div>
            <div class="event-card__meta">{{ event.time }}</div>
            <div class="event-card__meta">{{ event.location }}</div>
            <span
              v-if="event.availability"
              class="event-card__avail"
              :class="`event-card__avail--${event.availability.tone}`"
              :data-testid="`event-availability-${event.id}`"
            >
              <span class="event-card__avail-dot" aria-hidden="true" />
              {{ event.availability.text }}
            </span>
          </div>
          <a
            :href="urlFor(event.id)"
            class="event-card__cta"
            :data-event-id="event.id"
            :data-testid="`event-card-cta-${event.id}`"
          >
            {{ event.availability?.isFull ? 'キャンセル待ち' : '予約する' }}
            <span aria-hidden="true">›</span>
          </a>
        </article>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Kicker } from '@high-q/ui'
import { useEventList } from '../model/useEventList'
import { reservationEventUrl } from '@shared/config/reservation'

const { events, isPending, isError, isEmpty } = useEventList()

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const rangeLabel = computed(() => {
  const list = events.value
  if (!list || list.length === 0) return 'Coming soon'
  const months = list.map((e: { monthLabel: string }) => {
    const idx = MONTH_FULL.findIndex((m) => m.toUpperCase().startsWith(e.monthLabel))
    return idx >= 0 ? idx : -1
  }).filter((i: number) => i >= 0)
  if (months.length === 0) return 'Upcoming events'
  const minIdx = Math.min(...months)
  const maxIdx = Math.max(...months)
  const year = new Date().getFullYear()
  const minName = MONTH_FULL[minIdx]
  const maxName = MONTH_FULL[maxIdx]
  return minIdx === maxIdx
    ? `${minName} ${year}`
    : `${minName}–${maxName} ${year}`
})

function urlFor(id: string) {
  return reservationEventUrl(id)
}
</script>

<style scoped>
.event-list {
  background: var(--hq-color-paper);
  padding: 72px 28px 56px;
  padding-inline: max(28px, calc((100% - 880px) / 2));
}

.event-list__head {
  margin-bottom: 24px;
}

.event-list__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 26px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.event-list__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.event-list__state {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.85;
  color: var(--hq-color-ink-soft);
  background: var(--hq-color-paper-warm);
  border-radius: 4px;
  padding: 24px;
  text-align: center;
}

.event-list__state--error {
  color: var(--hq-color-danger);
}

.event-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-card {
  display: flex;
  gap: 16px;
  align-items: center;
  background: var(--hq-color-paper-warm);
  border: 1px solid var(--hq-color-hairline);
  border-radius: 4px;
  padding: 18px;
  color: inherit;
}

.event-card__date {
  min-width: 56px;
  text-align: center;
  border-right: 1px solid var(--hq-color-hairline);
  padding-right: 16px;
}

.event-card__month {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--hq-color-muted);
}

.event-card__day {
  font-family: var(--hq-font-jp-display);
  font-size: 28px;
  font-weight: 500;
  line-height: 1;
  color: var(--hq-color-ink);
  margin-top: 2px;
}

.event-card__dow {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--hq-color-muted);
  margin-top: 4px;
}

.event-card__body {
  flex: 1;
  min-width: 0;
}

.event-card__title {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--hq-color-ink);
  margin-bottom: 6px;
}

.event-card__meta {
  font-family: var(--hq-font-jp);
  font-size: 11.5px;
  color: var(--hq-color-muted);
  line-height: 1.7;
}

.event-card__avail {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-family: var(--hq-font-jp);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
}

.event-card__avail-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* トーンはドット色で表現し、テキスト色は AA を満たす ink 系に保つ
   (warn の amber を本文色に使うとコントラスト不足になるため)。
   満員のみ danger 色 (#9c4030 は十分濃く AA を満たす) で強調する。 */
.event-card__avail--ok {
  color: var(--hq-color-ink-soft);
}
.event-card__avail--ok .event-card__avail-dot {
  background: var(--hq-color-success);
}

.event-card__avail--warn {
  color: var(--hq-color-ink);
}
.event-card__avail--warn .event-card__avail-dot {
  background: var(--hq-color-warn);
}

.event-card__avail--full {
  color: var(--hq-color-danger);
}
.event-card__avail--full .event-card__avail-dot {
  background: var(--hq-color-danger);
}

.event-card__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-radius: var(--hq-radius-pill);
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  font-family: var(--hq-font-jp);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-decoration: none;
  min-height: 36px;
  white-space: nowrap;
  transition: opacity 120ms ease;
}

.event-card__cta:hover {
  opacity: 0.88;
}

.event-card__cta:focus-visible {
  outline: 2px solid var(--hq-color-ink);
  outline-offset: 2px;
}
</style>
