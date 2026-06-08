<!-- app/components/rooms/RoomFormModal.vue -->
<script setup lang="ts">
import { roomStatusOptions, roomTypeOptions } from '~/constants/rooms'
import type { Room, RoomForm } from '~/types/room'

const props = withDefaults(defineProps<{
  room?: Room | null
  loading?: boolean
}>(), {
  room: null,
  loading: false
})

const emit = defineEmits<{
  submit: [payload: RoomForm]
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive<RoomForm>({
  code: '',
  name: '',
  type: null,
  floor: '',
  capacity: null,
  pic: '',
  facilities: '',
  description: '',
  status: 'ACTIVE'
})

const isEdit = computed(() => !!props.room?.id)

const title = computed(() =>
  isEdit.value ? 'Edit Room' : 'Add New Room'
)

const description = computed(() =>
  isEdit.value
    ? 'Perbarui data ruangan'
    : 'Tambahkan ruangan baru'
)

const isValid = computed(() =>
  form.code.trim()
  && form.name.trim()
  && form.type !== null
)

function resetForm() {
  form.code = ''
  form.name = ''
  form.type = null
  form.floor = ''
  form.capacity = null
  form.pic = ''
  form.facilities = ''
  form.description = ''
  form.status = 'ACTIVE'
}

function fillForm(room: Room) {
  form.code = room.code
  form.name = room.name
  form.type = room.type
  form.floor = room.floor || ''
  form.capacity = room.capacity || null
  form.pic = room.pic || ''
  form.facilities = room.facilities || ''
  form.description = room.description || ''
  form.status = room.status
}

watch(
  () => props.room,
  (room) => {
    if (room) fillForm(room)
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
    type: form.type,
    floor: form.floor.trim(),
    capacity: Number(form.capacity || 0),
    pic: form.pic.trim(),
    facilities: form.facilities.trim(),
    description: form.description.trim(),
    status: form.status
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
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
                  placeholder="R-001"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField
                label="Nama Ruangan"
                required
              >
                <UInput
                  v-model="form.name"
                  placeholder="Poli Umum 1"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Tipe"
                required
              >
                <USelect
                  v-model="form.type"
                  :items="roomTypeOptions"
                  placeholder="Pilih tipe ruangan"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Lantai / Lokasi">
                <UInput
                  v-model="form.floor"
                  placeholder="Lantai 1"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Kapasitas">
                <UInput
                  v-model.number="form.capacity"
                  type="number"
                  min="1"
                  placeholder="2"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Penanggung Jawab">
                <UInput
                  v-model="form.pic"
                  placeholder="Nama dokter / staf"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Status">
                <USelect
                  v-model="form.status"
                  :items="roomStatusOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Fasilitas">
                <UInput
                  v-model="form.facilities"
                  placeholder="Bed, tensimeter, EKG"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Keterangan"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  placeholder="Catatan tambahan..."
                  class="w-full"
                  :rows="3"
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
                Cancel
              </UButton>

              <UButton
                type="submit"
                :loading="props.loading"
                :disabled="!isValid || props.loading"
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
