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

    <HeroFirst />
    <NextSessionStrip />
    <ReassuranceStrip />
    <MetaStrip />
    <AboutSection />
    <FeaturesSection />
    <FirstTimeFlow />
    <WorriesSection />
    <EventList />
    <FaqSection />
    <NotForYouSection />
    <GallerySnsSection />
    <FinalCtaSection />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { HeroFirst } from '@widgets/hero-first'
import { NextSessionStrip } from '@widgets/next-session-strip'
import { ReassuranceStrip } from '@widgets/reassurance-strip'
import { MetaStrip } from '@widgets/meta-strip'
import { AboutSection } from '@widgets/about-section'
import { FeaturesSection } from '@widgets/features-section'
import { FirstTimeFlow } from '@widgets/first-time-flow'
import { WorriesSection } from '@widgets/worries-section'
import { EventList } from '@widgets/event-list'
import { FaqSection } from '@widgets/faq-section'
import { NotForYouSection } from '@widgets/not-for-you'
import { GallerySnsSection } from '@widgets/gallery-sns'
import { FinalCtaSection } from '@widgets/final-cta'

const showWithdrawalNotice = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('withdrawn') === '1') {
    showWithdrawalNotice.value = true
    params.delete('withdrawn')
    const next = params.toString()
    const url = window.location.pathname + (next ? `?${next}` : '') + window.location.hash
    window.history.replaceState({}, '', url)
  }
})
</script>
