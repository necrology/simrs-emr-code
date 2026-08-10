import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncLookupField from '../../app/components/emr/AsyncLookupField.vue'

const { searchEmrLookup } = vi.hoisted(() => ({ searchEmrLookup: vi.fn() }))

vi.mock('~/services/emr-forms', () => ({ searchEmrLookup }))

const lookup = {
  endpoint: '/api/v1/lookups/icd-10',
  query_parameter: 'search',
  min_search: 3,
  limit: 10,
  value_key: 'value',
  label_key: 'label',
}

describe('AsyncLookupField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    searchEmrLookup.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('preserves an unresolved stored ID until the user searches and selects a scalar value', async () => {
    searchEmrLookup.mockResolvedValue([{ value: 71, label: 'A00 - Kolera' }])
    const wrapper = mount(AsyncLookupField, {
      props: { id: 'diagnosis', name: 'diagnosis_id', lookup, modelValue: 42, debounceMs: 250 },
    })

    const input = wrapper.get('input[role="combobox"]')
    expect(input.element.getAttribute('value')).toBe('ID: 42')
    expect(wrapper.text()).toContain('ID tersimpan 42 dipertahankan')

    await input.setValue('ko')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    await wrapper.setProps({ modelValue: null })
    await vi.advanceTimersByTimeAsync(250)
    expect(searchEmrLookup).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Ketik minimal 3 karakter')

    await input.setValue('kol')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(searchEmrLookup).toHaveBeenCalledWith(lookup, 'kol', expect.any(AbortSignal))
    expect(wrapper.get('[role="option"]').text()).toBe('A00 - Kolera')

    await wrapper.get('.async-lookup-option').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([71])
  })

  it('ignores a slower stale response after a newer search completes', async () => {
    let resolveFirst: (value: { value: number, label: string }[]) => void = () => undefined
    let resolveSecond: (value: { value: number, label: string }[]) => void = () => undefined
    searchEmrLookup
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve }))

    const wrapper = mount(AsyncLookupField, {
      props: { id: 'diagnosis', name: 'diagnosis_id', lookup, debounceMs: 100 },
    })
    const input = wrapper.get('input[role="combobox"]')

    await input.setValue('kol')
    await vi.advanceTimersByTimeAsync(100)
    await input.setValue('kole')
    await vi.advanceTimersByTimeAsync(100)

    resolveSecond([{ value: 2, label: 'Hasil terbaru' }])
    await flushPromises()
    expect(wrapper.text()).toContain('Hasil terbaru')

    resolveFirst([{ value: 1, label: 'Hasil lama' }])
    await flushPromises()
    expect(wrapper.text()).not.toContain('Hasil lama')
    expect(wrapper.text()).toContain('Hasil terbaru')
  })
})
