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
          <v-btn icon variant="text" color="primary" size="small" @click="prev">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <span class="cal-month">{{ calendarTitle }}</span>
          <v-btn icon variant="text" color="primary" size="small" @click="next">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
          <v-spacer />
          <v-btn variant="outlined" size="x-small" color="primary" rounded="lg" @click="setToday">
            今日
          </v-btn>
        </div>

        <v-divider />

        <v-sheet height="440" rounded="b-xl">
          <v-calendar
            v-model="viewDate"
            :events="calendarEvents"
            view-mode="month"
            @click:event="showEvent"
          />
        </v-sheet>
      </v-sheet>
    </v-container>

    <!-- イベント詳細ダイアログ -->
    <v-dialog v-model="dialog" max-width="340">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-5">
          {{ selectedEvent.name }}
        </v-card-title>
        <v-card-text class="px-5 pb-2">
          <v-list density="compact" class="pa-0">
            <v-list-item prepend-icon="mdi-clock-outline" class="px-0">
              <v-list-item-title class="text-body-2">
                {{ formatDate(selectedEvent.start) }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-clock-check-outline" class="px-0">
              <v-list-item-title class="text-body-2">
                {{ formatDate(selectedEvent.end) }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-map-marker-outline" class="px-0">
              <v-list-item-title class="text-body-2">{{ selectedEvent.location }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn color="primary" variant="flat" rounded="lg" size="small" @click="dialog = false">
            閉じる
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
export default {
  name: "EventContents",
  data() {
    return {
      viewDate: new Date(),
      dialog: false,
      selectedEvent: {},
      events: [],
    };
  },
  computed: {
    calendarTitle() {
      const d = this.viewDate;
      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
    },
    calendarEvents() {
      return this.events.map((e) => ({
        title: e.name,
        start: e.start,
        end: e.end,
        color: "#85BBCC",
      }));
    },
  },
  mounted() {
    this.fetchEvents();
  },
  methods: {
    setToday() { this.viewDate = new Date(); },
    prev() {
      const d = new Date(this.viewDate);
      d.setMonth(d.getMonth() - 1);
      this.viewDate = d;
    },
    next() {
      const d = new Date(this.viewDate);
      d.setMonth(d.getMonth() + 1);
      this.viewDate = d;
    },
    showEvent({ event }) {
      const original = this.events.find((e) => e.name === event.title);
      if (original) { this.selectedEvent = original; this.dialog = true; }
    },
    async fetchEvents() {
      try {
        const res = await fetch(
          "https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event"
        );
        const json = await res.json();
        const data = JSON.parse(json.body);
        this.events = data.map((e) => ({
          id: e.id,
          name: e.title,
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          location: e.location,
        }));
      } catch {
        // API未取得時はカレンダーを空表示
      }
    },
    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleString("ja-JP", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    },
  },
};
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
  color: #182F43;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
}

.section-bar {
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #182F43, #85BBCC);
}

.calendar-sheet {
  overflow: hidden;
}

/* 今日の日付の丸: 明るいアクセントカラーに変更 */
:deep(.v-calendar-month__day--today .v-btn) {
  background-color: #85BBCC !important;
  color: #182F43 !important;
}
:deep(.v-calendar-month__day--today .v-btn__overlay) {
  opacity: 0 !important;
}
:deep(.v-calendar-month__day--today .v-btn__content) {
  color: #182F43 !important;
}

/* イベントのテキストを強制的に濃い色に */
:deep(.v-calendar-month__event),
:deep(.v-calendar-month__event *),
:deep(.v-event),
:deep(.v-event *) {
  color: #182F43 !important;
  font-weight: 600;
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
  color: #182F43;
  min-width: 120px;
  text-align: center;
}
</style>
