<script setup lang="ts">
import type { ApiEnvelope } from '~/types/api'
import type { ModuleStatus } from '~/types/emr'
import { errorMessage } from '~/services/api'

useHead({ title: 'Dashboard' })
const modules = ref<ModuleStatus[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    modules.value = (await $fetch<ApiEnvelope<ModuleStatus[]>>('/api/backend/v1/modules/status')).data
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / Dashboard</div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Status kesiapan modul</h1>
        <p class="page-description">Status dihitung dari tabel klinis dan katalog menu yang benar-benar tersedia.</p>
      </div>
    </div>
    <section class="panel">
      <div v-if="loading" class="loading-state">Memeriksa modul…</div>
      <div v-else-if="error" class="error-state">{{ error }}</div>
      <div v-else class="data-wrap">
        <table class="data-table">
          <thead><tr><th>Modul</th><th>Tabel klinis</th><th>Katalog menu</th><th>Akses baca</th><th>Operasi tulis</th></tr></thead>
          <tbody>
            <tr v-for="module in modules" :key="module.module">
              <td style="font-weight:700">{{ module.label }}</td>
              <td>{{ module.schema_table_count }}</td>
              <td>{{ module.catalog_item_count }}</td>
              <td><span class="status" :class="module.read_ready ? 'status-ok' : 'status-warning'">{{ module.read_ready ? 'Siap' : 'Perlu verifikasi' }}</span></td>
              <td><span class="status" :class="module.write_ready ? 'status-ok' : 'status-warning'">{{ module.write_ready ? 'Aktif' : 'Safety gate aktif' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
