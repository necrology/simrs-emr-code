<script setup lang="ts">
import type { EmrModuleNode } from '~/types/emr'

defineOptions({ name: 'EmrModuleTree' })
const props = defineProps<{ node: EmrModuleNode, area: string }>()
const route = useRoute()

function contextQuery(): Record<string, string> {
  const query: Record<string, string> = { legacy_path: props.node.legacy_path }
  for (const key of ['encounter_id', 'patient_id'] as const) {
    const value = route.query[key]
    const normalized = Array.isArray(value) ? value[0] : value
    if (normalized) query[key] = String(normalized)
  }
  return query
}

const formRoute = computed(() => ({
  path: `/emr/${encodeURIComponent(props.area)}/forms/${props.node.id}`,
  query: contextQuery(),
}))
const isFormLeaf = computed(() => props.node.children.length === 0 && props.node.permissions.view)

const abilities = computed(() => {
  const labels: string[] = []
  if (props.node.permissions.view) labels.push('Baca')
  if (props.node.permissions.add) labels.push('Tambah')
  if (props.node.permissions.edit) labels.push('Ubah')
  if (props.node.permissions.delete) labels.push('Hapus')
  return labels
})
</script>

<template>
  <li class="module-tree-item">
    <!-- Render as a link if it's a leaf node. We allow clicking even without encounterId so the form page can show a clear empty state. -->
    <NuxtLink v-if="isFormLeaf" :to="formRoute" class="module-node module-node-link transition-colors hover:bg-blue-50 focus:bg-blue-100 border-l-4 border-transparent hover:border-blue-500">
      <div>
        <strong class="text-blue-900 group-hover:text-blue-700">{{ node.name }}</strong>
        <code v-if="node.legacy_path" class="text-xs text-gray-500 block mt-0.5">{{ node.legacy_path }}</code>
      </div>
      <div class="module-abilities flex gap-1">
        <span v-for="ability in abilities" :key="ability" class="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded">
          {{ ability }}
        </span>
        <!-- Optional: Visual cue to proceed -->
        <svg class="w-4 h-4 text-blue-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </div>
    </NuxtLink>
    
    <!-- Render as a normal div if it's a parent folder -->
    <div v-else class="module-node">
      <div>
        <strong class="text-gray-800">{{ node.name }}</strong>
        <code v-if="node.legacy_path" class="text-xs text-gray-400 block mt-0.5">{{ node.legacy_path }}</code>
      </div>
      <div class="module-abilities flex gap-1">
        <span v-for="ability in abilities" :key="ability" class="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded">
          {{ ability }}
        </span>
      </div>
    </div>
    
    <ul v-if="node.children.length > 0" class="module-tree">
      <EmrModuleTree v-for="child in node.children" :key="child.id" :node="child" :area="area" />
    </ul>
  </li>
</template>
