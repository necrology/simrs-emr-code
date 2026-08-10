<script setup lang="ts">
import type { ApiEnvelope } from '~/types/api'
import type { ModuleStatus } from '~/types/emr'
import { errorMessage } from '~/services/api'

const route = useRoute(); const status = ref<ModuleStatus | null>(null); const loading = ref(true); const error = ref('')
const moduleName = computed(() => String(route.params.module))
const titles: Record<string, string> = { clinical: 'EMR Klinis', pharmacy: 'Farmasi', laboratory: 'Laboratorium', radiology: 'Radiologi', billing: 'Billing', inventory: 'Inventory', reporting: 'Pelaporan' }
const title = computed(() => titles[moduleName.value] ?? moduleName.value)
useHead({ title })

onMounted(async () => { try { const response = await $fetch<ApiEnvelope<ModuleStatus[]>>('/api/backend/v1/modules/status'); status.value = response.data.find((item) => item.module === moduleName.value) ?? null } catch (cause) { error.value = errorMessage(cause) } finally { loading.value = false } })
</script>

<template>
  <div>
  <div class="breadcrumb">Beranda / Modul / {{ title }}</div><div class="page-header"><div><h1 class="page-title">{{ title }}</h1><p class="page-description">Boundary modul menggunakan Laravel API dan tidak mengakses PostgreSQL dari browser.</p></div></div>
  <section class="panel"><div v-if="loading" class="loading-state">Memeriksa sumber data…</div><div v-else-if="error" class="error-state">{{ error }}</div><div v-else-if="status" class="panel-body"><dl class="detail-list"><dt>Akses baca</dt><dd><span class="status" :class="status.read_ready ? 'status-ok' : 'status-warning'">{{ status.read_ready ? 'Schema tersedia' : 'Menunggu verifikasi schema' }}</span></dd><dt>Operasi tulis</dt><dd><span class="status" :class="status.write_ready ? 'status-ok' : 'status-warning'">{{ status.write_ready ? 'Function terverifikasi' : 'Safety gate aktif' }}</span></dd><dt>Integritas data</dt><dd>Operasi tulis tidak dijalankan sebelum function, trigger, dan transaksi legacy dipetakan.</dd></dl></div><div v-else class="empty">Modul tidak dikenali oleh API.</div></section>
  </div>
</template>
