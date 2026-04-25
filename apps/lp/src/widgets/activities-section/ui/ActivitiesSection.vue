<template>
  <section class="py-16" style="background-color: #F5F8FA;">
    <v-container>
      <SubTitle title="Content" />
      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <p class="text-body-1">
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
            target="_blank"
          >
            <v-icon color="white">mdi-twitter</v-icon>
          </v-btn>
        </v-col>
        <v-col cols="12" md="6">
          <v-img
            src="/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg"
            rounded="lg"
            cover
            height="280"
          />
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script>
import SubTitle from "./SubTitle.vue";

export default {
  name: "ActivitiesContent",
  components: { SubTitle },
};
</script>
