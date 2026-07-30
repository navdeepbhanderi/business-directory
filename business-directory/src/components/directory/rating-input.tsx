'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Interactive rating input — the only stateful piece of the rating family, and
 * therefore the only one that needs to be a client component.
 *
 * Native radio inputs underneath, so keyboard traversal, form submission, and
 * screen-reader semantics are the platform's rather than re-implemented with
 * key handlers. The prototype's version was five inert icons beside a
 * permanently disabled submit button.
 */
export function RatingInput({
  name = 'rating',
  value,
  onChange,
  legend,
  /** One label per star, 1–5, already localised. */
  starLabels,
  className,
}: {
  name?: string
  value: number | null
  onChange: (value: number) => void
  legend: string
  starLabels: [string, string, string, string, string]
  className?: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value ?? 0

  return (
    <fieldset
      className={cn('inline-flex items-center gap-1', className)}
      onMouseLeave={() => setHovered(null)}
    >
      <legend className="sr-only">{legend}</legend>
      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="rounded-control focus-within:outline-ring cursor-pointer p-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
          onMouseEnter={() => setHovered(star)}
        >
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <Star
            className={cn(
              'size-7 transition-colors duration-(--duration-hover)',
              star <= active ? 'fill-star text-star' : 'text-line-strong',
            )}
          />
          <span className="sr-only">{starLabels[star - 1]}</span>
        </label>
      ))}
    </fieldset>
  )
}
