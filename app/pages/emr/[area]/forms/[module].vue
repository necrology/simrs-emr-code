<script setup lang="ts">
import type { PaginationMeta } from '~/types/api'
import type { EmrFormCatalogItem, EmrFormRecord, EmrFormSchema, EmrFormValues } from '~/types/emr-form'
import { EMR_AREAS } from '~/types/emr'
import { resolveFormCatalog } from '~/utils/emr-form'
import {
  createEmrFormRecord,
  deleteEmrFormRecord,
  emrFormFailure,
  getEmrFormCatalog,
  getEmrFormRecord,
  getEmrFormRecords,
  getEmrFormSchema,
  updateEmrFormRecord,
} from '~/services/emr-forms'

type EditorMode = 'create' | 'edit'

const route = useRoute()
const areaName = computed(() => String(route.params.area))
const definition = computed(() => EMR_AREAS[areaName.value] ?? null)
const moduleReference = computed(() => String(route.params.module))
const legacyPath = computed(() => queryValue(route.query.legacy_path))
const requestedFormKey = computed(() => queryValue(route.query.form))
const patientId = computed(() => queryValue(route.query.patient_id))
const areaRoute = computed(() => ({
  path: `/emr/${areaName.value}`,
  query: {
    ...(queryValue(route.query.encounter_id) ? { encounter_id: queryValue(route.query.encounter_id) } : {}),
    ...(patientId.value ? { patient_id: patientId.value } : {}),
  },
}))

const catalog = ref<EmrFormCatalogItem[]>([])
const selectedFormKey = ref('')
const schema = ref<EmrFormSchema | null>(null)
const catalogLoading = ref(true)
const catalogError = ref('')
const schemaLoading = ref(false)
const schemaError = ref('')

const encounterInput = ref(queryValue(route.query.encounter_id))
const activeEncounterId = ref('')
const records = ref<EmrFormRecord[]>([])
const recordsMeta = ref<PaginationMeta>(emptyPagination())
const recordsLoading = ref(false)
const recordsError = ref('')
const page = ref(1)

const editorMode = ref<EditorMode | null>(null)
const editorRecord = ref<EmrFormRecord | null>(null)
const editorInitialValues = ref<EmrFormValues>({})
const editorLoading = ref(false)
const saving = ref(false)
const saveError = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

const deleteTarget = ref<EmrFormRecord | null>(null)
const deleting = ref(false)
const busyRecordId = ref<string | number | null>(null)
const notice = ref('')

const selectedCatalogItem = computed(() => catalog.value.find((item) => item.key === selectedFormKey.value) ?? null)
const title = computed(() => schema.value?.label ?? selectedCatalogItem.value?.label ?? 'Formulir EMR')
const canCreate = computed(() => Boolean(schema.value?.permissions.create && schema.value.capabilities.create !== false))
const canUpdate = computed(() => Boolean(schema.value?.permissions.update && schema.value.capabilities.update !== false))
const canDelete = computed(() => Boolean(schema.value?.permissions.delete && schema.value.capabilities.delete !== false))
const canList = computed(() => Boolean(schema.value && schema.value.capabilities.list !== false))
const hasEncounter = computed(() => activeEncounterId.value.length > 0)

useHead({ title })

function queryValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? String(value[0] ?? '') : ''
  return value === null || value === undefined ? '' : String(value)
}

function emptyPagination(): PaginationMeta {
  return { current_page: 1, from: null, last_page: 1, per_page: 20, to: null, total: 0 }
}

function paginationFrom(meta: unknown): PaginationMeta {
  const value = typeof meta === 'object' && meta !== null ? meta as Partial<PaginationMeta> : {}
  return {
    current_page: value.current_page ?? 1,
    from: value.from ?? null,
    last_page: value.last_page ?? 1,
    per_page: value.per_page ?? 20,
    to: value.to ?? null,
    total: value.total ?? 0,
  }
}

function catalogQuery(): { module_id?: number, legacy_path?: string } {
  const moduleId = Number(moduleReference.value)
  if (Number.isInteger(moduleId) && moduleId > 0) return { module_id: moduleId }
  if (legacyPath.value) return { legacy_path: legacyPath.value }
  return {}
}

async function loadCatalog(): Promise<void> {
  catalogLoading.value = true
  catalogError.value = ''
  schema.value = null
  records.value = []
  recordsMeta.value = emptyPagination()
  editorMode.value = null
  notice.value = ''
  recordsError.value = ''

  try {
    if (!definition.value) throw new Error('UNKNOWN_AREA')
    const response = await getEmrFormCatalog(catalogQuery())
    const resolved = resolveFormCatalog(response.data, areaName.value, requestedFormKey.value)
    catalog.value = resolved.items

    if (!catalog.value.length) {
      selectedFormKey.value = ''
      return
    }

    selectedFormKey.value = resolved.selectedKey

    await loadSchema()
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'UNKNOWN_AREA') catalogError.value = 'Area EMR tidak dikenali.'
    else catalogError.value = emrFormFailure(cause).message
  } finally {
    catalogLoading.value = false
  }
}

async function loadSchema(): Promise<void> {
  if (!selectedFormKey.value) return
  schemaLoading.value = true
  schemaError.value = ''
  recordsError.value = ''

  try {
    const loadedSchema = (await getEmrFormSchema(selectedFormKey.value)).data
    if (loadedSchema.area !== areaName.value) throw new Error('FORM_AREA_MISMATCH')
    schema.value = loadedSchema
    const encounterFromUrl = queryValue(route.query.encounter_id)
    encounterInput.value = encounterFromUrl
    if (encounterFromUrl && loadedSchema.capabilities.list !== false) {
      activeEncounterId.value = encounterFromUrl
      page.value = 1
      await loadRecords()
    } else {
      activeEncounterId.value = ''
      records.value = []
      recordsMeta.value = emptyPagination()
    }
  } catch (cause) {
    schemaError.value = cause instanceof Error && cause.message === 'FORM_AREA_MISMATCH'
      ? 'Formulir tidak termasuk dalam area EMR ini.'
      : emrFormFailure(cause).message
  } finally {
    schemaLoading.value = false
  }
}

function selectForm(): void {
  void navigateTo({
    path: route.path,
    query: { ...route.query, form: selectedFormKey.value || undefined },
  }, { replace: true })
}

async function applyEncounter(): Promise<void> {
  const encounterId = encounterInput.value.trim()
  if (!/^\d+$/.test(encounterId) || Number(encounterId) < 1) {
    recordsError.value = 'ID encounter wajib berupa bilangan positif.'
    return
  }
  if (!canList.value) return

  activeEncounterId.value = encounterId
  page.value = 1
  editorMode.value = null
  notice.value = ''
  await navigateTo({
    path: route.path,
    query: { ...route.query, encounter_id: encounterId },
  }, { replace: true })
  await loadRecords()
}

async function loadRecords(): Promise<void> {
  if (!selectedFormKey.value || !activeEncounterId.value || !canList.value) return
  recordsLoading.value = true
  recordsError.value = ''

  try {
    const response = await getEmrFormRecords(selectedFormKey.value, {
      encounter_id: activeEncounterId.value,
      page: page.value,
      per_page: recordsMeta.value.per_page,
    })
    records.value = response.data
    recordsMeta.value = paginationFrom(response.meta)
  } catch (cause) {
    recordsError.value = emrFormFailure(cause).message
  } finally {
    recordsLoading.value = false
  }
}

function changePage(nextPage: number): void {
  page.value = nextPage
  void loadRecords()
}

function openCreate(): void {
  if (!hasEncounter.value) {
    recordsError.value = 'Pilih encounter sebelum menambah data.'
    return
  }
  editorMode.value = 'create'
  editorRecord.value = null
  editorInitialValues.value = {}
  saveError.value = ''
  fieldErrors.value = {}
}

async function openEdit(record: EmrFormRecord): Promise<void> {
  if (!activeEncounterId.value) return
  editorLoading.value = true
  busyRecordId.value = record.id
  saveError.value = ''
  fieldErrors.value = {}

  try {
    const detail = (await getEmrFormRecord(selectedFormKey.value, record.id, activeEncounterId.value)).data
    editorMode.value = 'edit'
    editorRecord.value = detail
    editorInitialValues.value = detail.values
  } catch (cause) {
    recordsError.value = emrFormFailure(cause).message
  } finally {
    editorLoading.value = false
    busyRecordId.value = null
  }
}

function closeEditor(force = false): void {
  if (saving.value && !force) return
  editorMode.value = null
  editorRecord.value = null
  editorInitialValues.value = {}
  saveError.value = ''
  fieldErrors.value = {}
}

async function save(values: EmrFormValues): Promise<void> {
  if (!editorMode.value || !activeEncounterId.value) return
  saving.value = true
  saveError.value = ''
  fieldErrors.value = {}
  notice.value = ''

  try {
    if (editorMode.value === 'create') {
      await createEmrFormRecord(selectedFormKey.value, {
        encounter_id: activeEncounterId.value,
        ...(patientId.value ? { patient_id: patientId.value } : {}),
        values,
      })
      notice.value = 'Data formulir berhasil ditambahkan.'
    } else if (editorRecord.value) {
      await updateEmrFormRecord(selectedFormKey.value, editorRecord.value.id, {
        encounter_id: activeEncounterId.value,
        version: editorRecord.value.version,
        values,
      })
      notice.value = 'Perubahan data formulir berhasil disimpan.'
    }

    closeEditor(true)
    await loadRecords()
  } catch (cause) {
    const failure = emrFormFailure(cause)
    saveError.value = failure.code === 'STALE_RECORD'
      ? 'Data sudah diubah oleh pengguna lain. Tutup editor, muat ulang, lalu ulangi perubahan.'
      : failure.message
    fieldErrors.value = failure.errors
  } finally {
    saving.value = false
  }
}

function requestDelete(record: EmrFormRecord): void {
  deleteTarget.value = record
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value || !activeEncounterId.value) return
  const target = deleteTarget.value
  deleting.value = true
  busyRecordId.value = target.id
  recordsError.value = ''
  notice.value = ''

  try {
    await deleteEmrFormRecord(selectedFormKey.value, target.id, {
      encounter_id: activeEncounterId.value,
      version: target.version,
    })
    deleteTarget.value = null
    notice.value = 'Data formulir berhasil dihapus.'
    if (records.value.length === 1 && page.value > 1) page.value -= 1
    await loadRecords()
  } catch (cause) {
    const failure = emrFormFailure(cause)
    recordsError.value = failure.code === 'STALE_RECORD'
      ? 'Data sudah berubah. Muat ulang data sebelum menghapus.'
      : failure.message
    deleteTarget.value = null
  } finally {
    deleting.value = false
    busyRecordId.value = null
  }
}

onMounted(() => { void loadCatalog() })

watch(
  [areaName, moduleReference, legacyPath, requestedFormKey],
  () => { void loadCatalog() },
)
</script>

<template>
  <div>
    <div class="breadcrumb">
      <NuxtLink :to="areaRoute">Beranda / {{ definition?.label ?? 'EMR' }}</NuxtLink>
      / Formulir
    </div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-description">Input, perubahan, dan penghapusan mengikuti metadata serta hak akses formulir legacy.</p>
      </div>
      <NuxtLink class="button" :to="areaRoute">Kembali ke menu</NuxtLink>
    </div>

    <section v-if="catalogLoading" class="panel loading-state">Memuat katalog formulir…</section>
    <section v-else-if="catalogError" class="panel error-state" role="alert">{{ catalogError }}</section>
    <section v-else-if="catalog.length === 0" class="panel empty">
      Belum ada manifest formulir yang dipetakan untuk menu <code>{{ legacyPath || moduleReference }}</code>.
    </section>
    <template v-else>
      <section v-if="catalog.length > 1" class="panel form-selector-panel">
        <div class="filters">
          <label class="field form-selector-field">
            <span>Formulir</span>
            <select v-model="selectedFormKey" class="select" @change="selectForm">
              <option v-for="item in catalog" :key="item.key" :value="item.key">{{ item.label }}</option>
            </select>
          </label>
        </div>
      </section>

      <section v-if="schemaLoading" class="panel loading-state">Memuat struktur field…</section>
      <section v-else-if="schemaError" class="panel error-state" role="alert">{{ schemaError }}</section>
      <template v-else-if="schema">
        <div v-if="!canList" class="inline-error" role="alert">
          Tabel sumber formulir ini belum tersedia atau belum lolos pemeriksaan schema.
        </div>
        <div v-else-if="schema.writes_enabled === false" class="notice-state status-warning" role="status">
          Akses baca tersedia. Operasi tambah, ubah, dan hapus belum diaktifkan pada konfigurasi server.
        </div>
        <section class="panel encounter-panel">
          <form class="filters encounter-filter" @submit.prevent="applyEncounter">
            <label class="field encounter-field">
              <span>ID encounter</span>
              <input v-model.trim="encounterInput" class="input" type="number" inputmode="numeric" min="1" step="1" placeholder="Masukkan ID encounter" required>
            </label>
            <button class="button button-primary" type="submit" :disabled="recordsLoading || !canList">Buka data</button>
          </form>
        </section>

        <div v-if="notice" class="notice-state" role="status">{{ notice }}</div>

        <section v-if="editorMode" class="panel form-editor-panel">
          <div class="panel-header">
            <strong>{{ editorMode === 'create' ? `Tambah ${schema.label}` : `Ubah ${schema.label}` }}</strong>
            <span class="status">Encounter {{ activeEncounterId }}</span>
          </div>
          <div v-if="editorLoading" class="loading-state">Memuat data terpilih…</div>
          <div v-else class="panel-body">
            <div v-if="saveError" class="inline-error" role="alert">{{ saveError }}</div>
            <EmrDynamicForm
              :key="`${editorMode}-${String(editorRecord?.id ?? 'new')}`"
              :fields="schema.fields"
              :initial-values="editorInitialValues"
              :errors="fieldErrors"
              :busy="saving"
              :submit-label="editorMode === 'create' ? 'Tambah data' : 'Simpan perubahan'"
              @submit="save"
              @cancel="closeEditor"
            />
          </div>
        </section>

        <section class="panel records-panel">
          <div class="panel-header">
            <div>
              <strong>Data {{ schema.label }}</strong>
              <span v-if="hasEncounter" class="record-context">Encounter {{ activeEncounterId }}</span>
            </div>
            <button v-if="canCreate" class="button button-primary" type="button" :disabled="!hasEncounter || recordsLoading" @click="openCreate">
              Tambah data
            </button>
          </div>
          <div v-if="!hasEncounter" class="empty">
            Masukkan ID encounter untuk memuat dan mengelola data.
            <NuxtLink class="empty-state-link" to="/registrations">Pilih dari daftar registrasi</NuxtLink>
          </div>
          <EmrRecordTable
            v-else
            :fields="schema.fields"
            :records="records"
            :meta="recordsMeta"
            :loading="recordsLoading"
            :error="recordsError"
            :can-update="canUpdate"
            :can-delete="canDelete"
            :busy-record-id="busyRecordId"
            @page="changePage"
            @edit="openEdit"
            @delete="requestDelete"
          />
        </section>
      </template>
    </template>

    <EmrConfirmDialog
      :open="Boolean(deleteTarget)"
      title="Hapus data formulir?"
      message="Data klinis yang dihapus tidak dapat dikembalikan. Pastikan data dan encounter sudah benar."
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
