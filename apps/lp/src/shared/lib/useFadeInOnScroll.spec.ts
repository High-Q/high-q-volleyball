// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useFadeInOnScroll } from './useFadeInOnScroll'

// IntersectionObserver mock の参照を保持
let observers: MockIntersectionObserver[] = []

class MockIntersectionObserver {
  cb: (entries: { isIntersecting: boolean }[]) => void
  options: unknown
  observed: unknown[] = []
  disconnect = vi.fn()
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void, options?: unknown) {
    this.cb = cb
    this.options = options
    observers.push(this)
  }
  observe(target: unknown) {
    this.observed.push(target)
  }
  unobserve() {}
  takeRecords() { return [] }
  // テストから手動で発火
  trigger(isIntersecting: boolean) {
    this.cb([{ isIntersecting }])
  }
}

function createTestComponent() {
  return defineComponent({
    setup() {
      const { el, isVisible } = useFadeInOnScroll()
      return { el, isVisible }
    },
    render() {
      return h('section', { ref: 'el', 'data-visible': this.isVisible })
    },
  })
}

describe('useFadeInOnScroll', () => {
  beforeEach(() => {
    observers = []
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
    // matchMedia の default mock: reduced-motion 無効
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態は isVisible=false', async () => {
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(false)
  })

  it('IntersectionObserver が isIntersecting=true で発火すると isVisible=true になる', async () => {
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    expect(observers).toHaveLength(1)
    observers[0]!.trigger(true)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(true)
  })

  it('isIntersecting=false なら isVisible は false のまま', async () => {
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    observers[0]!.trigger(false)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(false)
  })

  it('発火後に observer.disconnect が呼ばれる（一度可視化したら以後監視不要）', async () => {
    const Comp = createTestComponent()
    mount(Comp)
    await nextTick()
    observers[0]!.trigger(true)
    await nextTick()
    expect(observers[0]!.disconnect).toHaveBeenCalled()
  })

  it('prefers-reduced-motion: reduce のとき初期から isVisible=true', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(true)
    // observer は作られない
    expect(observers).toHaveLength(0)
  })

  it('IntersectionObserver が undefined のとき初期から isVisible=true（フォールバック）', async () => {
    delete (global as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(true)
  })

  it('unmount 時に observer.disconnect が呼ばれる', async () => {
    const Comp = createTestComponent()
    const wrapper = mount(Comp)
    await nextTick()
    const observer = observers[0]!
    wrapper.unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})
