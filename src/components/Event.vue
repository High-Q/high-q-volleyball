<template>
  <v-container fluid fill-height>
    <v-row justify="center" class="pa-md-16">
      <SubTitle title="Event"></SubTitle>
    </v-row>
    <!-- <v-row justify="center" class="pa-md-16"> -->
    <!-- <p class="text-h6 font-weight-bold">第7回バレーボールイベント</p> -->
    <!-- </v-row> -->
    <!-- <v-row justify="center" class="pa-md-16">
      <p class="body-1">
        Comming Soon
        <br />
        日時： 2021年X月X日(X) XX:XX〜XX:XX
        <br />
        場所： XXX
        <br />
        持ち物： 運動できる服、シューズ、タオル、飲み物
        <br />
        参加費： XXX 円
      </p>
    </v-row> -->
    <v-row justify="center" class="pa-md-16">
      <v-col>
        <!-- <v-sheet height="64"> -->
          <v-toolbar flat>
            <v-btn
              outlined
              class="pa-0"
              color="grey darken-2"
              @click="setToday"
            >
              Today
            </v-btn>
            <v-btn fab text small class="pa-0" color="grey darken-2" @click="prev">
              <v-icon small>
                mdi-chevron-left
              </v-icon>
            </v-btn>
            <v-btn fab text smal class="pa-0" color="grey darken-2" @click="next">
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
                <v-btn outlined small class="pa-0" color="grey darken-2" v-bind="attrs" v-on="on">
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
        <!-- </v-sheet> -->
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
          <v-menu
            v-model="selectedOpen"
            :close-on-content-click="false"
            :activator="selectedElement"
            offset-x
          >
            <v-card color="grey lighten-4" min-width="350px" flat>
              <v-toolbar :color="selectedEvent.color" dark>
                <v-toolbar-title v-html="selectedEvent.name"></v-toolbar-title>
                <v-spacer></v-spacer>
              </v-toolbar>
              <v-card-text>
                <span v-html="selectedEvent.details"></span>
              </v-card-text>
              <v-card-actions>
                <v-btn text color="secondary" @click="selectedOpen = false">
                  Close
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-sheet>
      </v-col>
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
    showEvent({ nativeEvent, event }) {
      const open = () => {
        this.selectedEvent = event;
        this.selectedElement = nativeEvent.target;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => (this.selectedOpen = true))
        );
      };

      if (this.selectedOpen) {
        this.selectedOpen = false;
        requestAnimationFrame(() => requestAnimationFrame(() => open()));
      } else {
        open();
      }

      nativeEvent.stopPropagation();
    },
    updateRange() {
      const events = [];
      for (let i = 0; i < 1; i++) {//Eventの数だけループを回す
        events.push({
          name: "バレー会",
          start: new Date("2021-12-11T18:00:00"), // 開始時刻
          end: new Date("2021-12-11T20:00:00"), // 終了時刻
          color: "blue",
          details: new Date("2021-11-01T00:00:00"),
          timed: false, // 終日ならfalse
        });
      }
      this.events = events;
    },
    getEventColor(event) {
      return event.color;
    },
  },
};
</script>
