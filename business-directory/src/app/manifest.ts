import type { MetadataRoute } from 'next'
import { en } from '@/i18n/dictionaries/en'
import { brandColors } from '@/lib/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: en.meta.title,
    short_name: 'IN Directory',
    description: en.meta.description,
    start_url: '/',
    display: 'standalone',
    background_color: brandColors.paper,
    theme_color: brandColors.accent,
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
