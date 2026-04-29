import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";

/**
 * Vue Router を組み込んだ test 用マウントヘルパー。
 * `createMemoryHistory()` で本番のブラウザ履歴を持たない router を
 * 用意し、`initialPath` で起動時のルートを指定できる。
 */
export async function mountWithRouter<TComponent extends Component>(
  component: TComponent,
  routes: RouteRecordRaw[],
  initialPath = "/",
  options: ComponentMountingOptions<TComponent> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  await router.push(initialPath);
  await router.isReady();

  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [...(options.global?.plugins ?? []), router],
    },
  });
}
