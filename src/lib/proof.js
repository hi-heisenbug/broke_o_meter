/**
 * Proof generation, verification UI, and sharing.
 *
 * The cryptography lives in ./zkp.js; this module is the DOM/presentation layer
 * that drives the animated steps, renders certificates, and wires up sharing.
 */
import { state } from './state.js';
import { $, delay } from './dom.js';
import { track } from './analytics.js';
import { buildProof, verifyProofString } from './zkp.js';
import { getCurrencySymbol } from './currency.js';
import { mascotCelebrate, mascotSad, showSorryToast } from './mascots.js';

/** Last successfully generated proof (used by the share actions). */
let generatedProof = null;

export async function generateProof() {
  if (state.extractedBalance === null) return;
  const balance = state.extractedBalance, threshold = state.currentThreshold;
  const sym = getCurrencySymbol();

  $('proof-steps').classList.add('show');
  $('prove-btn').disabled = true;

  const steps = ['ps1', 'ps2', 'ps3', 'ps4', 'ps5', 'ps6'];
  const waits = [400, 400, 350, 350, 300, 200];
  for (let i = 0; i < steps.length; i++) { await delay(waits[i]); $(steps[i]).classList.add('show'); }

  state.extractedBalance = null;
  $('extracted-wrap').classList.remove('show');

  const cert = $('cert');
  cert.classList.add('show');
  const stamp = $('cert-stamp');

  const { proofStr, isBroke, commitment, response, validityHash } = await buildProof(balance, threshold);
  generatedProof = { threshold, isBroke, proofStr, commitment, response, validityHash };
  track('proof_generated', { threshold, result: isBroke ? 'broke' : 'not_broke', mode: 'zk' });

  if (isBroke) {
    mascotCelebrate();
    showSorryToast();
    stamp.textContent = 'VERIFIED BROKE';
    stamp.classList.remove('solvent');
    $('cert-body').innerHTML = 'Balance is strictly less than <span class="cert-hl">' + sym + threshold.toLocaleString('en-IN') + '</span>.<br>No actual balance was revealed.';
  } else {
    mascotSad();
    stamp.textContent = 'NOT BROKE';
    stamp.classList.add('solvent');
    $('cert-body').innerHTML = 'Balance is at or above <span class="cert-hl">' + sym + threshold.toLocaleString('en-IN') + '</span>.<br>No actual balance was revealed.';
  }

  $('cert-hash-val').textContent = proofStr;
  showCreditBridge(isBroke, threshold);
  cert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export async function verifyProof() {
  const str = $('proof-input').value.trim();
  const result = $('verify-result');
  result.className = 'verify-result';
  result.style.display = '';

  // Helper to build certificate-style HTML for verify result
  function vcertHTML(stampText, stampClass, bodyHTML, hashLabel, hashVal) {
    return '<div class="vcert-label">Verification Result</div>' +
      '<div class="vcert-stamp ' + stampClass + '">' + stampText + '</div>' +
      '<div class="vcert-body">' + bodyHTML + '</div>' +
      '<div class="vcert-hash"><span class="vcert-hash-label">' + hashLabel + '</span>' +
      '<div class="vcert-hash-val">' + hashVal + '</div></div>';
  }

  const v = await verifyProofString(str);

  // Handle ZK proof (BOMPROOF:v3)
  if (v.status === 'invalid_format') {
    result.className = 'verify-result err-state';
    result.innerHTML = vcertHTML('INVALID FORMAT', 'std-stamp', 'Not a valid Broke-O-Meter proof string.<br>Check that the full string was pasted.', 'Received', str.slice(0, 40) || '(empty)');
    return;
  }
  if (v.status === 'incomplete') {
    result.className = 'verify-result err-state';
    result.innerHTML = vcertHTML('INCOMPLETE', 'std-stamp', 'Proof string appears truncated during paste.', 'Parts found', v.partsLen + ' of 8 expected');
    return;
  }
  if (v.status === 'tampered') {
    result.className = 'verify-result err-state';
    result.innerHTML = vcertHTML('TAMPERED', 'std-stamp', 'Meta hash does not verify. This string has been modified after generation.', 'Commitment fragment', v.commitment.slice(0, 24) + '...');
    return;
  }
  if (v.status === 'mismatch') {
    result.className = 'verify-result err-state';
    result.innerHTML = vcertHTML('HASH MISMATCH', 'std-stamp', 'Validity hash does not match any known state.<br>Proof may be from a different version.', 'Validity hash', v.validityHash);
    return;
  }

  // Detect currency from proof if possible (threshold value clue)
  const sym = getCurrencySymbol();
  const thresholdDisplay = sym + v.threshold.toLocaleString('en-IN');

  if (v.status === 'broke') {
    track('proof_verified', { result: 'broke', threshold: v.threshold });
    mascotCelebrate();
    showSorryToast();
    result.className = 'verify-result broke';
    result.innerHTML = vcertHTML(
      'VERIFIED BROKE',
      '',
      'You verified that the holder\'s balance is<br>strictly less than <strong>' + thresholdDisplay + '</strong>.<br>No actual balance was revealed. Zero knowledge maintained.',
      'Commitment (verified)',
      v.commitment.slice(0, 32) + '...'
    );
  } else {
    track('proof_verified', { result: 'not_broke', threshold: v.threshold });
    mascotSad();
    result.className = 'verify-result liar';
    result.innerHTML = vcertHTML(
      'NOT BROKE',
      'liar-stamp',
      'You verified that the holder\'s balance is<br>at or above <strong>' + thresholdDisplay + '</strong>.<br>Funds exist above the threshold. Balance not revealed.',
      'Commitment (verified)',
      v.commitment.slice(0, 32) + '...'
    );
  }
}

export function copyProof() {
  if (!generatedProof) return;
  track('proof_copied');
  navigator.clipboard.writeText(generatedProof.proofStr).then(() => {
    const btn = $('copy-btn'), orig = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

export function sendDown() {
  if (!generatedProof) return;
  $('proof-input').value = generatedProof.proofStr;
  $('proof-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function shareViaWhatsApp() {
  if (!generatedProof) return;
  const sym = getCurrencySymbol();
  const proofDesc = '(Proves balance is ' + (generatedProof.isBroke ? 'below' : 'at/above') + ' ' + sym + generatedProof.threshold + ', no actual amount revealed)';
  const msg = encodeURIComponent('ZK-Proof of Poverty\n\nVerify at: ' + window.location.href + '\n\nProof:\n' + generatedProof.proofStr + '\n\n' + proofDesc);
  track('proof_shared_whatsapp', { threshold: generatedProof.threshold });
  window.open('https://wa.me/?text=' + msg, '_blank');
}

export function showCreditBridge(isBroke, threshold) {
  const bridge = $('credit-bridge'), text = $('credit-bridge-text');
  if (!bridge || !text) return;
  const sym = getCurrencySymbol();
  if (isBroke) {
    text.innerHTML = 'Signals <strong>insufficient funds for the ' + sym + threshold.toLocaleString('en-IN') + ' threshold</strong>, but the lender <strong>never saw your balance.</strong> That is exactly how the real product works.';
  } else {
    text.innerHTML = 'You are above ' + sym + threshold.toLocaleString('en-IN') + '. This could <strong>qualify you for a ' + sym + (threshold * 100).toLocaleString('en-IN') + ' credit limit</strong>. Zero paperwork. Zero exposure.';
  }
  bridge.classList.add('show');
}
