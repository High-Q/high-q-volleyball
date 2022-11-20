<template>
  <v-container fluid fill-height>
    <v-row justify="center" class="pa-md-16">
      <SubTitle title="Event"></SubTitle>
    </v-row>
    <v-row class="px-md-16">
      <v-container>
        <v-sheet height="64">
          <v-toolbar flat>
            <v-btn
              outlined
              class="pa-0"
              color="grey darken-2"
              @click="setToday"
            >
              Today
            </v-btn>
            <v-btn
              fab
              text
              small
              class="pa-0"
              color="grey darken-2"
              @click="prev"
            >
              <v-icon small>
                mdi-chevron-left
              </v-icon>
            </v-btn>
            <v-btn
              fab
              text
              smal
              class="pa-0"
              color="grey darken-2"
              @click="next"
            >
              <v-icon small>
                mdi-chevron-right
              </v-icon>
            </v-btn>
            <v-toolbar-title class="pa-0" v-if="$refs.calendar">
              {{ $refs.calendar.title }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-menu bottom right>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  outlined
                  small
                  class="pa-0"
                  color="grey darken-2"
                  v-bind="attrs"
                  v-on="on"
                >
                  <span>{{ typeToLabel[type] }}</span>
                  <v-icon right>
                    mdi-menu-down
                  </v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="type = 'day'">
                  <v-list-item-title>Day</v-list-item-title>
                </v-list-item>
                <v-list-item @click="type = 'week'">
                  <v-list-item-title>Week</v-list-item-title>
                </v-list-item>
                <v-list-item @click="type = 'month'">
                  <v-list-item-title>Month</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-toolbar>
        </v-sheet>
        <v-sheet height="600">
          <v-calendar
            ref="calendar"
            v-model="focus"
            color="primary"
            :events="events"
            :event-color="getEventColor"
            :type="type"
            @click:event="showEvent"
            @click:more="viewDay"
            @click:date="viewDay"
            @change="updateRange"
          ></v-calendar>
        </v-sheet>
      </v-container>
    </v-row>
  </v-container>
</template>
<script>
import SubTitle from "./SubTitle.vue";
export default {
  name: "Event",
  components: {
    SubTitle,
  },
  data: () => ({
    focus: "",
    type: "month",
    typeToLabel: {
      month: "Month",
      week: "Week",
      day: "Day",
    },
    selectedEvent: {},
    selectedElement: null,
    selectedOpen: false,
    events: [],
  }),
  mounted() {
    this.$refs.calendar.checkChange();
  },
  methods: {
    viewDay({ date }) {
      this.focus = date;
      this.type = "day";
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
    updateRange() {
      const events = [];
      for (let i = 0; i < 1; i++) {
        //Eventの数だけループを回す
        events.push(
          {
            name: "バレー会",
            start: new Date("2023-01-14T09:00:00"), // 開始時刻
            end: new Date("2023-01-14T12:00:00"), // 終了時刻
            color: "blue",
            details: new Date("2023-01-14T09:00:00"),
            timed: true, // 終日ならfalse
          },
          {
            name: "バレー会",
            start: new Date("2023-02-05T18:00:00"), // 開始時刻
            end: new Date("2023-02-05T21:30:00"), // 終了時刻
            color: "blue",
            details: new Date("2023-02-05T18:00:00"),
            timed: true, // 終日ならfalse
          },
          {
            name: "バレー会",
            start: new Date("2023-02-18T09:00:00"), // 開始時刻
            end: new Date("2023-02-18T12:00:00"), // 終了時刻
            color: "blue",
            details: new Date("2023-02-18T09:00:00"),
            timed: true, // 終日ならfalse
          }
        );
      }
      this.events = events;
    },
    getEventColor(event) {
      return event.color;
    },
  },
};
</script>
