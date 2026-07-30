/**
 * Sets the theme class before first paint so there is no flash of the wrong
 * theme. Must run synchronously in <head>, which is why it is a raw script
 * rather than an effect.
 *
 * Precedence: explicit user choice (localStorage) > OS preference.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* private mode or storage disabled — fall through to the light default */
  }
})();
`.trim()

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
