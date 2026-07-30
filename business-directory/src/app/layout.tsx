import type { ReactNode } from 'react'

/**
 * Passthrough root. `<html>` and `<body>` are rendered by
 * `app/[locale]/layout.tsx`, which is the first layout that knows the locale —
 * and therefore the correct `lang` and `dir`. Setting those after hydration
 * instead would ship the wrong reading direction on first paint.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
