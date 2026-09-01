<!-- app/components/rooms/RoomTypeModal.vue -->
<script setup lang="ts">
import { serviceTypeOptions } from '~/constants/room-types'
import type { RoomTypeForm, RoomTypeRecord } from '~/types/room'

const props = withDefaults(defineProps<{
  roomType?: RoomTypeRecord | null
  loading?: boolean
}>(), {
  roomType: null,
  loading: false
})

const emit = defineEmits<{
  submit: [payload: RoomTypeForm]
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive<RoomTypeForm & { tierMode: 'STRICT' | 'FREE' }>({
  code: '',
  name: '',
  serviceType: null,
  tierMode: 'STRICT',
  tierOrder: 1,
  isActive: true
})

const isEdit = computed(() => !!props.roomType?.id)

const title = computed(() =>
  isEdit.value ? 'Edit Room Type' : 'Add Room Type'
)

const description = computed(() =>
  isEdit.value
    ? 'Perbarui data room type'
    : 'Tambahkan room type baru'
)

const isValid = computed(() =>
  form.code.trim()
  && form.name.trim()
  && form.serviceType !== null
  && (form.tierMode === 'FREE' || Number(form.tierOrder || 0) >= 1)
)

function resetForm() {
  form.code = ''
  form.name = ''
  form.serviceType = null
  form.tierMode = 'STRICT'
  form.tierOrder = 1
  form.isActive = true
}

function fillForm(roomType: RoomTypeRecord) {
  form.code = roomType.code
  form.name = roomType.name
  form.serviceType = roomType.serviceType
  form.tierMode = roomType.tierMode ?? 'STRICT'
  form.tierOrder = roomType.tierOrder ?? 1
  form.isActive = roomType.isActive
}

watch(
  () => props.roomType,
  (roomType) => {
    if (roomType) fillForm(roomType)
    else resetForm()
  },
  { immediate: true }
)

watch(open, (value) => {
  if (!value && !isEdit.value) resetForm()
})

function submit() {
  if (!isValid.value || props.loading) return

  emit('submit', {
    code: form.code.trim(),
    name: form.name.trim(),
    serviceType: form.serviceType,
    tierMode: form.tierMode,
    tierOrder: form.tierMode === 'FREE' ? null : Number(form.tierOrder || 1),
    isActive: form.isActive
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">
                {{ title }}
              </h2>
              <p class="text-sm text-muted">
                {{ description }}
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>

        <div class="p-6">
          <form
            class="space-y-5"
            @submit.prevent="submit"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField
                label="Kode"
                required
              >
                <UInput
                  v-model="form.code"
                  placeholder="RT-001"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField
                label="Nama"
                required
              >
                <UInput
                  v-model="form.name"
                  placeholder="Laboratorium MCU"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Service Type"
                required
              >
                <USelect
                  v-model="form.serviceType"
                  :items="serviceTypeOptions"
                  placeholder="Pilih service type"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Tier Mode">
                <USelect
                  v-model="form.tierMode"
                  :items="[
                    { label: 'Strict (berurutan)', value: 'STRICT' },
                    { label: 'Free (bebas)', value: 'FREE' }
                  ]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Tier Order"
                :description="form.tierMode === 'FREE' ? 'Tidak berlaku untuk mode Free' : undefined"
              >
                <UInput
                  v-model.number="form.tierOrder"
                  type="number"
                  min="1"
                  class="w-full"
                  placeholder="1"
                  :disabled="form.tierMode === 'FREE'"
                />
              </UFormField>

              <UFormField label="Status">
                <USwitch
                  v-model="form.isActive"
                  label="Aktif"
                />
              </UFormField>
            </div>

            <div class="flex justify-end gap-2 border-t border-default pt-4">
              <UButton
                type="button"
                color="neutral"
                variant="soft"
                @click="open = false"
              >
                Batal
              </UButton>

              <UButton
                type="submit"
                :loading="loading"
                :disabled="!isValid || loading"
                :icon="isEdit ? 'i-lucide-save' : 'i-lucide-plus'"
              >
                {{ isEdit ? 'Update' : 'Simpan' }}
              </UButton>
            </div>
          </form>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
