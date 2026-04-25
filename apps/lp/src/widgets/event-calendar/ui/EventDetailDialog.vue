<template>
  <v-dialog v-model="model" max-width="340">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-5">
        {{ event.name }}
      </v-card-title>
      <v-card-text class="px-5 pb-2">
        <v-list density="compact" class="pa-0">
          <v-list-item prepend-icon="mdi-clock-outline" class="px-0">
            <v-list-item-title class="text-body-2">{{ formatDate(event.start) }}</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-clock-check-outline" class="px-0">
            <v-list-item-title class="text-body-2">{{ formatDate(event.end) }}</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-map-marker-outline" class="px-0">
            <v-list-item-title class="text-body-2">{{ event.location }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn color="primary" variant="flat" rounded="lg" size="small" @click="model = false">
          閉じる
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'EventDetailDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    event:      { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    model: {
      get() { return this.modelValue },
      set(v) { this.$emit('update:modelValue', v) },
    },
  },
  methods: {
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    },
  },
}
</script>
