// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import XIcon from './XIcon.vue'

describe('XIcon', () => {
  it('デフォルトサイズ24でsvgがレンダーされる', () => {
    const wrapper = mount(XIcon)
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
  })

  it('props.size を svg width/height にバインドする', () => {
    const wrapper = mount(XIcon, { props: { size: 32 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('32')
    expect(svg.attributes('height')).toBe('32')
  })

  it('props.color を path fill にバインドする', () => {
    const wrapper = mount(XIcon, { props: { color: '#ffffff' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('fill')).toBe('#ffffff')
  })

  it('デフォルトでは fill が currentColor', () => {
    const wrapper = mount(XIcon)
    expect(wrapper.find('svg').attributes('fill')).toBe('currentColor')
  })

  it('aria-hidden="true" が付与されている', () => {
    const wrapper = mount(XIcon)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
