<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
  }>(),
  {
    count: 0,
  },
);

const emit = defineEmits<{
  (e: "confirm"): void;
}>();

// ⬇️ INI YANG PENTING
const open = defineModel<boolean>("open");

function onSubmit() {
  emit("confirm");
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Delete ${count} patient${count > 1 ? 's' : ''}`"
    description="Data yang dihapus tidak bisa dikembalikan."
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton label="Delete" color="error" @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
