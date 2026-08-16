<script setup lang="ts">
import type { EmrModuleNode } from '~/types/emr'
import { areaForLegacyRoot, EMR_AREAS } from '~/types/emr'
import { resolveSimrsIcon, uniqueSimrsNavigation } from '~/utils/simrs'

const auth = useAuthStore()
const emrModules = useEmrModulesStore()
const simrsModules = useSimrsModulesStore()
const route = useRoute()

type SidebarMode = 'expanded' | 'collapsed'

const sidebarMode = useCookie<SidebarMode>('simrs_sidebar_mode', {
  default: () => 'expanded',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const isSidebarCollapsed = computed(() => sidebarMode.value === 'collapsed')
const sidebarToggleLabel = computed(() => isSidebarCollapsed.value ? 'Perbesar sidebar' : 'Perkecil sidebar')

function toggleSidebar() {
  sidebarMode.value = isSidebarCollapsed.value ? 'expanded' : 'collapsed'
}

interface NavigationItem { to: string, label: string, icon: string }
interface NavigationSection { group: string, items: NavigationItem[] }

const clinicalItems = computed<NavigationItem[]>(() => emrModules.roots.flatMap((root: EmrModuleNode) => {
  const area = areaForLegacyRoot(root.legacy_path)
  if (!area) return []
  const definition = EMR_AREAS[area]
  if (!definition) return []
  return [{ to: `/emr/${area}`, label: root.name || definition.label, icon: definition.icon }]
}))

const simrsItems = computed<NavigationItem[]>(() => [
  { to: '/simrs', label: 'Katalog Modul', icon: 'lucide:blocks' },
  ...uniqueSimrsNavigation(simrsModules.navigation, ['/patients', '/registrations', '/registrations/new', '/queues'])
    .map((item) => ({ to: item.route, label: item.label, icon: resolveSimrsIcon(item.icon) })),
])

const navigation = computed<NavigationSection[]>(() => [
  { group: 'Operasional', items: [
    { to: '/', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
    { to: '/patients', label: 'Master Pasien', icon: 'lucide:users' },
    { to: '/registrations', label: 'Registrasi', icon: 'lucide:clipboard-plus' },
    { to: '/queues', label: 'Antrean', icon: 'lucide:list-ordered' },
  ] },
  { group: 'Rekam Medis Elektronik', items: clinicalItems.value },
  { group: 'Modul SIMRS', items: simrsItems.value },
])

const currentLabel = computed(() => navigation.value
  .flatMap((section) => section.items)
  .sort((left, right) => right.to.length - left.to.length)
  .find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`))?.label ?? 'SIMRS')

watch(() => auth.user?.id, (userId) => {
  if (userId) {
    void emrModules.load()
    void simrsModules.load()
  } else {
    emrModules.reset()
    simrsModules.reset()
  }
}, { immediate: true })
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside id="app-sidebar" class="sidebar" aria-label="Navigasi utama">
      <div class="sidebar-brand">
        <span class="sidebar-logo"><Icon name="lucide:hospital" aria-hidden="true" /></span>
        <span class="sidebar-brand-label">SIMRS</span>
      </div>
      <nav class="sidebar-navigation">
        <template v-for="section in navigation" :key="section.group">
          <section v-if="section.items.length" class="nav-section" :aria-label="section.group">
            <div class="nav-group">{{ section.group }}</div>
            <NuxtLink v-for="item in section.items" :key="item.to" :to="item.to" class="nav-link" :aria-label="item.label" :title="item.label">
              <Icon :name="item.icon" class="nav-icon" aria-hidden="true" />
              <span class="nav-link-label">{{ item.label }}</span>
            </NuxtLink>
          </section>
        </template>
      </nav>
    </aside>
    <div class="main-column">
      <header class="topbar">
        <div class="topbar-heading">
          <button
            class="sidebar-toggle"
            type="button"
            aria-controls="app-sidebar"
            :aria-expanded="!isSidebarCollapsed"
            :aria-label="sidebarToggleLabel"
            :title="sidebarToggleLabel"
            @click="toggleSidebar"
          >
            <Icon :name="isSidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" aria-hidden="true" />
          </button>
          <strong>{{ currentLabel }}</strong>
        </div>
        <div class="top-user">
          <ClientOnly>
            <span>{{ auth.user?.name ?? 'Memuat pengguna…' }}</span>
            <template #fallback>
              <span class="text-gray-400">Memuat pengguna…</span>
            </template>
          </ClientOnly>
          <button class="button" type="button" @click="auth.logout">
            <Icon name="lucide:log-out" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>
      <main class="content"><slot /></main>
    </div>
  </div>
</template>
