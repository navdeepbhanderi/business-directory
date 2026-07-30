import { ImageResponse } from 'next/og'
import { isLocale } from '@/i18n/config'
import { getBusinessBySlug } from '@/lib/queries/businesses'
import { localizedText } from '@/lib/i18n-content'
import { brandColors } from '@/lib/brand'

/**
 * Per-listing share card.
 *
 * Generated rather than a single static image: a shared link showing the actual
 * business name, rating, and area is the difference between a link someone
 * clicks and one they scroll past.
 *
 * Deliberately text-only — no listing photo. Fetching and decoding a remote
 * image inside OG generation is the slowest and most failure-prone part of it,
 * and a card that sometimes fails to render is worse than a plain one that
 * always does.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Listing share card'

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: rawLocale, slug } = await params
  // Fall back rather than 404: a broken share card is worse than an English one.
  const locale = isLocale(rawLocale) ? rawLocale : 'en'
  const business = await getBusinessBySlug(slug)

  const name = business ? localizedText(business.name, business.name_i18n, locale) : 'Openly'
  const city = business?.cities
  const locality = business?.localities
  const place = [
    locality ? localizedText(locality.name, locality.name_i18n, locale) : null,
    city ? localizedText(city.name, city.name_i18n, locale) : null,
  ]
    .filter(Boolean)
    .join(', ')

  const rating = business?.rating ?? 0
  const reviewCount = business?.review_count ?? 0

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: brandColors.paper,
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: brandColors.accent,
            color: brandColors.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            fontWeight: 700,
            marginRight: 16,
          }}
        >
          O
        </div>
        <span style={{ fontSize: 28, color: brandColors.ink, fontWeight: 600 }}>Openly</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span
          style={{
            fontSize: 26,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: brandColors.accent,
          }}
        >
          {place || 'India'}
        </span>
        <span
          style={{
            fontSize: name.length > 34 ? 66 : 82,
            lineHeight: 1.05,
            color: brandColors.ink,
            fontWeight: 700,
          }}
        >
          {name}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', fontSize: 32 }}>
        {reviewCount > 0 ? (
          <>
            {/* The rating is *drawn*, not typed. Satori only has the fonts it
                  is given, and the default set contains no U+2605 — a literal ★
                  renders as a tofu box. Five bars need no glyph at all. */}
            <div style={{ display: 'flex', marginRight: 20 }}>
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 34,
                    height: 12,
                    borderRadius: 6,
                    marginRight: 6,
                    background:
                      index < Math.round(rating) ? brandColors.star : brandColors.paperDark,
                    opacity: index < Math.round(rating) ? 1 : 0.15,
                  }}
                />
              ))}
            </div>
            <span style={{ color: brandColors.ink, fontWeight: 600, marginRight: 16 }}>
              {rating.toFixed(1)}
            </span>
            <span style={{ color: brandColors.ink, opacity: 0.55 }}>
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </span>
          </>
        ) : (
          <span style={{ color: brandColors.ink, opacity: 0.55 }}>Open hours, honest reviews</span>
        )}
      </div>
    </div>,
    size,
  )
}
