<template>
  <v-container>
    <v-row>
      <v-col>
        <v-sheet>
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
      events: [
        {
          name: "ワークショップ",
          start: "2023-05-15T10:00:00",
          end: "2023-05-15T12:00:00",
          details: "ワークショップの説明がここに入ります。",
          color: "blue",
        },
        {
          name: "セミナー",
          start: "2023-05-20T14:00:00",
          end: "2023-05-20T16:00:00",
          details: "セミナーの説明がここに入ります。",
          color: "green",
        },
        {
          name: "ネットワーキングイベント",
          start: "2023-05-25T18:00:00",
          end: "2023-05-25T21:00:00",
          details: "ネットワーキングイベントの説明がここに入ります。",
          color: "red",
        },
      ],
    };
  },
  // mounted() {
  //   this.fetchEvents();
  // },
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
        const response = await axios.get("YOUR_API_URL");
        this.events = response.data.events;
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
  },
};
</script>
