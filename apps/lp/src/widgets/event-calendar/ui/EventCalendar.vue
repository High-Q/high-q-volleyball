<template>
  <section class="event-section">
    <v-container>
      <div class="section-header">
        <h2 class="section-title">EVENT</h2>
        <div class="section-bar"></div>
      </div>

      <v-sheet rounded="xl" elevation="1" class="calendar-sheet">
        <!-- 月ナビゲーション -->
        <div class="cal-toolbar">
          <v-btn icon variant="text" color="secondary" size="small" @click="prev">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <span class="cal-month">{{ calendarTitle }}</span>
          <v-btn icon variant="text" color="secondary" size="small" @click="next">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
          <v-spacer />
          <v-btn variant="outlined" size="x-small" color="primary" rounded="lg" @click="setToday">
            今日
          </v-btn>
        </div>

        <v-divider />

        <!-- Loading 状態 -->
        <v-sheet v-if="isPending" height="440" rounded="b-xl" class="d-flex align-center justify-center">
          <v-skeleton-loader type="table" width="100%" />
        </v-sheet>

        <!-- Error 状態 -->
        <v-sheet v-else-if="isError" height="440" rounded="b-xl" class="d-flex align-center justify-center pa-6">
          <v-alert type="error" variant="tonal" rounded="lg">
            イベント情報の取得に失敗しました。しばらくしてから再読み込みしてください。
          </v-alert>
        </v-sheet>

        <!-- Empty 状態 -->
        <v-sheet v-else-if="isEmpty" height="440" rounded="b-xl" class="d-flex align-center justify-center">
          <p class="text-medium-emphasis">予定されているイベントはありません</p>
        </v-sheet>

        <!-- Success 状態 -->
        <v-sheet v-else height="440" rounded="b-xl">
          <v-calendar
            v-model="viewDate"
            :events="calendarEvents"
            view-mode="month"
          >
            <template #event="{ event }">
              <div class="event-item" @click.stop="openDialog(event)">
                {{ event.name }}
              </div>
            </template>
          </v-calendar>
        </v-sheet>
      </v-sheet>
    </v-container>

    <EventDetailDialog v-model="dialog" :event="selectedEvent" />
  </section>
</template>

<script>
import { useEventCalendar } from '../model/useEventCalendar'
import EventDetailDialog from './EventDetailDialog.vue'

export default {
  name: 'EventCalendar',
  components: { EventDetailDialog },
  setup() {
    const { calendarEvents, isPending, isError, isEmpty } = useEventCalendar()
    return { calendarEvents, isPending, isError, isEmpty }
  },
  data() {
    return {
      viewDate:      new Date(),
      dialog:        false,
      selectedEvent: {},
    }
  },
  computed: {
    calendarTitle() {
      const d = this.viewDate
      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月`
    },
  },
  methods: {
    setToday() { this.viewDate = new Date() },
    prev() {
      const d = new Date(this.viewDate)
      d.setMonth(d.getMonth() - 1)
      this.viewDate = d
    },
    next() {
      const d = new Date(this.viewDate)
      d.setMonth(d.getMonth() + 1)
      this.viewDate = d
    },
    openDialog(calEvent) {
      this.selectedEvent = {
        name:     calEvent.name ?? calEvent.title ?? '',
        start:    calEvent.start,
        end:      calEvent.end,
        location: calEvent.location ?? '',
      }
      if (this.selectedEvent.name) this.dialog = true
    },
  },
}
</script>

<style scoped>
.event-section {
  padding: 56px 0;
  background: #fff;
}

.section-header {
  margin-bottom: 32px;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 900;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.08em;
  margin: 0 0 10px;
}

.section-bar {
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
}

.calendar-sheet {
  overflow: hidden;
}

:deep(.v-icon-btn--active) {
  border: none !important;
  outline: none !important;
}
:deep(.v-icon-btn--active .v-icon-btn__underlay) {
  background-color: rgb(var(--v-theme-secondary)) !important;
  opacity: 1 !important;
}
:deep(.v-icon-btn--active .v-icon-btn__content) {
  position: relative;
  z-index: 1;
  color: rgb(var(--v-theme-primary)) !important;
}

.event-item {
  background-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  text-align: center;
  cursor: pointer;
  padding: 0 2px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
}

.cal-month {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  min-width: 120px;
  text-align: center;
}
</style>
