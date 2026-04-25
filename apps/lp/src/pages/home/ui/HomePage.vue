<template>
  <div id="top">
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
}
</script>

<style>
/* ヘッダー高さ補正（アンカースクロール時にセクション見出しが隠れないよう） */
section[id] {
  scroll-margin-top: 64px;
}
</style>
