<script setup lang="ts">
import type { RoomTypeForm, RoomTypeRecord, RoomTypeStage } from '~/types/room'
import { serviceTypeBadgeColor } from '~/constants/room-types'

const toast = useToast()

const {
  roomTypes,
  pending,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  createStage,
  updateStage,
  deleteStage
} = await useRoomTypes()

const search = ref('')
const isFormOpen = ref(false)
const isDeleteOpen = ref(false)
const saving = ref(false)
const deleting = ref(false)
const selectedRoomType = ref<RoomTypeRecord | null>(null)
const selectedDeleteId = ref<string | null>(null)

const isStageOpen = ref(false)
const stageTarget = ref<RoomTypeRecord | null>(null)
const editingStage = ref<RoomTypeStage | null>(null)
const savingStage = ref(false)
const deletingStageId = ref<string | null>(null)
const deleteStageModalOpen = computed({
  get: () => Boolean(deletingStageId.value),
  set: (value: boolean) => {
    if (!value) deletingStageId.value = null
  },
})
const deletingStageRoomTypeId = ref<string | null>(null)

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

const filteredRoomTypes = computed(() => {
  const q = search.value.trim().toLowerCase()

  return [...roomTypes.value]
    .filter((roomType) => {
      if (!q) return true

      return [
        roomType.code,
        roomType.name,
        roomType.serviceType
      ].some(value => value.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (a.tierOrder !== b.tierOrder) return a.tierOrder - b.tierOrder
      return a.code.localeCompare(b.code)
    })
})

const stats = computed(() => ({
  total: roomTypes.value.length,
  active: roomTypes.value.filter(roomType => roomType.isActive).length,
  inactive: roomTypes.value.filter(roomType => !roomType.isActive).length
}))

function openAddModal() {
  selectedRoomType.value = null
  isFormOpen.value = true
}

function openEditModal(roomType: RoomTypeRecord) {
  selectedRoomType.value = roomType
  isFormOpen.value = true
}

function openDeleteModal(id: string) {
  selectedDeleteId.value = id
  isDeleteOpen.value = true
}

function closeDeleteModal() {
  if (deleting.value) return
  selectedDeleteId.value = null
  isDeleteOpen.value = false
}

async function handleSubmit(payload: RoomTypeForm) {
  if (saving.value) return

  saving.value = true

  try {
    if (selectedRoomType.value?.id) {
      await updateRoomType(selectedRoomType.value.id, payload)

      toast.add({
        title: 'Berhasil',
        description: 'Room type berhasil diperbarui',
        color: 'success'
      })
    } else {
      await createRoomType(payload)

      toast.add({
        title: 'Berhasil',
        description: 'Room type berhasil ditambahkan',
        color: 'success'
      })
    }

    isFormOpen.value = false
    selectedRoomType.value = null
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menyimpan room type'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!selectedDeleteId.value || deleting.value) return

  deleting.value = true

  try {
    await deleteRoomType(selectedDeleteId.value)

    toast.add({
      title: 'Berhasil',
      description: 'Room type berhasil dihapus',
      color: 'success'
    })

    selectedDeleteId.value = null
    isDeleteOpen.value = false
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menghapus room type'),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function openStageModal(roomType: RoomTypeRecord) {
  stageTarget.value = roomType
  editingStage.value = null
  isStageOpen.value = true
}

function openEditStage(roomType: RoomTypeRecord, stage: RoomTypeStage) {
  stageTarget.value = roomType
  editingStage.value = stage
  isStageOpen.value = true
}

const stageForm = reactive({
  code: '',
  name: '',
  stageOrder: 1,
  slotLimit: 1,
  isActive: true
})

watch(isStageOpen, (value) => {
  if (value) {
    if (editingStage.value) {
      stageForm.code = editingStage.value.code
      stageForm.name = editingStage.value.name
      stageForm.stageOrder = editingStage.value.stageOrder
      stageForm.slotLimit = editingStage.value.slotLimit ?? 1
      stageForm.isActive = editingStage.value.isActive
    } else {
      stageForm.code = ''
      stageForm.name = ''
      stageForm.stageOrder = (stageTarget.value?.stages?.length ?? 0) + 1
      stageForm.slotLimit = 1
      stageForm.isActive = true
    }
  }
})

function submitStage() {
  handleStageSubmit({
    code: stageForm.code.trim(),
    name: stageForm.name.trim(),
    stageOrder: Number(stageForm.stageOrder || 1),
    slotLimit: Number(stageForm.slotLimit || 1),
    isActive: stageForm.isActive
  })
}

async function handleStageSubmit(payload: {
  code: string
  name: string
  stageOrder: number
  slotLimit?: number
  isActive?: boolean
}) {
  if (!stageTarget.value || savingStage.value) return

  savingStage.value = true

  try {
    if (editingStage.value?.id) {
      await updateStage(stageTarget.value.id, editingStage.value.id, payload)

      toast.add({
        title: 'Berhasil',
        description: 'Stage berhasil diperbarui',
        color: 'success'
      })
    } else {
      await createStage(stageTarget.value.id, payload)

      toast.add({
        title: 'Berhasil',
        description: 'Stage berhasil ditambahkan',
        color: 'success'
      })
    }

    isStageOpen.value = false
    editingStage.value = null
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menyimpan stage'),
      color: 'error'
    })
  } finally {
    savingStage.value = false
  }
}

function openDeleteStage(roomTypeId: string, stageId: string) {
  deletingStageRoomTypeId.value = roomTypeId
  deletingStageId.value = stageId
}

async function handleDeleteStage() {
  if (!deletingStageId.value || !deletingStageRoomTypeId.value) return

  const roomTypeId = deletingStageRoomTypeId.value
  const stageId = deletingStageId.value
  deletingStageId.value = null
  deletingStageRoomTypeId.value = null

  try {
    await deleteStage(roomTypeId, stageId)

    toast.add({
      title: 'Berhasil',
      description: 'Stage berhasil dihapus',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menghapus stage'),
      color: 'error'
    })
  }
}</script>

<template>
  <UDashboardPanel id="room-types">
    <template #header>
      <UDashboardNavbar
        title="Room Types"
        subtitle="Master room type untuk room dan assignment"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/rooms"
            label="Rooms"
            icon="i-lucide-door-open"
            color="neutral"
            variant="soft"
          />

          <UButton
            icon="i-lucide-plus"
            label="Tambah Room Type"
            @click="openAddModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <UCard variant="subtle">
            <p class="text-sm text-muted">
              Total Room Type
            </p>
            <p class="mt-1 text-2xl font-semibold text-highlighted">
              {{ stats.total }}
            </p>
          </UCard>

          <UCard variant="subtle">
            <p class="text-sm text-muted">
              Aktif
            </p>
            <p class="mt-1 text-2xl font-semibold text-success">
              {{ stats.active }}
            </p>
          </UCard>

          <UCard variant="subtle">
            <p class="text-sm text-muted">
              Tidak Aktif
            </p>
            <p class="mt-1 text-2xl font-semibold text-muted">
              {{ stats.inactive }}
            </p>
          </UCard>
        </div>

        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari room type..."
          class="max-w-sm"
        />

        <div
          v-if="pending"
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
        >
          <USkeleton
            v-for="item in 6"
            :key="item"
            class="h-40 rounded-xl"
          />
        </div>

        <div
          v-else-if="!filteredRoomTypes.length"
          class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-folder-cog"
            class="mb-3 size-10 text-muted"
          />

          <h3 class="text-base font-semibold text-highlighted">
            Tidak ada room type ditemukan
          </h3>

          <p class="mt-1 max-w-lg text-sm text-muted">
            Tambahkan room type baru atau ubah kata kunci pencarian.
          </p>
        </div>

        <div
          v-else
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]"
        >
          <UCard
            v-for="roomType in filteredRoomTypes"
            :key="roomType.id"
            class="overflow-hidden"
          >
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted">
                    {{ roomType.code }}
                  </p>

                  <h3 class="mt-1 text-base font-semibold text-highlighted">
                    {{ roomType.name }}
                  </h3>
                </div>

                <UBadge
                  :label="roomType.isActive ? 'Aktif' : 'Nonaktif'"
                  :color="roomType.isActive ? 'success' : 'neutral'"
                  variant="subtle"
                />
              </div>
            </template>

            <div class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <UBadge
                  :label="roomType.serviceType"
                  :color="serviceTypeBadgeColor[roomType.serviceType]"
                  variant="soft"
                />

                <UBadge
                  :label="`Tier ${roomType.tierOrder}`"
                  color="neutral"
                  variant="outline"
                />
              </div>

              <div
                v-if="roomType.stages && roomType.stages.length"
                class="rounded-lg border border-default/70 bg-muted/30 p-3"
              >
                <p class="text-xs font-medium text-muted">
                  Urutan Stage Eksekusi ({{ roomType.stages.length }})
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <template
                    v-for="(stage, idx) in [...roomType.stages].sort((a, b) => a.stageOrder - b.stageOrder)"
                    :key="stage.id"
                  >
                    <div class="flex items-center gap-1">
                      <UBadge
                        :label="`${stage.stageOrder}. ${stage.name}`"
                        color="info"
                        variant="subtle"
                      />
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-pencil"
                        @click="openEditStage(roomType, stage)"
                      />
                      <UButton
                        size="xs"
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash"
                        @click="openDeleteStage(roomType.id, stage.id)"
                      />
                    </div>
                    <span
                      v-if="idx < roomType.stages.length - 1"
                      class="text-xs text-muted"
                    >→</span>
                  </template>
                </div>
                <p class="mt-2 text-xs text-muted">
                  Ruangan ini akan mengeksekusi stage sesuai urutan di atas saat pasien diambil.
                </p>
              </div>

              <div
                v-else
                class="rounded-lg border border-dashed border-default/70 bg-muted/20 p-3 text-xs text-muted"
              >
                Belum ada stage terkonfigurasi untuk ruangan ini.
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-lg bg-muted/40 p-3">
                  <p class="text-xs text-muted">
                    Service Type
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ roomType.serviceType }}
                  </p>
                </div>

                <div class="rounded-lg bg-muted/40 p-3">
                  <p class="text-xs text-muted">
                    Status
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ roomType.isActive ? 'Aktif' : 'Nonaktif' }}
                  </p>
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <UButton
                  block
                  size="sm"
                  color="info"
                  variant="soft"
                  icon="i-lucide-list-tree"
                  @click="openStageModal(roomType)"
                >
                  Kelola Stage
                </UButton>

                <UButton
                  block
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-pencil"
                  @click="openEditModal(roomType)"
                >
                  Edit
                </UButton>

                <UButton
                  size="sm"
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash"
                  @click="openDeleteModal(roomType.id)"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <RoomsRoomTypeModal
        v-model:open="isFormOpen"
        :room-type="selectedRoomType"
        :loading="saving"
        @submit="handleSubmit"
      />

      <BaseDeleteModal
        v-model:open="isDeleteOpen"
        :loading="deleting"
        :count="1"
        entity="room type"
        title="Hapus room type?"
        description="Room type yang dihapus tidak dapat dikembalikan."
        @close="closeDeleteModal"
        @confirm="handleDelete"
      />

      <UModal
        v-model:open="isStageOpen"
        :ui="{ content: 'sm:max-w-lg' }"
      >
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold">
                    {{ editingStage?.id ? 'Edit Stage' : 'Tambah Stage' }}
                  </h2>
                  <p class="text-sm text-muted">
                    {{ stageTarget?.name }}
                  </p>
                </div>

                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  @click="isStageOpen = false"
                />
              </div>
            </template>

            <form
              class="space-y-4"
              @submit.prevent="submitStage"
            >
              <UFormField label="Kode Stage" required>
                <UInput
                  v-model="stageForm.code"
                  placeholder="COLLECT"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Nama Stage" required>
                <UInput
                  v-model="stageForm.name"
                  placeholder="Pengambilan Sample"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Urutan" required>
                  <UInput
                    v-model.number="stageForm.stageOrder"
                    type="number"
                    min="1"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Slot Limit">
                  <UInput
                    v-model.number="stageForm.slotLimit"
                    type="number"
                    min="1"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Aktif">
                <USwitch v-model="stageForm.isActive" />
              </UFormField>

              <div class="flex justify-end gap-2 border-t border-default pt-4">
                <UButton
                  type="button"
                  color="neutral"
                  variant="soft"
                  @click="isStageOpen = false"
                >
                  Batal
                </UButton>

                <UButton
                  type="submit"
                  :loading="savingStage"
                  icon="i-lucide-save"
                >
                  Simpan
                </UButton>
              </div>
            </form>
          </UCard>
        </template>
      </UModal>

      <BaseDeleteModal
        v-model:open="deleteStageModalOpen"
        :loading="false"
        :count="1"
        entity="stage"
        title="Hapus stage?"
        description="Stage yang dihapus tidak dapat dikembalikan."
        @close="deletingStageId = null"
        @confirm="handleDeleteStage"
      />
    </template>
  </UDashboardPanel>
</template>
