<template>
  <div>
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
