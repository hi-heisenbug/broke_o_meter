/**
 * Broke-O-Meter — application entry point.
 *
 * Responsibilities:
 *   1. Expose the handlers referenced by inline `onclick=`/`oninput=` attributes
 *      in index.html on `window` (ES modules are scoped, so this preserves the
 *      original global wiring without changing the markup).
 *   2. Wire up the upload drop-zone and file input.
 *   3. Warm up the Tesseract OCR engine while the user is idle.
 *
 * Importing ./lib/mascots.js registers the ambient pupil-tracking interactions
 * as a side effect (it is also pulled in transitively via the proof module).
 */
import { loadScript } from './lib/dom.js';
import { TESSERACT_CDNS } from './lib/config.js';
import { setCurrency } from './lib/currency.js';
import { setThreshold, setCustomThreshold } from './lib/threshold.js';
import { generateProof, verifyProof, copyProof, sendDown, shareViaWhatsApp } from './lib/proof.js';
import { trackSendTo, trackVerifierTrust } from './lib/ui.js';
import { processFile } from './lib/ocr.js';
import './lib/mascots.js';

// ── 1. Expose inline-handler functions on the global scope ──────────
Object.assign(window, {
  setCurrency,
  setThreshold,
  setCustomThreshold,
  generateProof,
  verifyProof,
  copyProof,
  sendDown,
  shareViaWhatsApp,
  trackSendTo,
  trackVerifierTrust,
});

// ── 2. Upload zone wiring ───────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput  = document.getElementById('file-input');

uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('drag'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) processFile(f);
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) processFile(e.target.files[0]);
});

// ── 3. Preload Tesseract while the user is idle (avoids cold start) ──
(function preloadTesseract() {
  const load = () => {
    if (window.Tesseract) return;
    const cdns = TESSERACT_CDNS.slice(0, 2);
    loadScript(cdns[0]).catch(() => loadScript(cdns[1]).catch(() => {}));
  };
  if (window.requestIdleCallback) {
    requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 1500);
  }
})();
