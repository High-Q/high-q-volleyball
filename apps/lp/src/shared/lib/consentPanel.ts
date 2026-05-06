import { ref } from "vue";

/**
 * Cookie 同意パネル (バナー詳細展開) の表示状態を管理するシングルトン.
 *
 * ConsentBanner widget が表示状態を購読し、フッターや /external-transmission
 * ページの「Cookie 設定」/「Cookie 同意設定を変更する」リンクが open() を呼ぶ.
 */
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
