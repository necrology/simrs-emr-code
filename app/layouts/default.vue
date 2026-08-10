<script setup lang="ts">
import type { EmrModuleNode } from '~/types/emr'
import { areaForLegacyRoot, EMR_AREAS } from '~/types/emr'

const auth = useAuthStore()
const emrModules = useEmrModulesStore()
const route = useRoute()

interface NavigationItem { to: string, label: string, mark: string }
interface NavigationSection { group: string, items: NavigationItem[] }

const clinicalItems = computed<NavigationItem[]>(() => emrModules.roots.flatMap((root: EmrModuleNode) => {
  const area = areaForLegacyRoot(root.legacy_path)
  if (!area) return []
  const definition = EMR_AREAS[area]
  if (!definition) return []
  return [{ to: `/emr/${area}`, label: root.name || definition.label, mark: definition.mark }]
}))

const navigation = computed<NavigationSection[]>(() => [
  { group: 'Operasional', items: [
    { to: '/', label: 'Dashboard', mark: 'DB' },
    { to: '/patients', label: 'Master Pasien', mark: 'PS' },
    { to: '/registrations', label: 'Registrasi', mark: 'RG' },
  ] },
  { group: 'Rekam Medis Elektronik', items: clinicalItems.value },
  { group: 'Pelayanan Penunjang', items: [
    { to: '/modules/pharmacy', label: 'Farmasi', mark: 'FR' },
    { to: '/modules/laboratory', label: 'Laboratorium', mark: 'LB' },
    { to: '/modules/radiology', label: 'Radiologi', mark: 'RD' },
    { to: '/modules/billing', label: 'Billing', mark: 'BL' },
    { to: '/modules/inventory', label: 'Inventory', mark: 'IV' },
    { to: '/modules/reporting', label: 'Pelaporan', mark: 'RP' },
  ] },
])

const currentLabel = computed(() => navigation.value.flatMap((section) => section.items).find((item) => item.to === route.path)?.label ?? 'SIMRS EMR')

watch(() => auth.user?.id, (userId) => {
  if (userId) void emrModules.load()
  else emrModules.reset()
}, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Navigasi utama">
      <div class="sidebar-brand"><span class="brand-mark">RS</span><span>SIMRS EMR</span></div>
      <template v-for="section in navigation" :key="section.group">
        <template v-if="section.items.length">
          <div class="nav-group">{{ section.group }}</div>
          <NuxtLink v-for="item in section.items" :key="item.to" :to="item.to" class="nav-link">
            <span class="brand-mark">{{ item.mark }}</span><span>{{ item.label }}</span>
          </NuxtLink>
        </template>
      </template>
    </aside>
    <div class="main-column">
      <header class="topbar">
        <strong>{{ currentLabel }}</strong>
        <div class="top-user">
          <ClientOnly>
            <span>{{ auth.user?.name ?? 'Memuat pengguna…' }}</span>
            <template #fallback>
              <span class="text-gray-400">Memuat pengguna…</span>
            </template>
          </ClientOnly>
          <button class="button" type="button" @click="auth.logout">Keluar</button>
        </div>
      </header>
      <main class="content"><slot /></main>
    </div>
  </div>
</template>
