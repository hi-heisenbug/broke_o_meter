/**
 * Lightweight survey interactions (the "sending this to..." and verifier-trust
 * chips). Pure presentation + analytics.
 */
import { $ } from './dom.js';
import { track } from './analytics.js';

export function trackSendTo(recipient, el) {
  document.querySelectorAll('.cert-survey .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  track('proof_send_to', { recipient });
  const t = $('sendto-thanks'); if (t) t.classList.add('show');
}

export function trackVerifierTrust(answer, el) {
  document.querySelectorAll('.verifier-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  track('verifier_trust', { answer });
  const t = $('verifier-trust-thanks'); if (t) t.classList.add('show');
}
