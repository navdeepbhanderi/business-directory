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

/**
 * Colours for the MapLibre canvas.
 *
 * MapLibre paint expressions are evaluated by WebGL, not CSS, so they cannot
 * read a custom property. These mirror the tokens they are named after.
 */
export const mapColors = {
  /** `--accent` — small clusters. */
  cluster: '#363c9c',
  /** `--accent-hover` — large clusters, so density reads as depth. */
  clusterLarge: '#2c3184',
  /** `--success` — an open listing. */
  pinOpen: '#17734c',
  /** `--ink-muted` — a closed listing. */
  pinClosed: '#5a5f70',
  /** Pin and cluster outline; white in both themes for contrast on tiles. */
  outline: '#ffffff',
  /** Cluster count label. */
  clusterText: '#ffffff',
} as const
