<script setup lang="ts">
import type { PaginationMeta } from '~/types/api'
import type { EmrFormField, EmrFormRecord } from '~/types/emr-form'
import { displayFormValue } from '~/utils/emr-form'

withDefaults(defineProps<{
  fields: EmrFormField[]
  records: EmrFormRecord[]
  meta: PaginationMeta
  loading?: boolean
  error?: string
  canUpdate?: boolean
  canDelete?: boolean
  busyRecordId?: string | number | null
}>(), {
  loading: false,
  error: '',
  canUpdate: false,
  canDelete: false,
  busyRecordId: null,
})

const emit = defineEmits<{
  page: [page: number]
  edit: [record: EmrFormRecord]
  delete: [record: EmrFormRecord]
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="loading-state" role="status">Memuat data formulir…</div>
    <div v-else-if="error" class="error-state" role="alert">{{ error }}</div>
    <div v-else-if="records.length === 0" class="empty">Belum ada data pada encounter ini.</div>
    <template v-else>
      <div class="data-wrap">
        <table class="data-table emr-record-table">
          <thead>
            <tr>
              <th v-for="field in fields" :key="field.name">{{ field.label }}</th>
              <th v-if="canUpdate || canDelete" class="record-actions-column">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in records" :key="String(record.id)">
              <td v-for="field in fields" :key="field.name">{{ displayFormValue(field, record.values[field.name]) }}</td>
              <td v-if="canUpdate || canDelete" class="record-actions-column">
                <div class="record-actions">
                  <button
                    v-if="canUpdate"
                    class="button"
                    type="button"
                    :disabled="busyRecordId === record.id"
                    @click="emit('edit', record)"
                  >
                    Ubah
                  </button>
                  <button
                    v-if="canDelete"
                    class="button button-danger"
                    type="button"
                    :disabled="busyRecordId === record.id"
                    @click="emit('delete', record)"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Menampilkan {{ meta.from ?? 0 }}–{{ meta.to ?? 0 }} dari {{ meta.total.toLocaleString('id-ID') }}</span>
        <div class="pagination-actions">
          <button class="button" type="button" :disabled="meta.current_page <= 1" @click="emit('page', meta.current_page - 1)">Sebelumnya</button>
          <span class="button">{{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="button" type="button" :disabled="meta.current_page >= meta.last_page" @click="emit('page', meta.current_page + 1)">Berikutnya</button>
        </div>
      </div>
    </template>
  </div>
</template>
