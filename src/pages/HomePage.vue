<template>
  <section class="home">
    <MainImage></MainImage>
    <ConceptContents></ConceptContents>
    <ActivitiesContent></ActivitiesContent>
    <EventContents></EventContents>
  </section>
</template>

<script>
import MainImage from "../components/MainImage.vue"
import ConceptContents from "../components/ConseptContent.vue";
import ActivitiesContent from "../components/ActivitiesContent.vue"
import EventContents from '../components/EventContent.vue';

export default {
  name: "HomePage",
  components: {
    ConceptContents,
    MainImage,
    ActivitiesContent,
    EventContents,
  },
};
</script>