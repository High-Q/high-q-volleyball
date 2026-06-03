import { onMounted, onBeforeUnmount, ref, type Ref } from "vue";

/**
 * 要素がビューポートに入ったタイミングで isVisible を true にする composable。
 * - prefers-reduced-motion: reduce のユーザーには初期から true（即時表示）
 * - IntersectionObserver 非対応ブラウザでも初期から true（フォールバック）
 * - 一度発火したら disconnect して以後監視しない
 */
export function useFadeInOnScroll(
  options: IntersectionObserverInit = { threshold: 0.15 },
): { el: Ref<Element | null>; isVisible: Ref<boolean> } {
  const el = ref<Element | null>(null);
  const isVisible = ref<boolean>(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      isVisible.value = true;
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      isVisible.value = true;
      return;
    }

    observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        isVisible.value = true;
        observer?.disconnect();
      }
    }, options);

    if (el.value) observer.observe(el.value);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  return { el, isVisible };
}
