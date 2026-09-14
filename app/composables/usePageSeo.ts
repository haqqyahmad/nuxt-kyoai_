import { defaultSeo, resolvePageSeo } from '~/constants/seo'

type PageSeoOverride = {
  title?: string
  description?: string
}

/**
 * Set SEO halaman secara eksplisit & dinamis.
 *
 * Contoh:
 *   usePageSeo({
 *     title: 'Dashboard',
 *     description: 'Ringkasan data dan aktivitas sistem.'
 *   })
 *
 * Field yang tidak diisi akan diambil otomatis dari resolvePageSeo(route.path)
 * (label menu -> humanisasi -> default).
 */
export function usePageSeo(override: PageSeoOverride = {}) {
  const route = useRoute()

  const seo = computed(() => {
    const base = resolvePageSeo(route.path, route.query)
    return {
      title: override.title ?? base.title,
      description: override.description ?? base.description
    }
  })

  useSeoMeta({
    title: () => seo.value.title,
    description: () => seo.value.description,
    ogTitle: () => seo.value.title,
    ogDescription: () => seo.value.description,
    titleTemplate: (title?: string) =>
      title ? `${title} - ${defaultSeo.title}` : defaultSeo.title
  })

  return seo
}
