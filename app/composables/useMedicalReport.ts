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
  async function verify(id: string) {
    submitting.value = true
    try {
      await api.post(`/medical-reports/${id}/verify`, {})
      toast.add({ title: 'Verified', description: 'Medical report verified successfully', color: 'success' })
      return true
    } catch (err) {
      toast.add({ title: 'Verify failed', description: getErrorMessage(err, 'Failed to verify report'), color: 'error' })
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
      toast.add({ title: 'Returned', description: 'Medical report returned to the doctor', color: 'warning' })
      return true
    } catch (err) {
      toast.add({ title: 'Return failed', description: getErrorMessage(err, 'Failed to return report'), color: 'error' })
      return false
    } finally {
      submitting.value = false
    }
  }

  // ── release ───────────────────────────────────────────────────────
  async function release(id: string) {
    submitting.value = true
    try {
      await api.post(`/medical-reports/${id}/release`, {})
      toast.add({ title: 'Released', description: 'Medical report released successfully', color: 'success' })
      return true
    } catch (err) {
      toast.add({ title: 'Release failed', description: getErrorMessage(err, 'Failed to release report'), color: 'error' })
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
