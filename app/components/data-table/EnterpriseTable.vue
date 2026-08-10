<script setup lang="ts">
import type { PaginationMeta } from '~/types/api'

export interface TableColumn { key: string; label: string; sortable?: boolean }

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: object[]
  meta: PaginationMeta
  loading?: boolean
  error?: string
  rowLink?: (row: object) => string
}>(), { loading: false, error: '', rowLink: undefined })

const emit = defineEmits<{ page: [page: number]; sort: [key: string] }>()
const visible = ref<string[]>(props.columns.map((column) => column.key))
const activeColumns = computed(() => props.columns.filter((column) => visible.value.includes(column.key)))

function cell(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function showCell(row: object, key: string): string {
  const value = cell(row, key)
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}
</script>

<template>
  <div>
    <div class="panel-header">
      <strong>{{ meta.total.toLocaleString('id-ID') }} data</strong>
      <details>
        <summary class="button">Kolom</summary>
        <div class="panel-body" style="position:absolute;right:22px;z-index:10;border:1px solid var(--line);background:white">
          <label v-for="column in columns" :key="column.key" style="display:block;white-space:nowrap">
            <input v-model="visible" type="checkbox" :value="column.key"> {{ column.label }}
          </label>
        </div>
      </details>
    </div>
    <div v-if="loading" class="loading-state" role="status">Memuat data…</div>
    <div v-else-if="error" class="error-state" role="alert">{{ error }}</div>
    <div v-else-if="rows.length === 0" class="empty">Tidak ada data yang sesuai dengan filter.</div>
    <div v-else class="data-wrap">
      <table class="data-table">
        <thead><tr><th v-for="column in activeColumns" :key="column.key"><button v-if="column.sortable" type="button" @click="emit('sort', column.key)">{{ column.label }}</button><span v-else>{{ column.label }}</span></th></tr></thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="String(cell(row, 'patient_id') ?? cell(row, 'registration_id') ?? index)">
            <td v-for="column in activeColumns" :key="column.key">
              <NuxtLink v-if="column.key === activeColumns[0]?.key && rowLink" :to="rowLink(row)" style="color:var(--brand);font-weight:700">{{ showCell(row, column.key) }}</NuxtLink>
              <span v-else>{{ showCell(row, column.key) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <span>Menampilkan {{ meta.from ?? 0 }}–{{ meta.to ?? 0 }} dari {{ meta.total.toLocaleString('id-ID') }}</span>
      <div style="display:flex;gap:6px">
        <button class="button" type="button" :disabled="meta.current_page <= 1" @click="emit('page', meta.current_page - 1)">Sebelumnya</button>
        <span class="button">{{ meta.current_page }} / {{ meta.last_page }}</span>
        <button class="button" type="button" :disabled="meta.current_page >= meta.last_page" @click="emit('page', meta.current_page + 1)">Berikutnya</button>
      </div>
    </div>
  </div>
</template>
