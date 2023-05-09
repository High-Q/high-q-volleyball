<template>
  <v-container>
    <v-row>
      <v-col>
        <v-sheet height="450">
          <v-toolbar flat>
            <v-btn
              outlined
              class="mr-4"
              color="grey darken-2"
              @click="setToday"
            >
              Today
            </v-btn>
            <v-btn fab text small color="grey darken-2" @click="prev">
              <v-icon small>
                mdi-chevron-left
              </v-icon>
            </v-btn>
            <v-btn fab text small color="grey darken-2" @click="next">
              <v-icon small>
                mdi-chevron-right
              </v-icon>
            </v-btn>
            <v-toolbar-title v-if="$refs.calendar">
              {{ $refs.calendar.title }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-calendar
            ref="calendar"
            v-model="focus"
            color="primary"
            :events="events"
            :event-color="getEventColor"
            @click:event="showEvent"
            @click:more="viewDay"
            @click:date="viewDay"
          ></v-calendar>
        </v-sheet>
      </v-col>
    </v-row>
    <v-dialog v-model="dialog" max-width="290">
      <v-card>
        <v-card-title class="headline">{{ selectedEvent.name }}</v-card-title>
        <v-card-text>
          <div>
            <strong>開始時間:</strong> {{ formatDate(selectedEvent.start) }}
          </div>
          <div>
            <strong>終了時間:</strong> {{ formatDate(selectedEvent.end) }}
          </div>
          <div><strong>詳細:</strong> {{ selectedEvent.details }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";
export default {
  data() {
    return {
      focus: "",
      dialog: false,
      selectedEvent: {},
      events: [],
    };
  },
  mounted() {
    this.fetchEvents();
  },
  methods: {
    getEventColor(event) {
      return event.color;
    },
    showEvent({ event }) {
      console.log(event.start);
      this.selectedEvent = event;
      this.dialog = true;
    },
    viewDay({ date }) {
      this.focus = date;
      this.$refs.calendar.checkChange();
    },
    async fetchEvents() {
      try {
        const response = await axios.get(
          "https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event"
        );
        const parsedData = JSON.parse(response.data.body);
        const events = parsedData.map((event) => {
          return {
            id: event.id,
            name: event.title,
            start: new Date(event.start_time),
            end: new Date(event.end_time),
            location: event.location,
            color: "blue", // 青色に固定設定
          };
        });
        this.events = events;
        console.log(this.events);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    },
    formatDate(date) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Date(date).toLocaleString("ja-JP", options);
    },
    setToday() {
      this.focus = "";
    },
    prev() {
      this.$refs.calendar.prev();
    },
    next() {
      this.$refs.calendar.next();
    },
  },
};
</script>
