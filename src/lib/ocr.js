/**
 * Screenshot ingestion + on-device OCR.
 *
 * Tries the native Shape Detection API (`TextDetector`) first, then falls back
 * to Tesseract.js. All processing stays on the device; the image is never
 * uploaded. The largest plausible amount found becomes the extracted balance.
 */
import { CURRENCIES, TESSERACT_CDNS } from './config.js';
import { state } from './state.js';
import { $, delay, loadScript } from './dom.js';
import { track } from './analytics.js';
import { detectCurrencyFromText, parseIndianAmount, formatAmount } from './currency.js';

export async function processFile(file) {
  state.extractedBalance = null;
  state.rawBalance       = null;
  state.rawCurrency      = null;
  $('proof-panel').classList.remove('unlocked');
  $('extracted-wrap').classList.remove('show');
  $('manual-fallback').classList.remove('show');
  $('cert').classList.remove('show');
  $('proof-steps').classList.remove('show');
  track('screenshot_uploaded');

  const url = URL.createObjectURL(file);
  $('preview-img').src = url;
  $('preview-wrap').classList.add('show');
  $('ocr-log').classList.add('show');
  $('progress-wrap').classList.add('show');

  await showLog('l1', 400);
  updateProgress(10, 'Loading OCR engine...');

  try {
    updateProgress(20, 'Ready');
    await showLog('l2', 300);
    updateProgress(35, 'Preprocessing...');

    const processed = await preprocessImage(file);
    await showLog('l3', 300);
    updateProgress(55, 'Running OCR...');

    let text = null;

    // Try Chrome Shape Detection API first (native, instant, no download)
    if ('TextDetector' in window) {
      try {
        updateProgress(60, 'Using native OCR...');
        const textDetector = new TextDetector();
        const bitmap = await createImageBitmap(processed);
        const detections = await textDetector.detect(bitmap);
        if (detections.length > 0) {
          text = detections.map(d => d.rawValue).join('\n');
          track('ocr_engine', { engine: 'native' });
          updateProgress(88, 'Scanning for amounts...');
        }
      } catch (e) {
        console.warn('Native TextDetector failed, falling back to Tesseract:', e);
        text = null;
      }
    }

    // Fall back to Tesseract if native OCR unavailable or returned nothing
    if (!text) {
      if (!window.Tesseract) {
        const cdns = TESSERACT_CDNS;
        let loaded = false;
        for (const url of cdns) {
          try {
            await loadScript(url);
            if (window.Tesseract) { loaded = true; break; }
          } catch (e) { /* try next */ }
        }
        if (!loaded) throw new Error('Could not load OCR engine. Check your internet connection.');
      }
      updateProgress(60, 'Running Tesseract OCR...');
      const result = await Tesseract.recognize(processed, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            updateProgress(Math.round(60 + m.progress * 28), 'Recognising text...');
          }
        },
        tessedit_pageseg_mode: '6',
        tessedit_char_whitelist: '0123456789.,₹$£€ ',
      });
      text = result.data.text;
      track('ocr_engine', { engine: 'tesseract' });
      updateProgress(88, 'Scanning for amounts...');
    }

    updateProgress(88, 'Scanning for amounts...');
    await showLog('l4', 200);

    // Auto-detect currency from OCR text
    detectCurrencyFromText(text);
    // Build a fresh regex for the current currency (avoid stateful lastIndex on reuse)
    const currRegexSrc = CURRENCIES[state.currentCurrency].regex.source;
    const currencyRegex = new RegExp(currRegexSrc, 'g');
    const matches = text.match(currencyRegex) || [];
    const numericMatches = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b/g) || [];

    let balance = null;
    if (matches.length > 0) {
      const amounts = matches.map(m => parseIndianAmount(m)).filter(n => !isNaN(n) && n >= 0);
      balance = amounts.length ? Math.max(...amounts) : null;
    }
    if (balance === null && numericMatches.length > 0) {
      const nums = numericMatches.map(m => parseIndianAmount(m)).filter(n => !isNaN(n) && n >= 0 && n < 10000000);
      if (nums.length) balance = Math.max(...nums);
    }

    updateProgress(100, 'Done');

    if (balance !== null && !isNaN(balance)) {
      setLogLine('l5', 'ok', 'Found ' + (matches.length || numericMatches.length) + ' amount(s), selected largest.');
      await showLog('l5', 200);
      await showLog('l6', 300);
      track('ocr_success');
      state.rawBalance    = balance;
      state.rawCurrency   = state.currentCurrency; // currency auto-detected before this point
      state.extractedBalance = balance;
      $('extracted-value').textContent = formatAmount(balance);
      $('extracted-wrap').classList.add('show');
      showAmountEditor('On-device OCR may not be reliable for now. Edit amount if needed.', balance);
      $('proof-panel').classList.add('unlocked');
      $('proof-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      track('ocr_failed', { reason: 'no_amount_found' });
      setLogLine('l5', 'err', 'No amount found. Try a clearer image.');
      await showLog('l5', 200);
      showManualFallback();
    }
  } catch (err) {
    console.error('OCR error:', err);
    track('ocr_failed', { reason: 'ocr_exception' });
    const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Unknown error');
    setLogLine('l5', 'err', 'OCR failed. ' + msg);
    await showLog('l5', 200);
    showManualFallback();
  }
}

export function showManualFallback() {
  track('manual_balance_used');
  showAmountEditor('Couldn\'t read it. Enter manually.', '');
}

export async function preprocessImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = img.width < 600 ? 2 : 1;
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const c = avg < 128 ? Math.max(0, avg * 0.7) : Math.min(255, avg * 1.1 + 20);
        d[i] = d[i + 1] = d[i + 2] = c;
      }
      ctx.putImageData(id, 0, 0);
      canvas.toBlob(blob => resolve(blob), 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Reveal the manual amount editor and bind live input -> state updates.
 * Used both for the OCR "edit if needed" affordance and the manual fallback.
 */
export function showAmountEditor(labelText, initialValue) {
  $('manual-fallback').classList.add('show');
  const label = document.querySelector('#manual-fallback .manual-fallback-label');
  if (label) label.textContent = labelText;
  const input = $('manual-input');
  // Clone to remove any previously attached listeners
  const fresh = input.cloneNode(true);
  input.parentNode.replaceChild(fresh, input);
  fresh.value = (initialValue !== undefined && initialValue !== null) ? String(initialValue) : '';
  fresh.addEventListener('input', () => {
    const v = parseFloat(fresh.value);
    if (!isNaN(v) && v >= 0) {
      state.rawBalance       = v;
      state.rawCurrency      = state.currentCurrency;
      state.extractedBalance = v;
      $('extracted-value').textContent = formatAmount(v);
      $('extracted-wrap').classList.add('show');
      $('proof-panel').classList.add('unlocked');
    }
  });
}

/* ── OCR log / progress helpers ─────────────────────────────────── */
export async function showLog(id, ms = 300) { await delay(ms); $(id).classList.add('show'); }
export function setLogLine(id, type, text) { const el = $(id); el.className = 'log-line ' + type; el.textContent = text; }
export function updateProgress(pct, label) { $('progress-fill').style.width = pct + '%'; $('progress-label').textContent = label; }
