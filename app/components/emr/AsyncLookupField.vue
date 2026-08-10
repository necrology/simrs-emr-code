<script setup lang="ts">
import type { EmrFormLookup, EmrFormOption, EmrFormValue } from '~/types/emr-form'
import { searchEmrLookup } from '~/services/emr-forms'

const props = withDefaults(defineProps<{
  id: string
  name: string
  lookup: EmrFormLookup
  modelValue?: EmrFormValue
  placeholder?: string
  required?: boolean
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  debounceMs?: number
}>(), {
  modelValue: null,
  placeholder: 'Ketik untuk mencari',
  required: false,
  disabled: false,
  invalid: false,
  describedBy: undefined,
  debounceMs: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: EmrFormValue]
}>()

const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const options = ref<EmrFormOption[]>([])
const selectedOption = ref<EmrFormOption | null>(null)
const loading = ref(false)
const error = ref('')
const hasSearched = ref(false)
const isOpen = ref(false)
const isFocused = ref(false)
const activeIndex = ref(-1)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestController: AbortController | undefined
let requestSequence = 0
let hasPendingModelUpdate = false
let pendingModelValue: EmrFormValue = null

const listboxId = computed(() => `${props.id}-listbox`)
const statusId = computed(() => `${props.id}-lookup-status`)
const minSearch = computed(() => Math.max(1, Math.floor(props.lookup.min_search || 1)))
const hasStoredValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '')
const expanded = computed(() => isOpen.value && options.value.length > 0)
const activeDescendant = computed(() => activeIndex.value >= 0 ? `${props.id}-option-${activeIndex.value}` : undefined)
const combinedDescription = computed(() => [props.describedBy, statusId.value].filter(Boolean).join(' '))

const statusText = computed(() => {
  if (loading.value) return 'Mencari data...'
  if (error.value) return error.value
  if (selectedOption.value) return `Terpilih: ${selectedOption.value.label}`
  if (hasStoredValue.value) return `ID tersimpan ${String(props.modelValue)} dipertahankan. Ketik untuk mengganti.`

  const length = query.value.trim().length
  if (length < minSearch.value) return `Ketik minimal ${minSearch.value} karakter untuk mencari.`
  if (hasSearched.value && options.value.length === 0) return 'Data tidak ditemukan.'
  if (options.value.length > 0) return `${options.value.length} pilihan ditemukan.`
  return ''
})

function sameValue(left: EmrFormValue | undefined, right: EmrFormValue | undefined): boolean {
  return left === right || (left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right))
}

function storedValueText(value: EmrFormValue | undefined): string {
  return value === null || value === undefined || value === '' ? '' : `ID: ${String(value)}`
}

function emitValue(value: EmrFormValue): void {
  hasPendingModelUpdate = true
  pendingModelValue = value
  emit('update:modelValue', value)
}

watch(
  () => props.modelValue,
  (value) => {
    if (hasPendingModelUpdate && sameValue(value, pendingModelValue)) {
      hasPendingModelUpdate = false
      return
    }

    const selected = selectedOption.value
    if (selected && sameValue(selected.value, value)) {
      query.value = selected.label
      return
    }

    selectedOption.value = null
    query.value = storedValueText(value)
  },
  { immediate: true },
)

function invalidateRequest(): void {
  requestSequence += 1
  requestController?.abort()
  requestController = undefined
  loading.value = false
}

function clearDebounce(): void {
  if (debounceTimer !== undefined) clearTimeout(debounceTimer)
  debounceTimer = undefined
}

function resetResults(): void {
  options.value = []
  activeIndex.value = -1
  hasSearched.value = false
  error.value = ''
}

async function runSearch(term: string): Promise<void> {
  invalidateRequest()
  const sequence = requestSequence
  const controller = new AbortController()
  requestController = controller
  loading.value = true
  error.value = ''
  hasSearched.value = false
  isOpen.value = true

  try {
    const results = await searchEmrLookup(props.lookup, term, controller.signal)
    if (sequence !== requestSequence || query.value.trim() !== term) return

    options.value = results
    activeIndex.value = results.length > 0 ? 0 : -1
    hasSearched.value = true
  } catch {
    if (sequence !== requestSequence || controller.signal.aborted) return

    options.value = []
    activeIndex.value = -1
    error.value = 'Pencarian gagal. Silakan coba lagi.'
  } finally {
    if (sequence === requestSequence) {
      loading.value = false
      requestController = undefined
    }
  }
}

function scheduleSearch(): void {
  clearDebounce()
  invalidateRequest()
  resetResults()

  const term = query.value.trim()
  if (term.length < minSearch.value) {
    isOpen.value = false
    return
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = undefined
    void runSearch(term)
  }, Math.max(0, props.debounceMs))
}

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  query.value = target.value
  selectedOption.value = null
  if (hasStoredValue.value) emitValue(null)
  scheduleSearch()
}

function selectOption(option: EmrFormOption): void {
  clearDebounce()
  invalidateRequest()
  selectedOption.value = option
  query.value = option.label
  options.value = []
  activeIndex.value = -1
  error.value = ''
  hasSearched.value = false
  isOpen.value = false
  emitValue(option.value)
  input.value?.focus()
}

function clearSelection(): void {
  clearDebounce()
  invalidateRequest()
  resetResults()
  selectedOption.value = null
  query.value = ''
  isOpen.value = false
  emitValue(null)
  nextTick(() => input.value?.focus())
}

function onFocus(): void {
  isFocused.value = true
  if (options.value.length > 0) isOpen.value = true
  if (hasStoredValue.value && !selectedOption.value) nextTick(() => input.value?.select())
}

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget
  if (next instanceof Node && root.value?.contains(next)) return

  isFocused.value = false
  isOpen.value = false
  activeIndex.value = -1
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isOpen.value = false
    activeIndex.value = -1
    return
  }

  if (options.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    isOpen.value = true
    activeIndex.value = (activeIndex.value + 1) % options.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    isOpen.value = true
    activeIndex.value = activeIndex.value <= 0 ? options.value.length - 1 : activeIndex.value - 1
  } else if (event.key === 'Enter' && isOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    const option = options.value[activeIndex.value]
    if (option) selectOption(option)
  }
}

onBeforeUnmount(() => {
  clearDebounce()
  invalidateRequest()
})
</script>

<template>
  <div ref="root" class="async-lookup" @focusout="onFocusOut">
    <div class="async-lookup-control">
      <input
        :id="id"
        ref="input"
        :value="query"
        class="input async-lookup-input"
        type="text"
        :name="name"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="expanded"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendant"
        :aria-busy="loading"
        :aria-invalid="invalid"
        :aria-describedby="combinedDescription"
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeydown"
      >
      <button
        v-if="hasStoredValue && !disabled"
        type="button"
        class="async-lookup-clear"
        :aria-label="`Hapus pilihan ${name}`"
        @click="clearSelection"
      >
        &times;
      </button>
    </div>

    <ul v-if="expanded" :id="listboxId" class="async-lookup-options" role="listbox">
      <li
        v-for="(option, index) in options"
        :id="`${id}-option-${index}`"
        :key="`${String(option.value)}-${index}`"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <button
          type="button"
          class="async-lookup-option"
          :class="{ 'async-lookup-option-active': index === activeIndex }"
          tabindex="-1"
          @mousedown.prevent
          @click="selectOption(option)"
          @mouseenter="activeIndex = index"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>

    <div
      :id="statusId"
      class="async-lookup-status"
      :class="{ 'async-lookup-error': error }"
      :role="error ? 'alert' : 'status'"
      aria-live="polite"
    >
      {{ statusText }}
    </div>
  </div>
</template>

<style scoped>
.async-lookup { position: relative; }
.async-lookup-control { position: relative; }
.async-lookup-input { width: 100%; padding-right: 34px; }
.async-lookup-clear { position: absolute; top: 50%; right: 5px; display: grid; width: 26px; height: 26px; padding: 0; transform: translateY(-50%); place-items: center; border: 0; border-radius: 4px; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 18px; }
.async-lookup-clear:hover, .async-lookup-clear:focus-visible { background: var(--surface-muted); color: var(--text); }
.async-lookup-options { position: absolute; z-index: 30; top: calc(100% + 3px); right: 0; left: 0; max-height: 240px; margin: 0; padding: 4px; overflow-y: auto; border: 1px solid #9dafb5; border-radius: 5px; background: var(--surface); box-shadow: 0 8px 24px rgb(15 42 35 / 16%); list-style: none; }
.async-lookup-option { width: 100%; padding: 7px 8px; border: 0; border-radius: 3px; background: transparent; color: var(--text); cursor: pointer; text-align: left; }
.async-lookup-option:hover, .async-lookup-option-active { background: var(--brand-soft); }
.async-lookup-status { min-height: 17px; padding-top: 3px; color: var(--text-muted); font-size: 11px; }
.async-lookup-error { color: var(--danger); }
</style>
