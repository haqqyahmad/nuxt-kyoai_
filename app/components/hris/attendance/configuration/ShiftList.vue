<script setup lang="ts">
type ShiftTemplateDay = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
  shiftTemplateDays: ShiftTemplateDay[]
}

type MonthTemplateWeek = {
  id?: number
  week_number: number
  shift_template_id: number
  shiftTemplate?: {
    id: number
    name: string
    description?: string | null
  }
}

type MonthTemplate = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
  weeks: MonthTemplateWeek[]
}

type SelectedShift = {
  id: number
  type: 'shift' | 'month'
}

const props = defineProps<{
  shifts: ShiftTemplate[]
  monthTemplates?: MonthTemplate[]
  loading?: boolean
}>()

const selected = defineModel<SelectedShift | null>({
  default: null
})

const activeTab = ref<'shift' | 'month'>('shift')

const dayLabels: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun'
}

function formatSchedule(shift: ShiftTemplate) {
  const workingDays = shift.shiftTemplateDays
    ?.filter(day => day.is_working)
    ?.sort((a, b) => a.day_of_week - b.day_of_week) || []

  if (!workingDays.length) return 'No working days'

  return workingDays
    .map(day => `${dayLabels[day.day_of_week]} ${day.start_time}-${day.end_time}`)
    .join(', ')
}

function formatMonthTemplate(template: MonthTemplate) {
  if (!template.weeks?.length) return 'No weekly rotation'

  return [...template.weeks]
    .sort((a, b) => a.week_number - b.week_number)
    .map((week) => {
      return `Week ${week.week_number}: ${week.shiftTemplate?.name ?? `Shift #${week.shift_template_id}`}`
    })
    .join(', ')
}

function isSelected(id: number, type: 'shift' | 'month') {
  return selected.value?.id === id && selected.value?.type === type
}

function selectItem(id: number, type: 'shift' | 'month') {
  selected.value = { id, type }
}

function selectTab(tab: 'shift' | 'month') {
  activeTab.value = tab

  if (tab === 'shift' && props.shifts.length) {
    selected.value = {
      id: props.shifts[0].id,
      type: 'shift'
    }
  }

  if (tab === 'month' && props.monthTemplates?.length) {
    selected.value = {
      id: props.monthTemplates[0].id,
      type: 'month'
    }
  }
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-semibold text-highlighted">
              Shift Templates
            </h3>

            <p class="mt-1 text-sm text-muted">
              Select shift or monthly template.
            </p>
          </div>

          <UBadge
            color="primary"
            variant="soft"
            class="shrink-0"
          >
            {{ shifts.length + (monthTemplates?.length || 0) }} Total
          </UBadge>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            :class="activeTab === 'shift'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-default hover:bg-muted/50'"
            @click="selectTab('shift')"
          >
            Shift
            <span class="ml-1 text-xs text-muted">
              {{ shifts.length }}
            </span>
          </button>

          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            :class="activeTab === 'month'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-default hover:bg-muted/50'"
            @click="selectTab('month')"
          >
            Monthly
            <span class="ml-1 text-xs text-muted">
              {{ monthTemplates?.length || 0 }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="item in 4"
        :key="item"
        class="h-24 w-full rounded-xl"
      />
    </div>

    <div v-else>
      <div
        v-if="activeTab === 'shift'"
        class="space-y-3"
      >
        <div
          v-if="!shifts.length"
          class="rounded-xl border border-dashed border-default p-6 text-center"
        >
          <p class="text-sm font-medium text-highlighted">
            Belum ada shift
          </p>

          <p class="mt-1 text-xs text-muted">
            Klik New Shift untuk membuat data shift.
          </p>
        </div>

        <button
          v-for="shift in shifts"
          :key="shift.id"
          type="button"
          class="w-full rounded-xl border p-4 text-left transition"
          :class="isSelected(shift.id, 'shift')
            ? 'border-primary bg-primary/10'
            : 'border-default hover:bg-muted/50'"
          @click="selectItem(shift.id, 'shift')"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-highlighted">
                  {{ shift.name }}
                </p>

                <UBadge
                  color="primary"
                  variant="soft"
                  size="xs"
                >
                  Shift
                </UBadge>

                <UBadge
                  :color="shift.status === 'active' ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ shift.status }}
                </UBadge>
              </div>

              <p class="mt-1 line-clamp-2 text-sm text-muted">
                {{ formatSchedule(shift) }}
              </p>

              <p class="mt-3 text-xs text-muted">
                {{ shift.shiftTemplateDays?.filter(day => day.is_working).length || 0 }}
                working days
              </p>
            </div>

            <UIcon
              v-if="isSelected(shift.id, 'shift')"
              name="i-lucide-circle-check"
              class="size-5 shrink-0 text-primary"
            />
          </div>
        </button>
      </div>

      <div
        v-if="activeTab === 'month'"
        class="space-y-3"
      >
        <div
          v-if="!monthTemplates?.length"
          class="rounded-xl border border-dashed border-default p-6 text-center"
        >
          <p class="text-sm font-medium text-highlighted">
            Belum ada monthly template
          </p>

          <p class="mt-1 text-xs text-muted">
            Klik New Monthly Shift untuk membuat template rotasi.
          </p>
        </div>

        <button
          v-for="template in monthTemplates"
          :key="template.id"
          type="button"
          class="w-full rounded-xl border p-4 text-left transition"
          :class="isSelected(template.id, 'month')
            ? 'border-primary bg-primary/10'
            : 'border-default hover:bg-muted/50'"
          @click="selectItem(template.id, 'month')"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-highlighted">
                  {{ template.name }}
                </p>

                <UBadge
                  color="info"
                  variant="soft"
                  size="xs"
                >
                  Monthly
                </UBadge>

                <UBadge
                  :color="template.status === 'active' ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ template.status }}
                </UBadge>
              </div>

              <p class="mt-1 line-clamp-2 text-sm text-muted">
                {{ formatMonthTemplate(template) }}
              </p>

              <p class="mt-3 text-xs text-muted">
                {{ template.weeks?.length || 0 }}
                weeks rotation
              </p>
            </div>

            <UIcon
              v-if="isSelected(template.id, 'month')"
              name="i-lucide-circle-check"
              class="size-5 shrink-0 text-primary"
            />
          </div>
        </button>
      </div>
    </div>
  </UCard>
</template>
