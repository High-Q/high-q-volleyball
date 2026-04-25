<template>
  <div id="top">
    <HeroSection />
    <ConceptSection />
    <EventCalendar />
  </div>
</template>

<script>
import { HeroSection } from '@widgets/hero-section'
import { ConceptSection } from '@widgets/concept-section'
import { EventCalendar } from '@widgets/event-calendar'

export default {
  name: 'HomePage',
  components: { HeroSection, ConceptSection, EventCalendar },
}
</script>

<style>
/* ヘッダー高さ補正（アンカースクロール時にセクション見出しが隠れないよう） */
section[id] {
  scroll-margin-top: 64px;
}
</style>
