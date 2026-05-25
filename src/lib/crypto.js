/**
 * Cryptographic primitives backing the (simulated) zero-knowledge proof.
 *
 * `globalThis.crypto` is used rather than `window.crypto` so the exact same code
 * path runs in the browser (where `globalThis === window`) and under Node's test
 * runner (where `globalThis.crypto` is the WebCrypto implementation). Behaviour
 * in the browser is identical to the original `window.crypto.subtle` usage.
 */

/** SHA-256 hex digest of a string, with a non-crypto fallback for old engines. */
export async function sha256(str) {
  if (globalThis.crypto?.subtle) {
    const buf  = new TextEncoder().encode(str);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;
  for (const c of str) h = Math.imul((h << 5) + h, 1) ^ c.charCodeAt(0);
  return Math.abs(h).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

/** `n` random bytes rendered as a lowercase hex string. */
export function randomHex(n) {
  const arr = new Uint8Array(n);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
