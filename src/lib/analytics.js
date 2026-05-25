/**
 * Thin wrapper around Google Analytics' global `gtag`.
 *
 * `gtag` is bootstrapped by the inline snippet in index.html (it must run early,
 * before module evaluation). This wrapper swallows any error so analytics can
 * never break the app, matching the original `track()` behaviour exactly.
 */
export function track(eventName, params) {
  try {
    window.gtag('event', eventName, params || {});
  } catch (e) {
    /* analytics is best-effort; never throw */
  }
}
