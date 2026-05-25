import { masterSeo } from './master'
import { medicalSeo } from './medical'
import { frontOfficeSeo } from './front-office'
import { settingsSeo } from './settings'

/**
 * SEO CONFIG PER PAGE
 */

export type PageSeo = {
  title: string
  description: string
}

export const defaultSeo: PageSeo = {
  title: 'Kyoai Medical Services',
  description: 'Medical management system.'
}

export const pageSeo: Record<string, PageSeo> = {
  '/': {
    title: 'Dashboard',
    description: 'Dashboard overview.'
  },

  ...masterSeo,
  ...medicalSeo,
  ...frontOfficeSeo,
  ...settingsSeo
}
