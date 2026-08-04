import type {
  DoctorResultResponse,
  DoctorResultSubmitPayload,
  DoctorResultItem,
  GradeRule
} from '~/types/doctor-result'

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } }, message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

function withoutKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key))
}

/**
 * Composable untuk Doctor Result MCU.
 * - load(): GET /mcu/exams/:id/doctor-result
 * - selectGrade(): POST /mcu/exams/:id/doctor-result/grade (optimistic + auto-comment dari MstGradeRule)
 * - submit(): POST /mcu/exams/:id/doctor-result/submit
 * - gradeOptions(): daftar grade yang valid untuk item (sesuai flag/condition)
 */
export function useDoctorResult(examId: string) {
  const api = useApi()
  const toast = useToast()

  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const data = ref<DoctorResultResponse | null>(null)
  const selectedGrades = ref<Record<string, string>>({}) // inputanId -> grade
  const comments = ref<Record<string, string>>({}) // inputanId -> auto-comment
  const gradeRules = ref<Record<string, GradeRule[]>>({}) // cache: "condition:label" -> rules

  const finalGrade = ref('')
  const fitnessLevel = ref('')
  const finalComment = ref('')
  const internalNote = ref('')

  const allItems = computed<DoctorResultItem[]>(() =>
    (data.value?.departments ?? []).flatMap(d =>
      (d.groups ?? []).flatMap(g => g.items ?? [])
    )
  )

  const pendingItems = computed<DoctorResultItem[]>(() =>
    allItems.value.filter(i => i.gradable && !i.locked && !i.grade)
  )

  const pendingCount = computed(() => pendingItems.value.length)

  const gradedCount = computed(() =>
    allItems.value.filter(i => i.gradable && i.grade).length
  )

  const totalGradable = computed(() =>
    allItems.value.filter(i => i.gradable).length
  )

  const canSubmit = computed(() =>
    pendingCount.value === 0 && Boolean(finalGrade.value) && Boolean(fitnessLevel.value)
  )

  // ── load ────────────────────────────────────────────────────────────
  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/mcu/exams/${examId}/doctor-result`)
      const payload = res.data?.data ?? res.data
      data.value = payload

      // Preload grade dari server
      selectedGrades.value = {}
      comments.value = {}
      for (const item of allItems.value) {
        if (item.grade) {
          selectedGrades.value[item.inputanId] = item.grade
          comments.value[item.inputanId] = item.comment ?? ''
        }
      }
    } catch (err) {
      error.value = getErrorMessage(err, 'Gagal memuat doctor result')
      toast.add({ title: 'Error', description: error.value, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  // ── fetch grade rules (cache) ──────────────────────────────────────
  async function fetchGradeRules(item: DoctorResultItem): Promise<GradeRule[]> {
    const cacheKey = `${item.flag}:${item.inputanLabel}`
    if (gradeRules.value[cacheKey]) return gradeRules.value[cacheKey]
    try {
      const res = await api.get('/mcu/grade-rules', {
        params: {
          department: item.flag === 'normal' ? undefined : undefined,
          condition: item.flag,
          inputanLabel: item.inputanLabel,
          isActive: true
        }
      })
      const rules = (res.data?.data?.data ?? res.data?.data ?? []) as GradeRule[]
      const normalizedFlag = String(item.flag || 'normal').toLowerCase()
      const matchingRules = rules.filter(rule => String(rule.condition || 'normal').toLowerCase() === normalizedFlag)
      gradeRules.value[cacheKey] = matchingRules
      return matchingRules
    } catch {
      return []
    }
  }

  // ── grade options untuk dropdown ───────────────────────────────────
  async function gradeOptionsFor(item: DoctorResultItem): Promise<string[]> {
    const rules = await fetchGradeRules(item)
    const grades = [...new Set(rules.map(r => r.grade))]
    return grades
  }

  // ── select grade ───────────────────────────────────────────────────
  async function selectGrade(item: DoctorResultItem, grade: string) {
    // optimistic
    selectedGrades.value[item.inputanId] = grade

    // cari auto-comment dari rule
    try {
      const rules = await fetchGradeRules(item)
      const rule = rules.find(r => r.grade === grade && r.isActive && String(r.condition || 'normal').toLowerCase() === String(item.flag || 'normal').toLowerCase())
      comments.value[item.inputanId] = rule?.comment ?? ''
    } catch {
      comments.value[item.inputanId] = ''
    }

    // persist ke BE
    try {
      await api.post(`/mcu/exams/${examId}/doctor-result/grade`, {
        grades: [{ inputanId: item.inputanId, grade }]
      })
      item.grade = grade
      item.comment = comments.value[item.inputanId] ?? null
      item.source = 'doctor'
      item.locked = false
    } catch (err) {
      // rollback
      selectedGrades.value = withoutKey(selectedGrades.value, item.inputanId)
      comments.value = withoutKey(comments.value, item.inputanId)
      toast.add({
        title: 'Gagal simpan grade',
        description: getErrorMessage(err, 'Gagal menyimpan grade'),
        color: 'error'
      })
    }
  }

  async function clearGrade(item: DoctorResultItem) {
    if (item.locked) return false
    // simpan nilai lama untuk rollback
    const prevGrade = selectedGrades.value[item.inputanId] ?? item.grade ?? ''
    const prevComment = comments.value[item.inputanId] ?? item.comment ?? ''
    // optimistic
    selectedGrades.value = withoutKey(selectedGrades.value, item.inputanId)
    comments.value = withoutKey(comments.value, item.inputanId)
    item.grade = null
    item.comment = null
    // persist ke BE (hapus grade doctor, bukan master grade rule)
    try {
      await api.delete(`/mcu/exams/${examId}/doctor-result/grade/${item.inputanId}`)
      return true
    } catch (err) {
      // rollback
      if (prevGrade) selectedGrades.value[item.inputanId] = prevGrade
      if (prevComment) comments.value[item.inputanId] = prevComment
      item.grade = prevGrade || null
      item.comment = prevComment || null
      toast.add({
        title: 'Gagal hapus grade',
        description: getErrorMessage(err, 'Gagal menghapus grade'),
        color: 'error'
      })
      return false
    }
  }

  // ── submit ─────────────────────────────────────────────────────────
  async function submit() {
    if (!canSubmit.value) return false
    submitting.value = true
    try {
      const payload: DoctorResultSubmitPayload = {
        finalGrade: finalGrade.value,
        fitnessLevel: fitnessLevel.value,
        finalComment: finalComment.value || Object.values(comments.value).join(' '),
        internalNote: internalNote.value
      }
      const res = await api.post(`/mcu/exams/${examId}/doctor-result/submit`, payload)
      toast.add({ title: 'Sukses', description: 'Doctor result terkirim ke MR Review', color: 'success' })
      return res.data
    } catch (err) {
      toast.add({
        title: 'Gagal submit',
        description: getErrorMessage(err, 'Gagal submit doctor result'),
        color: 'error'
      })
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    data,
    loading,
    submitting,
    error,
    selectedGrades,
    comments,
    finalGrade,
    fitnessLevel,
    finalComment,
    internalNote,
    allItems,
    pendingItems,
    pendingCount,
    gradedCount,
    totalGradable,
    canSubmit,
    load,
    selectGrade,
    clearGrade,
    gradeOptionsFor,
    submit
  }
}
