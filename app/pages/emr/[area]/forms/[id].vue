<script setup lang="ts">
import type { EmrFormSchema, EmrFormField, EmrFormValues } from '~/types/emr-form'
import { errorMessage } from '~/services/api'
import DynamicForm from '~/components/emr/DynamicForm.vue'

const route = useRoute()
const router = useRouter()
const areaName = computed(() => String(route.params.area))
const encounterId = computed(() => String(route.query.encounter_id || ''))
// NuxtLink ModuleTree.vue appends legacy_path as a query param. 
// We use this legacy path to resolve the manifest form key in the backend.
const legacyPath = computed(() => String(route.query.legacy_path || ''))

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const schema = ref<EmrFormSchema | null>(null)
const initialValues = ref<EmrFormValues>({})
const validationErrors = ref<Record<string, string[]>>({})

const formFields = computed<EmrFormField[]>(() => {
  return schema.value?.fields || []
})

// Fix hydration issue: Make sure ClientOnly wrappers or reliable initial state are used.
// We disable SSR for this specific nested client-side route if it relies heavily on query params.
definePageMeta({
  key: route => route.fullPath,
})
useHead({ title: computed(() => schema.value?.label ?? 'Form EMR') })

async function loadSchema() {
  if (!legacyPath.value) {
    error.value = 'Path modul EMR tidak ditemukan dalam URL.'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''
    
    // 1. Resolve form 'key' (kebab-case) by legacy_path from catalog
    const catalogRes = await $fetch<{ data: EmrFormSchema[] }>(`/api/v1/emr/forms`, {
      baseURL: 'http://localhost:8000',
      query: { legacy_path: legacyPath.value },
      headers: { Accept: 'application/json' }
    })
    
    const matchedForm = catalogRes.data?.[0]
    if (!matchedForm?.key) {
      throw new Error(`Skema formulir untuk modul ${legacyPath.value} belum tersedia.`)
    }

    // 2. Load the actual Form Schema definition
    const res = await $fetch<{ data: EmrFormSchema }>(`/api/v1/emr/forms/${matchedForm.key}/schema`, {
      baseURL: 'http://localhost:8000',
      headers: { Accept: 'application/json' }
    })
    schema.value = res.data
  } catch (cause) {
    error.value = errorMessage(cause) || 'Gagal memuat struktur formulir.'
  } finally {
    loading.value = false
  }
}

async function onSubmit(payload: EmrFormValues) {
  if (!schema.value?.key) {
    error.value = 'Form ID tidak valid.'
    return
  }
  
  saving.value = true
  validationErrors.value = {}
  try {
    const submitData = { ...payload, encounter_id: encounterId.value }
    await $fetch(`/api/v1/emr/forms/${schema.value.key}/records`, {
      baseURL: 'http://localhost:8000',
      method: 'POST',
      body: submitData,
      headers: { Accept: 'application/json' }
    })
    alert('Data berhasil disimpan!')
    router.back()
  } catch (cause: unknown) {
    const fetchError = cause as { response?: { status: number, _data?: { errors?: Record<string, string[]> } } }
    
    if (fetchError?.response?.status === 422) {
      validationErrors.value = fetchError.response._data?.errors || {}
      error.value = 'Mohon periksa kembali isian Anda.'
    } else {
      error.value = errorMessage(cause) || 'Gagal menyimpan data.'
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSchema()
})
</script>

<template>
  <div class="px-6 py-4">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500 mb-1">Beranda / EMR / {{ areaName }}</div>
        <h1 class="text-2xl font-bold text-gray-900">{{ schema?.label || 'Memuat Form...' }}</h1>
      </div>
      <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" @click="router.back()">
        &larr; Kembali
      </button>
    </div>

    <!-- Peringatan wajib encounter_id sebelum form muncul -->
    <section v-if="!encounterId" class="bg-yellow-50 p-8 text-center rounded-xl border border-yellow-200 shadow-sm mt-4">
      <div class="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <h2 class="text-xl font-bold text-yellow-800 mb-2">Pilih Kunjungan (Encounter) Terlebih Dahulu</h2>
      <p class="text-yellow-700 max-w-md mx-auto">
        Anda sedang mencoba mengakses form klinis <strong>{{ schema?.label || legacyPath }}</strong> secara langsung.
        Formulir Rekam Medis Elektronik harus terikat pada satu kunjungan pasien. Silakan kembali ke Dashboard/Registrasi dan pilih pasien yang dituju.
      </p>
      <button class="mt-6 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors" @click="router.push('/registrations')">
        Menuju Modul Registrasi
      </button>
    </section>

    <!-- Normal Form Render -->
    <div v-else>
      <section v-if="loading" class="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
        <p class="text-gray-500">Mempersiapkan form input...</p>
      </section>

      <section v-else-if="error && !schema" class="bg-red-50 p-6 rounded-xl border border-red-100 text-red-700">
        {{ error }}
      </section>

      <section v-else-if="schema" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div v-if="error" class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
          {{ error }}
        </div>
        
        <ClientOnly>
          <DynamicForm 
            :fields="formFields" 
            :initial-values="initialValues"
            :errors="validationErrors"
            :busy="saving"
            submit-label="Simpan EMR"
            @submit="onSubmit"
          />
          <template #fallback>
            <div class="p-4 text-gray-500 text-center animate-pulse">Merender form...</div>
          </template>
        </ClientOnly>
      </section>
    </div>
  </div>
</template>
