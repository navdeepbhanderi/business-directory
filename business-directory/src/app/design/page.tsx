import { notFound } from 'next/navigation'
import { Heart, MapPin, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { BusinessCard, BusinessCardSkeleton } from '@/components/directory/business-card'
import { RatingBreakdown, RatingStars } from '@/components/directory/rating-stars'
import { HoursTable, OpenNowBadge } from '@/components/directory/open-now-badge'
import { AmenityChips } from '@/components/directory/amenity-chips'
import { EmptyState } from '@/components/directory/empty-state'
import { SectionHeading } from '@/components/directory/section-heading'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import type { HourSlot } from '@/lib/hours'

/**
 * Living style guide.
 *
 * Development only — `notFound()` in production keeps it out of the deployed
 * site and off the sitemap. Its job is to make a token or spacing regression
 * visible on one screen instead of surfacing on a page nobody reopened.
 *
 * Copy here is intentionally not localised: this surface is for whoever is
 * building the thing, not for visitors.
 */

const swatches = [
  ['--paper', 'bg-paper'],
  ['--surface', 'bg-surface'],
  ['--surface-sunken', 'bg-surface-sunken'],
  ['--ink', 'bg-ink'],
  ['--ink-muted', 'bg-ink-muted'],
  ['--line', 'bg-line'],
  ['--line-strong', 'bg-line-strong'],
  ['--accent', 'bg-accent'],
  ['--accent-soft', 'bg-accent-soft'],
  ['--success', 'bg-success'],
  ['--warning', 'bg-warning'],
  ['--danger', 'bg-danger'],
  ['--star', 'bg-star'],
] as const

const splitShift: HourSlot[] = ([1, 2, 3, 4, 5] as const).flatMap((dayOfWeek) => [
  { dayOfWeek, opens: '11:00', closes: '15:00' },
  { dayOfWeek, opens: '18:30', closes: '22:30' },
])
const weekend: HourSlot[] = [
  { dayOfWeek: 6, opens: '10:00', closes: '23:00' },
  { dayOfWeek: 0, opens: '10:00', closes: '23:00' },
]

const demoCard = {
  slug: 'demo',
  name: 'Gopi Dining Hall',
  cityName: 'Ahmedabad',
  localityName: 'Navrangpura',
  addressLine1: '24, Navrangpura Main Road',
  rating: 4.4,
  reviewCount: 218,
  priceLevel: 2,
  amenities: ['Parking', 'UPI accepted', 'Air conditioned', 'Family seating'],
  verified: true,
  distanceKm: 1.24,
  isOpen: true,
  promoted: false,
  categoryLabels: ['Restaurants', 'Tiffin & Meal Services'],
  photoUrl: null,
}

const cardLabels = {
  verified: 'Verified',
  reviews: 'reviews',
  promoted: 'Promoted',
  openNow: 'Open',
  closed: 'Closed',
}

const openLabels = {
  open: 'Open',
  closed: 'Closed',
  unknown: 'Hours not listed',
  closingSoon: 'Closing soon',
  closesAt: 'closes {time}',
  opensAt: 'opens {time}',
  opensOn: 'opens {day} at {time}',
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line border-t py-8">
      <h2 className="text-eyebrow text-ink-muted mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow text-accent">Internal</p>
          <h1 className="text-display mt-2">Design system</h1>
          <p className="text-ink-muted mt-3 max-w-lg">
            Toggle the theme and switch the document direction to check both at once. Rules and
            reasoning live in docs/DESIGN.md.
          </p>
        </div>
        <ThemeToggle label="Toggle theme" />
      </header>

      <Row title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map(([name, className]) => (
            <li key={name} className="flex flex-col gap-2">
              <div className={`rounded-card border-line h-14 border ${className}`} />
              <code className="text-ink-muted text-xs">{name}</code>
            </li>
          ))}
        </ul>
      </Row>

      <Row title="Type scale">
        <div className="flex flex-col gap-3">
          <p className="text-display-lg">Display large</p>
          <p className="text-display">Display</p>
          <h3 className="text-2xl">Heading 2xl</h3>
          <h4 className="text-xl">Heading xl</h4>
          <p className="text-base">Body — 16px, locked. Long-form copy sits at this size.</p>
          <p className="text-ink-muted text-sm">Small — metadata, captions, secondary detail.</p>
          <p className="text-eyebrow text-accent">Eyebrow</p>
          <p className="num text-base">Tabular numerals: 4.5 · 1,20,000 · ₹₹ · 1.2 km</p>
        </div>
      </Row>

      <Row title="Buttons">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {(['primary', 'secondary', 'outline', 'ghost', 'danger', 'link'] as const).map((v) => (
              <Button key={v} variant={v}>
                {v}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(['sm', 'md', 'lg'] as const).map((s) => (
              <Button key={s} size={s}>
                Size {s}
              </Button>
            ))}
            <Button size="icon" aria-label="Save">
              <Heart />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Row>

      <Row title="Badges">
        <div className="flex flex-wrap gap-2">
          {(['neutral', 'outline', 'accent', 'success', 'warning', 'danger'] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </div>
      </Row>

      <Row title="Form controls">
        <div className="grid max-w-md gap-3">
          <Input placeholder="Search restaurants, clinics, services…" />
          <Input aria-invalid placeholder="Invalid state" />
          <Input disabled placeholder="Disabled" />
          <Textarea placeholder="Write a review…" />
        </div>
      </Row>

      <Row title="Ratings">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-6">
            {[5, 4.4, 3.5, 2.1, 0].map((value) => (
              <RatingStars key={value} value={value} locale="en" count={12} />
            ))}
          </div>
          <div className="max-w-xs">
            <RatingBreakdown
              counts={{ 5: 128, 4: 54, 3: 19, 2: 8, 1: 9 }}
              locale="en"
              starLabels={{ 1: '1★', 2: '2★', 3: '3★', 4: '4★', 5: '5★' }}
            />
          </div>
        </div>
      </Row>

      <Row title="Open state">
        <div className="flex flex-col gap-3">
          <OpenNowBadge slots={[...splitShift, ...weekend]} locale="en" labels={openLabels} />
          <OpenNowBadge slots={[]} locale="en" labels={openLabels} />
          <div className="rounded-card border-line bg-surface max-w-sm border p-4">
            <HoursTable
              slots={[...splitShift, ...weekend]}
              overrides={[{ date: '2026-11-08', closed: true, note: 'Closed for Diwali' }]}
              locale="en"
              today={3}
              todayLabel="Today"
              closedLabel="Closed"
            />
          </div>
        </div>
      </Row>

      <Row title="Amenities">
        <AmenityChips amenities={demoCard.amenities} max={3} moreLabel="+{count} more" />
      </Row>

      <Row title="Business card">
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <BusinessCard business={demoCard} locale="en" labels={cardLabels} href="#" />
            <BusinessCard
              business={{
                ...demoCard,
                promoted: true,
                isOpen: false,
                verified: false,
                rating: 3.2,
              }}
              locale="en"
              labels={cardLabels}
              href="#"
            />
            <BusinessCardSkeleton />
          </div>
          <BusinessCard
            business={demoCard}
            locale="en"
            labels={cardLabels}
            href="#"
            variant="list"
          />
        </div>
      </Row>

      <Row title="Cards and headings">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Browse"
            title="What are you looking for?"
            description="Every category, across six cities."
            action={<Button variant="outline">View all</Button>}
          />
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Supporting description text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-ink-muted text-sm">Body content sits here.</p>
            </CardContent>
          </Card>
        </div>
      </Row>

      <Row title="Empty and loading states">
        <div className="flex flex-col gap-6">
          <EmptyState
            icon={<SearchX />}
            title="No listings match those filters"
            body="Try widening the distance, lowering the minimum rating, or clearing a filter."
            action={<Button variant="outline">Clear all filters</Button>}
          />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Row>

      <Row title="Logical properties (RTL check)">
        <div className="flex flex-col gap-3" dir="rtl">
          <p className="text-ink-muted text-sm">
            This block is forced to <code>dir=&quot;rtl&quot;</code>. Icons and spacing should
            mirror; numbers should not.
          </p>
          <div className="flex items-center gap-2">
            <MapPin className="text-ink-muted size-4" />
            <span>नवरंगपुरा, अहमदाबाद</span>
            <span className="num text-ink-muted">1.2 km</span>
          </div>
          <BusinessCard
            business={demoCard}
            locale="hi"
            labels={cardLabels}
            href="#"
            variant="list"
          />
        </div>
      </Row>
    </div>
  )
}
