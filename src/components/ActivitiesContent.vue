<template>
  <v-container fluid fill-height>
    <v-row justify="start" class="px-md-16">
      <SubTitle title="Content"></SubTitle>
    </v-row>
    <v-row class="px-md-16">
      <v-container>
        <v-row>
          <v-col cols="12" md="6">
            <p class="body-1">
              月に1回程度東京都内にてコートを借りて練習します！
              <br />
              人数に合わせて活動回数も増やしていく予定です。
              <br />
              参加希望者や気になった方は
              <br />
              公式TwitterにてDMで問い合わせください！
            </p>
            <v-btn
              class="mr-4"
              width="30"
              height="30"
              min-width="30"
              min-height="30"
              color="#6A96A4"
              href="https://twitter.com/c8w5y"
            >
              <v-icon color="white">mdi-twitter</v-icon>
            </v-btn>
          </v-col>
          <v-col cols="12" md="6">
            <v-img src="/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg">
            </v-img>
          </v-col>
        </v-row>
      </v-container>
    </v-row>
  </v-container>
</template>
<script>
import SubTitle from "./SubTitle.vue";
export default {
  name: "ActivitiesContent",
  components: {
    SubTitle,
  },
};
</script>