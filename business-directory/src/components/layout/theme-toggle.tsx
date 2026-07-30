'use client'

import { Moon, Sun } from 'lucide-react'

/**
 * Which icon shows is decided by CSS from the `.dark` class on <html>, not by
 * React state. That means no effect, no hydration mismatch, and a correct icon
 * on the very first paint — `ThemeScript` has already set the class by then.
 */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage unavailable — the choice simply will not persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="rounded-control border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink inline-flex size-9 items-center justify-center border transition-colors duration-(--duration-hover)"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </button>
  )
}
