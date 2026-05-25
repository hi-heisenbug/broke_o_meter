/**
 * Tiny DOM utilities shared across the UI modules.
 */

/** Shorthand for `document.getElementById`. */
export const $ = (id) => document.getElementById(id);

/** Promise-based delay used to pace the simulated OCR/proof step animations. */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Dynamically load an external script exactly once.
 * Resolves immediately if a script with the same `src` already exists.
 */
export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load script: ' + src));
    document.head.appendChild(s);
  });
}
