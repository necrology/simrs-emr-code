import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DynamicForm from '../../app/components/emr/DynamicForm.vue'
import type { EmrFormField } from '../../app/types/emr-form'

function numberField(name: string, rules: string[]): EmrFormField {
  return {
    name,
    label: name,
    type: 'number',
    required: false,
    read_only: false,
    nullable: true,
    rules,
  }
}

describe('DynamicForm numeric inputs', () => {
  it('allows decimal numeric values while retaining whole-number steps for integer rules', () => {
    const wrapper = mount(DynamicForm, {
      props: {
        fields: [
          numberField('temperature', ['nullable', 'numeric']),
          numberField('pulse', ['nullable', 'integer']),
        ],
      },
      global: {
        stubs: { AsyncLookupField: true },
      },
    })

    expect(wrapper.get('input[name="temperature"]').attributes('step')).toBe('any')
    expect(wrapper.get('input[name="pulse"]').attributes('step')).toBe('1')
  })
})
