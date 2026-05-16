<template>
  <div id="top">
    <v-snackbar
      v-model="showWithdrawalNotice"
      :timeout="6000"
      color="success"
      location="top"
      data-testid="lp-withdrawal-notice"
    >
      会員データの削除が完了しました。ご利用ありがとうございました。
    </v-snackbar>

    <HeroSection />
    <ConceptSection />
    <ActivitiesSection />
    <EventCalendar />
  </div>
</template>

<script>
import { HeroSection } from '@widgets/hero-section'
import { ConceptSection } from '@widgets/concept-section'
import { ActivitiesSection } from '@widgets/activities-section'
import { EventCalendar } from '@widgets/event-calendar'

export default {
  name: 'HomePage',
  components: { HeroSection, ConceptSection, ActivitiesSection, EventCalendar },
  data() {
    return {
      showWithdrawalNotice: false,
    }
  },
  mounted() {
    // 予約サイトの自己退会フローから ?withdrawn=1 で遷移してきたときに
    // 完了メッセージを表示する。URL からはクエリを削除して再表示を防ぐ。
    const params = new URLSearchParams(window.location.search)
    if (params.get('withdrawn') === '1') {
      this.showWithdrawalNotice = true
      params.delete('withdrawn')
      const next = params.toString()
      const url = window.location.pathname + (next ? `?${next}` : '') + window.location.hash
      window.history.replaceState({}, '', url)
    }
  },
}
</script>

<style>
/* ヘッダー高さ補正（アンカースクロール時にセクション見出しが隠れないよう） */
section[id] {
  scroll-margin-top: 64px;
}
</style>
