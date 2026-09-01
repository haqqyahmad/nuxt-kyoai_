<!-- app/components/hris/attendance/configuration/MonthlyShiftModal.vue -->

<script setup lang="ts">
const api = useApi()
const toast = useToast()

type ShiftTemplateDay = {
  id: number
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplateResponseItem = {
  id: number
  name: string
  description: string
  status: 'active' | 'inactive' | string
  shiftTemplateDays: ShiftTemplateDay[]
}

type ShiftOption = {
  label: string
  value: number
  description: string
  status: string
  days: ShiftTemplateDay[]
}

type AssignmentForm = {
  weekNumber: number
  shiftTemplateId: number | undefined
}

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  refresh: []
}>()

const loading = ref(false)
const loadingShift = ref(false)

const shiftOptions = ref<ShiftOption[]>([])

const form = reactive({
  name: '',
  description: '',
  status: 'active',
  assignments: [] as AssignmentForm[]
})

const canSubmit = computed(() => {
  return Boolean(
    form.name.trim()
    && form.assignments.length
    && form.assignments.every(item => item.shiftTemplateId)
  )
})

function addWeek() {
  form.assignments.push({
    weekNumber: form.assignments.length + 1,
    shiftTemplateId: undefined
  })
}

function removeWeek(index: number) {
  form.assignments.splice(index, 1)

  form.assignments = form.assignments.map((item, itemIndex) => ({
    ...item,
    weekNumber: itemIndex + 1
  }))
}

function getSelectedShift(shiftTemplateId?: number) {
  return shiftOptions.value.find(shift => shift.value === shiftTemplateId)
}

function generateWeeklyAssignments() {
  form.assignments = Array.from({ length: 5 }, (_, index) => ({
    weekNumber: index + 1,
    shiftTemplateId: undefined
  }))
}

function applyRotation() {
  if (!shiftOptions.value.length || !form.assignments.length) return

  form.assignments.forEach((assignment, index) => {
    assignment.shiftTemplateId = shiftOptions.value[index % shiftOptions.value.length]?.value
  })
}

function clearAssignmentsShift() {
  form.assignments.forEach((assignment) => {
    assignment.shiftTemplateId = undefined
  })
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.status = 'active'
  form.assignments = []
}

function setDefaultForm() {
  generateWeeklyAssignments()
}

async function loadShiftTemplates() {
  loadingShift.value = true

  try {
    const response = await api.get<{
      data: ShiftTemplateResponseItem[]
    }>('/hris/shift/templates')

    shiftOptions.value = response.data.data
      .filter(item => item.status === 'active')
      .map(item => ({
        label: item.name,
        value: item.id,
        description: item.description,
        status: item.status,
        days: item.shiftTemplateDays
      }))
  } catch (error) {
    console.error(error)
    shiftOptions.value = []
  } finally {
    loadingShift.value = false
  }
}

async function submit() {
  if (loading.value) return

  if (!canSubmit.value) {
    toast.add({
      title: 'Validasi',
      description: 'Shift name dan semua shift mingguan wajib diisi.',
      color: 'warning'
    })

    return
  }

  loading.value = true

  const payload = {
    name: form.name,
    description: form.description,
    status: form.status,
    weeks: form.assignments.map(item => ({
      week_number: item.weekNumber,
      shift_template_id: item.shiftTemplateId
    }))
  }

  try {
    await api.post('/hris/shift/month-templates', payload)

    toast.add({
      title: 'Berhasil',
      description: 'Monthly shift template berhasil dibuat.',
      color: 'success'
    })

    resetForm()
    open.value = false
    emit('refresh')
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Monthly shift template gagal dibuat.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) {
    setDefaultForm()
    loadShiftTemplates()
  } else {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create Monthly Shift"
    description="Atur rotasi shift mingguan dalam satu bulan untuk karyawan."
    :ui="{
      content: 'sm:max-w-6xl'
    }"
  >
    <template #body>
      <div class="max-h-[70vh] overflow-y-auto pr-1">
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="space-y-6 lg:col-span-2">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Shift Name" required>
                <UInput
                  v-model="form.name"
                  placeholder="Monthly Rotation A"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Status">
                <USelect
                  v-model="form.status"
                  :items="[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' }
                  ]"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Description"
                class="sm:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  :rows="3"
                  placeholder="Rotasi Shift Pagi → Shift Siang → Shift Malam"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-highlighted">
                Quick Action
              </h4>

              <div class="flex flex-wrap gap-2">
                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  icon="i-lucide-refresh-cw"
                  @click="generateWeeklyAssignments"
                >
                  Generate Mingguan
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  icon="i-lucide-repeat"
                  @click="applyRotation"
                >
                  Auto Rotation
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-rotate-ccw"
                  @click="clearAssignmentsShift"
                >
                  Clear Shift
                </UButton>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-highlighted">
                    Weekly Shift Rotation
                  </h4>

                  <p class="mt-1 text-xs text-muted">
                    Pilih template shift berbeda untuk setiap minggu.
                  </p>
                </div>

                <UButton
                  type="button"
                  size="sm"
                  variant="outline"
                  icon="i-lucide-plus"
                  class="justify-center"
                  @click="addWeek"
                >
                  Add Week
                </UButton>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(assignment, index) in form.assignments"
                  :key="index"
                  class="space-y-4 rounded-xl border border-default bg-muted/30 p-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-highlighted">
                        Minggu {{ index + 1 }}
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <UBadge
                        :color="assignment.shiftTemplateId ? 'success' : 'neutral'"
                        variant="soft"
                      >
                        {{ assignment.shiftTemplateId ? 'Selected' : 'Pending' }}
                      </UBadge>

                      <UButton
                        type="button"
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="xs"
                        square
                        @click="removeWeek(index)"
                      />
                    </div>
                  </div>

                  <UFormField label="Shift Template" required>
                    <USelect
                      v-model="assignment.shiftTemplateId"
                      :items="shiftOptions"
                      :loading="loadingShift"
                      label-key="label"
                      value-key="value"
                      placeholder="Pilih shift untuk minggu ini"
                      class="w-full"
                    />
                  </UFormField>

                  <div
                    v-if="getSelectedShift(assignment.shiftTemplateId)"
                    class="rounded-xl border border-default bg-default p-4"
                  >
                    <p class="text-sm font-semibold text-highlighted">
                      {{ getSelectedShift(assignment.shiftTemplateId)?.label }}
                    </p>

                    <p class="mt-1 text-sm text-muted">
                      {{ getSelectedShift(assignment.shiftTemplateId)?.description }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="!form.assignments.length"
                  class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default text-sm text-muted"
                >
                  Klik Generate Mingguan untuk membuat template mingguan.
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="sticky top-0 space-y-3">
              <div>
                <h4 class="text-sm font-semibold text-highlighted">
                  Preview Monthly Shift
                </h4>

                <p class="mt-1 text-xs text-muted">
                  Preview assignment mingguan yang akan dikirim.
                </p>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4">
                <p class="text-xs font-semibold text-highlighted">
                  Shift Name
                </p>

                <p class="mt-1 text-sm font-medium text-highlighted">
                  {{ form.name || '-' }}
                </p>

                <p class="mt-3 text-xs font-semibold text-highlighted">
                  Status
                </p>

                <p class="mt-1 text-sm text-muted">
                  {{ form.status }}
                </p>

                <p class="mt-3 text-xs font-semibold text-highlighted">
                  Description
                </p>

                <p class="mt-1 text-sm text-muted">
                  {{ form.description || '-' }}
                </p>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4">
                <p class="text-xs font-semibold text-highlighted">
                  Rotation Preview
                </p>

                <div class="mt-3 space-y-2">
                  <div
                    v-for="week in form.assignments"
                    :key="week.weekNumber"
                    class="flex items-center justify-between"
                  >
                    <span class="text-sm">
                      Minggu {{ week.weekNumber }}
                    </span>

                    <span class="text-sm font-medium">
                      {{ getSelectedShift(week.shiftTemplateId)?.label || '-' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4">
                <p class="text-xs font-semibold text-highlighted">
                  Total Week
                </p>

                <p class="mt-1 text-2xl font-bold text-highlighted">
                  {{ form.assignments.length }}
                </p>

                <p class="mt-1 text-xs text-muted">
                  minggu dalam bulan ini
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          class="justify-center"
          :disabled="loading"
          @click="open = false"
        >
          Batal
        </UButton>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="loading || !canSubmit"
          @click="submit"
        >
          Simpan Monthly Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
