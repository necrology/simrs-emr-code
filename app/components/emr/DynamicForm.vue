<script setup lang="ts">
import type { EmrFormField, EmrFormValue, EmrFormValues } from '~/types/emr-form'
import AsyncLookupField from '~/components/emr/AsyncLookupField.vue'
import { initializeFormValues, writableFormValues } from '~/utils/emr-form'

const props = withDefaults(defineProps<{
  fields: EmrFormField[]
  initialValues?: EmrFormValues
  errors?: Record<string, string[]>
  busy?: boolean
  submitLabel?: string
}>(), {
  initialValues: () => ({}),
  errors: () => ({}),
  busy: false,
  submitLabel: 'Simpan',
})

const emit = defineEmits<{
  submit: [values: EmrFormValues]
  cancel: []
}>()

const values = ref<EmrFormValues>({})

watch(
  [() => props.fields, () => props.initialValues],
  () => { values.value = initializeFormValues(props.fields, props.initialValues) },
  { deep: true, immediate: true },
)

function fieldId(field: EmrFormField): string {
  return `emr-field-${field.name.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function textValue(value: EmrFormValues[string] | undefined): string | number {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? '1' : '0'
  return ''
}

function updateTextValue(fieldName: string, event: Event): void {
  const target = event.target
  if (target instanceof HTMLTextAreaElement) values.value[fieldName] = target.value
}

function updateLookupValue(fieldName: string, value: EmrFormValue): void {
  values.value[fieldName] = value
}

function fieldHelp(field: EmrFormField): string | null {
  return field.help_text ?? field.help ?? null
}

function numberStep(field: EmrFormField): string {
  return field.type === 'integer' || field.rules.includes('integer') ? '1' : 'any'
}

function submit(): void {
  emit('submit', writableFormValues(props.fields, values.value))
}
</script>

<template>
  <form class="dynamic-form" @submit.prevent="submit">
    <div class="dynamic-form-grid">
      <div
        v-for="field in fields"
        :key="field.name"
        class="field"
        :class="{ 'field-wide': field.type === 'textarea' }"
      >
        <label :for="fieldId(field)">
          {{ field.label }}
          <span v-if="field.required" class="required-mark" aria-label="wajib">*</span>
        </label>

        <AsyncLookupField
          v-if="field.lookup"
          :id="fieldId(field)"
          :model-value="values[field.name]"
          :name="field.name"
          :lookup="field.lookup"
          :required="field.required"
          :disabled="field.read_only"
          :placeholder="field.placeholder ?? undefined"
          :invalid="Boolean(errors[field.name]?.length)"
          :described-by="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
          @update:model-value="updateLookupValue(field.name, $event)"
        />

        <textarea
          v-else-if="field.type === 'textarea'"
          :id="fieldId(field)"
          :value="textValue(values[field.name])"
          class="input textarea"
          :name="field.name"
          :required="field.required"
          :readonly="field.read_only"
          :placeholder="field.placeholder ?? undefined"
          :aria-invalid="Boolean(errors[field.name]?.length)"
          :aria-describedby="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
          rows="4"
          @input="updateTextValue(field.name, $event)"
        />

        <select
          v-else-if="field.type === 'select'"
          :id="fieldId(field)"
          v-model="values[field.name]"
          class="select"
          :name="field.name"
          :required="field.required"
          :disabled="field.read_only"
          :aria-invalid="Boolean(errors[field.name]?.length)"
          :aria-describedby="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
        >
          <option v-if="field.nullable || !field.required" value="">Pilih {{ field.label.toLocaleLowerCase('id-ID') }}</option>
          <option v-for="option in field.options ?? []" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
        </select>

        <label v-else-if="field.type === 'checkbox'" class="checkbox-field">
          <input
            :id="fieldId(field)"
            v-model="values[field.name]"
            type="checkbox"
            :name="field.name"
            :disabled="field.read_only"
            :aria-invalid="Boolean(errors[field.name]?.length)"
            :aria-describedby="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
          >
          <span>Ya</span>
        </label>

        <input
          v-else-if="field.type === 'number' || field.type === 'integer'"
          :id="fieldId(field)"
          v-model="values[field.name]"
          class="input"
          type="number"
          :step="numberStep(field)"
          :name="field.name"
          :required="field.required"
          :readonly="field.read_only"
          :placeholder="field.placeholder ?? undefined"
          :aria-invalid="Boolean(errors[field.name]?.length)"
          :aria-describedby="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
        >

        <input
          v-else
          :id="fieldId(field)"
          v-model="values[field.name]"
          class="input"
          :type="field.type === 'datetime' || field.type === 'datetime-local' ? 'datetime-local' : field.type"
          :name="field.name"
          :required="field.required"
          :readonly="field.read_only"
          :placeholder="field.placeholder ?? undefined"
          :aria-invalid="Boolean(errors[field.name]?.length)"
          :aria-describedby="fieldHelp(field) || errors[field.name]?.length ? `${fieldId(field)}-description` : undefined"
        >

        <div
          v-if="fieldHelp(field) || errors[field.name]?.length"
          :id="`${fieldId(field)}-description`"
          class="field-description"
        >
          <span v-if="fieldHelp(field)">{{ fieldHelp(field) }}</span>
          <span v-for="message in errors[field.name]" :key="message" class="field-error">{{ message }}</span>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button class="button" type="button" :disabled="busy" @click="emit('cancel')">Batal</button>
      <button class="button button-primary" type="submit" :disabled="busy">
        {{ busy ? 'Menyimpan…' : submitLabel }}
      </button>
    </div>
  </form>
</template>
