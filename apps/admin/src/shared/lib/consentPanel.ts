import { ref } from "vue";

const _isPanelOpen = ref(false);

export function useConsentPanel() {
  return {
    isOpen: _isPanelOpen,
    open() {
      _isPanelOpen.value = true;
    },
    close() {
      _isPanelOpen.value = false;
    },
  };
}
