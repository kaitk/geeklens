/**
 * The promise-based `browser` namespace, without `webextension-polyfill`.
 *
 * Firefox and Safari expose `browser` natively; Chrome only added it in 148.
 * Chrome's own `chrome` namespace has returned promises since 95 for every API
 * GeekLens touches (`storage.sync.get`/`set` are the latest of them), so an
 * alias covers the gap without pinning the extension to Chrome 148+.
 *
 * Typed against `@types/chrome` because the two namespaces are structurally
 * identical for these APIs, and it is the maintained type package for MV3.
 */
const browser: typeof chrome =
  (globalThis as { browser?: typeof chrome }).browser ?? globalThis.chrome;

export default browser;
