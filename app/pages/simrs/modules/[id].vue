<script setup lang="ts">
import type { SimrsModuleItem } from '~/types/simrs'
import { errorMessage } from '~/services/api'
import { getSimrsModule } from '~/services/simrs'
import { simrsMigrationClass, simrsMigrationLabel } from '~/utils/simrs'

const route = useRoute()
const moduleId = computed(() => String(route.params.id ?? ''))
const module = ref<SimrsModuleItem | null>(null)
const loading = ref(true)
const loadError = ref('')

useHead(() => ({ title: module.value?.name ?? 'Detail Modul SIMRS' }))

const capabilityEntries = computed(() => {
  if (!module.value) return []
  return [
    ['Lihat', module.value.capabilities.view],
    ['Tambah', module.value.capabilities.add],
    ['Ubah', module.value.capabilities.edit],
    ['Hapus', module.value.capabilities.delete],
    ['Cetak', module.value.capabilities.print],
  ] as Array<[string, boolean]>
})

onMounted(async () => {
  try {
    module.value = (await getSimrsModule(moduleId.value)).data
  } catch (cause) {
    loadError.value = errorMessage(cause)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / SIMRS / Katalog / {{ module?.name ?? moduleId }}</div>
    <div v-if="loading" class="panel loading-state">Memuat detail modul?</div>
    <div v-else-if="loadError" class="panel error-state" role="alert">{{ loadError }}</div>
    <template v-else-if="module">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ module.name }}</h1>
          <p class="page-description">{{ module.description || 'Metadata modul legacy SIMRS.' }}</p>
        </div>
        <div class="record-actions">
          <NuxtLink class="button" to="/simrs">Kembali ke katalog</NuxtLink>
          <NuxtLink v-if="module.migration.route" class="button button-primary" :to="module.migration.route">Buka modul</NuxtLink>
        </div>
      </div>

      <div class="notice-state module-migration-notice">
        <Icon name="lucide:shield-check" aria-hidden="true" />
        <div><strong>{{ simrsMigrationLabel(module.migration.status) }}</strong><span>{{ module.migration.notes }}</span></div>
      </div>

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><strong>Metadata Modul</strong></div>
          <div class="panel-body">
            <dl class="detail-list">
              <dt>ID modul</dt><dd><code>{{ module.id }}</code></dd>
              <dt>Tipe</dt><dd>{{ module.type }}</dd>
              <dt>Grup menu</dt><dd>{{ module.group }}</dd>
              <dt>Jalur lama</dt><dd><code>{{ module.menu_path }}</code></dd>
              <dt>Versi</dt><dd>{{ module.version ?? '?' }}</dd>
              <dt>Pengembang</dt><dd>{{ module.author ?? '?' }}</dd>
              <dt>Status</dt><dd><span class="status" :class="simrsMigrationClass(module.migration.status)">{{ simrsMigrationLabel(module.migration.status) }}</span></dd>
            </dl>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><strong>Referensi Source Legacy</strong></div>
          <div class="panel-body">
            <dl class="detail-list">
              <dt>Client class</dt><dd><code>{{ module.client_class ?? '?' }}</code></dd>
              <dt>Server class</dt><dd><code>{{ module.server_class ?? '?' }}</code></dd>
              <dt>Server file</dt><dd><code class="breakable-code">{{ module.server_file ?? '?' }}</code></dd>
              <dt>Rute Nuxt</dt><dd><code>{{ module.migration.route ?? 'Belum tersedia' }}</code></dd>
            </dl>
          </div>
        </section>
      </div>
      <div class="grid-2 module-detail-grid">
        <section class="panel">
          <div class="panel-header"><strong>Hak Akses Pengguna</strong></div>
          <div class="panel-body capability-grid">
            <div v-for="[label, allowed] in capabilityEntries" :key="label" class="capability-card">
              <Icon :name="allowed ? 'lucide:circle-check' : 'lucide:circle-minus'" aria-hidden="true" />
              <span>{{ label }}</span>
              <strong>{{ allowed ? 'Diizinkan' : 'Tidak diizinkan' }}</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><strong>Method Legacy</strong></div>
          <div class="panel-body">
            <p class="page-description module-method-description">Method hanya menjadi referensi migrasi; browser tidak memanggil SimrsRouter.php secara langsung.</p>
            <div class="method-list">
              <span v-for="method in module.declared_methods" :key="method" class="status" :class="module.allowed_methods.includes(method) ? 'status-ok' : 'status-muted'">{{ method }}</span>
              <span v-if="module.declared_methods.length === 0" class="status status-muted">Tidak ada metadata method</span>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
