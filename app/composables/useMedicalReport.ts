import type {
  MedicalReportDetail,
  MedicalReportListItem,
  MedicalReportStatus
} from '~/types/medical-report'

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } }, message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

/**
 * Composable untuk Medical Report (MR Review).
 * - loadList(): GET /medical-reports
 * - loadDetail(): GET /medical-reports/:id
 * - verify(): POST /medical-reports/:id/verify
 * - doReturn(): POST /medical-reports/:id/return
 * - release(): POST /medical-reports/:id/release
 */
export function useMedicalReport() {
  const api = useApi()
  const toast = useToast()

  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const list = ref<MedicalReportListItem[]>([])
  const totalItems = ref(0)
  const detail = ref<MedicalReportDetail | null>(null)

  // ── list ──────────────────────────────────────────────────────────
  async function loadList(params: {
    status?: MedicalReportStatus | ''
    page?: number
    limit?: number
  } = {}) {
    loading.value = true
    error.value = null
    try {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        limit: params.limit ?? 20
      }
      if (params.status) query.status = params.status

      const res = await api.get('/medical-reports', { params: query })
      const payload = res.data?.data ?? res.data
      list.value = payload?.data ?? (Array.isArray(payload) ? payload : [])
      totalItems.value = payload?.meta?.total ?? list.value.length
    } catch (err) {
      error.value = getErrorMessage(err, 'Failed to load medical report list')
      toast.add({ title: 'Error', description: error.value, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  // ── detail ────────────────────────────────────────────────────────
  async function loadDetail(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/medical-reports/${id}`)
      detail.value = res.data?.data ?? res.data
    } catch (err) {
      error.value = getErrorMessage(err, 'Failed to load medical report detail')
      toast.add({ title: 'Error', description: error.value, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  // ── verify ────────────────────────────────────────────────────────
  async function verify(id: string, step: 'start' | 'verify' = 'verify') {
    submitting.value = true
    try {
      await api.post(`/medical-reports/${id}/verify`, {})
      if (step === 'start') {
        toast.add({ title: 'Review Started', description: 'MR review started for this medical report', color: 'info' })
      } else {
        toast.add({ title: 'Verified', description: 'Medical report verified successfully', color: 'success' })
      }
      return true
    } catch (err) {
      toast.add({
        title: step === 'start' ? 'Failed to start review' : 'Verify failed',
        description: getErrorMessage(err, step === 'start' ? 'Failed to start MR review' : 'Failed to verify report'),
        color: 'error'
      })
      return false
    } finally {
      submitting.value = false
    }
  }

  // ── return ────────────────────────────────────────────────────────
  async function doReturn(id: string, payload: { reason: string, items?: { inputanId: string, note: string }[] }) {
    submitting.value = true
    try {
      await api.post(`/medical-reports/${id}/return`, payload)
      toast.add({ title: 'Returned to Doctor', description: 'Medical report returned to the doctor for revision', color: 'warning' })
      return true
    } catch (err) {
      toast.add({ title: 'Return failed', description: getErrorMessage(err, 'Failed to return report'), color: 'error' })
      return false
    } finally {
      submitting.value = false
    }
  }

  // ── release ───────────────────────────────────────────────────────
  async function release(id: string, step: 'ready' | 'release' = 'release') {
    submitting.value = true
    try {
      await api.post(`/medical-reports/${id}/release`, {})
      if (step === 'ready') {
        toast.add({ title: 'Ready to Release', description: 'Medical report marked as ready to release', color: 'info' })
      } else {
        toast.add({ title: 'Released', description: 'Medical report released successfully', color: 'success' })
      }
      return true
    } catch (err) {
      toast.add({
        title: step === 'ready' ? 'Failed to mark ready' : 'Release failed',
        description: getErrorMessage(err, step === 'ready' ? 'Failed to mark report as ready to release' : 'Failed to release report'),
        color: 'error'
      })
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    loading,
    submitting,
    error,
    list,
    totalItems,
    detail,
    loadList,
    loadDetail,
    verify,
    doReturn,
    release
  }
}
