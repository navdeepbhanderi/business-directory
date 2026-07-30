/* eslint-disable no-restricted-syntax -- see note below */

/**
 * The single place outside `globals.css` where literal color values may live.
 *
 * Some surfaces cannot read CSS custom properties: the PWA manifest, the
 * `theme-color` meta tag, and generated OG images are all consumed outside a
 * browser stylesheet context. Rather than scatter hex literals across those
 * files (which the `no-restricted-syntax` lint rule rightly rejects), they are
 * centralised here.
 *
 * These MUST stay in sync with the `:root` / `.dark` blocks in
 * `src/app/globals.css`, which remain the source of truth.
 */
export const brandColors = {
  /** `--paper`, light theme. */
  paper: '#fcfbf8',
  /** `--paper`, dark theme. */
  paperDark: '#14130f',
  /** `--ink`, light theme. */
  ink: '#1a1815',
  /** `--accent`, light theme — the brand terracotta. */
  accent: '#b4541e',
} as const
