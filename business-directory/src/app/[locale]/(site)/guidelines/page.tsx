import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

const rules = [
  {
    title: 'Write from a visit you actually made',
    body: 'Reviews describe first-hand experience. Second-hand accounts, rumours, and reviews written on behalf of someone else are removed.',
  },
  {
    title: 'One review per business',
    body: 'If something changes, edit your existing review rather than adding another. Editing keeps the original date and marks the review as edited.',
  },
  {
    title: 'No reviewing your own business, or a competitor',
    body: 'Owners cannot review listings they own — the database refuses it. Reviews aimed at damaging a competitor are removed and the account is suspended.',
  },
  {
    title: 'Keep it about the business',
    body: 'Personal details about staff or other customers, and anything a reasonable person would read as harassment, will be removed.',
  },
  {
    title: 'Owners may reply once, publicly',
    body: 'A single reply per review, attributed to the business. Replies cannot be edited into a different message after the fact without that being visible.',
  },
  {
    title: 'Reports are read by a person',
    body: 'Reporting a review sends it to a moderation queue with your stated reason. Every decision is recorded with who made it and why.',
  },
]

export default async function GuidelinesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-display">{dict.footer.guidelines}</h1>
      <p className="text-ink-muted mt-5 text-lg">
        A directory is only worth reading if the reviews in it are worth trusting.
      </p>

      <ol className="mt-10 flex flex-col gap-6">
        {rules.map((rule, index) => (
          <li key={rule.title} className="flex gap-4">
            <span
              className="num rounded-pill bg-accent-soft text-accent mt-0.5 grid size-7 shrink-0 place-items-center text-sm font-semibold"
              aria-hidden
            >
              {index + 1}
            </span>
            <div>
              <h2 className="text-ink text-base font-semibold">{rule.title}</h2>
              <p className="text-ink-muted mt-1 leading-relaxed">{rule.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
