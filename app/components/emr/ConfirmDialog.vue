<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  busy?: boolean
  confirmLabel?: string
}>(), {
  busy: false,
  confirmLabel: 'Hapus',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('cancel')">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <div class="panel-header"><strong id="confirm-dialog-title">{{ title }}</strong></div>
        <div class="panel-body">
          <p id="confirm-dialog-message" class="confirm-dialog-message">{{ message }}</p>
          <div class="form-actions">
            <button class="button" type="button" :disabled="busy" @click="emit('cancel')">Batal</button>
            <button class="button button-danger" type="button" :disabled="busy" @click="emit('confirm')">
              {{ busy ? 'Memproses…' : confirmLabel }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
