<script setup lang="ts">
import type { ApiEnvelope } from '~/types/api'
import type { EmrModuleNode, ModuleStatus } from '~/types/emr'
import { EMR_AREAS } from '~/types/emr'
import { errorMessage } from '~/services/api'

const route = useRoute()
const modules = useEmrModulesStore()
const loading = ref(true)
const error = ref('')
const statuses = ref<ModuleStatus[]>([])
const areaName = computed(() => String(route.params.area))
const definition = computed(() => EMR_AREAS[areaName.value] ?? null)
const root = computed(() => modules.roots.find((item: EmrModuleNode) => item.legacy_path === definition.value?.legacyRoot) ?? null)
const status = computed(() => statuses.value.find((item) => item.module === areaName.value) ?? null)
const encounterId = computed(() => {
  const value = route.query.encounter_id
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
})

function countItems(nodes: EmrModuleNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countItems(node.children), 0)
}

const visibleItems = computed(() => root.value ? countItems(root.value.children) : 0)
useHead({ title: computed(() => definition.value?.label ?? 'Modul EMR') })

onMounted(async () => {
  try {
    await modules.load()
    statuses.value = (await $fetch<ApiEnvelope<ModuleStatus[]>>('/api/backend/v1/modules/status')).data
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <!-- Render Halaman Anak jika kita berada di route sub-page (seperti forms/[id]) -->
    <NuxtPage v-if="$route.path !== `/emr/${areaName}`" />

    <!-- Tampilkan Dashboard Menu EMR jika berada tepat di root /emr/[area] -->
    <div v-else>
      <div class="breadcrumb">Beranda / Rekam Medis Elektronik / {{ definition?.label ?? areaName }}</div>
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ definition?.label ?? 'Modul EMR tidak dikenal' }}</h1>
          <p class="page-description">Struktur menu dan hak akses dibaca langsung dari skema CodeIgniter yang masih digunakan.</p>
        </div>
      </div>

      <section v-if="loading" class="panel loading-state">Memuat struktur modul…</section>
      <section v-else-if="error" class="panel error-state">{{ error }}</section>
      <section v-else-if="!definition" class="panel empty">Area EMR tidak dikenali.</section>
      <section v-else-if="!root" class="panel empty">Akun ini tidak memiliki akses ke {{ definition.label }}.</section>
      <template v-else>
        <div class="schema-cards">
          <section class="schema-card"><span>Menu berizin</span><strong>{{ visibleItems }}</strong></section>
          <section class="schema-card"><span>Tabel klinis</span><strong>{{ status?.schema_table_count ?? 0 }}</strong></section>
          <section class="schema-card"><span>Katalog legacy</span><strong>{{ status?.catalog_item_count ?? 0 }}</strong></section>
          <section class="schema-card"><span>Status baca</span><strong>{{ status?.read_ready ? 'Siap' : 'Perlu verifikasi' }}</strong></section>
        </div>
        <section class="panel">
          <div class="panel-header">
            <strong>Struktur formulir dan menu</strong>
            <span v-if="encounterId" class="status status-ok">Encounter {{ encounterId }}</span>
            <span v-else class="status status-warning">Pilih encounter untuk input klinis</span>
          </div>
          <div class="panel-body">
            <ul class="module-tree module-tree-root">
              <EmrModuleTree v-for="node in root.children" :key="node.id" :node="node" :area="areaName" />
            </ul>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
