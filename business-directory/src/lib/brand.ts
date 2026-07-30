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
  paper: '#fbfbfc',
  /** `--paper`, dark theme. */
  paperDark: '#0e1016',
  /** `--ink`, light theme. */
  ink: '#14161f',
  /** `--accent`, light theme — the brand indigo. */
  accent: '#363c9c',
  /** `--star` — marigold, identical in both themes. */
  star: '#e8a020',
} as const
