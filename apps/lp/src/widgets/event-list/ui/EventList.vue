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
            <div
              v-if="event.vol !== null"
              class="event-card__vol"
              :data-testid="`event-card-vol-${event.id}`"
            >vol.{{ event.vol }}</div>
            <div class="event-card__title">{{ event.title }}</div>
            <div class="event-card__meta">{{ event.time }}</div>
            <div class="event-card__meta">{{ event.location }}</div>
          </div>
          <a
            :href="urlFor(event.id)"
            class="event-card__cta"
            :data-event-id="event.id"
            :data-testid="`event-card-cta-${event.id}`"
          >
            予約する
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

.event-card__vol {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--hq-color-accent);
  text-transform: uppercase;
  margin-bottom: 4px;
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
