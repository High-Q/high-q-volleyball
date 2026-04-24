<template>
  <v-container fluid>
    <v-row justify="center" class="pa-md-16">
      <SubTitle title="EventContents"></SubTitle>
    </v-row>
    <v-row>
      <v-container>
        <v-sheet>
          <v-toolbar flat>
            <v-btn variant="outlined" class="mr-4" color="grey-darken-2" @click="setToday">
              Today
            </v-btn>
            <v-btn variant="text" size="small" color="grey-darken-2" @click="prev">
              <v-icon size="small">fas fa-chevron-left</v-icon>
            </v-btn>
            <v-btn variant="text" size="small" color="grey-darken-2" @click="next">
              <v-icon size="small">fas fa-chevron-right</v-icon>
            </v-btn>
            <v-toolbar-title>{{ calendarTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
        </v-sheet>
        <v-sheet height="450">
          <v-calendar
            v-model="viewDate"
            :events="calendarEvents"
            view-mode="month"
            @click:event="showEvent"
          />
        </v-sheet>
        <v-dialog v-model="dialog" max-width="290">
          <v-card>
            <v-card-title class="text-h5">{{ selectedEvent.name }}</v-card-title>
            <v-card-text>
              <div><strong>開始時間:</strong> {{ formatDate(selectedEvent.start) }}</div>
              <div><strong>終了時間:</strong> {{ formatDate(selectedEvent.end) }}</div>
              <div><strong>場所:</strong> {{ selectedEvent.location }}</div>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" variant="text" @click="dialog = false">Close</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-row>
  </v-container>
</template>

<script>
import SubTitle from "./SubTitle.vue";
import axios from "axios";

export default {
  components: { SubTitle },
  data() {
    return {
      viewDate: [new Date()],
      dialog: false,
      selectedEvent: {},
      events: [],
    };
  },
  computed: {
    calendarTitle() {
      const d = this.viewDate[0];
      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
    },
    calendarEvents() {
      return this.events.map((e) => ({
        title: e.name,
        start: e.start,
        end: e.end,
        color: e.color,
      }));
    },
  },
  mounted() {
    this.fetchEvents();
  },
  methods: {
    setToday() {
      this.viewDate = [new Date()];
    },
    prev() {
      const d = new Date(this.viewDate[0]);
      d.setMonth(d.getMonth() - 1);
      this.viewDate = [d];
    },
    next() {
      const d = new Date(this.viewDate[0]);
      d.setMonth(d.getMonth() + 1);
      this.viewDate = [d];
    },
    showEvent({ event }) {
      const original = this.events.find((e) => e.name === event.title);
      if (original) {
        this.selectedEvent = original;
        this.dialog = true;
      }
    },
    async fetchEvents() {
      try {
        const response = await axios.get(
          "https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event"
        );
        const parsedData = JSON.parse(response.data.body);
        this.events = parsedData.map((event) => ({
          id: event.id,
          name: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          location: event.location,
          color: "blue",
        }));
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    },
    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
};
</script>
