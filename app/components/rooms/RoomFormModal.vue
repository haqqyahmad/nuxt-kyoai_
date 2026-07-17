<!-- app/components/rooms/RoomFormModal.vue -->
<script setup lang="ts">
import type { Room, RoomForm, RoomTypeStage } from '~/types/room'

const {
  roomTypeOptions
} = await useRoomTypes()

const api = useApi()

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
  roomTypeId: null,
  staffCapacity: null,
  isActive: true,
  stageIds: []
})

const stageOptions = ref<RoomTypeStage[]>([])
const stagesLoading = ref(false)

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
  && form.roomTypeId !== null
)

async function loadStages(roomTypeId: string) {
  if (!roomTypeId) {
    stageOptions.value = []
    return
  }

  stagesLoading.value = true

  try {
    const res = await api.get(`/medical/rooms/room-types/${roomTypeId}`)
    const rt = res.data?.data ?? res.data
    stageOptions.value = (rt?.stages ?? []).filter((s: RoomTypeStage) => s.isActive)
  } catch {
    stageOptions.value = []
  } finally {
    stagesLoading.value = false
  }
}

function resetForm() {
  form.code = ''
  form.name = ''
  form.roomTypeId = null
  form.staffCapacity = null
  form.isActive = true
  form.stageIds = []
  stageOptions.value = []
}

function fillForm(room: Room) {
  form.code = room.code
  form.name = room.name
  form.roomTypeId = room.roomTypeId
  form.staffCapacity = room.staffCapacity || null
  form.isActive = room.isActive
  form.stageIds = (room.stageLinks ?? [])
    .map(link => link.stageId)
    .filter((id, idx, arr) => arr.includes(id))
  loadStages(room.roomTypeId)
}

watch(
  () => props.room,
  (room) => {
    if (room) fillForm(room)
    else resetForm()
  },
  { immediate: true }
)

watch(() => form.roomTypeId, (value) => {
  if (value) loadStages(value)
})

watch(open, (value) => {
  if (!value && !isEdit.value) resetForm()
})

function submit() {
  if (!isValid.value || props.loading) return

  emit('submit', {
    code: form.code.trim(),
    name: form.name.trim(),
    roomTypeId: form.roomTypeId,
    staffCapacity: Number(form.staffCapacity || 1),
    isActive: form.isActive,
    stageIds: form.stageIds ?? []
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
                  v-model="form.roomTypeId"
                  :items="roomTypeOptions"
                  placeholder="Pilih room type"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Kapasitas Petugas">
                <UInput
                  v-model.number="form.staffCapacity"
                  type="number"
                  min="1"
                  placeholder="1"
                  class="w-full"
                />
                <p class="mt-1 text-xs text-muted">
                  Jumlah petugas aktif yang boleh masuk room secara bersamaan.
                </p>
              </UFormField>

              <UFormField label="Aktif">
                <USwitch
                  v-model="form.isActive"
                  label="Ruangan aktif"
                />
              </UFormField>

            </div>

            <UFormField
              label="Stage yang ditangani"
              description="Pilih stage dari room type ini yang boleh dipanggil/dikerjakan ruangan ini. Nama stage bebas diubah; sistem mengenali lewat kode stage."
            >
              <USelect
                v-model="form.stageIds"
                :items="stageOptions"
                :loading="stagesLoading"
                multiple
                value-key="id"
                label-key="name"
                :disabled="!form.roomTypeId"
                placeholder="Pilih stage"
                class="w-full"
              >
                <template #label>
                  <template v-if="form.stageIds && form.stageIds.length">
                    <span>{{ form.stageIds.length }} stage dipilih</span>
                  </template>
                  <template v-else>
                    <span class="text-muted">Pilih stage</span>
                  </template>
                </template>
              </USelect>
            </UFormField>

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
