import type { Component } from 'vue'
import type { RendererKey } from '~/types/physical'
import GenericExamPanel from '~/components/rooms/GenericExamPanel.vue'
import PhysicalExamWorkPanel from '~/components/rooms/PhysicalExamWorkPanel.vue'
import DentalExamWorkPanel from '~/components/rooms/DentalExamWorkPanel.vue'
import DoctorTestWorkPanel from '~/components/rooms/DoctorTestWorkPanel.vue'

export const RENDERER_OPTIONS: Array<{ label: string, value: RendererKey }> = [
  { label: 'Generic', value: 'GENERIC' },
  { label: 'Physical Examination', value: 'PHYSICAL_EXAMINATION' },
  { label: 'Dental Examination', value: 'DENTAL_EXAMINATION' },
  { label: 'Visual Field Test', value: 'VISUAL_FIELD_TEST' },
  { label: 'Romberg Test', value: 'ROMBERG_TEST' },
  { label: 'Tinnel Test', value: 'TINNEL_TEST' },
  { label: 'Phallen Test', value: 'PHALLEN_TEST' },
  { label: 'Rectal Examination', value: 'RECTAL_EXAMINATION' }
]

export const EXAM_RENDERERS: Record<RendererKey, Component> = {
  GENERIC: GenericExamPanel,
  PHYSICAL_EXAMINATION: PhysicalExamWorkPanel,
  DENTAL_EXAMINATION: DentalExamWorkPanel,
  VISUAL_FIELD_TEST: DoctorTestWorkPanel,
  ROMBERG_TEST: DoctorTestWorkPanel,
  TINNEL_TEST: DoctorTestWorkPanel,
  PHALLEN_TEST: DoctorTestWorkPanel,
  RECTAL_EXAMINATION: DoctorTestWorkPanel
}

type RendererItem = { rendererKey?: string | null, code?: string | null, department?: { code?: string | null } | null }
export function resolveRenderer(item: RendererItem, snapshot?: { rendererKey?: string | null } | null): Component {
  const key = snapshot?.rendererKey ?? item.rendererKey
  if (key) {
    if (key in EXAM_RENDERERS) return EXAM_RENDERERS[key as RendererKey]
    console.warn(`Unknown exam renderer key: ${key}`)
    return EXAM_RENDERERS.GENERIC
  }
  if (item.code?.toUpperCase() === 'PHYSICAL_EXAMINATION') return EXAM_RENDERERS.PHYSICAL_EXAMINATION
  if (item.department?.code?.toUpperCase() === 'DENTAL') return EXAM_RENDERERS.DENTAL_EXAMINATION
  return EXAM_RENDERERS.GENERIC
}
