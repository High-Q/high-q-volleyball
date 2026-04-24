<template>
  <div>
    <MainImage />
    <ConseptContent />
    <EventContent />
  </div>
</template>

<script>
import MainImage from "../components/MainImage.vue";
import ConseptContent from "../components/ConseptContent.vue";
import EventContent from "../components/EventContent.vue";

export default {
  name: "HomePage",
  components: { MainImage, ConseptContent, EventContent },
};
</script>
